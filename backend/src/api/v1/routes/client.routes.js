const express = require("express");
const router = express.Router();
const clientController = require("../controllers/client.controller");
const { authenticateToken, authorizeRoles } = require("../../../middlewares/auth.middleware");
const { validate, validateParams } = require("../../../middlewares/validate.middleware");
const { uploadImage, uploadToS3 } = require("../../../middlewares/upload.middleware");
const { updateClientSchema, clientIdSchema, deleteAccountSchema, consentSchema } = require("../validators/client.validator");

// All routes require authentication
router.use(authenticateToken);

// Client self-management routes
router.get("/profile", authorizeRoles("Client"), clientController.getProfile);
router.get("/profile/export", authorizeRoles("Client"), clientController.exportMyData);
router.patch("/profile", authorizeRoles("Client"), uploadImage.single("avatar"), uploadToS3, clientController.updateProfile);
router.delete("/profile", authorizeRoles("Client"), validate(deleteAccountSchema), clientController.deleteMyAccount);
router.patch("/profile/consent", authorizeRoles("Client"), validate(consentSchema), clientController.updateConsent);

// Admin/Consultant view all clients
router.get("/", authorizeRoles("Admin", "Consultant"), clientController.getAllClients);

// Consultant/Admin view client profile route
router.get("/:id", authorizeRoles("Consultant", "Admin"), clientController.getClientProfileById);

// Admin update client (e.g. block/unblock)
router.patch("/:id", authorizeRoles("Admin"), validateParams(clientIdSchema), validate(updateClientSchema), clientController.updateClient);

module.exports = router;
