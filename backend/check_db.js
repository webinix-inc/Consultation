const mongoose = require("mongoose");
const Appointment = require("./src/models/appointment.model");
require("dotenv").config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/consultation_db");
        console.log("Connected to DB");

        const count = await Appointment.countDocuments({});
        console.log("Total Appointments:", count);

        if (count > 0) {
            const sample = await Appointment.findOne({});
            console.log("Sample Appointment Consultant ID:", sample.consultant);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkData();
