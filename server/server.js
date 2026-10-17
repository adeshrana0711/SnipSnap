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

// Validate Express router imports.
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

// Health check: does not require MongoDB.
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SnipSnap backend is running",
  });
});

// Connect to MongoDB for database-backed requests.
app.use(async (req, res, next) => {
  if (req.path === "/health") {
    return next();
  }

  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(503).json({
      success: false,
      message: "Database unavailable",
    });
  }
});

// Static uploads are not persistent on Vercel.
// Use Cloudinary for production uploads.
app.use("/uploads", express.static("public/uploads"));

// Main routes
app.use("/api/barbers", barberRoutes);

// Support both /api/shop/... and /shop/... paths.
app.use("/api/shop", shopRoutes);
app.use("/api/shop", barberLoginRoute);
app.use("/api/shop", barberRegisterRoute);
app.use("/shop", shopRoutes);
app.use("/api/shop", shopRoutes);

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

  res.json({ success: true });
});

// Login status
app.get("/me", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
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
// Client statistics
app.get("/client/stats", auth("client"), async (req, res) => {
  try {
    const booking = await Appointment.countDocuments({
      client: req.user.id,
    });

    res.json({ booking });
  } catch (error) {
    console.error("Client stats error:", error);

    res.status(500).json({
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

    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);

    res.status(500).json({
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

    res.json(user);
  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      message: "Could not update profile",
    });
  }
});

// Upload client profile image to Cloudinary
app.post(
  "/api/profile/image",
  auth("client"),
  upload.single("image"),
  async (req, res) => {
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
            if (error) return reject(error);
            resolve(uploadedImage);
          }
        );

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

      res.json({
        success: true,
        message: "Profile image updated.",
        image: user.image,
      });
    } catch (error) {
      console.error("Profile image upload failed:", error);

      res.status(500).json({
        success: false,
        message: "Could not upload profile image.",
      });
    }
  }
);

// Update barber availability
app.patch(
  "/availability/:id",
  auth("shop"),
  async (req, res) => {
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

      res.json(barber);
    } catch (error) {
      console.error("Availability update error:", error);

      res.status(500).json({
        message: "Could not update availability",
      });
    }
  }
);

// Get shop by ID
app.get("/shops/:id", async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found",
      });
    }

    res.json(shop);
  } catch (error) {
    console.error("Get shop error:", error);

    res.status(500).json({
      message: "Could not load shop",
    });
  }
});

// Unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: "API route not found",
    path: req.originalUrl,
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error("Unhandled Express error:", err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    message: "Internal server error",
  });
});

// Export app for Vercel.
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
module.exports = app;