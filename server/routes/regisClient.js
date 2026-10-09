const express = require('express');
const router = express.Router();

const Client = require('../models/Client');

router.post('/registration', async(req,res)=>{

    try{
    const {name, email, password} = req.body;
    const existingClient  = await Client.findOne({email});
    if (existingClient) {
        return res.json({status: "Client already exists"});
    }

    const newClient = new Client({
        name,
        email,
        password
    });
    await newClient.save();
    res.json({success: true});

    }catch(error){
        console.log(error);
        res.status(500).send("Server Error");       
    }
});

module.exports = router;