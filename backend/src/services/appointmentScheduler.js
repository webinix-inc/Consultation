/**
 * Appointment Scheduler Service
 * Automatically updates appointment statuses and sends reminders
 */

const Appointment = require("../models/appointment.model");

/**
 * Update past appointments from "Upcoming" to "Completed"
 * Runs periodically to mark appointments as completed when their end time has passed
 */
async function updatePastAppointments() {
    try {
        const now = new Date();
        // Adjust for IST (UTC+5:30) for string-based comparisons (Legacy/Fake UTC)
        const offsetMs = 5.5 * 60 * 60 * 1000;
        const comparisonTime = new Date(now.getTime() + offsetMs);

        // Find all "Upcoming" appointments where the end time has passed
        const result = await Appointment.updateMany(
            {
                status: "Upcoming",
                $or: [
                    // For Date objects (Real UTC), compare with real UTC 'now'
                    { endAt: { $lt: now } },
                    // For String constructed dates (Fake UTC / IST stored as UTC), compare with IST-shifted time
                    {
                        $expr: {
                            $lt: [
                                {
                                    $dateFromString: {
                                        dateString: { $concat: ["$date", "T", "$timeEnd", ":00"] },
                                        onError: comparisonTime,
                                        onNull: comparisonTime
                                    }
                                },
                                comparisonTime
                            ]
                        }
                    }
                ]
            },
            {
                $set: { status: "Completed" }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`📅 [Scheduler] Auto-completed ${result.modifiedCount} past appointments`);
        }
    } catch (error) {
        console.error("❌ [Scheduler] Error updating past appointments:", error.message);
    }
}

/**
 * Send reminder notifications for appointments starting within the next hour
 */
async function sendAppointmentReminders() {
    try {
        const now = new Date();
        const offsetMs = 5.5 * 60 * 60 * 1000;
        // For standard Date objects (stored as UTC), use real UTC time
        const utcWindow = new Date(now.getTime() + 15 * 60 * 1000);

        // For Legacy String dates (stored as "YYYY-MM-DD" and "HH:mm" representing IST),
        // we shift "now" by 5.5 hours so that 21:00 IST (15:30 UTC) matches 21:00Z.
        const shiftedNow = new Date(now.getTime() + offsetMs);
        const shiftedWindow = new Date(shiftedNow.getTime() + 15 * 60 * 1000);

        // Find upcoming appointments within the reminder window that haven't been reminded yet
        const appointments = await Appointment.find({
            status: "Upcoming",
            reminderSent: { $ne: true },
            $or: [
                // 1. Standard Date Field (Correct UTC)
                {
                    startAt: { $gte: now, $lte: utcWindow }
                },
                // 2. Legacy String Fields (Fake UTC / IST interpreted as UTC)
                {
                    $expr: {
                        $and: [
                            {
                                $gte: [
                                    {
                                        $dateFromString: {
                                            dateString: { $concat: ["$date", "T", "$timeStart", ":00"] },
                                            onError: null,
                                            onNull: null
                                        }
                                    },
                                    shiftedNow
                                ]
                            },
                            {
                                $lte: [
                                    {
                                        $dateFromString: {
                                            dateString: { $concat: ["$date", "T", "$timeStart", ":00"] },
                                            onError: null,
                                            onNull: null
                                        }
                                    },
                                    shiftedWindow
                                ]
                            }
                        ]
                    }
                }
            ]
        }).lean();

        if (appointments.length === 0) return;

        const NotificationService = require("./notificationService");
        const User = require("../models/user.model");
        const Client = require("../models/client.model");
        const { Consultant } = require("../models/consultant.model");

        for (const apt of appointments) {
            try {
                // Get names - manual resolution since we removed populate to handle mixed refs (User vs Client)
                let clientName = apt.clientSnapshot?.name || "Client";
                let consultantName = apt.consultantSnapshot?.name || "Consultant";

                // Resolve Client Name
                if (apt.client) {
                    // Try User first
                    let clientDoc = await User.findById(apt.client).select("fullName").lean();
                    if (!clientDoc) {
                        // Try Client model (Legacy/Agency)
                        clientDoc = await Client.findById(apt.client).select("fullName").lean();
                    }
                    if (clientDoc) clientName = clientDoc.fullName;
                }

                // Resolve Consultant Name
                if (apt.consultant) {
                    // Try User first
                    let consultantDoc = await User.findById(apt.consultant).select("fullName").lean();
                    if (!consultantDoc) {
                        // Try Consultant model
                        consultantDoc = await Consultant.findById(apt.consultant).select("name fullName").lean();
                    }
                    if (consultantDoc) consultantName = consultantDoc.fullName || consultantDoc.name;
                }

                // Send reminders
                await NotificationService.notifyAppointmentReminder(
                    { ...apt, timeStart: apt.timeStart },
                    clientName,
                    consultantName
                );

                // Mark reminder as sent
                await Appointment.updateOne(
                    { _id: apt._id },
                    { $set: { reminderSent: true } }
                );

                console.log(`🔔 [Scheduler] Sent reminder for appointment ${apt._id}`);
            } catch (notifErr) {
                console.error(`❌ [Scheduler] Failed to send reminder for ${apt._id}:`, notifErr.message);
            }
        }
    } catch (error) {
        console.error("❌ [Scheduler] Error sending reminders:", error.message);
    }
}

/**
 * Start the appointment scheduler
 * Runs every minute to check for appointments that need status updates or reminders
 */
function startAppointmentScheduler() {
    // Run immediately on startup
    updatePastAppointments();
    sendAppointmentReminders();

    // Then run every minute (60000 ms)
    const intervalId = setInterval(() => {
        updatePastAppointments();
        sendAppointmentReminders();
    }, 60 * 1000);

    console.log("📅 [Scheduler] Appointment auto-completion and reminder scheduler started (runs every 1 minute)");

    return intervalId;
}

module.exports = {
    startAppointmentScheduler,
    updatePastAppointments,
    sendAppointmentReminders
};
