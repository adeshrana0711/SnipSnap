const express = require("express");
const router = express.Router();

const Shop = require("../models/Shop");
const Barber = require("../models/Barber");
const auth = require("../middlewares/auth");

// --------------------------------------------------
// CHECK WHETHER A SHOP IS OPEN
// --------------------------------------------------
function isShopOpen(open, close) {
  if (!open || !close) {
    return false;
  }

  const timePattern = /^([01]?\d|2[0-3]):([0-5]\d)$/;

  if (
    !timePattern.test(String(open)) ||
    !timePattern.test(String(close))
  ) {
    return false;
  }

  const [openHour, openMinute] = open.split(":").map(Number);
  const [closeHour, closeMinute] = close.split(":").map(Number);

  const now = new Date();

  const currentMinutes =
    now.getHours() * 60 + now.getMinutes();

  const openMinutes =
    openHour * 60 + openMinute;

  const closeMinutes =
    closeHour * 60 + closeMinute;

  // Same opening and closing time means closed all day.
  if (openMinutes === closeMinutes) {
    return false;
  }

  // Normal opening hours, e.g. 09:00 to 21:00.
  if (openMinutes < closeMinutes) {
    return (
      currentMinutes >= openMinutes &&
      currentMinutes < closeMinutes
    );
  }

  // Overnight opening hours, e.g. 20:00 to 02:00.
  return (
    currentMinutes >= openMinutes ||
    currentMinutes < closeMinutes
  );
}

// --------------------------------------------------
// GET ALL SHOPS
// GET /shop/shops
// Also supports GET /api/shop/shops
// --------------------------------------------------
router.get("/shops", async (req, res) => {
  try {
    console.log("[GET /shop/shops] Fetching shops...");

    const shops = await Shop.find({}).lean();

    const formattedShops = shops.map((shop) => {
      const openTime =
        shop.availability?.openTime ||
        shop.workingHours?.open ||
        "";

      const closeTime =
        shop.availability?.closeTime ||
        shop.workingHours?.close ||
        "";

      return {
        ...shop,

        status: isShopOpen(openTime, closeTime)
          ? "Open"
          : "Closed",
      };
    });

    console.log(
      `[GET /shop/shops] Successfully fetched ${formattedShops.length} shops.`
    );

    return res.status(200).json(formattedShops);
  } catch (error) {
    // Detailed server logs help identify the real cause of a 500.
    console.error("[GET /shop/shops] Failed:", {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to fetch shops.",
    });
  }
});

// --------------------------------------------------
// GET SHOP DATA AND ITS BARBERS
// GET /shop/:id/data
// --------------------------------------------------
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
      shop: shop._id,
    }).lean();

    return res.status(200).json({
      success: true,
      shop,
      barbers,
    });
  } catch (error) {
    console.error("[GET /shop/:id/data] Failed:", {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to fetch shop data.",
    });
  }
});

// --------------------------------------------------
// UPDATE SHOP AVAILABILITY
// POST /shop/availability
// --------------------------------------------------
router.post("/availability", auth("shop"), async (req, res) => {
  try {
    const { openTime, closeTime } = req.body;

    const timePattern = /^([01]?\d|2[0-3]):([0-5]\d)$/;

    if (
      typeof openTime !== "string" ||
      typeof closeTime !== "string" ||
      !timePattern.test(openTime) ||
      !timePattern.test(closeTime)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid opening and closing times are required.",
      });
    }

    const shop = await Shop.findById(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    shop.availability = {
      ...(shop.availability?.toObject?.() ||
        shop.availability ||
        {}),
      openTime,
      closeTime,
    };

    await shop.save();

    return res.status(200).json({
      success: true,
      message: "Shop availability updated successfully.",
      availability: shop.availability,
    });
  } catch (error) {
    console.error("[POST /shop/availability] Failed:", {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to update shop availability.",
    });
  }
});

// --------------------------------------------------
// UPDATE SHOP WORKING HOURS
// POST /shop/timing
// --------------------------------------------------
router.post("/timing", auth("shop"), async (req, res) => {
  try {
    const { open, close, slotDuration } = req.body;

    const timePattern = /^([01]?\d|2[0-3]):([0-5]\d)$/;

    if (
      typeof open !== "string" ||
      typeof close !== "string" ||
      !timePattern.test(open) ||
      !timePattern.test(close)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid opening and closing times are required.",
      });
    }

    if (
      slotDuration !== undefined &&
      (!Number.isInteger(Number(slotDuration)) ||
        Number(slotDuration) <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Slot duration must be a positive number.",
      });
    }

    const shop = await Shop.findById(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    shop.workingHours = {
      ...(shop.workingHours?.toObject?.() ||
        shop.workingHours ||
        {}),
      open,
      close,
    };

    if (slotDuration !== undefined) {
      shop.slotDuration = Number(slotDuration);
    }

    await shop.save();

    return res.status(200).json({
      success: true,
      message: "Shop working hours updated successfully.",
      workingHours: shop.workingHours,
      slotDuration: shop.slotDuration,
    });
  } catch (error) {
    console.error("[POST /shop/timing] Failed:", {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to update shop working hours.",
    });
  }
});

// --------------------------------------------------
// UPDATE WORKING HOURS USING START AND END
// PATCH /shop/hours
// --------------------------------------------------
router.patch("/hours", auth("shop"), async (req, res) => {
  try {
    const { start, end } = req.body;

    const timePattern = /^([01]?\d|2[0-3]):([0-5]\d)$/;

    if (
      typeof start !== "string" ||
      typeof end !== "string" ||
      !timePattern.test(start) ||
      !timePattern.test(end)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid start and end times are required.",
      });
    }

    const shop = await Shop.findById(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    shop.workingHours = {
      ...(shop.workingHours?.toObject?.() ||
        shop.workingHours ||
        {}),
      start,
      end,
    };

    await shop.save();

    return res.status(200).json({
      success: true,
      message: "Working hours updated successfully.",
      workingHours: shop.workingHours,
    });
  } catch (error) {
    console.error("[PATCH /shop/hours] Failed:", {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to update working hours.",
    });
  }
});

// --------------------------------------------------
// GET SHOP PROFILE
// GET /shop/profile
// --------------------------------------------------
router.get("/profile", auth("shop"), async (req, res) => {
  try {
    const shop = await Shop.findById(req.user.id).lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    return res.status(200).json({
      success: true,
      shop,
    });
  } catch (error) {
    console.error("[GET /shop/profile] Failed:", {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to fetch shop profile.",
    });
  }
});

module.exports = router;