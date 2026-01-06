const express = require("express");
const router = express.Router();
const controller = require("../controllers/notification.controller");
const { authenticateToken, authorizeRoles } = require("../../../middlewares/auth.middleware.js");

// All routes require authentication
router.use(authenticateToken);

// Routes accessible by all authenticated users
router.get("/", authorizeRoles("Admin", "Consultant", "Client"), controller.list);
router.get("/unread-count", authorizeRoles("Admin", "Consultant", "Client"), controller.getUnreadCount);
router.get("/grouped", authorizeRoles("Admin", "Consultant", "Client"), controller.getGroupedByCategory);

// CRUD operations
router.post("/", authorizeRoles("Admin"), controller.create); // Only Admin can manually create via API
router.post("/consultant/send", authorizeRoles("Consultant"), controller.createForClient); // Consultant can send to their clients

// Mark read operations
router.post("/mark-all-read", authorizeRoles("Admin", "Consultant", "Client"), controller.markAllRead);
router.patch("/:id/read", authorizeRoles("Admin", "Consultant", "Client"), controller.markRead);

// Delete operations
router.delete("/all", authorizeRoles("Admin", "Consultant", "Client"), controller.removeAll);
router.delete("/:id", authorizeRoles("Admin", "Consultant", "Client"), controller.remove);

module.exports = router;
