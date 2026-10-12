
const express = require("express");
const router = express.Router();
const Shop = require("../models/Shop");
const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG and WEBP images are allowed"));
    }

    cb(null, true);
  },
});

router.post(
  "/registration",
  upload.single("shopImage"),
  async (req, res) => {
    try {
      const {
        name,
        owner_name,
        email,
        phone,
        password,
        location,
        city,
        latitude,
        longitude,
      } = req.body;

      if (
        !name ||
        !email ||
        !password ||
        !location ||
        !city ||
        latitude === undefined ||
        longitude === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide shop name, email, password, full address, city, latitude and longitude.",
        });
      }

      const lat = Number(latitude);
      const lng = Number(longitude);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid shop coordinates.",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existingShop = await Shop.findOne({
        email: normalizedEmail,
      });

      if (existingShop) {
        return res.status(409).json({
          success: false,
          message: "Shop already registered with this email",
        });
      }

      // Image bytes are in req.file.buffer.
      // Upload them to persistent cloud storage before saving an image URL.
      // Do not save a local /uploads path on Vercel.
      const imagePath = "";

      const newShop = new Shop({
        name: name.trim(),
        owner_name,
        email: normalizedEmail,
        phone,
        password,
        location: location.trim(),
        city: city.trim(),
        coordinates: {
          type: "Point",
          coordinates: [lng, lat],
        },
        image: imagePath,
      });

      await newShop.save();

      return res.status(201).json({
        success: true,
        message: "Shop registered successfully",
        shopId: newShop._id,
      });
    } catch (err) {
      console.error("Shop registration error:", err);

      return res.status(500).json({
        success: false,
        message: "Server error during shop registration",
        error:
          process.env.NODE_ENV === "development"
            ? err.message
            : undefined,
      });
    }
  }
);

module.exports = router;
