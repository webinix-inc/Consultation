#!/usr/bin/env node
/**
 * Create one Admin user with email and password.
 * Run: node scripts/create-admin.js
 *
 * Uses env vars (optional):
 *   ADMIN_EMAIL   - default: admin@aob.com
 *   ADMIN_PASSWORD - default: Admin@123
 *   ADMIN_NAME    - default: Admin
 *   ADMIN_MOBILE  - default: 9000090000
 */
require("dotenv").config();
const mongoose = require("mongoose");
const crypto = require("crypto");
const User = require("../src/models/user.model");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@aob.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";
const ADMIN_MOBILE = process.env.ADMIN_MOBILE || "9000090000";

async function createAdmin() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/consultation_db";
    await mongoose.connect(uri);
    console.log("Connected to DB");

    const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (existing) {
      console.log(`Admin already exists: ${ADMIN_EMAIL}`);
      console.log("To reset password, update the user in User Management or delete and re-run this script.");
      process.exit(0);
      return;
    }

    const userId = "ADM-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    const admin = await User.create({
      userId,
      fullName: ADMIN_NAME,
      email: ADMIN_EMAIL.toLowerCase(),
      mobile: ADMIN_MOBILE,
      password: ADMIN_PASSWORD,
      role: "Admin",
      status: "Active",
      verificationStatus: "Approved",
    });

    console.log("\n=== Admin created successfully ===");
    console.log("Email:", admin.email);
    console.log("Password:", ADMIN_PASSWORD);
    console.log("User ID:", admin.userId);
    console.log("\nUse these credentials to login via Email & Password in the Admin portal.");
    console.log("================================\n");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

createAdmin();
