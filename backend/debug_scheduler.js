require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('./src/models/appointment.model');
const { connectDB } = require('./src/config/db');
const fs = require('fs');

async function debugScheduler() {
    await connectDB();
    let out = "";
    const log = (msg) => { console.log(msg); out += msg + "\n"; };

    log("--- DEBUG SCHEDULER DIAGNOSTICS ---");
    const utcNow = new Date();
    // 15 mins from now
    const utcWindow = new Date(utcNow.getTime() + 15 * 60 * 1000);

    const offsetMs = 5.5 * 60 * 60 * 1000;
    const shiftedNow = new Date(utcNow.getTime() + offsetMs);
    const shiftedWindow = new Date(shiftedNow.getTime() + 15 * 60 * 1000);

    log(`NOW (UTC): ${utcNow.toISOString()}`);
    log(`Window Limit (UTC + 15m): ${utcWindow.toISOString()}`);

    const allUpcoming = await Appointment.find({ status: "Upcoming" }).select("startAt date timeStart reminderSent").lean();
    log(`\nFound ${allUpcoming.length} total upcoming appointments.`);

    allUpcoming.forEach(a => {
        let start = a.startAt;
        let type = "Standard (Date)";
        let qualifies = false;
        let diffMins = "N/A";

        if (!start) {
            // Legacy fallback
            type = "Legacy (String)";
            start = `[String] ${a.date} ${a.timeStart}`;
            // Can't easily calc diff without parsing logic
        } else {
            // It is a date
            if (a.startAt instanceof Date) {
                const diffMs = a.startAt.getTime() - utcNow.getTime();
                diffMins = (diffMs / 60000).toFixed(2);

                // Logic Check
                if (a.startAt >= utcNow && a.startAt <= utcWindow) {
                    qualifies = "YES (Time Match)";
                } else if (a.startAt < utcNow) {
                    qualifies = "NO (Ideally Passed)";
                } else {
                    qualifies = "NO (Too far future)";
                }
            }
        }

        let sentStatus = a.reminderSent ? "SENT" : "PENDING";
        log(`- ID: ${a._id} [${type}] | Start: ${start instanceof Date ? start.toISOString() : start} | In: ${diffMins}m | Rem: ${sentStatus} | Qualifies: ${qualifies}`);
    });

    log("\n--- SIMULATING LIVE QUERY ---");
    // Standard Date Query
    const standardMatches = await Appointment.find({
        status: "Upcoming",
        reminderSent: { $ne: true },
        startAt: { $gte: utcNow, $lte: utcWindow }
    }).select("_id").lean();

    log(`Standard Query Matches: ${standardMatches.length}`);
    standardMatches.forEach(m => log(`MATCH: ${m._id}`));

    // Legacy Query
    const legacyMatches = await Appointment.find({
        status: "Upcoming",
        reminderSent: { $ne: true },
        $expr: {
            $and: [
                { $gte: [{ $dateFromString: { dateString: { $concat: ["$date", "T", "$timeStart", ":00"] }, onError: null, onNull: null } }, shiftedNow] },
                { $lte: [{ $dateFromString: { dateString: { $concat: ["$date", "T", "$timeStart", ":00"] }, onError: null, onNull: null } }, shiftedWindow] }
            ]
        }
    }).select("_id").lean();

    log(`Legacy Query Matches: ${legacyMatches.length}`);
    legacyMatches.forEach(m => log(`MATCH (Legacy): ${m._id}`));

    fs.writeFileSync('debug_scheduler_output.txt', out);
    process.exit();
}

debugScheduler();
