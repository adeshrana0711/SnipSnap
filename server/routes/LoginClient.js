const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Client = require("../models/Client");

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // Validate input
    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Ensure JWT secret exists
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing");

      return res.status(500).json({
        success: false,
        message: "Server configuration error.",
      });
    }

    // Find the client using their normalized email
    const normalizedEmail = email.trim().toLowerCase();

    const client = await Client.findOne({
      email: normalizedEmail,
    });

    // Avoid revealing whether an email is registered
    if (!client) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Compare the submitted password with the stored bcrypt hash
    const passwordMatches = await bcrypt.compare(
      password,
      client.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate authentication token
    const token = jwt.sign(
      {
        id: client._id.toString(),
        email: client.email,
        role: "client",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    // Set authentication cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
    });
  } catch (error) {
    console.error("Client login error:", {
      message: error.message,
      name: error.name,
    });

    return res.status(500).json({
      success: false,
      message: "Login failed due to a server error.",
    });
  }
});

module.exports = router;
