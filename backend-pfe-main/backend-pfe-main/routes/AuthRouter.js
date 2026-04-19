const express = require("express");
const route = express.Router();
const AuthController = require("../controllers/AuthController");

// âœ… ADD THIS
route.post("/signup", AuthController.signup);

route.post("/forgot-password", AuthController.forgotPassword);
route.post("/verify-reset-code", AuthController.verifyResetCode);
route.post("/reset-password", AuthController.resetPassword);
route.post("/request-password-reset", AuthController.requestPasswordReset);
route.post("/verify-password-reset-otp", AuthController.verifyPasswordResetOtp);
route.post("/reset-password-with-otp", AuthController.resetPasswordWithOtp);

route.post("/login-secure", AuthController.loginSecure);

module.exports = route;

