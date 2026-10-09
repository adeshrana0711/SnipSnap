const express = require("express");
const router = express.Router();

const Appointment = require("../models/appointment");
const Barber = require("../models/Barber");
const Client = require("../models/Client");
const auth = require("../middlewares/auth");
const sendEmail = require("../utils/sendEmail");


router.get("/:barberId/booked", async (req, res) => {
    try {

        const { barberId } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).send("Date required");
        }

        const bookings = await Appointment.find({
            barber: barberId,
            date: date
        });

        const bookedSlots = bookings.map(b => b.time);

        res.json(bookedSlots);

    } catch (err) {

        console.error("Booked Slot Error:", err);
        res.status(500).send("Server Error");

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