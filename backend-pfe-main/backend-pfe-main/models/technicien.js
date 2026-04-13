const mongoose = require("mongoose");
const User = require("../models/User");

const technicienSchema = new mongoose.Schema({
  about : {
      type : String
  }
});

module.exports = User.discriminator("Technicien", technicienSchema);