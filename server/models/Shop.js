const mongoose = require("mongoose");

const ShopSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    owner_name:String,
    location: String,
    email: String,
    password: String,
    image:{
			type: String,
			default: ""
	},
    workingHours:{
        open:String,
        close:String
    },
      availability: {
        openTime: String,
        closeTime: String 
    },
    slotDuration:{
        type:Number,
        default:30
    }
},{timestamps:true});

module.exports = mongoose.model("Shop", ShopSchema);
