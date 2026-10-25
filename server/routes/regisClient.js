const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Client = require("../models/Client");

// Test endpoint: GET /client/registration-test
router.get("/registration-test", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Client registration route is working.",
  });
});

// POST /client/registration
router.post("/registration", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    // Validate input
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, valid email, and password of at least 8 characters are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for existing account
    const existingClient = await Client.findOne({
      email: normalizedEmail,
    });

    if (existingClient) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create client
    const newClient = new Client({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    await newClient.save();

    return res.status(201).json({
      success: true,
      message: "Registration successful. You can now log in.",
    });
  } catch (error) {
    console.error("Client registration failed:", {
      message: error.message,
      code: error.code,
      name: error.name,
    });

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error during client registration.",
    });
  }
});

module.exports = router;