const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    message: { type: String, required: true },
    avatar: { type: String, default: "" },
    read: { type: Boolean, default: false },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Specific user
    recipientRole: { type: String, enum: ["Admin", "Consultant", "Client"] }, // Role-based (e.g. all Admins)
    type: { type: String, enum: ["system", "appointment", "registration", "payment", "other"], default: "other" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);









