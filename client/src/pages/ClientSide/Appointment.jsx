import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../../styles/appointment.css";

const Appointment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const barberId = window.location.pathname.split("/").pop();

  const [barberName, setBarberName] = useState("Loading...");
  const [checkingLogin, setCheckingLogin] = useState(true);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [bookingDetails, setBookingDetails] = useState("");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await fetch("/me");
        const data = await res.json();

        if (!data.loggedIn || data.role !== "client") {
          navigate(`/client/login?next=${encodeURIComponent(location.pathname)}`);
          return;
        }
      } catch (err) {
        console.error("Login check failed", err);
        navigate(`/client/login?next=${encodeURIComponent(location.pathname)}`);
        return;
      } finally {
        setCheckingLogin(false);
      }
    };

    checkLogin();
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!checkingLogin) {
      loadBarber();
    }
  }, [checkingLogin]);

  useEffect(() => {
    if (date) {
      generateSlots();
    }
  }, [date]);

  const loadBarber = async () => {
    try {
      const res = await fetch(`/api/barbers/${barberId}`);
      const barber = await res.json();
      setBarberName(barber.name || "Unknown");
    } catch (err) {
      console.error(err);
      setBarberName("Barber not found");
    }
  };

  const generateSlots = async () => {
    if (!date) {
      setSlots([]);
      setSelectedSlot("");
      return;
    }

    try {
      const res = await fetch(`/api/barber/${barberId}/slots/${date}`);
      const slotsData = await res.json();

      const bookedRes = await fetch(
        `/appointment/${barberId}/booked?date=${date}`
      );
      const bookedSlots = await bookedRes.json();

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const processedSlots = slotsData.map((slot) => {
        const start = slot.start;
        const display = slot.display;

        const [hour, minute] = start.split(":").map(Number);
        const slotMinutes = hour * 60 + minute;

        let status = "available";
        let displayText = display;

        if (bookedSlots.includes(start)) {
          status = "disabled";
          displayText = `${display} (Booked)`;
        } else if (date === today && slotMinutes < currentMinutes) {
          status = "disabled";
          displayText = `${display} (Unavailable)`;
        }

        return {
          start,
          display,
          displayText,
          status,
        };
      });

      setSlots(processedSlots);
      setSelectedSlot("");
    } catch (err) {
      console.log("Slot error:", err);
    }
  };

  const confirmBooking = async () => {
    if (!date) {
      alert("Please select date");
      return;
    }

    if (!selectedSlot) {
      alert("Please select time slot");
      return;
    }

    try {
      const res = await fetch(`/appointment/${barberId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: date,
          time: selectedSlot,
        }),
      });

      const msg = await res.text();

      if (msg === "Booking Successful") {
        setBookingDetails(`Date: ${date} | Time: ${selectedSlot}`);
        setShowPopup(true);
      } else {
        alert(msg);
      }
    } catch (err) {
      console.error(err);
      alert("Booking failed");
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    navigate("/");
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
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/my-bookings">My Bookings</Link>
          </li>
          <li>
            <Link to="/profile">Profile</Link>
          </li>
          <li>
            <Link to="/logout">Logout</Link>
          </li>
        </ul>
      </nav>

      <div className="container">
        <h2>Book Appointment</h2>

        <p>
          <strong>Barber:</strong>
          <span>{barberName}</span>
        </p>

        <label>Select Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={today}
        />

        <div className="slot-container">
          {slots.map((slot) => (
            <div
              key={slot.start}
              className={`slot ${slot.status} ${
                selectedSlot === slot.start ? "active" : ""
              }`}
              onClick={() => {
                if (slot.status !== "disabled") {
                  setSelectedSlot(slot.start);
                }
              }}
            >
              {slot.displayText}
            </div>
          ))}
        </div>

        <button onClick={confirmBooking}>
          <i className="bx bxs-calendar"></i> Confirm Booking
        </button>
      </div>

      {showPopup && (
        <div className="popup">
          <div className="popup-box">
            <h3>✅ Booking Confirmed</h3>
            <p>{bookingDetails}</p>
            <button onClick={closePopup}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointment;