const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Core fields
    name: { type: String, required: true },
    message: { type: String, required: true },
    avatar: { type: String, default: "" },
    read: { type: Boolean, default: false },

    // Recipient targeting (MUTUALLY EXCLUSIVE)
    // Option 1: Specific user
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Option 2: All users of a role
    recipientRole: { type: String, enum: ["Admin", "Consultant", "Client"] },
    // Option 3: Global broadcast (Admin only)
    isGlobal: { type: Boolean, default: false },

    // Enhanced categorization
    type: {
      type: String,
      enum: ["system", "appointment", "registration", "payment", "message", "reminder", "alert", "other"],
      default: "other"
    },
    category: {
      type: String,
      enum: ["general", "appointments", "payments", "messages", "system", "reminders"],
      default: "general"
    },

    // Priority for visual styling
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal"
    },

    // Action link for navigation
    actionUrl: { type: String, default: "" },
    actionLabel: { type: String, default: "" },

    // Reference to related entity
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    relatedType: { type: String, enum: ["appointment", "payment", "user", "document", "other"] },

    // Sender info (for consultant-to-client messaging)
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    senderRole: { type: String, enum: ["Admin", "Consultant", "Client", "System"] },

    // Metadata for additional context
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Expiration for auto-cleanup
    expiresAt: { type: Date },

    // Tracking
    readAt: { type: Date },
  },
  { timestamps: true }
);

// Index for efficient queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipientRole: 1, read: 1, createdAt: -1 });
notificationSchema.index({ isGlobal: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model("Notification", notificationSchema);
