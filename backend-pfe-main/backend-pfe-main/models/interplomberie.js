const mongoose = require("mongoose");
const User = require("../models/Intervention");

const interplomberieSchema = new mongoose.Schema({
  about : {
      type : String
  }
});

module.exports = Intervention.discriminator("Interplomberie", interplomberieSchema);