// validators/consultantSettings.validator.js
const Joi = require("joi");

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// Working Hours Schema
// Working Hours Schema
const timeSlotSchema = Joi.object({
  start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
});

const workingHoursSchema = Joi.object({
  start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().allow(""),
  end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().allow(""),
  slots: Joi.array().items(timeSlotSchema).optional(),
  enabled: Joi.boolean().required(),
});

// Break Time Schema
const breakTimeSchema = Joi.object({
  start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  days: Joi.array().items(Joi.string().valid("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")).required(),
});

// Time Off Schema
const timeOffSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref("startDate")).required(),
  reason: Joi.string().max(200).optional(),
  type: Joi.string().valid("vacation", "sick", "personal", "other").required(),
  status: Joi.string().valid("approved", "pending", "rejected").optional(),
});

// Notification Channel Schema (nested)
const notificationChannelSchema = Joi.object({
  enabled: Joi.boolean().optional(),
  appointment: Joi.boolean().optional(),
  payment: Joi.boolean().optional(),
  marketing: Joi.boolean().optional(),
  system: Joi.boolean().optional(),
  reviews: Joi.boolean().optional(),
  messages: Joi.boolean().optional(),
}).optional();

// Notification Settings Schema (accepts nested channels and legacy flat flags)
const notificationSettingsSchema = Joi.object({
  email: Joi.alternatives().try(notificationChannelSchema, Joi.boolean()).optional(),
  sms: Joi.alternatives().try(notificationChannelSchema, Joi.boolean()).optional(),
  push: Joi.alternatives().try(notificationChannelSchema, Joi.boolean()).optional(),
  weeklyReports: Joi.boolean().optional(),
  // legacy / flat top-level flags (optional)
  appointment: Joi.boolean().optional(),
  payment: Joi.boolean().optional(),
  marketing: Joi.boolean().optional(),
  reviews: Joi.boolean().optional(),
  messages: Joi.boolean().optional(),
}).optional();

// Availability Settings Schema
const availabilitySettingsSchema = Joi.object({
  acceptingNewClients: Joi.boolean().optional(),
  currentStatus: Joi.string().valid("available", "busy", "offline", "Available", "Busy", "Away").optional(),
  workingHours: Joi.object({
    monday: workingHoursSchema.required(),
    tuesday: workingHoursSchema.required(),
    wednesday: workingHoursSchema.required(),
    thursday: workingHoursSchema.required(),
    friday: workingHoursSchema.required(),
    saturday: workingHoursSchema.required(),
    sunday: workingHoursSchema.required(),
  }).optional(),
  breakTimes: Joi.array().items(breakTimeSchema).optional(),
  advanceBooking: Joi.object({
    minHoursInAdvance: Joi.number().min(0).max(168).optional(),
    maxDaysInAdvance: Joi.number().min(1).max(365).optional(),
    sameDayBooking: Joi.boolean().optional(),
    lastMinuteBooking: Joi.boolean().optional(),
  }).optional(),
  sessionSettings: Joi.object({
    defaultDuration: Joi.number().min(15).max(480).optional(),
    minDuration: Joi.number().min(15).max(480).optional(),
    maxDuration: Joi.number().min(15).max(480).optional(),
    bufferTime: Joi.number().min(0).max(120).optional(),
    maxSessionsPerDay: Joi.number().min(1).max(50).optional(),
    overlappingAllowed: Joi.boolean().optional(),
  }).optional(),
  cancellation: Joi.object({
    cancellationWindow: Joi.number().min(0).max(168).optional(),
    cancellationPolicy: Joi.string().max(1000).optional(),
    autoCancelUnpaid: Joi.boolean().optional(),
    unpaidBookingWindow: Joi.number().min(0).max(24).optional(),
  }).optional(),
  timeOff: Joi.array().items(timeOffSchema).optional(),
}).optional();

// Calendar Settings Schema
const calendarSettingsSchema = Joi.object({
  defaultView: Joi.string().valid("day", "week", "month").optional(),
  workingDaysOnly: Joi.boolean().optional(),
  showWeekends: Joi.boolean().optional(),
  timeSlotInterval: Joi.number().min(15).max(120).optional(),
  syncWithGoogle: Joi.boolean().optional(),
  googleCalendarId: Joi.string().max(100).optional(),
  syncWithOutlook: Joi.boolean().optional(),
  outlookCalendarId: Joi.string().max(100).optional(),
}).optional();

// Payment Settings Schema
const paymentSettingsSchema = Joi.object({
  acceptedMethods: Joi.array().items(Joi.string().valid("card", "bank_transfer", "paypal", "stripe", "cash")).optional(),
  autoConfirmPayments: Joi.boolean().optional(),
  requirePaymentUpfront: Joi.boolean().optional(),
  partialPaymentAllowed: Joi.boolean().optional(),
  partialPaymentPercentage: Joi.number().min(1).max(99).optional(),
  refundPolicy: Joi.string().max(1000).optional(),
  currency: Joi.string().length(3).optional(),
}).optional();

// Communication Settings Schema
const communicationSettingsSchema = Joi.object({
  preferredContactMethod: Joi.string().valid("email", "phone", "chat").optional(),
  autoResponseEnabled: Joi.boolean().optional(),
  autoResponseMessage: Joi.string().max(500).optional(),
  responseTimeSLA: Joi.number().min(1).max(168).optional(),
  allowVideoCalls: Joi.boolean().optional(),
  allowAudioCalls: Joi.boolean().optional(),
  allowChat: Joi.boolean().optional(),
  allowInPerson: Joi.boolean().optional(),
}).optional();

// Privacy Settings Schema
const privacySettingsSchema = Joi.object({
  showProfilePublicly: Joi.boolean().optional(),
  showEmailPublicly: Joi.boolean().optional(),
  showPhonePublicly: Joi.boolean().optional(),
  showAddressPublicly: Joi.boolean().optional(),
  allowReviews: Joi.boolean().optional(),
  moderateReviews: Joi.boolean().optional(),
  showAvailabilityPublicly: Joi.boolean().optional(),
}).optional();

// Security Settings Schema
const securitySettingsSchema = Joi.object({
  twoFactorAuth: Joi.boolean().optional(),
  sessionTimeout: Joi.number().min(1).max(168).optional(),
  requirePasswordChange: Joi.boolean().optional(),
  passwordExpiryDays: Joi.number().min(1).max(365).optional(),
  loginNotifications: Joi.boolean().optional(),
  ipWhitelist: Joi.boolean().optional(),
  allowedIPs: Joi.array().items(Joi.string().ip()).optional(),
}).optional();

// Professional Settings Schema
const qualificationSchema = Joi.object({
  degree: Joi.string().max(200).optional(),
  institution: Joi.string().max(200).optional(),
  year: Joi.string().max(20).optional(),
  certificate: Joi.string().max(200).optional(),
}).optional();

const membershipSchema = Joi.object({
  organization: Joi.string().max(200).optional(),
  membershipNumber: Joi.string().max(100).optional(),
  validUntil: Joi.date().optional(),
}).optional();

const professionalSettingsSchema = Joi.object({
  consultationTypes: Joi.array().items(Joi.string().max(100)).optional(),
  languages: Joi.array().items(Joi.string().max(50)).optional(),
  specializations: Joi.array().items(Joi.string().max(100)).optional(),
  consultationFees: Joi.object({
    initial: Joi.number().min(0).optional(),
    followUp: Joi.number().min(0).optional(),
    emergency: Joi.number().min(0).optional(),
  }).optional(),
  qualifications: Joi.array().items(qualificationSchema).optional(),
  memberships: Joi.array().items(membershipSchema).optional(),
}).optional();

// Integration Settings Schema
const integrationSettingsSchema = Joi.object({
  zoom: Joi.object({
    enabled: Joi.boolean().optional(),
    apiKey: Joi.string().max(100).optional(),
    apiSecret: Joi.string().max(100).optional(),
    meetingUrlTemplate: Joi.string().max(200).optional(),
  }).optional(),
  googleMeet: Joi.object({
    enabled: Joi.boolean().optional(),
    clientId: Joi.string().max(100).optional(),
    clientSecret: Joi.string().max(100).optional(),
  }).optional(),
  skype: Joi.object({
    enabled: Joi.boolean().optional(),
    username: Joi.string().max(100).optional(),
  }).optional(),
  teams: Joi.object({
    enabled: Joi.boolean().optional(),
    tenantId: Joi.string().max(100).optional(),
    clientId: Joi.string().max(100).optional(),
    clientSecret: Joi.string().max(100).optional(),
  }).optional(),
}).optional();

// Dashboard Settings Schema
const dashboardSettingsSchema = Joi.object({
  defaultView: Joi.string().valid("overview", "calendar", "appointments", "clients").optional(),
  widgets: Joi.array().items(Joi.string().max(50)).optional(),
  refreshInterval: Joi.number().min(10).max(300).optional(),
  showTips: Joi.boolean().optional(),
  compactMode: Joi.boolean().optional(),
}).optional();

// Create Consultant Settings Schema
const createConsultantSettingsSchema = Joi.object({
  consultant: Joi.string().pattern(objectIdPattern).required(),
  notifications: notificationSettingsSchema.optional(),
  availability: availabilitySettingsSchema.optional(),
  calendar: calendarSettingsSchema.optional(),
  payments: paymentSettingsSchema.optional(),
  communication: communicationSettingsSchema.optional(),
  privacy: privacySettingsSchema.optional(),
  security: securitySettingsSchema.optional(),
  professional: professionalSettingsSchema.optional(),
  integrations: integrationSettingsSchema.optional(),
  dashboard: dashboardSettingsSchema.optional(),
}).required();

// Update Consultant Settings Schema
const updateConsultantSettingsSchema = Joi.object({
  notifications: notificationSettingsSchema.optional(),
  availability: availabilitySettingsSchema.optional(),
  calendar: calendarSettingsSchema.optional(),
  payments: paymentSettingsSchema.optional(),
  communication: communicationSettingsSchema.optional(),
  privacy: privacySettingsSchema.optional(),
  security: securitySettingsSchema.optional(),
  professional: professionalSettingsSchema.optional(),
  integrations: integrationSettingsSchema.optional(),
  dashboard: dashboardSettingsSchema.optional(),
}).min(1);

// Consultant Settings ID Schema
const consultantSettingsIdSchema = Joi.object({
  consultantId: Joi.string().pattern(objectIdPattern).required(),
});

// Password Update Schema
const updateConsultantPasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).max(128).required(),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required(),
});

module.exports = {
  createConsultantSettingsSchema,
  updateConsultantSettingsSchema,
  consultantSettingsIdSchema,
  updateConsultantPasswordSchema,
}; 