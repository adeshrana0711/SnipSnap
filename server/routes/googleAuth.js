const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const router = express.Router();

router.get("/google",passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get("/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:5173/client/login",
    session: false,
  }),
  async (req, res) => {
    try {
      const user = req.user;

      const token = jwt.sign({
          id:user._id,
          role:"client",
        },
        process.env.JWT_SECRET || "SECRET_KEY",
        { expiresIn: "5m" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 5 * 60 * 1000,
      });

      return res.redirect("http://localhost:5173/");
    } catch (error) {
      console.error("Google login callback error:", error);
      return res.redirect("http://localhost:5173/client/login");
    }
  }
);

module.exports = router;