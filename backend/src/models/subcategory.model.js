const mongoose = require("mongoose");

const subcategorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    rating: { type: Number, default: 0 },
    consultants: { type: Number, default: 0 },
    clients: { type: Number, default: 0 },
    monthlyRevenue: { type: Number, default: 0 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

// Index for efficient queries
subcategorySchema.index({ parentCategory: 1 });

module.exports = mongoose.model("SubCategory", subcategorySchema);

