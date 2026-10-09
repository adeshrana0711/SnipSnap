const express = require("express");
const router = express.Router();

const Shop = require("../models/Shop");
const Barber = require("../models/Barber");
const auth = require("../middlewares/auth");

router.get("/shops", async (req, res) => {

  try {

    const shops = await Shop.find();

    const result = shops.map(shop => {

      const open = isShopOpen(
        shop.availability?.openTime,
        shop.availability?.closeTime
      );

      return {
        _id: shop._id,
        name: shop.name,
        location: shop.location,
        image: shop.image,
        status: open ? "Open" : "Closed"
      };

    });

    res.json(result);

  } catch (error) {

    console.error(error);
    res.status(500).send("Server Error");

  }

});

function isShopOpen(open, close) {

  if (!open || !close) {
    return false;
  }

  const [openH, openM] = open.split(":").map(Number);
  const [closeH, closeM] = close.split(":").map(Number);

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;

}

router.post("/availability", auth("shop"), async (req, res) => {

  try {

    const { openTime, closeTime } = req.body;

    await Shop.findByIdAndUpdate(req.user.id, {
      availability: {
        openTime,
        closeTime
      }
    });

    res.json({ message: "Availability saved" });

  } catch (error) {

    console.error(error);
    res.status(500).send("Server Error");

  }

});

router.get("/:id/data", async (req, res) => {

  try {

    const shop = await Shop.findById(req.params.id);
    const barbers = await Barber.find({ shop: req.params.id });

    res.json({ shop, barbers });

  } catch (error) {

    console.error(error);
    res.status(500).send("Server Error");

  }

});

router.post("/timing", auth("shop"), async (req, res) => {

  try {

    const { open, close, slotDuration } = req.body;

    await Shop.findByIdAndUpdate(req.user.id, {
      workingHours: {
        open,
        close
      },
      slotDuration
    });

    res.json({ message: "Timing Updated" });

  } catch (error) {

    console.error(error);
    res.status(500).send("Server Error");

  }

});

router.patch("/hours", auth("shop"), async (req, res) => {

  try {

    const { start, end } = req.body;

    if (!start || !end) {
      return res.status(400).send("Working hours required");
    }

    const shop = await Shop.findById(req.user.id);

    if (!shop) {
      return res.status(404).send("Shop not found");
    }

    if (!shop.workingHours) {
      shop.workingHours = {};
    }

    shop.workingHours.start = start;
    shop.workingHours.end = end;

    await shop.save();

    res.json({
      message: "Shop hours updated",
      workingHours: shop.workingHours
    });

  } catch (error) {

    console.error(error);
    res.status(500).send("Server Error");

  }
});

router.get("/profile", auth("shop"), async (req,res)=>{

    try{

        const shop = await Shop.findById(req.user.id);

        if(!shop){
            return res.status(404).json({error:"Shop not found"});
        }

        res.json(shop);

    }catch(err){

        console.error(err);
        res.status(500).json({error:"Server error"});

    }

});

module.exports = router;