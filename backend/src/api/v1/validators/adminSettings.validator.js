const Joi = require("joi");

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// General Settings Schema
const generalSettingsSchema = Joi.object({
  platformName: Joi.string().min(2).max(100).optional(),
  timezone: Joi.string().max(50).optional(),
  dateFormat: Joi.string().max(20).optional(),
  timeFormat: Joi.string().valid("12h", "24h").optional(),
  language: Joi.string().max(50).optional(),
});

// Notification Settings Schema
const notificationSettingsSchema = Joi.object({
  email: Joi.boolean().optional(),
  sms: Joi.boolean().optional(),
  push: Joi.boolean().optional(),
  appointment: Joi.boolean().optional(),
  payment: Joi.boolean().optional(),
  marketing: Joi.boolean().optional(),
  system: Joi.boolean().optional(),
});



// Profile Settings Schema
const profileSettingsSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  email: Joi.string().email().max(100).optional(),
});

// Platform Settings Schema
const platformSettingsSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().max(1000).optional(),
  version: Joi.string().max(20).optional(),
});

// Create Admin Settings Schema
const createAdminSettingsSchema = Joi.object({
  admin: Joi.string().pattern(objectIdPattern).required(),
  profile: profileSettingsSchema.optional(),
  platform: platformSettingsSchema.optional(),
  general: generalSettingsSchema.optional(),
  notifications: notificationSettingsSchema.optional(),
});

// Update Admin Settings Schema
const updateAdminSettingsSchema = Joi.object({
  profile: profileSettingsSchema.optional(),
  platform: platformSettingsSchema.optional(),
  general: generalSettingsSchema.optional(),
  notifications: notificationSettingsSchema.optional(),
}).min(1);

// Admin Settings ID Schema
const adminSettingsIdSchema = Joi.object({
  adminId: Joi.string().pattern(objectIdPattern).required(),
});



module.exports = {
  createAdminSettingsSchema,
  updateAdminSettingsSchema,
  adminSettingsIdSchema,

  profileSettingsSchema,
  platformSettingsSchema,
};
