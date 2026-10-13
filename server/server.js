
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

// Validate router imports before app.use().
const routesToCheck = {
  barberRoutes,
  appointmentRoutes,
  slotRoutes,
  googleAuthRoutes,
  barberLoginRoute,
  clientLoginRoute,
  barberRegisterRoute,
  clientRegisterRoute,
  shopRoutes,
  clientBookingsRoute,
};

for (const [name, route] of Object.entries(routesToCheck)) {
  const valid =
    typeof route === "function" &&
    Array.isArray(route.stack);

  console.log(
    `[Route check] ${name}: ${valid ? "VALID" : "INVALID"}`
  );

  if (!valid) {
    throw new TypeError(
      `Invalid Express router: ${name}. Check its export and import.`
    );
  }
}

// CORS
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

// Connect to MongoDB before any route that uses the database.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    return next();
  } catch (error) {
    console.error("Database connection error:", error.message);

    return res.status(503).json({
      success: false,
      message: "Database unavailable",
    });
  }
});

// Existing uploads, if present.
// Do not rely on Vercel's filesystem for persistent uploads.
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

// Logout
app.get("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    path: "/",
  });

  return res.json({ success: true });
});

// Login status
app.get("/me", async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.json({ loggedIn: false });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        message: "Authentication configuration error",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
    console.error("Client stats error:", error.message);

    return res.status(500).json({
      message: "Could not load client statistics",
    });
  }
});

// Get client profile
app.get("/api/profile", auth("client"), async (req, res) => {
  try {
    const user = await Client.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    return res.json(user);
  } catch (error) {
    console.error("Get profile error:", error.message);

    return res.status(500).json({
      message: "Could not load profile",
    });
  }
});

// Update client profile
app.put("/api/profile", auth("client"), async (req, res) => {
  try {
    const user = await Client.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    const { name, phone } = req.body;

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    return res.json(user);
  } catch (error) {
    console.error("Update profile error:", error.message);

    return res.status(500).json({
      message: "Could not update profile",
    });
  }
});

// Profile image upload.
// Persistent storage must be configured before enabling this endpoint.
app.post(
  "/api/profile/image",
  auth("client"),
  upload.single("image"),
  async (req, res) => {
    return res.status(501).json({
      message:
        "Profile image uploads require persistent cloud storage configuration.",
    });
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
      return res.status(404).json({
        message: "Barber not found",
      });
    }

    barber.workingHours.start = start;
    barber.workingHours.end = end;

    await barber.save();

    return res.json(barber);
  } catch (error) {
    console.error("Availability update error:", error.message);

    return res.status(500).json({
      message: "Could not update availability",
    });
  }
});

// Get shop by ID
app.get("/shops/:id", async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found",
      });
    }

    return res.json(shop);
  } catch (error) {
    console.error("Get shop error:", error.message);

    return res.status(500).json({
      message: "Could not load shop",
    });
  }
});

// JSON response for unknown routes
app.use((req, res) => {
  return res.status(404).json({
    message: "API route not found",
    path: req.originalUrl,
  });
});

// Return JSON for unexpected route errors
app.use((err, req, res, next) => {
  console.error("Unhandled Express error:", err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    message: "Internal server error",
  });
});

module.exports = app;

// Local development only.
if (require.main === module) {
  const port = process.env.PORT || 3000;

  connectDB()
    .then(() => {
      app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
      });
    })
    .catch((error) => {
      console.error("Server startup failed:", error);
      process.exit(1);
    });
}
