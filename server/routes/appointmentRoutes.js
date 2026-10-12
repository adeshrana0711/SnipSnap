const express = require("express");
const router = express.Router();

const Appointment = require("../models/appointment");
const Barber = require("../models/Barber");
const Client = require("../models/Client");
const auth = require("../middlewares/auth");
const sendEmail = require("../utils/sendEmail");

const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const ADVANCE_AMOUNT  = Number(process.env.ADVANCE_AMOUNT || 100);

async function removeExpiredReservations() {
  await Appointment.deleteMany({
    status: "PendingPayment",
    expiresAt: { $lte: new Date() },
  });
}


router.get("/:barberId/booked", async (req, res) => {
  try {
    await removeExpiredReservations();
    const { barberId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date required" });
    }

    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const bookings = await Appointment.find({
      barber: barberId,
      date: { $gte: start, $lte: end },
      status: { $in: ["PendingPayment", "Booked", "Completed"] },
    }).select("time");

    res.json(bookings.map((booking) => booking.time));
  } catch (err) {
    console.error("Booked slots error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:barberId/create-order", auth("client"), async (req, res) => {
  let appointment;

  try {
    await removeExpiredReservations();

    const { barberId } = req.params;
    const { date, time } = req.body;
    const clientId = req.user.id;

    if (!date || !time) {
      return res.status(400).json({ message: "Date and time required" });
    }

    const selectedDate = new Date(`${date}T00:00:00.000Z`);

    if (
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({ message: "Invalid date" });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (date < today) {
      return res.status(400).json({ message: "Cannot book a past date" });
    }

    const barber = await Barber.findById(barberId);
    if (!barber) {
      return res.status(404).json({ message: "Barber not found" });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const existingClientBooking = await Appointment.findOne({
      client: clientId,
      date: selectedDate,
      status: { $in: ["PendingPayment", "Booked", "Completed"] },
      expiresAt: { $gt: new Date() },
    });

    if (existingClientBooking) {
      return res.status(400).json({
        message: "You already have an appointment on this date",
      });
    }

    // The unique index prevents competing reservations for the same slot.
    appointment = await Appointment.create({
      barber: barberId,
      client: clientId,
      date: selectedDate,
      time,
      status: "PendingPayment",
      paymentStatus: "Pending",
      advanceAmount: ADVANCE_AMOUNT,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const order = await razorpay.orders.create({
      amount: ADVANCE_AMOUNT,
      currency: "INR",
      receipt: appointment._id.toString(),
      notes: {
        appointmentId: appointment._id.toString(),
        clientId: clientId.toString(),
      },
    });

    appointment.razorpayOrderId = order.id;
    await appointment.save();

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      appointmentId: appointment._id,
      barberName: barber.name,
      date,
      time,
      customerName: client.name,
      customerEmail: client.email,
    });
  } catch (err) {
    // Duplicate key means another customer reserved the slot first.
    if (err.code === 11000) {
      return res.status(409).json({
        message: "This slot is already reserved or booked. Choose another.",
      });
    }

    if (appointment) {
      await Appointment.deleteOne({
        _id: appointment._id,
        status: "PendingPayment",
      }).catch(console.error);
    }

    console.error("Create order error:", err);
    res.status(500).json({ message: "Could not create payment order" });
  }
});

/* STEP 2: VERIFY PAYMENT AND CONFIRM BOOKING */
router.post("/verify-payment", auth("client"), async (req, res) => {
  try {
    const {
      appointmentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !appointmentId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({ message: "Payment details missing" });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      client: req.user.id,
      razorpayOrderId: razorpay_order_id,
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Idempotency: don't send another confirmation for an already-paid booking.
    if (
      appointment.status === "Booked" &&
      appointment.paymentStatus === "Paid" &&
      appointment.razorpayPaymentId === razorpay_payment_id
    ) {
      return res.json({
        success: true,
        message: "Payment successful. Booking confirmed!",
      });
    }

    if (
      appointment.status !== "PendingPayment" ||
      appointment.expiresAt <= new Date()
    ) {
      return res.status(400).json({
        message: "Reservation expired. Please select the slot again.",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const received = Buffer.from(razorpay_signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // Verify payment details directly with Razorpay too.
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (
      payment.order_id !== razorpay_order_id ||
      payment.amount !== ADVANCE_AMOUNT ||
      payment.currency !== "INR" ||
      payment.status !== "captured"
    ) {
      return res.status(400).json({
        message: "Payment is not captured or does not match this booking",
      });
    }

    // Atomic update: only one verification can claim this pending booking.
    const confirmed = await Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        client: req.user.id,
        status: "PendingPayment",
        paymentStatus: "Pending",
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: "Booked",
          paymentStatus: "Paid",
          razorpayPaymentId: razorpay_payment_id,
          expiresAt: null,
        },
      },
      { new: true }
    );

    if (!confirmed) {
      return res.status(409).json({
        message: "Reservation expired or has already been processed",
      });
    }

    // Send confirmation email after payment verification.
    try {
      const client = await Client.findById(confirmed.client);
      const barber = await Barber.findById(confirmed.barber).populate("shop");

      if (client?.email && barber) {
        await sendEmail(
          client.email,
          "SnipSnap - Payment Successful & Booking Confirmed",
          `
            <div style="font-family:Arial,sans-serif;padding:24px;color:#222">
              <h2 style="color:#16803c">Payment Successful!</h2>
              <p>Hello ${client.name || "Customer"},</p>
              <p>Your SnipSnap appointment is confirmed.</p>
              <p><b>Shop:</b> ${barber.shop?.name || "N/A"}</p>
              <p><b>Barber:</b> ${barber.name}</p>
              <p><b>Date:</b> ${confirmed.date.toISOString().slice(0, 10)}</p>
              <p><b>Time:</b> ${confirmed.time}</p>
              <p><b>Booking fee paid:</b> ₹1</p>
              <p><b>Payment ID:</b> ${razorpay_payment_id}</p>
              <p>Thank you for choosing SnipSnap!</p>
            </div>
          `
        );
      }
    } catch (emailErr) {
      // Payment is already verified; email failure must not undo the booking.
      console.error("Confirmation email error:", emailErr);
    }

    res.json({
      success: true,
      message: "Payment successful. Booking confirmed!",
      appointment: {
        id: confirmed._id,
        date: confirmed.date.toISOString().slice(0, 10),
        time: confirmed.time,
        advancePaid: 1,
      },
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({ message: "Could not verify payment" });
  }
});

// ===========================
// BOOK APPOINTMENT
// ===========================
router.post("/:barberId", auth("client"), async (req, res) => {

    try {

        const { barberId } = req.params;
        const { date, time } = req.body;

        const clientId = req.user.id;

        if (!clientId) {
            return res.status(401).send("Login required");
        }

        if (!date || !time) {
            return res.status(400).send("Date and Time required");
        }

        const today = new Date().toISOString().split("T")[0];

        if (date < today) {
            return res.status(400).send("Cannot book past date");
        }

        const existing = await Appointment.findOne({
            barber: barberId,
            date,
            time
        });

        if (existing) {
            return res.status(400).send("Slot already booked");
        }

        const clientBooking = await Appointment.findOne({
            client: clientId,
            date
        });

        if (clientBooking) {
            return res.status(400).send("You already booked an appointment on this date");
        }

        const appointment = new Appointment({
            barber: barberId,
            client: clientId,
            date,
            time
        });

        await appointment.save();

        // ===========================
        // SEND EMAIL
        // ===========================

        try {

            const client = await Client.findById(clientId);

            const barber = await Barber.findById(barberId).populate("shop");

            if (client && client.email && barber) {

                await sendEmail(
                    client.email,
                    "BARQ - Appointment Confirmed",
                    `
                    <div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:30px">

                        <div style="max-width:600px;margin:auto;background:#fff;border-radius:10px;overflow:hidden">

                            <div style="background:#1976d2;color:white;padding:20px;text-align:center">
                                <h1>BARQ</h1>
                                <h3>Appointment Confirmation</h3>
                            </div>

                            <div style="padding:25px">

                                <p>Hello <strong>${client.name}</strong>,</p>

                                <p>Your appointment has been booked successfully.</p>

                                <table style="width:100%;border-collapse:collapse">

                                    <tr>
                                        <td style="padding:10px;border:1px solid #ddd"><b>Shop</b></td>
                                        <td style="padding:10px;border:1px solid #ddd">
                                            ${barber.shop ? barber.shop.name : "N/A"}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="padding:10px;border:1px solid #ddd"><b>Barber</b></td>
                                        <td style="padding:10px;border:1px solid #ddd">
                                            ${barber.name}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="padding:10px;border:1px solid #ddd"><b>Date</b></td>
                                        <td style="padding:10px;border:1px solid #ddd">
                                            ${date}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="padding:10px;border:1px solid #ddd"><b>Time</b></td>
                                        <td style="padding:10px;border:1px solid #ddd">
                                            ${time}
                                        </td>
                                    </tr>

                                </table>

                                <br>

                                <p>
                                    Thank you for choosing
                                    <strong>BARQ</strong>.
                                </p>

                                <p>
                                    We look forward to serving you.
                                </p>

                            </div>

                            <div style="background:#1976d2;color:white;text-align:center;padding:15px">
                                © BARQ Barber Booking System
                            </div>

                        </div>

                    </div>
                    `
                );

                console.log("Appointment confirmation email sent.");

            }

        } catch (emailErr) {

            console.error("Email Error:", emailErr);

            // Don't stop booking if email fails
        }

        res.send("Booking Successful");

    } catch (err) {

        console.error("Booking Error:", err);
        res.status(500).send("Server Error");

    }

});

// ===========================
// SHOP ORDERS
// ===========================
router.get("/shop/orders", auth("shop"), async (req, res) => {

    try {

        const barbers = await Barber.find({
            shop: req.user.id
        });

        const orders = await Appointment.find({
            barber: {
                $in: barbers.map(b => b._id)
            }
        })
            .populate("client", "name email")
            .populate("barber", "name");

        res.json(orders);

    } catch (err) {

        console.error(err);
        res.status(500).send("Server Error");

    }

});

// ===========================
// UPDATE STATUS
// ===========================
router.put("/update-status/:id", async (req, res) => {

    try {

        const { status } = req.body;

        const updated = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        res.json({
            message: "Status updated successfully",
            updated
        });

    } catch (err) {

        console.error(err);
        res.status(500).json({
            message: "Server error"
        });

    }

});

module.exports = router;