const mongoose = require("mongoose");
const User = require("./src/models/user.model");
const Appointment = require("./src/models/appointment.model");
const Transaction = require("./src/models/transaction.model");
const { Consultant } = require("./src/models/consultant.model");
require("dotenv").config();

async function debugClientProfile() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // 1. Find a Client user
        const client = await User.findOne({ role: "Client" });
        if (!client) {
            console.log("No client found!");
            return;
        }
        console.log(`\n--- Debugging for Client: ${client.fullName} (${client._id}) ---`);

        // 2. Simulate /users/profile
        console.log("\n[1] /users/profile");
        const profile = await User.findById(client._id).select("-passwordHash").populate("category subcategory");
        console.log("Profile Data:", profile ? "Found" : "Not Found");
        if (profile) console.log("  Name:", profile.fullName);

        // 3. Simulate /analytics/client
        console.log("\n[2] /analytics/client");
        const today = new Date();
        const upcomingAppointments = await Appointment.countDocuments({
            client: client._id,
            status: { $in: ["Upcoming", "Confirmed"] },
            startAt: { $gte: today }
        });
        console.log("  Upcoming Appointments:", upcomingAppointments);

        const myConsultants = await require("./src/models/clientConsultant.model").countDocuments({ client: client._id, status: "Active" });
        console.log("  My Consultants:", myConsultants);

        const totalSpentResult = await Appointment.aggregate([
            { $match: { client: client._id, status: { $in: ["Completed", "Confirmed"] } } },
            { $group: { _id: null, total: { $sum: "$fee" } } },
        ]);
        const totalSpent = totalSpentResult[0]?.total || 0;
        console.log("  Total Spent:", totalSpent);

        // 4. Simulate /appointments
        console.log("\n[3] /appointments");
        const appointments = await Appointment.find({ client: client._id }).limit(5);
        console.log(`  Found ${appointments.length} appointments`);

        // 5. Simulate /transactions
        console.log("\n[4] /transactions");
        const transactions = await Transaction.find({ user: client._id }).limit(5);
        console.log(`  Found ${transactions.length} transactions`);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

debugClientProfile();
