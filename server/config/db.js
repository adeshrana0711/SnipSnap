const mongoose = require('mongoose');

mongoose.connect("mongodb://localhost:27017/barber", )
        .then(()=> console.log("MongoDb connected"))
        .catch((err)=> console.log(err));




        //mongodb+srv:adeshrana0711_db_user//:q1f6bEaBpmWk5Ymk@cluster0.v4zfoje.mongodb.net/?appName=Cluster0