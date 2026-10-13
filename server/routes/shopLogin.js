
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Shop = require("../models/Shop");

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
    }

    const shopName = await Shop.findOne({ email });

    if (!shopName || shopName.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: shopName._id.toString(),
        role: "shop",
        email: shopName.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Shop login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
