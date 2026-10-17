
const app = require("../server/server.js");

module.exports = (req, res) => {
  try {
    const originalUrl = req.url || "/";
    const pathname = originalUrl.split("?")[0];

    // Remove the /api prefix before forwarding to Express.
    // Example: /api/shop/registration -> /shop/registration
    // Express has routes mounted at /shop and /client.
    if (/^\/api(?:\/|$)/.test(pathname)) {
      req.url = originalUrl.replace(/^\/api(?=\/|$)/, "") || "/";
    }

    // Prevent caching of API responses.
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return app(req, res);
  } catch (error) {
    console.error("Vercel API handler error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};
