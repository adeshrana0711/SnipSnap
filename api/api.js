const app = require("../server/server.js");

module.exports = (req, res) => {
  try {
    const incomingUrl = req.url || "/";

    console.log("Incoming Vercel URL:", incomingUrl);

    // Extract the pathname, excluding query parameters.
    let pathname;

    try {
      pathname = new URL(incomingUrl, "http://localhost").pathname;
    } catch {
      pathname = incomingUrl.split("?")[0];
    }

    // Remove /api only when it is a leading path segment.
    if (/^\/api(?:\/|$)/.test(pathname)) {
      pathname = pathname.replace(/^\/api(?=\/|$)/, "") || "/";
    }

    // Preserve the original query string.
    const queryIndex = incomingUrl.indexOf("?");
    const queryString =
      queryIndex >= 0 ? incomingUrl.substring(queryIndex) : "";

    req.url = pathname + queryString;

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
