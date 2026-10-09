const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const shop = require('../models/Shop');

router.post('/login', async (req, res) => {
    try{
        const { email, password } = req.body;

        const shopName = await shop.findOne({ email });
        if (!shopName || shopName.password !== password) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const token = jwt.sign(
            {
                id: shopName._id,
                role: "shop",
                email: shopName.email
            },
            process.env.JWT_SECRET || "SECRET_KEY",
            { expiresIn: "1d" }   
        );
        res.cookie("token", token, { httpOnly: true });

        return res.json({ success: true });
    }catch(error){
        console.error("Shop login error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;
