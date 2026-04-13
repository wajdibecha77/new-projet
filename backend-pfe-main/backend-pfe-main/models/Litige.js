const mongoose = require("mongoose");

const Litige = new mongoose.Schema({
  id: {
    type: String,
    autoIncrement: true,
    primaryKey: true,
  },

  description: {
    type: String,
    reuired: true,
  },
  interventionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Intervention",
    required: false,
  },
});

module.exports = mongoose.model("Litige", Litige);
