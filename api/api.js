const app = require("../server/server.js");

module.exports = (req, res) => {
  try {
    const incomingUrl = req.url || "/";

    console.log("Incoming Vercel URL:", incomingUrl);

    // Vercel may supply a path query parameter when rewriting.
    const parsedUrl = new URL(incomingUrl, "http://localhost");

    let pathname = parsedUrl.pathname;

    // Remove the /api prefix only once.
    if (pathname === "/api") {
      pathname = "/";
    } else if (pathname.startsWith("/api/")) {
      pathname = pathname.substring(4);
    }

    // Remove the internal routing query parameter.
    parsedUrl.searchParams.delete("path");

    const queryString = parsedUrl.searchParams.toString();
    req.url = pathname + (queryString ? `?${queryString}` : "");

    console.log("Forwarding to Express:", req.method, req.url);

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
