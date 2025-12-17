const express = require("express");
const router = express.Router();
const controller = require("../controllers/subcategory.controller");
const { authenticateToken, authorizeRoles } = require("../../../middlewares/auth.middleware.js");
const { validate, validateParams } = require("../../../middlewares/validate.middleware.js");
const {
  createSubcategorySchema,
  updateSubcategorySchema,
  subcategoryIdSchema,
} = require("../validators/subcategory.validator.js");

// GET /api/v1/subcategories
router.get(
  "/",
  authenticateToken,
  authorizeRoles("Admin", "Consultant"),
  controller.list
);

// GET /api/v1/subcategories/:id
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin", "Consultant"),
  validateParams(subcategoryIdSchema),
  controller.getById
);

// POST /api/v1/subcategories
router.post(
  "/",
  authenticateToken,
  authorizeRoles("Admin","Consultant"),
  validate(createSubcategorySchema),
  controller.create
);

// PATCH /api/v1/subcategories/:id
router.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin", "Consultant"),
  validateParams(subcategoryIdSchema),
  validate(updateSubcategorySchema),
  controller.update
);

// DELETE /api/v1/subcategories/:id
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  validateParams(subcategoryIdSchema),
  controller.remove
);

module.exports = router;  

