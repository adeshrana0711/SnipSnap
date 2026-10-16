
const app = require("../server/server.js");

module.exports = (req, res) => {
  const originalUrl = req.url || "/";
  req.url = originalUrl.replace(/^\/api(?=\/|$)/, "") || "/";

  return app(req, res);
};
