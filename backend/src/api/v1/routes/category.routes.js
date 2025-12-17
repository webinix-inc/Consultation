const express = require("express");
const router = express.Router();
const controller = require("../controllers/category.controller");
const { authenticateToken, authorizeRoles } = require("../../../middlewares/auth.middleware.js");
const { validate, validateParams } = require("../../../middlewares/validate.middleware.js");
const { createCategorySchema, updateCategorySchema, categoryIdSchema } = require("../validators/category.validator.js");

// GET /api/v1/categories 
router.get("/", controller.list);

// POST /api/v1/categories
router.post("/", authenticateToken, authorizeRoles("Admin"), validate(createCategorySchema), controller.create);

// PATCH /api/v1/categories/:id
router.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin","Consultant"),
  validateParams(categoryIdSchema),
  validate(updateCategorySchema),
  controller.update
);

// DELETE /api/v1/categories/:id
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  validateParams(categoryIdSchema),
  controller.remove
);

module.exports = router;


