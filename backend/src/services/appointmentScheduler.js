/**
 * Appointment Scheduler Service
 * Automatically updates appointment statuses when their scheduled time passes
 */

const Appointment = require("../models/appointment.model");

/**
 * Update past appointments from "Upcoming" to "Completed"
 * Runs periodically to mark appointments as completed when their end time has passed
 */
async function updatePastAppointments() {
    try {
        const now = new Date();

        // Find all "Upcoming" appointments where the end time has passed
        const result = await Appointment.updateMany(
            {
                status: "Upcoming",
                $or: [
                    // For appointments with endAt field
                    { endAt: { $lt: now } },
                    // For appointments with date + timeEnd (legacy format)
                    {
                        $expr: {
                            $lt: [
                                {
                                    $dateFromString: {
                                        dateString: { $concat: ["$date", "T", "$timeEnd", ":00"] },
                                        onError: now, // fallback to now if parsing fails
                                        onNull: now
                                    }
                                },
                                now
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
 * Start the appointment scheduler
 * Runs every minute to check for appointments that need status updates
 */
function startAppointmentScheduler() {
    // Run immediately on startup
    updatePastAppointments();

    // Then run every minute (60000 ms)
    const intervalId = setInterval(updatePastAppointments, 60 * 1000);

    console.log("📅 [Scheduler] Appointment auto-completion scheduler started (runs every 1 minute)");

    return intervalId;
}

module.exports = {
    startAppointmentScheduler,
    updatePastAppointments
};
