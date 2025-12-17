const Joi = require("joi");

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const createDocumentSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  type: Joi.string()
    .valid("Medical Report", "Consultation Notes", "Prescription", "Invoice", "Lab Results", "Treatment Plan", "Other")
    .required(),
  client: Joi.string().pattern(objectIdPattern).optional(),
  consultant: Joi.string().pattern(objectIdPattern).optional(),
  appointment: Joi.string().pattern(objectIdPattern).allow(null, "").optional(),
  description: Joi.string().max(500).allow("").optional(),
  fileUrl: Joi.string().uri().required(),
  fileKey: Joi.string().required(),
  fileName: Joi.string().optional(),
  originalFileName: Joi.string().optional(),
  fileSize: Joi.number().min(0).optional(),
  mimeType: Joi.string().optional(),
});

const updateDocumentSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  type: Joi.string()
    .valid("Medical Report", "Consultation Notes", "Prescription", "Invoice", "Lab Results", "Treatment Plan", "Other")
    .optional(),
  description: Joi.string().max(500).allow("").optional(),
  status: Joi.string().valid("Active", "Archived", "Deleted").optional(),
}).min(1);

const documentIdSchema = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required(),
});

module.exports = {
  createDocumentSchema,
  updateDocumentSchema,
  documentIdSchema,
};

