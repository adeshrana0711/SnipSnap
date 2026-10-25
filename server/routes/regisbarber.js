const express = require("express");
const router = express.Router();
const multer = require("multer");
const Shop = require("../models/Shop");
const cloudinary = require("../config/cloudinary");

// ============================================
// MULTER CONFIGURATION
// ============================================
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // Maximum 5 MB
    files: 1,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg", // JPG and JPEG
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Invalid image format. Please upload a JPG, JPEG, PNG, or WEBP image."
        )
      );
    }

    cb(null, true);
  },
});

// ============================================
// CLOUDINARY IMAGE UPLOAD
// ============================================
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET) {
      return reject(
        new Error("Cloudinary environment variables are missing.")
      );
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "snipsnap/shops",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload failed:", {
            name: error.name,
            message: error.message,
            http_code: error.http_code,
            error: error.error,
          });

          return reject(error);
        }

        if (!result || !result.secure_url) {
          return reject(
            new Error("Cloudinary did not return a valid image URL.")
          );
        }

        resolve(result);
      }
    );

    stream.on("error", reject);
    stream.end(buffer);
  });
}

// ============================================
// PHOTO UPLOAD MIDDLEWARE
// ============================================
function handleShopPhoto(req, res, next) {
  upload.single("shopImage")(req, res, (error) => {
    if (!error) {
      return next();
    }

    console.error("Shop photo upload validation failed:", {
      name: error.name,
      message: error.message,
      code: error.code,
    });

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Shop photo must be 5 MB or smaller.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Unable to process the uploaded shop photo.",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Invalid shop photo.",
    });
  });
}

// ============================================
// POST /registration
// Mounted through /api/shop or /shop
// ============================================
router.post(
  "/registration",
  handleShopPhoto,
  async (req, res) => {
    try {
      // ----------------------------------------
      // 1. READ FORM DATA
      // ----------------------------------------
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

      // ----------------------------------------
      // 2. VALIDATE REQUIRED FIELDS
      // ----------------------------------------
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
        !city.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide the shop name, email, password, full address, and city.",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must contain at least 8 characters.",
        });
      }

      // Require the shop photo.
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please upload a shop photo.",
        });
      }

      // ----------------------------------------
      // 3. VALIDATE COORDINATES
      // ----------------------------------------
      if (
        latitude === undefined ||
        latitude === "" ||
        longitude === undefined ||
        longitude === ""
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide the shop's latitude and longitude.",
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

      // ----------------------------------------
      // 4. NORMALIZE EMAIL
      // ----------------------------------------
      const normalizedEmail = email.trim().toLowerCase();

      // ----------------------------------------
      // 5. CHECK FOR DUPLICATE EMAIL
      // ----------------------------------------
      const existingShop = await Shop.findOne({
        email: normalizedEmail,
      });

      if (existingShop) {
        return res.status(409).json({
          success: false,
          message: "A shop is already registered with this email.",
        });
      }

      // ----------------------------------------
      // 6. UPLOAD PHOTO TO CLOUDINARY
      // ----------------------------------------
      let imagePath;

      try {
        const result = await uploadToCloudinary(req.file.buffer);
        imagePath = result.secure_url;

        console.log("Shop image uploaded successfully:", {
          public_id: result.public_id,
          format: result.format,
        });
      } catch (error) {
        console.error("Shop image upload failed:", {
          name: error.name,
          message: error.message,
          http_code: error.http_code,
        });

        if (error.http_code === 403) {
          return res.status(502).json({
            success: false,
            message:
              "Cloudinary rejected the image upload. Check the API key, secret, and upload permissions in your deployment settings.",
          });
        }

        if (error.http_code === 401) {
          return res.status(502).json({
            success: false,
            message:
              "Cloudinary authentication failed. Check your deployment credentials.",
          });
        }

        return res.status(502).json({
          success: false,
          message:
            "Unable to upload the shop photo. Please try again later.",
        });
      }

      // ----------------------------------------
      // 7. CREATE SHOP DOCUMENT
      // ----------------------------------------
      const newShop = new Shop({
        name: name.trim(),

        owner_name:
          typeof owner_name === "string"
            ? owner_name.trim()
            : "",

        email: normalizedEmail,

        phone:
          typeof phone === "string"
            ? phone.trim()
            : "",

        // Keep the password handling consistent with your
        // existing login system. See the security note below.
        password,

        location: location.trim(),
        city: city.trim(),

        coordinates: {
          type: "Point",
          coordinates: [lng, lat],
        },

        image: imagePath,
      });

      // ----------------------------------------
      // 8. SAVE TO MONGODB
      // ----------------------------------------
      await newShop.save();

      // ----------------------------------------
      // 9. SEND SUCCESS RESPONSE
      // ----------------------------------------
      return res.status(201).json({
        success: true,
        message: "Shop registered successfully.",
        shopId: newShop._id,
        image: newShop.image,
      });
    } catch (error) {
      // ----------------------------------------
      // ERROR HANDLING
      // ----------------------------------------
      console.error("Shop registration failed:", {
        name: error.name,
        message: error.message,
        code: error.code,
        http_code: error.http_code,
      });

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "A shop is already registered with this email.",
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Shop details failed database validation.",
          details: Object.values(error.errors || {}).map(
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
