const Joi = require("joi");
const { phoneSchema } = require("./common.validator");

const updateClientSchema = Joi.object({
  fullName: Joi.string().min(2).max(50).trim().optional(),
  email: Joi.string().email().lowercase().trim().optional(),
  mobile: phoneSchema.optional(),
  dob: Joi.date().allow(null).optional(),
  address: Joi.string().max(500).allow("").optional(),
  city: Joi.string().max(100).allow("").optional(),
  state: Joi.string().max(100).allow("").optional(),
  country: Joi.string().max(100).allow("").optional(),
  pincode: Joi.string().max(20).allow("").optional(),
  emergencyContact: Joi.string().max(50).allow("").optional(),
  status: Joi.string().valid("Active", "Inactive", "Blocked", "Pending").optional(),
}).min(1);

const clientIdSchema = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    "string.pattern.base": "Invalid client ID format",
  }),
});

const deleteAccountSchema = Joi.object({
  password: Joi.string().optional(), // Required if account has password set
}).unknown(true);

const consentSchema = Joi.object({
  marketingConsent: Joi.boolean().optional(),
  dataProcessingConsent: Joi.boolean().optional(),
}).min(1);

module.exports = {
  consentSchema,
  updateClientSchema,
  clientIdSchema,
  deleteAccountSchema,
};
