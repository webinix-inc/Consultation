const express = require("express");
const router = express.Router();
const controller = require("../controllers/analytics.controller");
const { authenticateToken, authorizeRoles } = require("../../../middlewares/auth.middleware.js");

// GET /api/v1/analytics/overview
router.get("/overview", authenticateToken, authorizeRoles("Admin"), controller.overview);
router.get("/consultant", authenticateToken, authorizeRoles("Consultant"), controller.consultantStats);
router.get("/client", authenticateToken, authorizeRoles("Client"), controller.clientStats);
router.get("/client/:id", authenticateToken, authorizeRoles("Consultant", "Admin"), controller.getClientStatsById);

module.exports = router;









