const mongoose = require("mongoose");

const ReclamationSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
  },

  nom: {
    type: String,
    default: "",
  },

  prenom: {
    type: String,
    default: "",
  },

  email: {
    type: String,
    default: "",
  },

  nationalite: {
    type: String,
    default: "",
  },

  langue: {
    type: String,
    default: "",
  },

  typeIntervention: {
    type: String,
    default: "",
  },

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
    enum: ["EN_ATTENTE", "ACCEPTEE", "EN_COURS", "TERMINEE", "REFUSEE"],
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
