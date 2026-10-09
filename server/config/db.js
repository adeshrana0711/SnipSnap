const mongoose = require('mongoose');

mongoose.connect("mongodb://localhost:27017/barber")
        .then(()=> console.log("MongoDb connected"))
        .catch((err)=> console.log(err));
