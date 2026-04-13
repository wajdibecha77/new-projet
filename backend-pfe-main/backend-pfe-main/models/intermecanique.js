const mongoose = require("mongoose");
const User = require("../models/Intervention");

const intermecaniqueSchema = new mongoose.Schema({
  about : {
      type : String
  }
});

module.exports = Intervention.discriminator("Intermecanique", intermecaniqueSchema);