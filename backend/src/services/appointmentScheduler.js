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
        const comparisonTime = new Date(now.getTime() + offsetMs);

        // Window: appointments starting between now and 1 hour from now
        const oneHourLater = new Date(comparisonTime.getTime() + 60 * 60 * 1000);

        // Find upcoming appointments within the reminder window that haven't been reminded yet
        const appointments = await Appointment.find({
            status: "Upcoming",
            reminderSent: { $ne: true },
            $or: [
                {
                    startAt: { $gte: comparisonTime, $lte: oneHourLater }
                },
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
                                    comparisonTime
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
                                    oneHourLater
                                ]
                            }
                        ]
                    }
                }
            ]
        }).populate("client", "fullName").populate("consultant", "fullName").lean();

        if (appointments.length === 0) return;

        const NotificationService = require("./notificationService");
        const Client = require("../models/client.model");
        const { Consultant } = require("../models/consultant.model");

        for (const apt of appointments) {
            try {
                // Get names
                let clientName = apt.client?.fullName || apt.clientSnapshot?.name || "Client";
                let consultantName = apt.consultant?.fullName || apt.consultantSnapshot?.name || "Consultant";

                // If client wasn't populated (might be in Client model), try to fetch
                if (!apt.client?.fullName && apt.client) {
                    const clientDoc = await Client.findById(apt.client).select("fullName").lean();
                    if (clientDoc) clientName = clientDoc.fullName;
                }

                // If consultant wasn't populated, try to fetch from Consultant model
                if (!apt.consultant?.fullName && apt.consultant) {
                    const consultantDoc = await Consultant.findById(apt.consultant).select("name fullName").lean();
                    if (consultantDoc) consultantName = consultantDoc.name || consultantDoc.fullName;
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
