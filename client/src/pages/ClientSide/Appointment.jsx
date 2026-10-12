
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import "../../styles/appointment.css";

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const Appointment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Supports /appointment/:barberId and your existing URL structure.
  const barberId =
    params.barberId || window.location.pathname.split("/").pop();

  const [barberName, setBarberName] = useState("Loading...");
  const [checkingLogin, setCheckingLogin] = useState(true);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [bookingDetails, setBookingDetails] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  const today = new Date().toLocaleDateString("en-CA");

  // Check login.
  useEffect(() => {
    let active = true;

    const checkLogin = async () => {
      try {
        const res = await fetch("/me", {
          credentials: "include",
        });
        const data = await res.json();

        if (!data.loggedIn || data.role !== "client") {
          navigate(
            `/client/login?next=${encodeURIComponent(location.pathname)}`
          );
          return;
        }
      } catch (err) {
        console.error("Login check failed:", err);

        if (active) {
          navigate(
            `/client/login?next=${encodeURIComponent(location.pathname)}`
          );
        }
      } finally {
        if (active) setCheckingLogin(false);
      }
    };

    checkLogin();

    return () => {
      active = false;
    };
  }, [location.pathname, navigate]);

  // Load barber.
  useEffect(() => {
    if (!checkingLogin && barberId) {
      loadBarber();
    }
  }, [checkingLogin, barberId]);

  const loadBarber = async () => {
    try {
      const res = await fetch(`/api/barbers/${barberId}`);

      if (!res.ok) throw new Error("Barber not found");

      const barber = await res.json();
      setBarberName(barber.name || "Unknown");
    } catch (err) {
      console.error("Barber loading error:", err);
      setBarberName("Barber not found");
    }
  };

  // Load slots and mark booked or expired time slots.
  useEffect(() => {
    if (date && !checkingLogin) {
      generateSlots();
    } else {
      setSlots([]);
      setSelectedSlot("");
    }
  }, [date, checkingLogin]);

  const generateSlots = async () => {
    try {
      const slotsRes = await fetch(
        `/api/barber/${barberId}/slots/${date}`
      );

      if (!slotsRes.ok) throw new Error("Could not load available slots");

      const slotsData = await slotsRes.json();

      const bookedRes = await fetch(
        `/appointment/${barberId}/booked?date=${encodeURIComponent(date)}`
      );

      if (!bookedRes.ok) throw new Error("Could not load booked slots");

      const bookedSlots = await bookedRes.json();

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const processedSlots = slotsData.map((slot) => {
        const [hour, minute] = slot.start.split(":").map(Number);
        const slotMinutes = hour * 60 + minute;

        let status = "available";
        let displayText = slot.display;

        if (bookedSlots.includes(slot.start)) {
          status = "disabled";
          displayText = `${slot.display} (Reserved/Booked)`;
        } else if (date === today && slotMinutes <= currentMinutes) {
          status = "disabled";
          displayText = `${slot.display} (Unavailable)`;
        }

        return {
          start: slot.start,
          display: slot.display,
          displayText,
          status,
        };
      });

      setSlots(processedSlots);
      setSelectedSlot((current) =>
        processedSlots.some(
          (slot) =>
            slot.start === current && slot.status === "available"
        )
          ? current
          : ""
      );
    } catch (err) {
      console.error("Slot loading error:", err);
      setSlots([]);
      alert("Could not load available slots. Please try again.");
    }
  };

  // Start payment and confirm only after backend verification.
  const confirmBooking = async () => {
    if (paymentLoading) return;

    if (!date) {
      alert("Please select a date.");
      return;
    }

    if (!selectedSlot) {
      alert("Please select a time slot.");
      return;
    }

    setPaymentLoading(true);

    let checkoutOpened = false;

    try {
      const loaded = await loadRazorpay();

      if (!loaded) {
        throw new Error("Razorpay could not load. Check your internet.");
      }

      // Ask backend to reserve the slot and create a Razorpay order.
      const orderRes = await fetch(
        `/appointment/${barberId}/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            date,
            time: selectedSlot,
          }),
        }
      );

      const order = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(order.message || "Could not create payment order.");
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "SnipSnap",
        description: "Appointment booking fee - ₹1",
        order_id: order.orderId,

        prefill: {
          name: order.customerName || "",
          email: order.customerEmail || "",
        },

        theme: {
          color: "#1976d2",
        },

        handler: async (response) => {
          try {
            const verifyRes = await fetch(
              "/appointment/verify-payment",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                  appointmentId: order.appointmentId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              }
            );

            const result = await verifyRes.json();

            if (!verifyRes.ok || !result.success) {
              alert(
                result.message ||
                  "Payment verification is incomplete. Check My Bookings before trying again."
              );
              return;
            }

            setBookingDetails(
              `Barber: ${order.barberName || barberName}\n` +
                `Date: ${order.date || date}\n` +
                `Time: ${order.time || selectedSlot}\n` +
                "Booking fee paid: ₹1"
            );

            setShowPopup(true);
            await generateSlots();
          } catch (err) {
            console.error("Payment verification error:", err);

            alert(
              "We could not verify the payment right now. Please check your booking status before paying again."
            );
          } finally {
            setPaymentLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
            // The pending reservation expires according to the backend policy.
          },
        },
      };

      const checkout = new window.Razorpay(options);

      checkout.on("payment.failed", (response) => {
        console.error("Payment failed:", response.error);
        alert("Payment failed. Your appointment is not confirmed.");
        setPaymentLoading(false);
      });

      checkout.open();
      checkoutOpened = true;
    } catch (err) {
      console.error("Booking/payment error:", err);
      alert(err.message || "Unable to start payment.");
    } finally {
      if (!checkoutOpened) {
        setPaymentLoading(false);
      }
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    navigate("/my-bookings");
  };

  if (checkingLogin) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Checking login...</p>
      </div>
    );
  }

  return (
    <div>
      <nav>
        <div className="logo">SnipSnap</div>

        <ul className="links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/my-bookings">My Bookings</Link></li>
          <li><Link to="/profile">Profile</Link></li>
          <li><Link to="/logout">Logout</Link></li>
        </ul>
      </nav>

      <div className="container">
        <h2>Book Appointment</h2>

        <p>
          <strong>Barber: </strong>
          <span>{barberName}</span>
        </p>

        <p>
          <strong>Booking fee: </strong>
          <span>₹1</span>
        </p>

        <label htmlFor="appointment-date">Select Date</label>

        <input
          id="appointment-date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSelectedSlot("");
          }}
          min={today}
          disabled={paymentLoading}
        />

        <div className="slot-container">
          {slots.map((slot) => (
            <div
              key={slot.start}
              className={`slot ${slot.status} ${
                selectedSlot === slot.start ? "active" : ""
              }`}
              onClick={() => {
                if (
                  slot.status !== "disabled" &&
                  !paymentLoading
                ) {
                  setSelectedSlot(slot.start);
                }
              }}
            >
              {slot.displayText}
            </div>
          ))}
        </div>

        <button
          onClick={confirmBooking}
          disabled={paymentLoading || !date || !selectedSlot}
        >
          <i className="bx bxs-calendar"></i>{" "}
          {paymentLoading ? "Processing Payment..." : "Pay ₹1 & Confirm Booking"}
        </button>
      </div>

      {showPopup && (
        <div className="popup">
          <div className="popup-box">
            <h3>✅ Payment Successful!</h3>
            <h4>Your Booking Is Confirmed</h4>

            <p style={{ whiteSpace: "pre-line" }}>
              {bookingDetails}
            </p>

            <p>
              A confirmation email will be sent to your registered email
              address.
            </p>

            <button onClick={closePopup}>View My Bookings</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointment;
