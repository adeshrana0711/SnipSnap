const express = require("express");
const router = express.Router();
const Shop = require("../models/Shop");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({

	destination: function (req, file, cb) {
		cb(null, "public/uploads/shops");
	},

	filename: function (req, file, cb) {
		const uniqueName = Date.now() + path.extname(file.originalname);
		cb(null, uniqueName);
	}

});

const upload = multer({ storage });

router.post("/registration",upload.single("shopImage"),async (req, res) => {
		try {
			const { name,owner_name, email, phone, password, location } = req.body;

			const existingShop = await Shop.findOne({ email });

			if (existingShop) {
				return res.json({success: false,message: "Shop already registered with this email"});
			}
			let imagePath = "";

			if (req.file) {
				imagePath = "/uploads/shops/" + req.file.filename;
			}
			
			const newShop = new Shop({
				name,
				owner_name,
				email,
				phone,
				password,
				location,
				image: imagePath

			});
			await newShop.save();
			res.json({success: true});
		} 
		catch (err) {
			res.json({success: false,message: "Server error"});
		}
	}
);
module.exports = router;