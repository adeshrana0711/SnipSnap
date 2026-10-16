
const app = require("../server/server.js");

module.exports = (req, res) => {
  const originalUrl = req.url || "/";
  const pathname = originalUrl.split("?")[0];

  // Keep /api for routes mounted under /api in Express.
  const preserveApiPrefix = [
    /^\/api\/barbers(?:\/|$)/,
    /^\/api\/profile(?:\/|$)/,
    /^\/api\/shop(?:\/|$)/,
  ].some((pattern) => pattern.test(pathname));

  // Strip /api for legacy routes mounted without it,
  // such as /client/login, /me, and /appointment.
  if (!preserveApiPrefix && /^\/api(?:\/|$)/.test(pathname)) {
    req.url = originalUrl.replace(/^\/api(?=\/|$)/, "") || "/";
  }

  return app(req, res);
};
