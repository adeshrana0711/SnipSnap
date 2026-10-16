const app = require("../server/server.js");

module.exports = (req, res) => {
  const originalUrl = req.url || "/";
  const pathname = originalUrl.split("?")[0];

  // These Express routes are registered with the /api prefix.
  const preserveApiPrefix = [
    /^\/api\/barbers(?:\/|$)/,
    /^\/api\/profile(?:\/|$)/,
    /^\/api\/shop(?:\/|$)/,
  ].some((pattern) => pattern.test(pathname));

  // Legacy Express routes are registered without /api.
  if (
    !preserveApiPrefix &&
    /^\/api(?:\/|$)/.test(pathname)
  ) {
    req.url = originalUrl.replace(/^\/api(?=\/|$)/, "") || "/";
  }

  return app(req, res);
};