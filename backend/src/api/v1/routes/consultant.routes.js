const express = require("express");
const router = express.Router();
const controller = require("../controllers/consultant.controller");
const { authenticateToken, authorizeRoles } = require("../../../middlewares/auth.middleware.js");
const { validate, validateParams } = require("../../../middlewares/validate.middleware.js");
const { createConsultantSchema, updateConsultantSchema, consultantIdSchema } = require("../validators/consultant.validator.js");
const { uploadImage, uploadToS3 } = require("../../../middlewares/upload.middleware");

// GET /api/v1/consultants/public - Public endpoint (no auth required)
router.get("/public", controller.list);

// GET /api/v1/consultants - Requires authentication
router.get("/", authenticateToken, authorizeRoles("Admin", "Consultant", "Client"), controller.list);

// GET /api/v1/consultants/:id
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin", "Consultant", "Client"),
  validateParams(consultantIdSchema),
  controller.getOne
);

// POST /api/v1/consultants (with optional image upload)
router.post(
  "/",
  authenticateToken,
  authorizeRoles("Admin", "Consultant"),
  uploadImage.single("image"),
  uploadToS3,
  validate(createConsultantSchema),
  controller.create
);

// PATCH /api/v1/consultants/:id (with optional image upload)
router.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin", "Consultant"),
  uploadImage.single("image"),
  uploadToS3,
  validateParams(consultantIdSchema),
  validate(updateConsultantSchema),
  controller.update
);

// DELETE /api/v1/consultants/:id
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin", "Consultant"),
  validateParams(consultantIdSchema),
  controller.remove
);

// POST /api/v1/consultants/:id/approve
router.post(
  "/:id/approve",
  authenticateToken,
  authorizeRoles("Admin", "Consultant"),
  validateParams(consultantIdSchema),
  controller.approve
);

// POST /api/v1/consultants/:id/reject
router.post(
  "/:id/reject",
  authenticateToken,
  authorizeRoles("Admin", "Consultant"),
  validateParams(consultantIdSchema),
  controller.reject
);

module.exports = router;


