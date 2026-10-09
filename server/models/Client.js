const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name:String,
    email:String,
    password:String,
    phone:{
        type:String,
        default:""
    },
    wallet:{
        type:Number,
        default:0
    },
    image:{
        type:String,
        default:""
    }
})
module.exports = mongoose.model("Client",clientSchema);
