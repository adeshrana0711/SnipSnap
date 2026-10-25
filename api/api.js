const app = require("../server/server.js");

module.exports = (req, res) => {
  try {
    const incomingUrl = req.url || "/";
    const parsedUrl = new URL(incomingUrl, "http://localhost");

    let pathname = parsedUrl.pathname;

    // Remove the API prefix if Vercel passes it to the function.
    if (pathname === "/api") {
      pathname = "/";
    } else if (pathname.startsWith("/api/")) {
      pathname = pathname.substring(4);
    }

    const queryString = parsedUrl.searchParams.toString();

    req.url = pathname + (queryString ? `?${queryString}` : "");

    console.log("Incoming Vercel URL:", incomingUrl);
    console.log("Forwarding to Express:", req.method, req.url);

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );

    return app(req, res);
  } catch (error) {
    console.error("Vercel API handler error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};
