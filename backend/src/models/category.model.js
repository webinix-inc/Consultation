const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    rating: { type: Number, default: 0 },
    consultants: { type: Number, default: 0 },
    clients: { type: Number, default: 0 },
    monthlyRevenue: { type: Number, default: 0 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);


