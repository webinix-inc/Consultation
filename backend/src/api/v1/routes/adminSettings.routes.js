const express = require("express");
const router = express.Router();

const controller = require("../controllers/adminSettings.controller");
const {
  createAdminSettingsSchema,
  updateAdminSettingsSchema,
  adminSettingsIdSchema,

} = require("../validators/adminSettings.validator.js");
const { validate } = require("../../../middlewares/validate.middleware.js");
const { authenticateToken, authorizeRoles } = require("../../../middlewares/auth.middleware.js");

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(authorizeRoles("Admin"));

// Get admin settings
router.get(
  "/:adminId",
  validate(adminSettingsIdSchema, "params"),
  controller.getSettings
);

// Create admin settings
router.post(
  "/",
  validate(createAdminSettingsSchema),
  controller.createSettings
);

// Update admin settings
router.put(
  "/:adminId",
  validate(adminSettingsIdSchema, "params"),
  validate(updateAdminSettingsSchema),
  controller.updateSettings
);

// Update profile settings
router.put(
  "/:adminId/profile",
  validate(adminSettingsIdSchema, "params"),
  controller.updateProfileSettings
);

// Update platform settings
router.put(
  "/:adminId/platform",
  validate(adminSettingsIdSchema, "params"),
  controller.updatePlatformSettings
);

// Update general settings
router.put(
  "/:adminId/general",
  validate(adminSettingsIdSchema, "params"),
  controller.updateGeneralSettings
);

// Update notification settings
router.put(
  "/:adminId/notifications",
  validate(adminSettingsIdSchema, "params"),
  controller.updateNotificationSettings
);





module.exports = router;
