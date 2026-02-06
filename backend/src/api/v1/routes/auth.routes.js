const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticateToken } = require("../../../middlewares/auth.middleware.js");
const { validate, validateParams } = require("../../../middlewares/validate.middleware.js");
const {
  updateProfileSchema,
  createAdminSchema,
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  registerSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/auth.validator.js");

// Stricter rate limit for auth endpoints (brute force / OTP abuse prevention)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts per 15 min for login, send-otp, verify-otp
  message: { success: false, message: "Too many attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(authLimiter);

// PATCH /api/v1/auth/edit-profile
router.patch("/edit-profile", authenticateToken, validate(updateProfileSchema), authController.updateProfile);

// POST /api/v1/auth/login
router.post("/login", validate(loginSchema), authController.login);

// POST /api/v1/auth/create-admin - Bootstrap: create first admin (only when no admins exist)
router.post("/create-admin", validate(createAdminSchema), authController.createAdmin);

// POST /api/v1/auth/send-otp
router.post("/send-otp", validate(sendOtpSchema), authController.sendOtp);

// POST /api/v1/auth/verify-otp
router.post("/verify-otp", validate(verifyOtpSchema), authController.verifyOtp);

// POST /api/v1/auth/forgot-password
router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);

// PUT /api/v1/auth/reset-password/:resettoken
router.put("/reset-password/:resettoken", validate(resetPasswordSchema), authController.resetPassword);

// POST /api/v1/auth/register
router.post("/register", validate(registerSchema), authController.register);

// POST /api/v1/auth/signup - Direct signup for clients
router.post("/signup", validate(signupSchema), authController.signup);

module.exports = router;