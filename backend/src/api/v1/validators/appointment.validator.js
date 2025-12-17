// validators/appointment.validator.js
const Joi = require("joi");

// Accept either startAt/endAt (ISO) OR date + timeStart/timeEnd ("HH:mm")
const createAppointmentSchema = Joi.object({
  client: Joi.string().required(),
  consultant: Joi.string().required(),
  category: Joi.string().allow("", null),
  session: Joi.string().valid("Video Call").default("Video Call"),
  // Legacy
  date: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeStart: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  timeEnd: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  // Preferred
  startAt: Joi.date().iso().optional(),
  endAt: Joi.date().iso().optional(),

  status: Joi.string().valid("Upcoming", "Confirmed", "Completed", "Cancelled").default("Upcoming"),
  reason: Joi.string().allow("", null),
  notes: Joi.string().allow("", null),
  fee: Joi.number().min(0).optional(),
  payment: Joi.object({
    amount: Joi.number().min(0).optional(),
    status: Joi.string().valid("Pending", "Success", "Failed").optional(),
    method: Joi.string().optional(),
    transactionId: Joi.string().optional(),
  }).optional(),
});

const updateAppointmentSchema = Joi.object({
  client: Joi.string().optional(),
  consultant: Joi.string().optional(),
  category: Joi.string().optional(),
  session: Joi.string().valid("Video Call").optional(),
  date: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeStart: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  timeEnd: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  startAt: Joi.date().iso().optional(),
  endAt: Joi.date().iso().optional(),
  status: Joi.string().valid("Upcoming", "Confirmed", "Completed", "Cancelled").optional(),
  reason: Joi.string().allow("", null).optional(),
  notes: Joi.string().allow("", null).optional(),
  fee: Joi.number().min(0).optional(),
});

const availableSlotsQuerySchema = Joi.object({
  consultant: Joi.string().required(),
  date: Joi.string().required().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotDurationMin: Joi.number().integer().min(15).max(480).optional(),
  startHour: Joi.number().integer().min(0).max(23).optional(),
  endHour: Joi.number().integer().min(0).max(23).optional(),
});

module.exports = {
  createAppointmentSchema,
  updateAppointmentSchema,
  availableSlotsQuerySchema,
};
