
const app = require("../server/server.js");

module.exports = (req, res) => {
  const originalUrl = req.url || "/";
  const pathname = originalUrl.split("?")[0];

  if (/^\/api(?:\/|$)/.test(pathname)) {
    req.url = originalUrl.replace(/^\/api(?=\/|$)/, "") || "/";
  }

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );

  return app(req, res);
};
