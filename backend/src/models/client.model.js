const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const clientSchema = new mongoose.Schema(
    {
        // Link to User account (optional - only for backward compatibility)
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            unique: true,
            sparse: true, // Allow null for backward compatibility
        },

        // Basic identity
        fullName: { type: String, required: true, trim: true },

        // Authentication fields (required for Client)
        email: {
            type: String,
            lowercase: true,
            unique: true,
            required: true,
            trim: true,
        },
        mobile: { type: String, required: true, trim: true },

    


        // OTP Fields
        otp: { type: String },
        otpExpires: { type: Date },

        lastLogin: { type: Date },

        // Client specific fields
        dob: { type: Date },
        address: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        country: { type: String, default: "" },
        pincode: { type: String, default: "" },
        emergencyContact: { type: String, default: "" },
        avatar: { type: String, default: "" },

        // Status
        status: {
            type: String,
            enum: ["Active", "Inactive", "Blocked", "Pending"],
            default: "Active",
        },
    },
    {
        timestamps: true,
    }
);





// Generate JWT token
clientSchema.methods.generateAuthToken = function () {
    return jwt.sign(
        { id: this._id, email: this.email, role: "Client" },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "24h",
        }
    );
};

module.exports = mongoose.model("Client", clientSchema);
