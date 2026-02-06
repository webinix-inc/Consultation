/**
 * GDPR Data Retention - Inactive Users
 * Run monthly via cron: node backend/scripts/retention-inactive-users.js
 *
 * Identifies users with no login for 2+ years and logs them for review.
 * Does NOT auto-delete; manual review required before anonymization/deletion.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const INACTIVE_DAYS = 730; // 2 years

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log("Connected to DB");

    const Client = require("../src/models/client.model");
    const Consultant = require("../src/models/consultant.model").Consultant;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - INACTIVE_DAYS);

    const [inactiveClients, inactiveConsultants] = await Promise.all([
      Client.find({ lastLogin: { $lt: cutoff }, status: "Active" })
        .select("_id fullName email lastLogin createdAt")
        .lean(),
      Consultant.find({ lastLogin: { $lt: cutoff }, status: "Active" })
        .select("_id name email lastLogin createdAt")
        .lean(),
    ]);

    console.log(`\nInactive users (no login since ${cutoff.toISOString().split("T")[0]}):`);
    console.log(`Clients: ${inactiveClients.length}`);
    console.log(`Consultants: ${inactiveConsultants.length}`);

    if (inactiveClients.length > 0) {
      console.log("\n--- Inactive Clients ---");
      inactiveClients.forEach((c) => {
        console.log(`  ${c._id} | ${c.fullName} | ${c.email} | lastLogin: ${c.lastLogin || "never"}`);
      });
    }

    if (inactiveConsultants.length > 0) {
      console.log("\n--- Inactive Consultants ---");
      inactiveConsultants.forEach((c) => {
        console.log(`  ${c._id} | ${c.name} | ${c.email} | lastLogin: ${c.lastLogin || "never"}`);
      });
    }

    console.log("\nReview complete. Manual action required for anonymization/deletion.");
  } catch (err) {
    console.error("Retention job error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
