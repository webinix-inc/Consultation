const Joi = require("joi");
const { ROLES } = require("../../../constants/roles");

// MongoDB ObjectId pattern
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// Common user validation schema
const baseUserSchema = {
  fullName: Joi.string().min(2).max(50).trim().required().messages({
    "string.min": "Full name must be at least 2 characters long",
    "string.max": "Full name cannot exceed 50 characters",
    "any.required": "Full name is required",
  }),
  email: Joi.string().email().lowercase().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  mobile: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .required()
    .messages({
      "string.pattern.base": "Mobile number must be 10-15 digits",
      "any.required": "Mobile number is required",
    }),
  role: Joi.string()
    .valid(...Object.values(ROLES))
    .required()
    .messages({
      "any.only": `Role must be one of: ${Object.values(ROLES).join(", ")}`,
      "any.required": "Role is required",
    }),
  category: Joi.alternatives()
    .try(
      Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
          "string.pattern.base": "Category must be a valid ObjectId",
        }),
      Joi.string().allow("", null),
      Joi.valid(null)
    )
    .optional(),
  subcategory: Joi.alternatives()
    .try(
      Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
          "string.pattern.base": "Subcategory must be a valid ObjectId",
        }),
      Joi.string().allow("", null),
      Joi.valid(null)
    )
    .optional(),
  status: Joi.string().valid("Active", "Inactive").default("Active"),
  verificationStatus: Joi.string().valid("Approved", "Pending", "Rejected", "Blocked").default("Pending"),
};

// Create user validation schema
const createUserSchema = Joi.object({
  ...baseUserSchema,
  userId: Joi.string().alphanum().min(3).max(20).required().messages({
    "string.alphanum": "User ID must contain only alphanumeric characters",
    "string.min": "User ID must be at least 3 characters long",
    "string.max": "User ID cannot exceed 20 characters",
    "any.required": "User ID is required",
  }),
});

// Update user validation schema
const updateUserSchema = Joi.object({
  fullName: baseUserSchema.fullName.optional(),
  email: baseUserSchema.email.optional(),
  mobile: baseUserSchema.mobile.optional(),
  // role: baseUserSchema.role.optional(), // Role cannot be updated
  category: baseUserSchema.category,
  subcategory: baseUserSchema.subcategory,
  status: baseUserSchema.status.optional(),
  verificationStatus: baseUserSchema.verificationStatus.optional(),
}).min(1); // At least one field must be provided

// ID parameter validation
const userIdSchema = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Invalid user ID format",
    "any.required": "User ID is required",
  }),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  userIdSchema,
};
