const app = require("../server/server.js");

module.exports = (req, res) => {
  console.log("[API DEBUG]", {
    url: req.url,
    originalUrl: req.originalUrl,
    method: req.method,
  });

  const originalUrl = req.url || "/";
  const pathname = originalUrl.split("?")[0];

  const preserveApiPrefix = [
    /^\/api\/barbers(?:\/|$)/,
    /^\/api\/profile(?:\/|$)/,
    /^\/api\/shop(?:\/|$)/,
  ].some((pattern) => pattern.test(pathname));

  if (!preserveApiPrefix && /^\/api(?:\/|$)/.test(pathname)) {
    req.url = originalUrl.replace(/^\/api(?=\/|$)/, "") || "/";
  }

  return app(req, res);
};