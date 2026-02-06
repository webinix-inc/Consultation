const express = require("express");
const controller = require("../controllers/storage.controller");
const { authenticateToken } = require("../../../middlewares/auth.middleware");

const router = express.Router();

// Require authentication - users can only access their own files
router.get("/proxy", authenticateToken, controller.proxyDownload);

module.exports = router;
