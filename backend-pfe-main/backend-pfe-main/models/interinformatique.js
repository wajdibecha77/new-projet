const mongoose = require("mongoose");
const User = require("../models/Intervention");

const interinformatiqueSchema = new mongoose.Schema({
  about : {
      type : String
  }
});

module.exports = Intervention.discriminator("Interinformatique", interinformatiqueSchema);