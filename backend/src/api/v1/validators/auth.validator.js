const Joi = require("joi");
const { phoneSchema } = require("./common.validator");

// Update profile validation schema
const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(50).trim().messages({
    "string.min": "Full name must be at least 2 characters long",
    "string.max": "Full name cannot exceed 50 characters",
  }),


});

const sendOtpSchema = Joi.object({
  mobile: phoneSchema.required().messages({
    "any.required": "Mobile number is required",
  }),
});

const verifyOtpSchema = Joi.object({
  mobile: phoneSchema.required().messages({
    "any.required": "Mobile number is required",
  }),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "string.length": "OTP must be 6 digits",
      "string.pattern.base": "OTP must contain only numbers",
      "any.required": "OTP is required",
    }),
  role: Joi.string()
    .valid("Client", "Consultant", "Admin", "Employee")
    .optional()
    .messages({
      "any.only": "Role must be Client, Consultant, Admin, or Employee",
    }),
});




const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please enter a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
  mobile: Joi.string().optional(),
  otp: Joi.string().optional(),
  role: Joi.string().optional()
});

const registerSchema = Joi.object({
  registrationToken: Joi.string().required(),
  fullName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  role: Joi.string().valid("Consultant", "Client").required(),
  category: Joi.alternatives().try(
    Joi.string(),
    Joi.object()
  ).optional(),
  subcategory: Joi.alternatives().try(
    Joi.string(),
    Joi.object()
  ).optional(),
  fees: Joi.number().min(0).optional(),
  currency: Joi.string().length(3).uppercase().optional(),
  password: Joi.string().min(6).optional(),
});

const signupSchema = Joi.object({
  fullName: Joi.string().min(2).max(50).required().messages({
    "string.min": "Full name must be at least 2 characters long",
    "string.max": "Full name cannot exceed 50 characters",
    "any.required": "Full name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please enter a valid email address",
    "any.required": "Email is required",
  }),
  mobile: phoneSchema.required().messages({
    "any.required": "Mobile number is required",
  }),

  role: Joi.string().valid("Client", "Consultant").required().messages({
    "any.only": "Role must be either Client or Consultant",
    "any.required": "Role is required",
  }),
  category: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),
  subcategory: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),
  fees: Joi.number().min(0).optional(),
  currency: Joi.string().length(3).uppercase().optional(),
  password: Joi.string().min(6).optional().messages({
    "string.min": "Password must be at least 6 characters long",
  }),
});

module.exports = {
  updateProfileSchema,
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  registerSchema,
  signupSchema,
};
