const mongoose = require("mongoose");
const User = require("./src/models/user.model");
const Appointment = require("./src/models/appointment.model");
const fs = require("fs");
require("dotenv").config();

async function debugData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/consultation_db");

        const users = await User.find({ role: "Consultant" });
        const results = [];

        for (const user of users) {
            const apptCount = await Appointment.countDocuments({ consultant: user._id });
            results.push({
                email: user.email,
                id: user._id,
                appointments: apptCount
            });
        }

        fs.writeFileSync("users_dump.json", JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugData();
