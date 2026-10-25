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
const cloudinary = require("./config/cloudinary");

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

// Check that imported route modules are valid Express routers.
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
  if (typeof route !== "function" || !Array.isArray(route.stack)) {
    throw new TypeError(
      `Invalid Express router: ${name}. Check its import and export.`
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
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SnipSnap backend is running",
  });
});

// Database connection
app.use(async (req, res, next) => {
  if (req.path === "/health") {
    return next();
  }

  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection error:", error.message);

    return res.status(503).json({
      success: false,
      message: "Database unavailable",
    });
  }
});

// Static uploads are not persistent on Vercel.
// Store production images using Cloudinary instead.
app.use("/uploads", express.static("public/uploads"));

// --------------------------------------------------
// BARBER ROUTES
// --------------------------------------------------

app.use("/api/barbers", barberRoutes);
app.use("/barbers", barberRoutes);

// --------------------------------------------------
// SHOP ROUTES
// --------------------------------------------------

// Both URL formats are supported.
app.use("/api/shop", shopRoutes);
app.use("/api/shop", barberLoginRoute);
app.use("/api/shop", barberRegisterRoute);

app.use("/shop", shopRoutes);
app.use("/shop", barberLoginRoute);
app.use("/shop", barberRegisterRoute);

// --------------------------------------------------
// CLIENT REGISTRATION AND LOGIN
// --------------------------------------------------

// These mounts support requests with and without /api.
app.use("/api/client", clientLoginRoute);
app.use("/api/client", clientRegisterRoute);

app.use("/client", clientLoginRoute);
app.use("/client", clientRegisterRoute);

// --------------------------------------------------
// APPOINTMENTS AND BOOKINGS
// --------------------------------------------------

app.use("/api/appointment", appointmentRoutes);
app.use("/appointment", appointmentRoutes);

app.use("/api/client/bookings", clientBookingsRoute);
app.use("/client/bookings", clientBookingsRoute);

// Slot routes
app.use("/api", slotRoutes);

// --------------------------------------------------
// GOOGLE AUTHENTICATION
// --------------------------------------------------

app.use("/auth", googleAuthRoutes);

// --------------------------------------------------
// LOGOUT
// --------------------------------------------------

app.get("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  return res.json({
    success: true,
    message: "Logged out successfully",
  });
});

// --------------------------------------------------
// LOGIN STATUS
// --------------------------------------------------

app.get("/me", (req, res) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );

  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(200).json({
        loggedIn: false,
        role: null,
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return res.status(200).json({
      loggedIn: true,
      role: decoded.role,
      id: decoded.id,
    });
  } catch (error) {
    return res.status(200).json({
      loggedIn: false,
      role: null,
    });
  }
});

// --------------------------------------------------
// CLIENT STATISTICS
// --------------------------------------------------

app.get("/client/stats", auth("client"), async (req, res) => {
  try {
    const booking = await Appointment.countDocuments({
      client: req.user.id,
    });

    return res.json({ booking });
  } catch (error) {
    console.error("Client stats error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load client statistics",
    });
  }
});

// --------------------------------------------------
// CLIENT PROFILE
// --------------------------------------------------

async function getClientProfile(req, res) {
  try {
    const user = await Client.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    return res.json(user);
  } catch (error) {
    console.error("Get profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load profile",
    });
  }
}

app.get("/api/profile", auth("client"), getClientProfile);
app.get("/profile", auth("client"), getClientProfile);

// --------------------------------------------------
// UPDATE CLIENT PROFILE
// --------------------------------------------------

async function updateClientProfile(req, res) {
  try {
    const user = await Client.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const { name, phone } = req.body;

    if (name !== undefined) {
      user.name = name;
    }

    if (phone !== undefined) {
      user.phone = phone;
    }

    await user.save();

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update profile",
    });
  }
}

app.put("/api/profile", auth("client"), updateClientProfile);
app.put("/profile", auth("client"), updateClientProfile);

// --------------------------------------------------
// CLIENT PROFILE IMAGE UPLOAD
// --------------------------------------------------

async function uploadClientProfileImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image.",
      });
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Only JPG, PNG and WEBP images are allowed.",
      });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "snipsnap/clients",
          resource_type: "image",
        },
        (error, uploadedImage) => {
          if (error) {
            return reject(error);
          }

          resolve(uploadedImage);
        }
      );

      stream.on("error", reject);
      stream.end(req.file.buffer);
    });

    const user = await Client.findByIdAndUpdate(
      req.user.id,
      { image: result.secure_url },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    return res.json({
      success: true,
      message: "Profile image updated.",
      image: user.image,
    });
  } catch (error) {
    console.error("Profile image upload failed:", {
      message: error.message,
      http_code: error.http_code,
    });

    return res.status(500).json({
      success: false,
      message: "Could not upload profile image.",
    });
  }
}

app.post(
  "/api/profile/image",
  auth("client"),
  upload.single("image"),
  uploadClientProfileImage
);

app.post(
  "/profile/image",
  auth("client"),
  upload.single("image"),
  uploadClientProfileImage
);

// --------------------------------------------------
// UPDATE BARBER AVAILABILITY
// --------------------------------------------------

async function updateBarberAvailability(req, res) {
  try {
    const { start, end } = req.body;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: "Start and end times are required.",
      });
    }

    const barber = await Barber.findOne({
      _id: req.params.id,
      shop: req.user.id,
    });

    if (!barber) {
      return res.status(404).json({
        success: false,
        message: "Barber not found",
      });
    }

    if (!barber.workingHours) {
      barber.workingHours = {};
    }

    barber.workingHours.start = start;
    barber.workingHours.end = end;

    await barber.save();

    return res.json({
      success: true,
      message: "Barber availability updated.",
      barber,
    });
  } catch (error) {
    console.error("Availability update error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update availability",
    });
  }
}

app.patch(
  "/availability/:id",
  auth("shop"),
  updateBarberAvailability
);

// --------------------------------------------------
// GET SHOP BY ID
// --------------------------------------------------

async function getShopById(req, res) {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    return res.json(shop);
  } catch (error) {
    console.error("Get shop error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load shop",
    });
  }
}

app.get("/shops/:id", getShopById);
app.get("/api/shops/:id", getShopById);

// --------------------------------------------------
// UNKNOWN ROUTES
// --------------------------------------------------

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

// --------------------------------------------------
// CENTRAL ERROR HANDLER
// --------------------------------------------------

app.use((err, req, res, next) => {
  console.error("Unhandled Express error:", err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Export the Express application for Vercel.
module.exports = app;

// Start a persistent server only during local development.
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
