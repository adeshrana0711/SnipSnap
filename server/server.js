require('dotenv').config();
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const shop = require('./models/Shop');
const Appointment = require('./models/appointment');
const barberRoutes = require("./routes/barberRoutes");
const Barber = require('./models/Barber');
const appointmentRoutes = require("./routes/appointmentRoutes");
const slotRoutes = require("./routes/slots");
const googleAuthRoutes = require("./routes/googleAuth");

require('./config/db');
require("./config/passport");
const auth = require('./middlewares/auth');
const barberLoginRoute = require('./routes/shopLogin');
const clientLoginRoute = require('./routes/LoginClient');

const barberRegisterRoute = require('./routes/regisbarber');
const clientRegisterRoute = require('./routes/regisClient');
const shopRoutes = require("./routes/shop");
const clientBookingsRoute = require("./routes/clientBookings");
const Client = require("./models/Client")
const upload = require("./middlewares/upload");

const app = express();
const port = 3000;

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
app.use("/uploads", express.static("public/uploads"));
app.use("/api/barbers", barberRoutes);
app.use("/api/shop", barberLoginRoute);
app.use("/api/shop", barberRegisterRoute);
app.use("/shop", shopRoutes);
app.use("/client", clientLoginRoute);
app.use("/client", clientRegisterRoute);
app.use("/appointment", appointmentRoutes);
app.use("/client/bookings", clientBookingsRoute);
app.use("/api", slotRoutes);
app.use("/auth", googleAuthRoutes);

app.get('/logout',(req,res)=>{
    res.clearCookie("token");
    if (req.accepts("json") && !req.accepts("html")) {
        return res.json({ success: true });
    }
    res.redirect("/");
});

app.get("/me", async (req,res)=>{
    try{
        const token = req.cookies.token;

        if(!token){
            return res.json({loggedIn:false});
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY");
        let user = null;

        if(decoded.role == "client"){
            user = await Client.findById(decoded.id);
        }
        if(decoded.role == "shop"){
            user = await shop.findById(decoded.id);
        }

        if(!user){
            return res.json({loggedIn:false});
        }

        res.json({
            loggedIn:true,
            role:decoded.role,
            name:user.name,
            email:user.email,
            wallet:user?.wallet || 0,
            image:user?.image || null
        });

    }catch(err){
        res.json({loggedIn:false});
    }
});
app.get("/client/stats",auth("client"),async (req,res)=>{
    try{
        const booking = await Appointment.countDocuments({
            client:req.user.id
        })
        res.json({booking});
    }catch(error){
        res.send("Server Error");
    }
})
app.get("/api/profile", auth("client"), async (req,res)=>{

try{

const user = await Client.findById(req.user.id);

res.json(user);

}catch(err){

console.error(err);
res.status(500).json({error:"Server error"});

}

});
app.put("/api/profile",auth("client"),async(req,res)=>{
    const {name,phone} = req.body;
    const user = await Client.findById(req.user.id);

    user.name = name;
    user.phone = phone;
    
    await user.save();
    res.json(user);
})

app.post("/api/profile/image",auth("client"),upload.single("image"),async(req,res)=>{

    const user = await Client.findById(req.user.id);
    user.image = "/uploads/users/" + req.file.filename;
    await user.save();
    res.json({image:user.image});
});

app.patch("/availability/:id", auth("shop"), async (req, res) => {

  try {

    const { start, end } = req.body;

    const barber = await Barber.findOne({
      _id: req.params.id,
      shop: req.user.id
    });

    if (!barber) {
      return res.status(404).send("Barber not found");
    }

    barber.workingHours.start = start;
    barber.workingHours.end = end;

    await barber.save();

    res.json(barber);

  } catch (error) {

    console.error(error);
    res.status(500).send("Server Error");

  }

});
app.get('/shops/:id', async (req,res)=>{

try{

const shop = await Shop.findById(req.params.id);

if(!shop){
return res.status(404).send("Shop not found");
}

res.json(shop);

}catch(err){

res.status(500).send("Server error");

}
});

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
