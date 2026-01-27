const mongoose = require("mongoose");

const adminSettingsSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Profile Information
    profile: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
    },

    // Platform Settings
    platform: {
      name: { type: String, default: "NexFutrr Consultation" },
      description: { type: String, default: "" },
      version: { type: String, default: "1.0.0" },
    },

    // General Settings
    general: {
      platformName: { type: String, default: "Consultation Platform" },
      timezone: { type: String, default: "UTC" },
      dateFormat: { type: String, default: "MM/DD/YYYY" },
      timeFormat: { type: String, enum: ["12h", "24h"], default: "12h" },
      language: { type: String, default: "English" },
      currency: { type: String, default: "USD" },
      defaultPage: { type: String, default: "dashboard" },
    },

    // Notification Settings
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },

      // Notification Types
      appointment: { type: Boolean, default: true },
      payment: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
      system: { type: Boolean, default: true },
    },

    // Security Settings
    security: {
      termsAndConditions: { type: String, default: "" },
      privacyPolicy: { type: String, default: "" },
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model("AdminSettings", adminSettingsSchema);
