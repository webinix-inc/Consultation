require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./src/config/db');
const Appointment = require('./src/models/appointment.model');
const Notification = require('./src/models/notification.model');
// Register models
require('./src/models/user.model');
require('./src/models/consultant.model');
require('./src/models/client.model');

const { sendAppointmentReminders } = require('./src/services/appointmentScheduler');
const fs = require('fs');

async function manualRun() {
    await connectDB();
    const id = '695fd0e1331e078775699c30';
    let out = "";
    // Use originalLog to avoid recursion when we overwrite console.log later
    const originalLog = console.log;
    const originalError = console.error;

    const log = (msg) => {
        originalLog(msg);
        out += msg + "\n";
    };

    log("--- MANUAL SCHEDULER RUN ---");

    // 1. Move Appointment to Future (10 mins from now) & Reset
    const futureTime = new Date(new Date().getTime() + 10 * 60 * 1000); // 10 mins from now

    await Appointment.updateOne({ _id: id }, {
        $set: {
            reminderSent: false,
            startAt: futureTime,
            // Also update legacy fields just in case? No, new logic uses startAt.
        }
    });
    log(`Moved Appt to ${futureTime.toISOString()} and reset reminderSent.`);

    // 1.5 Inspect Appointment Data
    const rawApt = await Appointment.findById(id).lean();
    log(`[INSPECT] Raw Client ID: ${rawApt.client}`);
    log(`[INSPECT] Raw Consultant ID: ${rawApt.consultant}`);

    const apt = await Appointment.findById(id).populate("client").populate("consultant");
    log(`[INSPECT] Populated Client: ${apt.client ? apt.client._id : 'NULL'}`);
    log(`[INSPECT] Consultant: ${apt.consultant ? apt.consultant._id : 'NULL'}`);
    if (!apt.client) log(`[WARN] Client field is missing or populate failed! Raw: ${apt.client}`);

    // 2. Run Function (Wrap console.log/error to capture output)
    // originalLog/Error already defined above
    console.log = (msg, arg) => log(`[LOG] ${msg} ${arg || ''}`);
    console.error = (msg, arg) => log(`[ERR] ${msg} ${arg || ''}`);

    try {
        log("Calling sendAppointmentReminders()...");
        await sendAppointmentReminders();
        log("Finished sendAppointmentReminders().");
    } catch (e) {
        log(`CRITICAL ERROR: ${e.message}`);
    }

    // Restore consoles
    console.log = originalLog;
    console.error = originalError;

    // 3. Check Notification
    const notifs = await Notification.find({ relatedId: id, type: "reminder" }).sort({ createdAt: -1 });
    log(`Found ${notifs.length} reminder notifications.`);
    if (notifs.length > 0) {
        log(`SUCCESS! Notif ID: ${notifs[0]._id}`);
    } else {
        log("FAILURE: Still no notification.");
    }

    fs.writeFileSync('debug_run_scheduler_output.txt', out);
    process.exit();
}
manualRun();
