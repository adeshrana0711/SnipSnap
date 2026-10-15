const app = require("../server/server.js");

module.exports = (req, res) => {
  // Vercel routes API requests through /api.
  // Remove that prefix before Express processes the request.
  const originalUrl = req.url || "/";
  req.url = originalUrl.replace(/^\/api(?=\/|$)/, "") || "/";

  return app(req, res);
};