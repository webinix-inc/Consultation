require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./src/config/db');
const Appointment = require('./src/models/appointment.model');
const Notification = require('./src/models/notification.model');

async function fixAndVerify() {
    await connectDB();
    const id = '695fd0e1331e078775699c30';

    // 1. Reset reminderSent
    await Appointment.updateOne({ _id: id }, { $set: { reminderSent: false } });
    console.log("Reset reminderSent to false.");

    // 2. Wait for scheduler (runs every minute). We can simulate by waiting 2 seconds? No, scheduler is running in background process.
    // We should wait ~65 seconds for next Tick.
    console.log("Waiting 65s for Scheduler tick...");

    await new Promise(r => setTimeout(r, 65000));

    // 3. Check Notification again
    const notifs = await Notification.find({ relatedId: id, type: "reminder" }).sort({ createdAt: -1 });
    console.log(`Found ${notifs.length} reminder notifications.`);
    if (notifs.length > 0) {
        console.log("SUCCESS! Most recent:", notifs[0]);
    } else {
        console.log("FAILURE: No reminder notification found.");
    }

    process.exit();
}
fixAndVerify();
