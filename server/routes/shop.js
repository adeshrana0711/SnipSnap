const express = require("express");
const router = express.Router();

const Shop = require("../models/Shop");
const Barber = require("../models/Barber");
const auth = require("../middlewares/auth");

// Check whether a shop is currently open.
// Supports availability.openTime/closeTime and workingHours.open/close.
function isShopOpen(open, close) {
  if (
    typeof open !== "string" ||
    typeof close !== "string" ||
    !/^\d{1,2}:\d{2}$/.test(open) ||
    !/^\d{1,2}:\d{2}$/.test(close)
  ) {
    return false;
  }

  const [openHour, openMinute] = open.split(":").map(Number);
  const [closeHour, closeMinute] = close.split(":").map(Number);

  if (
    openHour > 23 ||
    closeHour > 23 ||
    openMinute > 59 ||
    closeMinute > 59
  ) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const openingMinutes = openHour * 60 + openMinute;
  const closingMinutes = closeHour * 60 + closeMinute;

  // Handles normal hours and overnight hours.
  if (openingMinutes <= closingMinutes) {
    return (
      currentMinutes >= openingMinutes &&
      currentMinutes < closingMinutes
    );
  }

  return (
    currentMinutes >= openingMinutes ||
    currentMinutes < closingMinutes
  );
}

// GET /shop/shops
// Public route: return all shops.
router.get("/shops", async (req, res) => {
  try {
    console.log("[GET /shop/shops] Fetching shops");

    const shops = await Shop.find({}).lean();

    const result = shops.map((shop) => {
      const openTime =
        shop.availability?.openTime ||
        shop.workingHours?.open ||
        shop.workingHours?.start ||
        "";

      const closeTime =
        shop.availability?.closeTime ||
        shop.workingHours?.close ||
        shop.workingHours?.end ||
        "";

      return {
        _id: shop._id,
        name: shop.name || "",
        owner_name: shop.owner_name || "",
        location: shop.location || "",
        city: shop.city || "",
        image: shop.image || "",
        phone: shop.phone || "",
        availability: shop.availability || {},
        workingHours: shop.workingHours || {},
        status: isShopOpen(openTime, closeTime) ? "Open" : "Closed",
      };
    });

    console.log(`[GET /shop/shops] Found ${result.length} shops`);

    return res.status(200).json(result);
  } catch (error) {
    console.error("[GET /shop/shops] Failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch shops.",
      // Keep the detailed error in server logs, not the public response.
    });
  }
});

// GET /shop/:id/data
// Fetch one shop and its barbers.
router.get("/:id/data", async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    const barbers = await Barber.find({
      shop: req.params.id,
    }).lean();

    return res.status(200).json({
      shop,
      barbers,
    });
  } catch (error) {
    console.error("[GET /shop/:id/data] Failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch shop details.",
    });
  }
});

// POST /shop/availability
router.post("/availability", auth("shop"), async (req, res) => {
  try {
    const { openTime, closeTime } = req.body;

    if (!openTime || !closeTime) {
      return res.status(400).json({
        success: false,
        message: "Opening and closing times are required.",
      });
    }

    const shop = await Shop.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          "availability.openTime": openTime,
          "availability.closeTime": closeTime,
        },
      },
      { new: true, runValidators: true }
    );

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Availability saved.",
      availability: shop.availability,
    });
  } catch (error) {
    console.error("[POST /shop/availability] Failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save shop availability.",
    });
  }
});

// POST /shop/timing
router.post("/timing", auth("shop"), async (req, res) => {
  try {
    const { open, close, slotDuration } = req.body;

    if (!open || !close) {
      return res.status(400).json({
        success: false,
        message: "Opening and closing times are required.",
      });
    }

    const update = {
      "workingHours.open": open,
      "workingHours.close": close,
    };

    if (slotDuration !== undefined) {
      const duration = Number(slotDuration);

      if (!Number.isFinite(duration) || duration <= 0) {
        return res.status(400).json({
          success: false,
          message: "Slot duration must be a positive number.",
        });
      }

      update.slotDuration = duration;
    }

    const shop = await Shop.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Shop timing updated.",
      workingHours: shop.workingHours,
      slotDuration: shop.slotDuration,
    });
  } catch (error) {
    console.error("[POST /shop/timing] Failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update shop timing.",
    });
  }
});

// PATCH /shop/hours
router.patch("/hours", auth("shop"), async (req, res) => {
  try {
    const { start, end } = req.body;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: "Start and end times are required.",
      });
    }

    const shop = await Shop.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          "workingHours.start": start,
          "workingHours.end": end,
        },
      },
      { new: true, runValidators: true }
    );

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Shop hours updated.",
      workingHours: shop.workingHours,
    });
  } catch (error) {
    console.error("[PATCH /shop/hours] Failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update shop hours.",
    });
  }
});

// GET /shop/profile
router.get("/profile", auth("shop"), async (req, res) => {
  try {
    const shop = await Shop.findById(req.user.id).lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    return res.status(200).json(shop);
  } catch (error) {
    console.error("[GET /shop/profile] Failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch shop profile.",
    });
  }
});

// IMPORTANT: Keep this after the more specific routes.
module.exports = router;