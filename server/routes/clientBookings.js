const express = require("express");
const router = express.Router();

const Appointment = require("../models/Appointment");
const auth = require("../middlewares/auth");

router.get("/", auth("client"), async (req, res) => {

    try {

        if (req.user.role !== "client") {
            return res.status(403).json({ message: "Access denied" });
        }

        const now = new Date();

        const bookings = await Appointment.find({ client: req.user.id })
            .populate({
                path: "barber",
                select: "name shop",
                populate: {
                    path: "shop",
                    select: "name location"
                }
            })
            .sort({ date: 1, time: 1 });

        const formatted = bookings.map(b => {

            const bookingDateTime = new Date(b.date);
            const [h, m] = b.time.split(":");
            bookingDateTime.setHours(h, m);

            let status = b.status;

            if (status === "Booked") {
                status = bookingDateTime < now ? "Completed" : "Pending";
            }

            return {
                id: b._id,
                shopName: b.barber?.shop?.name || "N/A",
                barberName: b.barber?.name || "N/A",
                date: b.date,
                time: b.time,
                status
            };
        });

        res.json(formatted);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }

});

module.exports = router;