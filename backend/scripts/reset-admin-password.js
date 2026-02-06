#!/usr/bin/env node
/**
 * Reset Admin password for email/password login.
 * Run: node scripts/reset-admin-password.js
 *
 * Uses env vars (optional):
 *   ADMIN_EMAIL    - default: admin@aob.com
 *   ADMIN_PASSWORD - default: Admin@123
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/user.model");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@aob.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";

async function resetPassword() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/consultation_db";
    await mongoose.connect(uri);
    console.log("Connected to DB");

    const admin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase(), role: "Admin" }).select("+password");
    if (!admin) {
      console.log(`No Admin found with email: ${ADMIN_EMAIL}`);
      console.log("Run: node scripts/create-admin.js to create one.");
      process.exit(1);
      return;
    }

    admin.password = ADMIN_PASSWORD;
    await admin.save();

    console.log("\n=== Password reset successfully ===");
    console.log("Email:", admin.email);
    console.log("New Password:", ADMIN_PASSWORD);
    console.log("\nUse these credentials to login via Email & Password.");
    console.log("================================\n");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

resetPassword();
