const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const { authenticateToken } = require("../../../middlewares/auth.middleware");

// Create Razorpay order
router.post("/create-order", authenticateToken, paymentController.createOrder);

// Verify Razorpay payment
router.post("/verify", authenticateToken, paymentController.verifyPayment);

// Get payment status
router.get("/status", authenticateToken, paymentController.getPaymentStatus);

module.exports = router;

