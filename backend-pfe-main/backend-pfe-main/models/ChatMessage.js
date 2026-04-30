const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: false,
    default: "admin",
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  response: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
