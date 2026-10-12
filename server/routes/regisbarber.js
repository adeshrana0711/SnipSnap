
const express = require("express");
const router = express.Router();
const Shop = require("../models/Shop");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(
  process.cwd(),
  "public",
  "uploads",
  "shops"
);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() + path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

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

      const existingShop = await Shop.findOne({
        email: email.trim().toLowerCase(),
      });

      if (existingShop) {
        return res.status(409).json({
          success: false,
          message: "Shop already registered with this email",
        });
      }

      const imagePath = req.file
        ? "/uploads/shops/" + req.file.filename
        : "";

      const newShop = new Shop({
        name: name.trim(),
        owner_name,
        email: email.trim().toLowerCase(),
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
