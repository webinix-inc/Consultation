const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transaction.controller");
const { authenticateToken } = require("../../../middlewares/auth.middleware");

router.get("/", authenticateToken, transactionController.getTransactions);
router.post("/payout", authenticateToken, (req, res, next) => {
    // Check if user is admin - manually since authorizeRoles middleware import might need verification
    if (req.user.role !== "Admin") {
        return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
}, transactionController.createPayout);

module.exports = router;
