const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

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

        // Password & Recovery
        password: {
            type: String,
            select: false
        },
        resetPasswordToken: String,
        resetPasswordExpire: Date,


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

// Encrypt password using bcrypt
// Encrypt password using bcrypt
clientSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Match user entered password to hashed password in database
clientSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
clientSchema.methods.getResetPasswordToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};





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
