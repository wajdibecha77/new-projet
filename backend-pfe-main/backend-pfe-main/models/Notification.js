const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    category: {
      type: String,
      default: "GENERAL",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      default: "warning",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    interventionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Intervention",
      required: false,
    },
    technicienId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    technicienName: {
      type: String,
      required: false,
    },
    commentaire: {
      type: String,
      required: false,
      default: "",
    },
    refusType: {
      type: String,
      required: false,
      enum: ["COMPETENCE", "CHARGE", "MATERIEL", "AUTRE"],
    },
    metadata: {
      interventionType: { type: String, required: false },
      employeeName: { type: String, required: false },
      concernedTarget: { type: String, required: false },
      interventionDateTime: { type: Date, required: false },
      lieu: { type: String, required: false },
    },
  },
  {
    collection: "notifications",
  }
);

module.exports = mongoose.model("Notification", NotificationSchema);
