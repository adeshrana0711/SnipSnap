const express = require("express");
const router = express.Router();
const Barber = require("../models/Barber");
const auth = require("../middlewares/auth");

router.get("/all", auth("shop"), async (req,res)=>{

    const barbers = await Barber.find({shop:req.user.id}).lean();

    res.json(barbers);
});
router.post("/add", auth("shop"), async (req,res)=>{
    try{
        const { name, location, skills, status } = req.body;

        if (!name || !location || !skills) {
            return res.status(400).json({ message: "Name, location and skills are required" });
        }

        const barber = new Barber({
            name,
            location,
            skills,
            status,
            shop:req.user.id
        });
        await barber.save();
        res.json(barber);
    }catch(err){
        res.status(500).json({ message: err.message });
    }
});

router.patch("/status/:id", auth("shop"), async(req,res)=>{
    const barber = await Barber.findOne({_id:req.params.id, shop:req.user.id});

    if(!barber) return res.send("Not allowed");

    if(barber.status === "Active"){
        barber.status = "Inactive";
    }
    else{
        barber.status = "Active";
    }
    await barber.save();
    res.json(barber);
});
router.get("/:id", async (req,res)=>{
try{

const barber = await Barber.findById(req.params.id);

if(!barber){
return res.status(404).json({message:"Barber not found"});
}

res.json(barber);

}catch(err){

console.error(err);
res.status(500).send("Server Error");

}
});

router.patch("/availability/:id", auth("shop"), async (req, res) => {

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
router.delete("/:id", auth("shop"), async(req,res)=>{
    await Barber.deleteOne({_id:req.params.id, shop:req.user.id});
    res.send("Deleted");
});

module.exports = router;
