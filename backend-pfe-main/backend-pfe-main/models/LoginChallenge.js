const mongoose = require("mongoose");

const LoginChallengeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true, index: true },

    deviceId: { type: String, default: "", index: true },
    deviceHash: { type: String, required: true },
    userAgent: { type: String, default: "" },

    ip: { type: String, default: "" },
    location: { type: String, default: "" }, // ex: "Tunis, TN"

    // ✅ device info (optional, for email display)
    deviceType: { type: String, default: "" },   // mobile/desktop/tablet
    deviceVendor: { type: String, default: "" }, // Samsung/Apple...
    deviceModel: { type: String, default: "" },
    os: { type: String, default: "" },           // Android 13
    browser: { type: String, default: "" },      // Chrome 121

    status: { type: String, enum: ["PENDING", "APPROVED", "DENIED", "VERIFIED"], default: "PENDING" },

    approveTokenHash: { type: String, required: true, index: true },
    denyTokenHash: { type: String, required: true, index: true }, // ✅ NEW

    otpHash: { type: String, default: "" },
    attempts: { type: Number, default: 0 }, // ✅ anti brute force

    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LoginChallenge", LoginChallengeSchema);
