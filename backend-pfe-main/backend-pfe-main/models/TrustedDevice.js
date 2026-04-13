const mongoose = require("mongoose");

const TrustedDeviceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deviceId: { type: String, default: "", index: true },
    deviceHash: { type: String, required: true, index: true },
    userAgent: { type: String, default: "" },
    lastIp: { type: String, default: "" },
    lastLocation: { type: String, default: "" },
    lastLoginAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

TrustedDeviceSchema.index({ userId: 1, deviceHash: 1 }, { unique: true });

module.exports = mongoose.model("TrustedDevice", TrustedDeviceSchema);
