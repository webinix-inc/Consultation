const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticateToken } = require("../../../middlewares/auth.middleware.js");
const { validate, validateParams } = require("../../../middlewares/validate.middleware.js");
const {
  updateProfileSchema,
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  registerSchema,
  signupSchema
} = require("../validators/auth.validator.js");


// PATCH /api/v1/auth/edit-profile
router.patch("/edit-profile", authenticateToken, validate(updateProfileSchema), authController.updateProfile);

// POST /api/v1/auth/login - REMOVED
// router.post("/login", validate(loginSchema), authController.login);

// POST /api/v1/auth/send-otp
router.post("/send-otp", validate(sendOtpSchema), authController.sendOtp);

// POST /api/v1/auth/verify-otp
router.post("/verify-otp", validate(verifyOtpSchema), authController.verifyOtp);

// POST /api/v1/auth/register
router.post("/register", validate(registerSchema), authController.register);

// POST /api/v1/auth/signup - Direct signup for clients
router.post("/signup", validate(signupSchema), authController.signup);

module.exports = router;