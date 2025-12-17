// routes/appointment.routes.js
const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointment.controller");
const { authenticateToken, authorizeRoles } = require("../../../middlewares/auth.middleware.js");

// List / filters
router.get("/", authenticateToken, authorizeRoles("Admin", "Consultant", "Client"), appointmentController.getAppointments);

// Available slots (server-side)
router.get("/available-slots", authenticateToken, authorizeRoles("Admin", "Consultant", "Client"), appointmentController.getAvailableSlots);

// Get one
router.get("/:id", authenticateToken, authorizeRoles("Admin", "Consultant", "Client"), appointmentController.getAppointmentById);

// Create (allow Client and Consultant roles)
router.post("/", authenticateToken, authorizeRoles("Admin", "Consultant", "Client"), appointmentController.createAppointment);

// Update (allow Client and Consultant roles)
router.patch("/:id", authenticateToken, authorizeRoles("Admin", "Consultant", "Client"), appointmentController.updateAppointment);

// Delete (allow Client and Consultant roles)
router.delete("/:id", authenticateToken, authorizeRoles("Admin", "Consultant", "Client"), appointmentController.deleteAppointment);

module.exports = router;
