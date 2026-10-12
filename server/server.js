require("dotenv").config();

const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const Shop = require("./models/Shop");
const Appointment = require("./models/appointment");
const Barber = require("./models/Barber");
const Client = require("./models/Client");

const barberRoutes = require("./routes/barberRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const slotRoutes = require("./routes/slots");
const googleAuthRoutes = require("./routes/googleAuth");

require("./config/db");
require("./config/passport");

const auth = require("./middlewares/auth");
const barberLoginRoute = require("./routes/shopLogin");
const clientLoginRoute = require("./routes/LoginClient");
const barberRegisterRoute = require("./routes/regisbarber");
const clientRegisterRoute = require("./routes/regisClient");
const shopRoutes = require("./routes/shop");
const clientBookingsRoute = require("./routes/clientBookings");
const upload = require("./middlewares/upload");

const app = express();

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (useful when running locally)
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// API routes
app.use("/api/barbers", barberRoutes);
app.use("/api/shop", barberLoginRoute);
app.use("/api/shop", barberRegisterRoute);

app.use("/shop", shopRoutes);

app.use("/client", clientLoginRoute);
app.use("/client", clientRegisterRoute);

app.use("/appointment", appointmentRoutes);
app.use("/client/bookings", clientBookingsRoute);

app.use("/api", slotRoutes);
app.use("/auth", googleAuthRoutes);

// Logout
app.get("/logout", (req, res) => {
  res.clearCookie("token");

  if (req.accepts("json") && !req.accepts("html")) {
    return res.json({ success: true });
  }

  return res.redirect("/");
});

// Check login status
app.get("/me", async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.json({ loggedIn: false });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "SECRET_KEY"
    );

    let user = null;

    if (decoded.role === "client") {
      user = await Client.findById(decoded.id);
    } else if (decoded.role === "shop") {
      user = await Shop.findById(decoded.id);
    }

    if (!user) {
      return res.json({ loggedIn: false });
    }

    return res.json({
      loggedIn: true,
      role: decoded.role,
      name: user.name,
      email: user.email,
      wallet: user.wallet || 0,
      image: user.image || null,
    });
  } catch (error) {
    console.error("Login status error:", error.message);
    return res.json({ loggedIn: false });
  }
});

// Client statistics
app.get("/client/stats", auth("client"), async (req, res) => {
  try {
    const booking = await Appointment.countDocuments({
      client: req.user.id,
    });

    return res.json({ booking });
  } catch (error) {
    console.error("Client stats error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get client profile
app.get("/api/profile", auth("client"), async (req, res) => {
  try {
    const user = await Client.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Client not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update client profile
app.put("/api/profile", auth("client"), async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await Client.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Client not found" });
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    return res.json(user);
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Upload client profile image
app.post(
  "/api/profile/image",
  auth("client"),
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      const user = await Client.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: "Client not found" });
      }

      user.image = "/uploads/users/" + req.file.filename;
      await user.save();

      return res.json({ image: user.image });
    } catch (error) {
      console.error("Profile image error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// Update barber availability
app.patch("/availability/:id", auth("shop"), async (req, res) => {
  try {
    const { start, end } = req.body;

    const barber = await Barber.findOne({
      _id: req.params.id,
      shop: req.user.id,
    });

    if (!barber) {
      return res.status(404).json({ message: "Barber not found" });
    }

    barber.workingHours.start = start;
    barber.workingHours.end = end;

    await barber.save();

    return res.json(barber);
  } catch (error) {
    console.error("Availability update error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get shop by ID
app.get("/shops/:id", async (req, res) => {
  try {
    const shopData = await Shop.findById(req.params.id);

    if (!shopData) {
      return res.status(404).json({ message: "Shop not found" });
    }

    return res.json(shopData);
  } catch (error) {
    console.error("Get shop error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// API fallback: do not return index.html for missing API routes
app.use((req, res) => {
  return res.status(404).json({
    message: "API route not found",
    path: req.originalUrl,
  });
});

// Export for Vercel
module.exports = app;

// Run locally using: node server.js
if (require.main === module) {
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
