const app = require("../server/server.js");

module.exports = (req, res) => {
  try {
    const incomingUrl = req.url || "/";
    const parsedUrl = new URL(incomingUrl, "http://localhost");

    let pathname = parsedUrl.pathname;

    // Vercel may route /api/api/client/... to this function.
    // Remove the function-routing prefix and normalize the path.
    while (pathname.startsWith("/api/")) {
      pathname = pathname.substring(4);
    }

    if (pathname === "/api") {
      pathname = "/";
    }

    const query = parsedUrl.searchParams;
    query.delete("path");

    const queryString = query.toString();
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
        message: "Internal server error",
      });
    }
  }
};
