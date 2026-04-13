const mongoose = require("mongoose");

const PasswordResetTokenSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    used: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "password_reset_tokens",
  }
);

module.exports = mongoose.model("PasswordResetToken", PasswordResetTokenSchema);
