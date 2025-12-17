// server/src/routes/clientConsultant.routes.js
const express = require("express");
const router = express.Router();
const clientConsultantController = require("../controllers/clientConsultant.controller");
const { authenticateToken, authorizeRoles } = require("../../../middlewares/auth.middleware.js");

// Link a client to a consultant
router.post(
  "/link",
  authenticateToken,
  authorizeRoles("Admin", "Consultant"),
  clientConsultantController.linkClientConsultant
);

// Unlink a client from a consultant
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin", "Consultant", "Client"),
  clientConsultantController.unlinkClientConsultant
);

// Get all clients for a consultant (supports pagination)
router.get(
  "/consultant/:consultantId/clients",
  // authenticateToken,
  // authorizeRoles("Admin", "Consultant"),
  clientConsultantController.getConsultantClients
);

// Get all consultants for a client (supports pagination)
router.get(
  "/client/:clientId/consultants",
  authenticateToken,
  authorizeRoles("Admin", "Consultant", "Client"),
  clientConsultantController.getClientConsultants
);

// Get all relationships (with optional filters & pagination)
router.get(
  "/",
  authenticateToken,
  authorizeRoles("Admin", "Consultant"),
  clientConsultantController.getAllRelationships
);

// Update relationship status
router.patch(
  "/:id/status",
  authenticateToken,
  authorizeRoles("Admin", "Consultant"),
  clientConsultantController.updateRelationshipStatus
);

module.exports = router;
