const mongoose = require("mongoose");
const User = require("../models/Intervention");

const interelcriqueSchema = new mongoose.Schema({
  about : {
      type : String
  }
});

module.exports = Intervention.discriminator("Interelectrique", interelectriqueSchema);