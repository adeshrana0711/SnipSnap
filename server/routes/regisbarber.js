const express = require("express");
const router = express.Router();
const Shop = require("../models/Shop");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG, PNG and WEBP images are allowed")
      );
    }

    cb(null, true);
  },
});

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "snipsnap/shops",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

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

      let imagePath = "";

      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer);
        imagePath = result.secure_url;
      }

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
        image: newShop.image,
      });
    } catch (err) {
      console.error("Shop registration error:", err.message);

      return res.status(500).json({
        success: false,
        message: "Server error during shop registration",
      });
    }
  }
);

module.exports = router;
