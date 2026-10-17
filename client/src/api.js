
const app = require("../server/server.js");

module.exports = (req, res) => {
  const originalUrl = req.url || "/";
  const pathname = originalUrl.split("?")[0];

  // Convert /api/client/login to /client/login
  if (/^\/api(?:\/|$)/.test(pathname)) {
    req.url = originalUrl.replace(/^\/api(?=\/|$)/, "") || "/";
  }

  return app(req, res);
};
