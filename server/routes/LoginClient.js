
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Client = require("../models/Client");

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    const client = await Client.findOne({
      email: email.trim().toLowerCase(),
      password,
    });

    if (!client) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: client._id,
        email: client.email,
        role: "client",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Client login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed due to a server error",
    });
  }
});

module.exports = router;
