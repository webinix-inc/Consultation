const express = require("express");
const router = express.Router();
const controller = require("../controllers/notification.controller");
const { authenticateToken, authorizeRoles } = require("../../../middlewares/auth.middleware.js");

// Routes accessible by all authenticated users
router.get("/", authenticateToken, authorizeRoles("Admin", "Consultant", "Client"), controller.list);
router.post("/", authenticateToken, authorizeRoles("Admin"), controller.create); // Only Admin can manually create via API
router.post("/consultant/send", authenticateToken, authorizeRoles("Consultant"), controller.createForClient); // Consultant can send to their clients
router.post("/mark-all-read", authenticateToken, authorizeRoles("Admin", "Consultant", "Client"), controller.markAllRead);
router.patch("/:id/read", authenticateToken, authorizeRoles("Admin", "Consultant", "Client"), controller.markRead);
router.delete("/:id", authenticateToken, authorizeRoles("Admin", "Consultant", "Client"), controller.remove);
router.delete("/", authenticateToken, authorizeRoles("Admin", "Consultant", "Client"), controller.removeAll);

module.exports = router;









