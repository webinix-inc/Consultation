const AdminSettings = require("../../../models/adminSettings.model");
const { sendSuccess, sendError } = require("../../../utils/response.js");
const bcrypt = require("bcryptjs");
const User = require("../../../models/user.model");

// Get Admin Settings
exports.getSettings = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    let settings = await AdminSettings.findOne({ admin: adminId });

    if (!settings) {
      // Create default settings if none exist
      settings = new AdminSettings({ admin: adminId });
      await settings.save();
    }

    return sendSuccess(res, "Admin settings retrieved successfully", settings);
  } catch (err) {
    next(err);
  }
};

// Create Admin Settings
exports.createSettings = async (req, res, next) => {
  try {
    const settings = new AdminSettings(req.body);
    await settings.save();

    return sendSuccess(res, "Admin settings created successfully", settings, 201);
  } catch (err) {
    next(err);
  }
};

// Update Admin Settings
exports.updateSettings = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const updates = req.body;

    let settings = await AdminSettings.findOne({ admin: adminId });

    if (!settings) {
      return sendError(res, "Admin settings not found", 404);
    }

    // Merge updates with existing settings
    Object.keys(updates).forEach(key => {
      if (updates[key] && typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
        settings[key] = { ...settings[key], ...updates[key] };
      } else {
        settings[key] = updates[key];
      }
    });

    await settings.save();

    return sendSuccess(res, "Admin settings updated successfully", settings);
  } catch (err) {
    next(err);
  }
};

// Update Profile Settings
exports.updateProfileSettings = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    let settings = await AdminSettings.findOne({ admin: adminId });

    if (!settings) {
      return sendError(res, "Admin settings not found", 404);
    }

    settings.profile = { ...settings.profile, ...req.body };
    await settings.save();

    return sendSuccess(res, "Profile settings updated successfully", settings.profile);
  } catch (err) {
    next(err);
  }
};

// Update Platform Settings
exports.updatePlatformSettings = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    let settings = await AdminSettings.findOne({ admin: adminId });

    if (!settings) {
      return sendError(res, "Admin settings not found", 404);
    }

    settings.platform = { ...settings.platform, ...req.body };
    await settings.save();

    return sendSuccess(res, "Platform settings updated successfully", settings.platform);
  } catch (err) {
    next(err);
  }
};

// Update General Settings
exports.updateGeneralSettings = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    let settings = await AdminSettings.findOne({ admin: adminId });

    if (!settings) {
      return sendError(res, "Admin settings not found", 404);
    }

    settings.general = { ...settings.general, ...req.body };
    await settings.save();

    return sendSuccess(res, "General settings updated successfully", settings.general);
  } catch (err) {
    next(err);
  }
};

// Update Notification Settings
exports.updateNotificationSettings = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    let settings = await AdminSettings.findOne({ admin: adminId });

    if (!settings) {
      return sendError(res, "Admin settings not found", 404);
    }

    settings.notifications = { ...settings.notifications, ...req.body };
    await settings.save();

    return sendSuccess(res, "Notification settings updated successfully", settings.notifications);
  } catch (err) {
    next(err);
  }
};
