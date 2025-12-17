const mongoose = require("mongoose");
const User = require("./src/models/user.model");
const { Consultant } = require("./src/models/consultant.model");
const Appointment = require("./src/models/appointment.model");
const ClientConsultant = require("./src/models/clientConsultant.model");
const crypto = require("crypto");
require("dotenv").config();

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/consultation_db");
        console.log("Connected to DB");

        // 1. Find a Consultant
        let consultantUser = await User.findOne({ role: "Consultant" });
        if (!consultantUser) {
            console.log("No consultant user found. Creating one...");
            try {
                consultantUser = await User.create({
                    userId: "CONS-" + crypto.randomBytes(4).toString("hex"),
                    fullName: "Demo Consultant",
                    email: "consultant@demo.com",
                    mobile: "1234567890",
                    role: "Consultant",
                    status: "Active",
                    verificationStatus: "Approved"
                    // Note: Password handling seems missing in schema view, skipping for now as we just need the user for linking
                });
            } catch (err) {
                console.log("User creation failed");
                console.dir(err, { depth: null });
                throw err;
            }
        }

        // Ensure Consultant Profile exists
        let consultantProfile = await Consultant.findOne({ user: consultantUser._id });
        if (!consultantProfile) {
            console.log("Creating Consultant Profile...");
            try {
                consultantProfile = await Consultant.create({
                    user: consultantUser._id,
                    email: consultantUser.email,
                    phone: consultantUser.mobile || "1234567890",
                    category: "General Health",
                    name: consultantUser.fullName
                });
            } catch (err) {
                console.log("Consultant profile creation failed");
                console.dir(err, { depth: null });
                throw err;
            }
        }
        console.log("Using Consultant:", consultantUser.email);

        // 2. Find a Client
        let clientUser = await User.findOne({ role: "Client" });
        if (!clientUser) {
            console.log("No client user found. Creating one...");
            try {
                clientUser = await User.create({
                    userId: "CLI-" + crypto.randomBytes(4).toString("hex"),
                    fullName: "Demo Client",
                    email: "client@demo.com",
                    mobile: "0987654321",
                    role: "Client",
                    status: "Active"
                });
            } catch (err) {
                console.log("Client creation failed");
                console.dir(err, { depth: null });
                throw err;
            }
        }
        console.log("Using Client:", clientUser.email);

        // 3. Link them
        try {
            await ClientConsultant.findOneAndUpdate(
                { client: clientUser._id, consultant: consultantUser._id },
                { status: "Active", linkedAt: new Date() },
                { upsert: true, new: true }
            );
            console.log("Linked Client and Consultant");
        } catch (err) {
            console.log("Link creation failed");
            console.dir(err, { depth: null });
            throw err;
        }

        // 4. Create Appointments
        const count = await Appointment.countDocuments({ consultant: consultantUser._id });
        if (count === 0) {
            const today = new Date();
            const appointments = [
                {
                    client: clientUser._id,
                    consultant: consultantUser._id,
                    startAt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
                    endAt: new Date(today.getTime() + 25 * 60 * 60 * 1000),
                    status: "Upcoming",
                    fee: 500,
                    date: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    timeStart: "10:00",
                    category: "General"
                },
                {
                    client: clientUser._id,
                    consultant: consultantUser._id,
                    startAt: new Date(today.getTime() - 24 * 60 * 60 * 1000), // Yesterday
                    endAt: new Date(today.getTime() - 23 * 60 * 60 * 1000),
                    status: "Completed",
                    fee: 500,
                    date: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    timeStart: "10:00",
                    category: "General"
                },
                {
                    client: clientUser._id,
                    consultant: consultantUser._id,
                    startAt: new Date(today.getTime() + 2 * 60 * 60 * 1000), // Today later
                    endAt: new Date(today.getTime() + 3 * 60 * 60 * 1000),
                    status: "Upcoming",
                    fee: 500,
                    date: today.toISOString().split("T")[0],
                    timeStart: "14:00",
                    category: "General"
                }
            ];

            for (const appt of appointments) {
                try {
                    await Appointment.create(appt);
                } catch (err) {
                    console.log("Appointment creation failed");
                    console.dir(err, { depth: null });
                    throw err;
                }
            }
            console.log(`Created ${appointments.length} appointments`);
        } else {
            console.log("Appointments already exist, skipping creation.");
        }

        process.exit(0);
    } catch (e) {
        console.error("Global Error:", e);
        process.exit(1);
    }
}

seed();
