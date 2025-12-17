// models/consultantSettings.model.js
const mongoose = require("mongoose");

const consultantSettingsSchema = new mongoose.Schema(
  {
    // Reference to Consultant model (primary) - stores the Consultant ID
    consultant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultant",
      required: true,
      unique: true,
    },
    // Optional reference to User for backward compatibility (if consultant was linked to User)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },

    // Notification Settings (NESTED)
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      appointmentReminders: { type: Boolean, default: true },
      clientMsgs: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: true },
    },

    // Availability Settings
    availability: {
      acceptingNewClients: { type: Boolean, default: true },
      currentStatus: {
        type: String,
        enum: ["available", "busy", "offline"],
        default: "available",
      },

      // Working Hours
      workingHours: {
        monday: { enabled: { type: Boolean, default: true }, slots: [{ start: { type: String }, end: { type: String } }], generatedSlots: [{ type: String }] },
        tuesday: { enabled: { type: Boolean, default: true }, slots: [{ start: { type: String }, end: { type: String } }], generatedSlots: [{ type: String }] },
        wednesday: { enabled: { type: Boolean, default: true }, slots: [{ start: { type: String }, end: { type: String } }], generatedSlots: [{ type: String }] },
        thursday: { enabled: { type: Boolean, default: true }, slots: [{ start: { type: String }, end: { type: String } }], generatedSlots: [{ type: String }] },
        friday: { enabled: { type: Boolean, default: true }, slots: [{ start: { type: String }, end: { type: String } }], generatedSlots: [{ type: String }] },
        saturday: { enabled: { type: Boolean, default: false }, slots: [{ start: { type: String }, end: { type: String } }], generatedSlots: [{ type: String }] },
        sunday: { enabled: { type: Boolean, default: false }, slots: [{ start: { type: String }, end: { type: String } }], generatedSlots: [{ type: String }] },
      },




      // Session Settings
      sessionSettings: {
        defaultDuration: { type: Number, default: 60 }, // minutes
        minDuration: { type: Number, default: 30 },
        maxDuration: { type: Number, default: 180 },
        bufferTime: { type: Number, default: 15 }, // minutes between sessions
        maxSessionsPerDay: { type: Number, default: 8 },
        overlappingAllowed: { type: Boolean, default: false },
      },

      // Cancellation Settings
      cancellation: {
        cancellationWindow: { type: Number, default: 24 }, // hours
        cancellationPolicy: { type: String, default: "" },
        autoCancelUnpaid: { type: Boolean, default: false },
        unpaidBookingWindow: { type: Number, default: 2 }, // hours
      },

      // Vacation/Time Off
      timeOff: [{
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        reason: { type: String, default: "" },
        type: { type: String, enum: ["vacation", "sick", "personal", "other"], default: "personal" },
        status: { type: String, enum: ["approved", "pending", "rejected"], default: "approved" },
      }],
    },

    // Calendar Settings
    calendar: {
      defaultView: { type: String, enum: ["day", "week", "month"], default: "week" },
      workingDaysOnly: { type: Boolean, default: true },
      showWeekends: { type: Boolean, default: false },
      timeSlotInterval: { type: Number, default: 30 }, // minutes
      syncWithGoogle: { type: Boolean, default: false },
      googleCalendarId: { type: String, default: "" },
      syncWithOutlook: { type: Boolean, default: false },
      outlookCalendarId: { type: String, default: "" },
    },

    // Payment Settings
    payments: {
      acceptedMethods: [{ type: String, enum: ["card", "bank_transfer", "paypal", "stripe", "cash"] }],
      autoConfirmPayments: { type: Boolean, default: false },
      requirePaymentUpfront: { type: Boolean, default: true },
      partialPaymentAllowed: { type: Boolean, default: false },
      partialPaymentPercentage: { type: Number, default: 50 },
      refundPolicy: { type: String, default: "" },
      currency: { type: String, default: "USD" },
    },

    // Communication Settings
    communication: {
      preferredContactMethod: { type: String, enum: ["email", "phone", "chat"], default: "email" },
      autoResponseEnabled: { type: Boolean, default: false },
      autoResponseMessage: { type: String, default: "" },
      responseTimeSLA: { type: Number, default: 24 }, // hours
      allowVideoCalls: { type: Boolean, default: true },
      allowAudioCalls: { type: Boolean, default: true },
      allowChat: { type: Boolean, default: true },
      allowInPerson: { type: Boolean, default: true },
    },

    // Privacy Settings
    privacy: {
      showProfilePublicly: { type: Boolean, default: true },
      showEmailPublicly: { type: Boolean, default: false },
      showPhonePublicly: { type: Boolean, default: false },
      showAddressPublicly: { type: Boolean, default: false },
      allowReviews: { type: Boolean, default: true },
      moderateReviews: { type: Boolean, default: true },
      showAvailabilityPublicly: { type: Boolean, default: true },
    },



    // Professional Settings
    professional: {
      consultationTypes: [{ type: String }],
      languages: [{ type: String }],
      specializations: [{ type: String }],
      consultationFees: {
        initial: { type: Number, default: 0 },
        followUp: { type: Number, default: 0 },
        emergency: { type: Number, default: 0 },
      },
      qualifications: [{
        degree: { type: String },
        institution: { type: String },
        year: { type: String },
        certificate: { type: String },
      }],
      memberships: [{
        organization: { type: String },
        membershipNumber: { type: String },
        validUntil: { type: Date },
      }],
    },

    // Integration Settings
    integrations: {
      zoom: {
        enabled: { type: Boolean, default: false },
        apiKey: { type: String, default: "" },
        apiSecret: { type: String, default: "" },
        meetingUrlTemplate: { type: String, default: "" },
      },
      googleMeet: {
        enabled: { type: Boolean, default: false },
        clientId: { type: String, default: "" },
        clientSecret: { type: String, default: "" },
      },
      skype: {
        enabled: { type: Boolean, default: false },
        username: { type: String, default: "" },
      },
      teams: {
        enabled: { type: Boolean, default: false },
        tenantId: { type: String, default: "" },
        clientId: { type: String, default: "" },
        clientSecret: { type: String, default: "" },
      },
    },

    // Dashboard Settings
    dashboard: {
      defaultView: { type: String, enum: ["overview", "calendar", "appointments", "clients"], default: "overview" },
      widgets: [{ type: String }],
      refreshInterval: { type: Number, default: 30 }, // seconds
      showTips: { type: Boolean, default: true },
      compactMode: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model("ConsultantSettings", consultantSettingsSchema);
