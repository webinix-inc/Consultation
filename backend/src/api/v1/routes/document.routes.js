const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../../middlewares/auth.middleware");
const { validate } = require("../../../middlewares/validate.middleware");
const documentController = require("../controllers/document.controller");
const {
  createDocumentSchema,
  updateDocumentSchema,
  documentIdSchema,
} = require("../validators/document.validator");

// Get document types
router.get("/types", authenticateToken, documentController.getTypes);

// Get all documents
router.get("/", authenticateToken, documentController.getAll);

// Get single document
router.get("/:id", authenticateToken, validate(documentIdSchema, "params"), documentController.getOne);

// Create document
router.post("/", authenticateToken, validate(createDocumentSchema), documentController.create);

// Update document
router.patch("/:id", authenticateToken, validate(documentIdSchema, "params"), validate(updateDocumentSchema), documentController.update);

// Delete document
router.delete("/:id", authenticateToken, validate(documentIdSchema, "params"), documentController.delete);

module.exports = router;

