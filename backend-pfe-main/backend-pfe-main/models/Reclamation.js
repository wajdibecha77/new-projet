const mongoose = require("mongoose");

const ReclamationSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },

  lieu: {
    type: String,
    required: true,
  },

  type: {
    type: String,
    enum: ["ELECTRIQUE", "INFORMATIQUE", "MECANIQUE", "PLOMBERIE", "AUTRE"],
    default: "AUTRE",
  },

  urgence: {
    type: String,
    enum: ["NORMAL", "URGENT", "CRITIQUE"],
    default: "NORMAL",
  },

  contact: {
    type: String,
    default: "",
  },

  // 🔥 MULTI IMAGES
  images: {
    type: [String],
    default: []
  },

  status: {
    type: String,
    enum: ["EN_ATTENTE", "ACCEPTEE", "REFUSEE"],
    default: "EN_ATTENTE",
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

}, {
  timestamps: true,
});

module.exports = mongoose.model("Reclamation", ReclamationSchema);
