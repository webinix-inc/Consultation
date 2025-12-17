const Joi = require("joi");

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const createSubcategorySchema = Joi.object({
  title: Joi.string().min(2).max(100).required(),
  description: Joi.string().allow("").max(500).optional(),
  parentCategory: Joi.string().pattern(objectIdPattern).required(),
  rating: Joi.number().min(0).max(5).optional(),
  consultants: Joi.number().min(0).optional(),
  clients: Joi.number().min(0).optional(),
  monthlyRevenue: Joi.number().min(0).optional(),
  status: Joi.string().valid("Active", "Inactive").optional(),
});

const updateSubcategorySchema = Joi.object({
  title: Joi.string().min(2).max(100).optional(),
  description: Joi.string().allow("").max(500).optional(),
  parentCategory: Joi.string().pattern(objectIdPattern).optional(),
  rating: Joi.number().min(0).max(5).optional(),
  consultants: Joi.number().min(0).optional(),
  clients: Joi.number().min(0).optional(),
  monthlyRevenue: Joi.number().min(0).optional(),
  status: Joi.string().valid("Active", "Inactive").optional(),
}).min(1);

const subcategoryIdSchema = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required(),
});

module.exports = {
  createSubcategorySchema,
  updateSubcategorySchema,
  subcategoryIdSchema,
};

