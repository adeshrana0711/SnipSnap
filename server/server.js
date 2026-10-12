
require("dotenv").config();

const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
require("./config/passport");

const Shop = require("./models/Shop");
const Appointment = require("./models/appointment");
const Barber = require("./models/Barber");
const Client = require("./models/Client");

const auth = require("./middlewares/auth");
const upload = require("./middlewares/upload");

const barberRoutes = require("./routes/barberRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const slotRoutes = require("./routes/slots");
const googleAuthRoutes = require("./routes/googleAuth");
const barberLoginRoute = require("./routes/shopLogin");
const clientLoginRoute = require("./routes/LoginClient");
const barberRegisterRoute = require("./routes/regisbarber");
const clientRegisterRoute = require("./routes/regisClient");
const shopRoutes = require("./routes/shop");
const clientBookingsRoute = require("./routes/clientBookings");

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploads are served from this directory when persistent storage exists.
// Vercel's function filesystem is not persistent storage for user uploads.
app.use("/uploads", express.static("public/uploads"));

// Routes
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

app.get("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    path: "/",
  });

  return res.json({ success: true });
});

app.get("/me", async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.json({ loggedIn: false });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        message: "JWT_SECRET is not configured",
      });
    }

    const decoded = jwt.verify(token, secret);

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

app.put("/api/profile", auth("client"), async (req, res) => {
  try {
    const user = await Client.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Client not found" });
    }

    const { name, phone } = req.body;

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    return res.json(user);
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

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

app.get("/shops/:id", async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    return res.json(shop);
  } catch (error) {
    console.error("Get shop error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// JSON response instead of returning the frontend's index.html
app.use((req, res) => {
  return res.status(404).json({
    message: "API route not found",
    path: req.originalUrl,
  });
});

// Connect to MongoDB before serving API requests.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database unavailable:", error.message);
    res.status(503).json({ message: "Database unavailable" });
  }
});

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;

  connectDB()
    .then(() => {
      app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    })
    .catch((error) => {
      console.error("Server startup failed:", error);
      process.exit(1);
    });
}
