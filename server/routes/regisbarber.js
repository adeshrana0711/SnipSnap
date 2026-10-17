
const express = require("express");
const router = express.Router();
const multer = require("multer");
const Shop = require("../models/Shop");
const cloudinary = require("../config/cloudinary");

// Accept shop photos in memory for Cloudinary uploads.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG, PNG and WEBP images are allowed.")
      );
    }

    cb(null, true);
  },
});

// Upload an image buffer to Cloudinary.
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "snipsnap/shops",
        resource_type: "image",
      },
      (err, result) => {
        if (err) {
          console.error("Cloudinary upload failed:", {
            name: err.name,
            message: err.message,
            http_code: err.http_code,
          });

          return reject(err);
        }

        if (!result || !result.secure_url) {
          return reject(
            new Error("Cloudinary did not return an image URL.")
          );
        }

        resolve(result);
      }
    );

    stream.on("error", reject);
    stream.end(buffer);
  });
}

// POST /api/shop/registration
router.post(
  "/registration",
  (req, res, next) => {
    upload.single("shopImage")(req, res, (err) => {
      if (!err) return next();

      console.error("Shop photo validation failed:", {
        name: err.name,
        message: err.message,
        code: err.code,
      });

      if (err instanceof multer.MulterError) {
        const message =
          err.code === "LIMIT_FILE_SIZE"
            ? "Shop photo must be 5 MB or smaller."
            : "Shop photo upload failed.";

        return res.status(400).json({
          success: false,
          message,
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || "Invalid shop photo.",
      });
    });
  },
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
      } = req.body || {};

      // Validate required fields.
      if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof email !== "string" ||
        !email.trim() ||
        typeof password !== "string" ||
        !password ||
        typeof location !== "string" ||
        !location.trim() ||
        typeof city !== "string" ||
        !city.trim() ||
        latitude === undefined ||
        latitude === "" ||
        longitude === undefined ||
        longitude === ""
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

      // Check for an existing shop account.
      const existingShop = await Shop.findOne({
        email: normalizedEmail,
      });

      if (existingShop) {
        return res.status(409).json({
          success: false,
          message: "Shop already registered with this email.",
        });
      }

      // Upload the selected photo, if provided.
      let imagePath = "";

      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer);
        imagePath = result.secure_url;
      }

      // Save the new shop.
      const newShop = new Shop({
        name: name.trim(),
        owner_name:
          typeof owner_name === "string" ? owner_name.trim() : "",
        email: normalizedEmail,
        phone: typeof phone === "string" ? phone.trim() : "",
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
        message: "Shop registered successfully.",
        shopId: newShop._id,
        image: newShop.image,
      });
    } catch (err) {
      // Log the actual error for diagnosis in Vercel runtime logs.
      console.error("Shop registration failed:", {
        name: err.name,
        message: err.message,
        http_code: err.http_code,
        code: err.code,
        stack: err.stack,
      });

      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "A shop with this email already exists.",
        });
      }

      if (err.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Shop details failed database validation.",
          details: Object.values(err.errors || {}).map(
            (item) => item.message
          ),
        });
      }

      return res.status(500).json({
        success: false,
        message: "Server error during shop registration.",
      });
    }
  }
);

module.exports = router;
