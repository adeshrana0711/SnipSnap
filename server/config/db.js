const mongoose = require('mongoose');

mongoose.connect("mongodb+srv:adeshrana0711_db_user//:q1f6bEaBpmWk5Ymk@cluster0.v4zfoje.mongodb.net/?appName=Cluster0")
        .then(()=> console.log("MongoDb connected"))
        .catch((err)=> console.log(err));