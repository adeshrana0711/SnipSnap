const jwt = require("jsonwebtoken");

module.exports = function(requiredRole){

    return function(req,res,next){

        const token = req.cookies.token;
        if(!token){
            if (req.originalUrl.startsWith("/api") || req.xhr) {
                return res.status(401).json({ message: "Please login again" });
            }
            const nextUrl = encodeURIComponent(req.originalUrl);
            return res.redirect(requiredRole === "shop"? `/barber/login?next=${nextUrl}`: `/client/login?next=${nextUrl}`);
        }
        try{
            const decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY");

            if(decoded.role !== requiredRole){
                if (req.originalUrl.startsWith("/api") || req.xhr) {
                    return res.status(403).json({ message: "Not allowed" });
                }
                return res.redirect("/");
            }

            req.user = {
                id: decoded.id,
                role: decoded.role
            };

            next();

        }catch(err){
            res.clearCookie("token");
            if (req.originalUrl.startsWith("/api") || req.xhr) {
                return res.status(401).json({ message: "Please login again" });
            }
            return res.redirect("/");
        }
    }
}
