const mongoose = require("mongoose");
require("dotenv").config();

async function checkUser() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);

        const User = mongoose.connection.collection("users");
        const Appointment = mongoose.connection.collection("appointments");
        const Consultant = mongoose.connection.collection("consultants");

        // Dump recent Appointments
        console.log("=== RECENT APPOINTMENTS ===");
        const appts = await Appointment.find({}).sort({ createdAt: -1 }).limit(3).toArray();
        for (const appt of appts) {
            console.log(`Appt ID: ${appt._id}, Consultant ID: ${appt.consultant}`);

            // Find User for this consultant
            const user = await User.findOne({ _id: appt.consultant });
            if (user) {
                console.log(" -> Linked User:", JSON.stringify(user, null, 2));
                const profile = await Consultant.findOne({ user: user._id });
                if (profile) {
                    console.log(" -> Linked Profile:", JSON.stringify(profile, null, 2));
                } else {
                    console.log(" -> Linked Profile: NONE");
                }
            } else {
                console.log(" -> Linked User: NOT FOUND");
                // Check if consultant ID refers directly to a profile?
                const profile = await Consultant.findOne({ _id: appt.consultant });
                if (profile) {
                    console.log(" -> ID matches Consultant PROFILE directly!", JSON.stringify(profile, null, 2));
                }
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkUser();
