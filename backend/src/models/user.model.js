const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    mobile: { type: String, required: true },
    role: {
      type: String,
      enum: ["Admin", "Employee"], // User model is only for Admin and Employee
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    verificationStatus: {
      type: String,
      enum: ["Approved", "Pending", "Rejected", "Blocked"],
      default: "Pending",
    },

    profileImage: { type: String, default: "" },

    lastLogin: { type: Date },



    // OTP Fields
    otp: { type: String },
    otpExpires: { type: Date },

  },
  {
    timestamps: { createdAt: true, updatedAt: "updatedAt" },
  }
);





// Generate JWT token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    }
  );
};


module.exports = mongoose.model("User", userSchema);
