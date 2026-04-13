const express = require("express");
const route = express.Router();
const AuthController = require("../controllers/AuthController");

// ✅ ADD THIS
route.post("/signup", AuthController.signup);

route.post("/forgot-password", AuthController.forgotPassword);
route.post("/verify-reset-code", AuthController.verifyResetCode);
route.post("/reset-password", AuthController.resetPassword);

route.post("/login-secure", AuthController.loginSecure);
route.get("/challenge/approve", AuthController.approveChallenge);
route.get("/challenge/deny", AuthController.denyChallenge);
route.post("/challenge/verify", AuthController.verifyLoginOtp);

module.exports = route;