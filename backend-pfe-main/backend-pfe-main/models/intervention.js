const mongoose = require("mongoose");

const Intervention = new mongoose.Schema({
  id: {
    type: String,
    autoIncrement: true,
    primaryKey: true
},
  name: {
    type: String,
    reuired: true,
  },
  type: {
    type: String,
    required: false,
    enum: ["ELECTRIQUE", "INFORMATIQUE", "MECANIQUE", "PLOMBERIE", "AUTRE"],
    default: "AUTRE",
  },
  isAI: {
    type: Boolean,
    default: false,
  },
  aiDetails: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default : Date.now()

  },
  dateDebut: {
    type: Date,
    default : Date.now(),
    reuired: false,
  },
  dateEnd: {
    type: Date,
    reuired: false,
  },
  description: {
    type: String,
    reuired: true,
  },
  lieu: {
    type: String,
    reuired: true,
  },
  delai: { 
    type: Date,
    reuired: true,
  },

  degree: { 
    type: String,
    reuired: true,
  },

  etat: { 
    type: String,
    reuired: false,
    default : 'NON_AFFECTEE'
  },

  createdBy :{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
    },

    assignedTo :{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
      },

    affectedBy :{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
      },

      affectedToUsers :[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
        }],

      workDetails: {
        type: String,
        default: "",
        required: false,
      },

      technicianComments: [
        {
          author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
          },
          text: {
            type: String,
            required: false,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],

      reportedProblems: [
        {
          author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
          },
          description: {
            type: String,
            required: false,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
          status: {
            type: String,
            default: "OPEN",
          },
        },
      ],

      reclamationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reclamation",
        required: false
      }

});

module.exports = mongoose.model("Intervention", Intervention);
