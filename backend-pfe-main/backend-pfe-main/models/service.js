const mongoose = require("mongoose");

const Service = new mongoose.Schema({
  id: {
    type: String,
    autoIncrement: true,
    primaryKey: true
},

name : {
    type : String,
    reuired : true
},
email : {
    type :String,
    required : true,
    unique : true
},
tel : {
  type :Number,
  required : true,
  unique : true
},

});

module.exports = mongoose.model("Service", Service);