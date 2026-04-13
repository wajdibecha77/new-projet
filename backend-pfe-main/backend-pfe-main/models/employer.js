const mongoose = require("mongoose");
const User = require("../models/User");

const employerSchema = new mongoose.Schema({
  about : {
      type : String
  }
});

module.exports = User.discriminator("Employer", empoloyerSchema);