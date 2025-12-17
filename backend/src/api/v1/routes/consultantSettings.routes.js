const express = require("express");
const router = express.Router();

const controller = require("../controllers/consultantSettings.controller");
const {
  createConsultantSettingsSchema,
  updateConsultantSettingsSchema,
  consultantSettingsIdSchema,
  updateConsultantPasswordSchema,
} = require("../validators/consultantSettings.validator.js");
const { validate } = require("../../../middlewares/validate.middleware.js");
const { authenticateToken, authorizeRoles } = require("../../../middlewares/auth.middleware.js");

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(authorizeRoles("Consultant", "Admin")); // Allow both consultants and admins

// Get consultant settings
router.get(
  "/:consultantId",
  validate(consultantSettingsIdSchema, "params"),
  controller.getSettings
);

// Create consultant settings
router.post(
  "/",
  validate(createConsultantSettingsSchema),
  controller.createSettings
);

// Update consultant settings
router.put(
  "/:consultantId",
  validate(consultantSettingsIdSchema, "params"),
  validate(updateConsultantSettingsSchema),
  controller.updateSettings
);

// Update notification settings
router.put(
  "/:consultantId/notifications",
  validate(consultantSettingsIdSchema, "params"),
  controller.updateNotificationSettings
);

// Update availability settings
router.put(
  "/:consultantId/availability",
  validate(consultantSettingsIdSchema, "params"),
  controller.updateAvailabilitySettings
);



module.exports = router;