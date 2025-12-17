// server/src/models/clientConsultant.model.js
const mongoose = require("mongoose");

const clientConsultantSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // This references the Consultant model. If you want polymorphic refs
    // (sometimes stored in User), consider using refPath and an additional field,
    // or keep current approach and use helper to resolve when missing from Consultant.
    consultant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    linkedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index to ensure unique client-consultant pairs
clientConsultantSchema.index({ client: 1, consultant: 1 }, { unique: true });

// Index for efficient queries
clientConsultantSchema.index({ client: 1 });
clientConsultantSchema.index({ consultant: 1 });
clientConsultantSchema.index({ status: 1 });

// Add static method to count clients for a consultant
clientConsultantSchema.statics.countClientsForConsultant = async function (consultantId) {
  return this.countDocuments({
    consultant: consultantId,
    status: "Active",
  });
};

module.exports = mongoose.model("ClientConsultant", clientConsultantSchema);
