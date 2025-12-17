const Joi = require("joi");

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const createCategorySchema = Joi.object({
  title: Joi.string().min(2).max(100).required(),
  description: Joi.string().allow("").max(500).optional(),
  rating: Joi.number().min(0).max(5).optional(),
  consultants: Joi.number().min(0).optional(),
  clients: Joi.number().min(0).optional(),
  monthlyRevenue: Joi.number().min(0).optional(),
  status: Joi.string().valid("Active", "Inactive").optional(),
});

const updateCategorySchema = Joi.object({
  title: Joi.string().min(2).max(100).optional(),
  description: Joi.string().allow("").max(500).optional(),
  rating: Joi.number().min(0).max(5).optional(),
  consultants: Joi.number().min(0).optional(),
  clients: Joi.number().min(0).optional(),
  monthlyRevenue: Joi.number().min(0).optional(),
  status: Joi.string().valid("Active", "Inactive").optional(),
}).min(1);

const categoryIdSchema = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
};


