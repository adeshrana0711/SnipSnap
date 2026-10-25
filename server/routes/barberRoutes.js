const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Barber = require("../models/Barber");
const auth = require("../middlewares/auth");

// ============================================
// GET ALL BARBERS BELONGING TO LOGGED-IN SHOP
// GET /api/barbers/all
// ============================================
router.get("/all", auth("shop"), async (req, res) => {
  try {
    const barbers = await Barber.find({
      shop: req.user.id,
    }).lean();

    return res.status(200).json(barbers);
  } catch (error) {
    console.error("Fetch barbers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch barbers.",
    });
  }
});

// ============================================
// ADD A BARBER
// POST /api/barbers/add
// ============================================
router.post("/add", auth("shop"), async (req, res) => {
  try {
    const { name, location, skills, status } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof location !== "string" ||
      !location.trim() ||
      !skills ||
      (Array.isArray(skills) && skills.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, location and skills are required.",
      });
    }

    const barber = new Barber({
      name: name.trim(),
      location: location.trim(),
      skills,
      status: status || "Active",
      shop: req.user.id,
    });

    await barber.save();

    return res.status(201).json({
      success: true,
      message: "Barber added successfully.",
      barber,
    });
  } catch (error) {
    console.error("Add barber error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid barber details.",
        details: Object.values(error.errors || {}).map(
          (item) => item.message
        ),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to add barber.",
    });
  }
});

// ============================================
// TOGGLE BARBER STATUS
// PATCH /api/barbers/status/:id
// ============================================
router.patch("/status/:id", auth("shop"), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid barber ID.",
      });
    }

    const barber = await Barber.findOne({
      _id: id,
      shop: req.user.id,
    });

    if (!barber) {
      return res.status(404).json({
        success: false,
        message: "Barber not found for this shop.",
      });
    }

    barber.status =
      barber.status === "Active" ? "Inactive" : "Active";

    await barber.save();

    return res.status(200).json({
      success: true,
      message: "Barber status updated successfully.",
      barber,
    });
  } catch (error) {
    console.error("Update barber status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update barber status.",
    });
  }
});

// ============================================
// UPDATE BARBER WORKING HOURS
// PATCH /api/barbers/availability/:id
// ============================================
router.patch(
  "/availability/:id",
  auth("shop"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { start, end } = req.body || {};

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid barber ID.",
        });
      }

      if (
        typeof start !== "string" ||
        typeof end !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)
      ) {
        return res.status(400).json({
          success: false,
          message: "Provide valid start and end times in HH:mm format.",
        });
      }

      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: "End time must be later than start time.",
        });
      }

      const barber = await Barber.findOne({
        _id: id,
        shop: req.user.id,
      });

      if (!barber) {
        return res.status(404).json({
          success: false,
          message: "Barber not found for this shop.",
        });
      }

      // Initialize workingHours if it doesn't exist.
      barber.workingHours = barber.workingHours || {};
      barber.workingHours.start = start;
      barber.workingHours.end = end;

      await barber.save();

      return res.status(200).json({
        success: true,
        message: "Barber availability updated successfully.",
        barber,
      });
    } catch (error) {
      console.error("Update barber availability error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update barber availability.",
      });
    }
  }
);

// ============================================
// GET A BARBER BY ID
// GET /api/barbers/:id
// ============================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid barber ID.",
      });
    }

    const barber = await Barber.findById(id).lean();

    if (!barber) {
      return res.status(404).json({
        success: false,
        message: "Barber not found.",
      });
    }

    return res.status(200).json(barber);
  } catch (error) {
    console.error("Get barber by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch barber.",
    });
  }
});

// ============================================
// DELETE A BARBER
// DELETE /api/barbers/:id
// ============================================
router.delete("/:id", auth("shop"), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid barber ID.",
      });
    }

    const deletedBarber = await Barber.findOneAndDelete({
      _id: id,
      shop: req.user.id,
    });

    if (!deletedBarber) {
      return res.status(404).json({
        success: false,
        message: "Barber not found for this shop.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Barber deleted successfully.",
    });
  } catch (error) {
    console.error("Delete barber error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete barber.",
    });
  }
});

module.exports = router;