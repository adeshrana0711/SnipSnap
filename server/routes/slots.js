const express = require("express");
const router = express.Router();

const Barber = require("../models/Barber");
const Appointment = require("../models/appointment");

router.get("/barber/:id/slots/:date", async (req, res) => {

  try {

    const { id, date } = req.params;

    const barber = await Barber.findById(id);

    if (!barber) {
      return res.status(404).json({ error: "Barber not found" });
    }

    // get booked appointments
    const appointments = await Appointment.find({
      barber: id,
      date: date
    });

    const bookedSlots = appointments.map(a => a.time);

    const start = barber.workingHours.start;
    const end = barber.workingHours.end;

    const slotDuration = barber.slotDuration || 30;

    const slots = [];

    let current = new Date(`1970-01-01T${start}:00`);
    const endTime = new Date(`1970-01-01T${end}:00`);

    while (current < endTime) {

      const hours = String(current.getHours()).padStart(2, "0");
      const minutes = String(current.getMinutes()).padStart(2, "0");

      const startSlot = `${hours}:${minutes}`;

      const next = new Date(current);
      next.setMinutes(next.getMinutes() + slotDuration);

      const nextHour = String(next.getHours()).padStart(2, "0");
      const nextMin = String(next.getMinutes()).padStart(2, "0");

      const displaySlot = `${startSlot} - ${nextHour}:${nextMin}`;

      // skip booked slot
      if (!bookedSlots.includes(startSlot)) {
        slots.push({
          start: startSlot,
          display: displaySlot
        });
      }

      current.setMinutes(current.getMinutes() + slotDuration);

    }

    res.json(slots);

  } catch (err) {

    console.error("Slot generation error:", err);

    res.status(500).json({
      error: "Server error",
      message: err.message
    });

  }

});

module.exports = router;