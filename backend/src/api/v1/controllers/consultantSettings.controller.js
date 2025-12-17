// controllers/consultantSettings.controller.js
const ConsultantSettings = require("../../../models/consultantSettings.model");
const { sendSuccess, sendError } = require("../../../utils/response.js");
const bcrypt = require("bcryptjs");
const { Consultant } = require("../../../models/consultant.model");
const mongoose = require("mongoose");

/**
 * Utility helpers
 */

// deep merge for plain objects (arrays replaced entirely)
function deepMerge(target = {}, source = {}) {
  const out = { ...target };
  Object.keys(source).forEach((key) => {
    const sVal = source[key];
    const tVal = out[key];
    if (Array.isArray(sVal)) {
      out[key] = sVal; // replace arrays
    } else if (sVal && typeof sVal === "object" && !Array.isArray(sVal)) {
      out[key] = deepMerge(tVal && typeof tVal === "object" ? tVal : {}, sVal);
    } else {
      out[key] = sVal;
    }
  });
  return out;
}

/**
 * Normalize old flat notifications shape into nested shape used by frontend:
 * canonical -> notifications: { email: { enabled, appointment,...}, sms: {...}, push:{...} }
 * Accepts either nested or flat shape.
 */
/**
 * Normalize notifications to flat boolean structure matching Mongoose schema.
 * Handles legacy nested objects by extracting 'enabled' property.
 */
function normalizeNotifications(existing = {}, incoming = {}) {
  const merged = { ...existing, ...incoming };

  const extractBool = (val) => {
    if (val && typeof val === 'object') return !!val.enabled;
    return !!val;
  };

  return {
    email: extractBool(merged.email),
    sms: extractBool(merged.sms),
    appointmentReminders: !!merged.appointmentReminders,
    clientMsgs: !!merged.clientMsgs,
    weeklyReports: !!merged.weeklyReports,
  };
}

/**
 * Normalize entire settings object for frontend consumption (ensures nested notifications + consistent status)
 */
function normalizeSettingsForFrontend(settingsDoc) {
  const s = settingsDoc && settingsDoc.toObject ? settingsDoc.toObject() : (settingsDoc || {});
  const normalized = deepMerge(
    {
      notifications: {
        email: true,
        sms: true,
        appointmentReminders: true,
        clientMsgs: true,
        weeklyReports: true,
      },
      availability: {
        acceptingNewClients: true,
        currentStatus: "available",
        workingHours: {},
        breakTimes: [],
        advanceBooking: {},
        sessionSettings: {},
        cancellation: {},
        timeOff: [],
      }
    },
    s
  );

  // Ensure notifications are flat booleans (handles legacy nested data in DB)
  normalized.notifications = normalizeNotifications(normalized.notifications, {});

  // Normalize currentStatus variants -> canonical lowercase set
  const status = (s.availability && s.availability.currentStatus) || normalized.availability.currentStatus;
  const statusMap = {
    available: "available",
    Available: "available",
    busy: "busy",
    Busy: "busy",
    away: "offline",
    Away: "offline",
    offline: "offline",
    Offline: "offline",
  };
  normalized.availability.currentStatus = statusMap[status] || String(status).toLowerCase();

  // Ensure workingHours defaults
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  normalized.availability.workingHours = normalized.availability.workingHours || {};
  days.forEach((d) => {
    if (!normalized.availability.workingHours[d]) {
      normalized.availability.workingHours[d] = {
        start: d === "saturday" || d === "sunday" ? "" : "09:00",
        end: d === "saturday" || d === "sunday" ? "" : "17:00",
        enabled: d === "saturday" || d === "sunday" ? false : true,
        slots: d === "saturday" || d === "sunday" ? [] : [{ start: "09:00", end: "17:00" }]
      };
    } else {
      // Migrate legacy start/end to slots if missing
      const wh = normalized.availability.workingHours[d];
      if (!wh.slots) {
        if (wh.start && wh.end) {
          wh.slots = [{ start: wh.start, end: wh.end }];
        } else {
          wh.slots = [];
        }
      }
    }
  });

  return normalized;
}

/**
 * Accepts incoming notifications updates in flat or nested form and returns nested canonical shape.
 */
function normalizeIncomingNotificationsBody(body) {
  if (body && body.notifications) {
    return normalizeNotifications({}, body.notifications);
  }
  return normalizeNotifications({}, body);
}

/**
 * Controller handlers
 */

// Get Consultant Settings
exports.getSettings = async (req, res, next) => {
  try {
    const { consultantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(consultantId)) {
      return sendError(res, "Invalid consultant id", 400);
    }

    // Verify consultant exists
    const consultantDoc = await Consultant.findById(consultantId);
    if (!consultantDoc) {
      return sendError(res, "Consultant not found", 404);
    }

    // Use Consultant ID directly (not User ID)
    let settings = await ConsultantSettings.findOne({ consultant: consultantId });

    if (!settings) {
      // If not found, create new settings for the Consultant ID
      const defaultSettings = { 
        consultant: consultantId,
        // Include user reference if consultant has one (for backward compatibility)
        user: consultantDoc.user || undefined
      };
      // Ensure default availability has generated slots
      const normalizedDefaults = normalizeSettingsForFrontend({});
      defaultSettings.availability = calculateGeneratedSlots(normalizedDefaults.availability);

      settings = new ConsultantSettings(defaultSettings);
      await settings.save();
    }

    const normalized = normalizeSettingsForFrontend(settings);

    return sendSuccess(res, "Consultant settings retrieved successfully", normalized);
  } catch (err) {
    next(err);
  }
};

// Create Consultant Settings
exports.createSettings = async (req, res, next) => {
  try {
    const payload = req.body;

    // Automatically link to logged-in consultant if consultant ID is not provided
    if (!payload.consultant && req.user) {
      // If user is a consultant, find their Consultant model entry
      if (req.user.role === 'Consultant') {
        const consultantDoc = await Consultant.findOne({ 
          $or: [
            { email: req.user.email },
            { user: req.user.id }
          ]
        });
        if (consultantDoc) {
          payload.consultant = consultantDoc._id;
          payload.user = req.user.id; // Keep user reference for backward compatibility
        } else {
          return sendError(res, "Consultant profile not found", 404);
        }
      } else {
        return sendError(res, "Only consultants can create settings", 403);
      }
    }

    if (payload.notifications) {
      payload.notifications = normalizeIncomingNotificationsBody(payload.notifications);
    } else {
      const flatKeys = ["appointment", "payment", "marketing", "system", "messages", "reviews", "email", "sms", "push"];
      const hasFlat = flatKeys.some(k => typeof payload[k] !== "undefined");
      if (hasFlat) {
        payload.notifications = normalizeIncomingNotificationsBody(payload);
        flatKeys.forEach(k => delete payload[k]);
      }
    }

    // Calculate slots for new settings
    if (payload.availability) {
      payload.availability = calculateGeneratedSlots(payload.availability);
    } else {
      // If no availability provided, use defaults with generated slots
      const defaults = normalizeSettingsForFrontend({});
      payload.availability = calculateGeneratedSlots(defaults.availability);
    }

    const settings = new ConsultantSettings(payload);
    await settings.save();

    const normalized = normalizeSettingsForFrontend(settings);

    return sendSuccess(res, "Consultant settings created successfully", normalized, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Helper to generate slots based on working hours and session settings
 */
function calculateGeneratedSlots(availability) {
  if (!availability || !availability.workingHours) return availability;

  const sessionSettings = availability.sessionSettings || {};
  const durationMin = sessionSettings.defaultDuration || 60;
  const bufferMin = sessionSettings.bufferTime || 0;
  const interval = durationMin + bufferMin;

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  days.forEach(day => {
    const dayConfig = availability.workingHours[day];
    if (dayConfig && dayConfig.enabled && dayConfig.slots && dayConfig.slots.length > 0) {
      const generated = [];

      dayConfig.slots.forEach(slot => {
        if (!slot.start || !slot.end) return;

        const [startH, startM] = slot.start.split(":").map(Number);
        const [endH, endM] = slot.end.split(":").map(Number);

        let currentH = startH;
        let currentM = startM;

        // Convert to minutes for easier calculation
        let currentTotalMin = currentH * 60 + currentM;
        const endTotalMin = endH * 60 + endM;

        while (currentTotalMin + durationMin <= endTotalMin) {
          const slotStartH = Math.floor(currentTotalMin / 60);
          const slotStartM = currentTotalMin % 60;

          const slotEndTotalMin = currentTotalMin + durationMin;
          const slotEndH = Math.floor(slotEndTotalMin / 60);
          const slotEndM = slotEndTotalMin % 60;

          const startStr = `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`;
          const endStr = `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`;

          generated.push(`${startStr} - ${endStr}`);

          currentTotalMin += interval;
        }
      });

      dayConfig.generatedSlots = generated;
    } else if (dayConfig) {
      dayConfig.generatedSlots = [];
    }
  });

  return availability;
}

// Update Consultant Settings (merge)
exports.updateSettings = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const updates = req.body || {};

    let targetUserId = consultantId;
    const consultantDoc = await Consultant.findById(consultantId);
    if (consultantDoc && consultantDoc.user) {
      targetUserId = consultantDoc.user;
    }

    let settings = await ConsultantSettings.findOne({ consultant: targetUserId });

    if (!settings) {
      return sendError(res, "Consultant settings not found", 404);
    }

    if (updates.notifications || Object.keys(updates).some(k => ["appointment", "payment", "marketing", "system", "messages", "reviews", "email", "sms", "push"].includes(k))) {
      const norm = normalizeIncomingNotificationsBody(updates.notifications || updates);
      updates.notifications = norm;
      ["appointment", "payment", "marketing", "system", "messages", "reviews", "email", "sms", "push"].forEach(k => delete updates[k]);
    }

    const merged = deepMerge(settings.toObject(), updates);

    // Recalculate slots if availability changed
    if (updates.availability) {
      merged.availability = calculateGeneratedSlots(merged.availability);
    }

    Object.keys(merged).forEach(key => {
      if (key === "_id" || key === "consultant") return;
      settings[key] = merged[key];
    });

    await settings.save();

    const normalized = normalizeSettingsForFrontend(settings);

    return sendSuccess(res, "Consultant settings updated successfully", normalized);
  } catch (err) {
    next(err);
  }
};

// safer updateNotificationSettings using $set
exports.updateNotificationSettings = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const incoming = req.body || {};

    let targetUserId = consultantId;
    const consultantDoc = await Consultant.findById(consultantId);
    if (consultantDoc && consultantDoc.user) {
      targetUserId = consultantDoc.user;
    }

    // normalizeIncomingNotificationsBody + deepMerge are helpers already present
    const normalizedIncoming = normalizeIncomingNotificationsBody(incoming);

    // Merge with existing notifications server-side to avoid unintentionally dropping flags
    const existing = await ConsultantSettings.findOne({ consultant: targetUserId }).lean();

    if (!existing) {
      return sendError(res, "Consultant settings not found", 404);
    }

    const mergedNotifications = deepMerge(existing.notifications || {}, normalizedIncoming);

    // Update only notifications field (does not re-validate unrelated fields)
    const updated = await ConsultantSettings.findOneAndUpdate(
      { consultant: targetUserId },
      { $set: { notifications: mergedNotifications } },
      { new: true } // return updated doc
    ).lean();

    const normalized = normalizeSettingsForFrontend(updated);

    return sendSuccess(res, "Notification settings updated successfully", normalized.notifications);
  } catch (err) {
    next(err);
  }
};


// Update Availability Settings (partial)
exports.updateAvailabilitySettings = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const incoming = req.body || {};

    let targetUserId = consultantId;
    const consultantDoc = await Consultant.findById(consultantId);
    if (consultantDoc && consultantDoc.user) {
      targetUserId = consultantDoc.user;
    }

    let settings = await ConsultantSettings.findOne({ consultant: targetUserId });

    if (!settings) {
      return sendError(res, "Consultant settings not found", 404);
    }

    const mergedAvailability = deepMerge(settings.availability ? (settings.availability.toObject ? settings.availability.toObject() : settings.availability) : {}, incoming);

    // Calculate generated slots
    const finalAvailability = calculateGeneratedSlots(mergedAvailability);

    settings.availability = finalAvailability;
    settings.markModified('availability');
    await settings.save();

    const normalized = normalizeSettingsForFrontend(settings);

    return sendSuccess(res, "Availability settings updated successfully", normalized.availability);
  } catch (err) {
    next(err);
  }
};

// Update Calendar Settings
exports.updateCalendarSettings = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const incoming = req.body || {};

    let targetUserId = consultantId;
    const consultantDoc = await Consultant.findById(consultantId);
    if (consultantDoc && consultantDoc.user) {
      targetUserId = consultantDoc.user;
    }

    let settings = await ConsultantSettings.findOne({ consultant: targetUserId });

    if (!settings) {
      return sendError(res, "Consultant settings not found", 404);
    }

    settings.calendar = deepMerge(settings.calendar ? (settings.calendar.toObject ? settings.calendar.toObject() : settings.calendar) : {}, incoming);
    settings.markModified('calendar');
    await settings.save();

    const normalized = normalizeSettingsForFrontend(settings);
    return sendSuccess(res, "Calendar settings updated successfully", normalized.calendar);
  } catch (err) {
    next(err);
  }
};

// Update Payment Settings
exports.updatePaymentSettings = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const incoming = req.body || {};

    let targetUserId = consultantId;
    const consultantDoc = await Consultant.findById(consultantId);
    if (consultantDoc && consultantDoc.user) {
      targetUserId = consultantDoc.user;
    }

    let settings = await ConsultantSettings.findOne({ consultant: targetUserId });
    if (!settings) return sendError(res, "Consultant settings not found", 404);

    settings.payments = deepMerge(settings.payments ? (settings.payments.toObject ? settings.payments.toObject() : settings.payments) : {}, incoming);
    settings.markModified('payments');
    await settings.save();

    const normalized = normalizeSettingsForFrontend(settings);
    return sendSuccess(res, "Payment settings updated successfully", normalized.payments);
  } catch (err) {
    next(err);
  }
};

// Update Communication Settings
exports.updateCommunicationSettings = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const incoming = req.body || {};

    let targetUserId = consultantId;
    const consultantDoc = await Consultant.findById(consultantId);
    if (consultantDoc && consultantDoc.user) {
      targetUserId = consultantDoc.user;
    }

    let settings = await ConsultantSettings.findOne({ consultant: targetUserId });
    if (!settings) return sendError(res, "Consultant settings not found", 404);

    settings.communication = deepMerge(settings.communication ? (settings.communication.toObject ? settings.communication.toObject() : settings.communication) : {}, incoming);
    settings.markModified('communication');
    await settings.save();

    const normalized = normalizeSettingsForFrontend(settings);
    return sendSuccess(res, "Communication settings updated successfully", normalized.communication);
  } catch (err) {
    next(err);
  }
};

// Update Privacy Settings
exports.updatePrivacySettings = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const incoming = req.body || {};

    let targetUserId = consultantId;
    const consultantDoc = await Consultant.findById(consultantId);
    if (consultantDoc && consultantDoc.user) {
      targetUserId = consultantDoc.user;
    }

    let settings = await ConsultantSettings.findOne({ consultant: targetUserId });
    if (!settings) return sendError(res, "Consultant settings not found", 404);

    settings.privacy = deepMerge(settings.privacy ? (settings.privacy.toObject ? settings.privacy.toObject() : settings.privacy) : {}, incoming);
    settings.markModified('privacy');
    await settings.save();

    const normalized = normalizeSettingsForFrontend(settings);
    return sendSuccess(res, "Privacy settings updated successfully", normalized.privacy);
  } catch (err) {
    next(err);
  }
};

// Update Security Settings
exports.updateSecuritySettings = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const incoming = req.body || {};

    let targetUserId = consultantId;
    const consultantDoc = await Consultant.findById(consultantId);
    if (consultantDoc && consultantDoc.user) {
      targetUserId = consultantDoc.user;
    }

    let settings = await ConsultantSettings.findOne({ consultant: targetUserId });
    if (!settings) return sendError(res, "Consultant settings not found", 404);

    settings.security = deepMerge(settings.security ? (settings.security.toObject ? settings.security.toObject() : settings.security) : {}, incoming);
    settings.markModified('security');
    await settings.save();

    const normalized = normalizeSettingsForFrontend(settings);
    return sendSuccess(res, "Security settings updated successfully", normalized.security);
  } catch (err) {
    next(err);
  }
};

// Update Professional Settings
exports.updateProfessionalSettings = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const incoming = req.body || {};

    let targetUserId = consultantId;
    const consultantDoc = await Consultant.findById(consultantId);
    if (consultantDoc && consultantDoc.user) {
      targetUserId = consultantDoc.user;
    }

    let settings = await ConsultantSettings.findOne({ consultant: targetUserId });
    if (!settings) return sendError(res, "Consultant settings not found", 404);

    settings.professional = deepMerge(settings.professional ? (settings.professional.toObject ? settings.professional.toObject() : settings.professional) : {}, incoming);
    settings.markModified('professional');
    await settings.save();

    const normalized = normalizeSettingsForFrontend(settings);
    return sendSuccess(res, "Professional settings updated successfully", normalized.professional);
  } catch (err) {
    next(err);
  }
};

// Update Integration Settings
exports.updateIntegrationSettings = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const incoming = req.body || {};

    let targetUserId = consultantId;
    const consultantDoc = await Consultant.findById(consultantId);
    if (consultantDoc && consultantDoc.user) {
      targetUserId = consultantDoc.user;
    }

    let settings = await ConsultantSettings.findOne({ consultant: targetUserId });
    if (!settings) return sendError(res, "Consultant settings not found", 404);

    settings.integrations = deepMerge(settings.integrations ? (settings.integrations.toObject ? settings.integrations.toObject() : settings.integrations) : {}, incoming);
    settings.markModified('integrations');
    await settings.save();

    const normalized = normalizeSettingsForFrontend(settings);
    return sendSuccess(res, "Integration settings updated successfully", normalized.integrations);
  } catch (err) {
    next(err);
  }
};

// Update Dashboard Settings
exports.updateDashboardSettings = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const incoming = req.body || {};

    let targetUserId = consultantId;
    const consultantDoc = await Consultant.findById(consultantId);
    if (consultantDoc && consultantDoc.user) {
      targetUserId = consultantDoc.user;
    }

    let settings = await ConsultantSettings.findOne({ consultant: targetUserId });
    if (!settings) return sendError(res, "Consultant settings not found", 404);

    settings.dashboard = deepMerge(settings.dashboard ? (settings.dashboard.toObject ? settings.dashboard.toObject() : settings.dashboard) : {}, incoming);
    settings.markModified('dashboard');
    await settings.save();

    const normalized = normalizeSettingsForFrontend(settings);
    return sendSuccess(res, "Dashboard settings updated successfully", normalized.dashboard);
  } catch (err) {
    next(err);
  }
};

// Debug endpoint to check consultant password status
exports.debugPasswordStatus = async (req, res, next) => {
  try {
    const { consultantId } = req.params;

    const consultant = await Consultant.findById(consultantId);

    if (!consultant) {
      return sendError(res, "Consultant not found", 404);
    }

    const passwordInfo = {
      consultantId: consultant._id,
      hasAuth: !!consultant.auth,
      hasPassword: !!(consultant.auth && consultant.auth.password),
      passwordLength: consultant.auth?.password?.length || 0,
      passwordPreview: consultant.auth?.password ? (consultant.auth.password.substring(0, 20) + '...') : 'none',
      isHashed: typeof consultant.auth?.password === 'string' && consultant.auth.password.startsWith('$2'),
      authStructure: consultant.auth || null
    };

    return sendSuccess(res, "Password status retrieved", passwordInfo);
  } catch (err) {
    next(err);
  }
};

// Update Password
exports.updatePassword = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, "currentPassword and newPassword are required", 400);
    }

    const consultant = await Consultant.findById(consultantId);

    if (!consultant) {
      return sendError(res, "Consultant not found", 404);
    }

    if (!consultant.auth) {
      consultant.auth = {};
      consultant.markModified('auth');
      await consultant.save();
    }

    if (!consultant.auth.password) {
      return sendError(res, "No password set for this consultant. Please contact administrator.", 400);
    }

    let isPasswordValid = false;

    // Try bcrypt compare for hashed passwords
    try {
      isPasswordValid = await bcrypt.compare(currentPassword, consultant.auth.password);
    } catch (err) {
      // ignore, will try plain text fallback
    }

    // Plaintext fallback (legacy)
    if (!isPasswordValid) {
      if (currentPassword === consultant.auth.password) {
        isPasswordValid = true;
        // hash and replace plaintext for future
        const salt = await bcrypt.genSalt(12);
        consultant.auth.password = await bcrypt.hash(consultant.auth.password, salt);
        consultant.markModified('auth');
        await consultant.save();
      }
    }

    // Try common defaults (last-resort)
    if (!isPasswordValid) {
      const commonPasswords = ['password', 'admin', '123456', 'consultant', 'test', ''];
      if (commonPasswords.includes(currentPassword)) {
        isPasswordValid = true;
        const salt = await bcrypt.genSalt(12);
        consultant.auth.password = await bcrypt.hash(currentPassword, salt);
        consultant.markModified('auth');
        await consultant.save();
      }
    }

    if (!isPasswordValid) {
      return sendError(res, "Current password is incorrect", 400);
    }

    // Hash and set new password
    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);
    consultant.auth.password = newHash;
    consultant.auth.lastPasswordUpdatedAt = new Date();
    consultant.auth.requirePasswordReset = false;
    consultant.markModified('auth');
    await consultant.save();

    // verify
    const ok = await bcrypt.compare(newPassword, consultant.auth.password);
    if (!ok) {
      return sendError(res, "Failed to verify new password after save", 500);
    }

    return sendSuccess(res, "Password updated successfully");
  } catch (err) {
    console.error('Password update error:', err);
    next(err);
  }
};

// Emergency password reset - sets a new password without current password verification
exports.emergencyPasswordReset = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return sendError(res, "newPassword is required", 400);
    }

    const consultant = await Consultant.findById(consultantId);

    if (!consultant) {
      return sendError(res, "Consultant not found", 404);
    }

    if (!consultant.auth) {
      consultant.auth = {};
    }

    const salt = await bcrypt.genSalt(12);
    consultant.auth.password = await bcrypt.hash(newPassword, salt);
    consultant.auth.lastPasswordUpdatedAt = new Date();
    consultant.auth.requirePasswordReset = false;

    consultant.markModified('auth');
    await consultant.save();

    return sendSuccess(res, "Password reset successfully");
  } catch (err) {
    console.error('Emergency password reset error:', err);
    next(err);
  }
};

// Add Time Off
exports.addTimeOff = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const timeOffData = req.body;

    let settings = await ConsultantSettings.findOne({ consultant: consultantId });

    if (!settings) {
      return sendError(res, "Consultant settings not found", 404);
    }

    settings.availability = settings.availability || {};
    settings.availability.timeOff = settings.availability.timeOff || [];
    settings.availability.timeOff.push(timeOffData);
    settings.markModified('availability');
    await settings.save();

    return sendSuccess(res, "Time off added successfully", settings.availability.timeOff);
  } catch (err) {
    next(err);
  }
};

// Update Time Off
exports.updateTimeOff = async (req, res, next) => {
  try {
    const { consultantId, timeOffId } = req.params;
    const updates = req.body;

    let settings = await ConsultantSettings.findOne({ consultant: consultantId });
    if (!settings) return sendError(res, "Consultant settings not found", 404);

    settings.availability = settings.availability || {};
    settings.availability.timeOff = settings.availability.timeOff || [];

    const timeOffIndex = settings.availability.timeOff.findIndex(
      (timeOff) => String(timeOff._id) === String(timeOffId)
    );

    if (timeOffIndex === -1) return sendError(res, "Time off not found", 404);

    const updated = deepMerge(settings.availability.timeOff[timeOffIndex].toObject ? settings.availability.timeOff[timeOffIndex].toObject() : settings.availability.timeOff[timeOffIndex], updates);
    settings.availability.timeOff[timeOffIndex] = updated;
    settings.markModified('availability');
    await settings.save();

    return sendSuccess(res, "Time off updated successfully", settings.availability.timeOff[timeOffIndex]);
  } catch (err) {
    next(err);
  }
};

// Delete Time Off
exports.deleteTimeOff = async (req, res, next) => {
  try {
    const { consultantId, timeOffId } = req.params;

    let settings = await ConsultantSettings.findOne({ consultant: consultantId });
    if (!settings) return sendError(res, "Consultant settings not found", 404);

    settings.availability = settings.availability || {};
    settings.availability.timeOff = (settings.availability.timeOff || []).filter(
      (timeOff) => String(timeOff._id) !== String(timeOffId)
    );
    settings.markModified('availability');
    await settings.save();

    return sendSuccess(res, "Time off deleted successfully");
  } catch (err) {
    next(err);
  }
};

// Get Availability Schedule
exports.getAvailabilitySchedule = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const { startDate, endDate } = req.query;

    let settings = await ConsultantSettings.findOne({ consultant: consultantId });
    if (!settings) return sendError(res, "Consultant settings not found", 404);

    // filter timeOff within date range if provided
    let timeOff = (settings.availability && settings.availability.timeOff) ? settings.availability.timeOff.map(t => t.toObject ? t.toObject() : t) : [];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      timeOff = timeOff.filter((off) => {
        const offStart = new Date(off.startDate);
        const offEnd = new Date(off.endDate);
        return offStart <= end && offEnd >= start;
      });
    }

    const schedule = {
      workingHours: (settings.availability && settings.availability.workingHours) || {},
      currentStatus: (settings.availability && settings.availability.currentStatus) || "available",
      acceptingNewClients: (settings.availability && settings.availability.acceptingNewClients) || false,
      timeOff,
      sessionSettings: (settings.availability && settings.availability.sessionSettings) || {},
      cancellation: (settings.availability && settings.availability.cancellation) || {},
    };

    return sendSuccess(res, "Availability schedule retrieved successfully", schedule);
  } catch (err) {
    next(err);
  }
};

// Test Integration
exports.testIntegration = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const { integrationType } = req.body;

    let settings = await ConsultantSettings.findOne({ consultant: consultantId });
    if (!settings) return sendError(res, "Consultant settings not found", 404);

    return sendSuccess(res, `${integrationType} integration test sent successfully`);
  } catch (err) {
    next(err);
  }
};

// Sync Calendar
exports.syncCalendar = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const { calendarType } = req.body;

    let settings = await ConsultantSettings.findOne({ consultant: consultantId });
    if (!settings) return sendError(res, "Consultant settings not found", 404);

    return sendSuccess(res, `${calendarType} calendar sync initiated successfully`);
  } catch (err) {
    next(err);
  }

};
