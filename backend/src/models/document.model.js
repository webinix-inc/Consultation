const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Medical Report", "Consultation Notes", "Prescription", "Invoice", "Lab Results", "Treatment Plan", "Other"],
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    consultant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultant",
      required: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileKey: {
      type: String,
      required: true, // S3 key for file management
    },
    fileName: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true, // Size in bytes
    },
    mimeType: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["Active", "Archived", "Deleted"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
documentSchema.index({ client: 1, status: 1 });
documentSchema.index({ consultant: 1, status: 1 });
documentSchema.index({ appointment: 1 });
documentSchema.index({ type: 1 });
documentSchema.index({ uploadedBy: 1 });

// Virtual for formatted file size
documentSchema.virtual("formattedSize").get(function () {
  const bytes = this.fileSize;
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
});

const Document = mongoose.model("Document", documentSchema);

module.exports = { Document };

