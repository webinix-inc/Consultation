// models/appointment.model.js
const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    consultant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },



    session: {
      type: String,
      enum: ["Video Call"],
      default: "Video Call",
    },

    // Legacy fields
    date: {
      // "YYYY-MM-DD" (legacy) — kept for backward compatibility
      type: String,
    },
    // Preferred canonical fields
    startAt: {
      // ISO date
      type: Date,
    },
    endAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["Upcoming", "Completed", "Cancelled", "Hold"],
      default: "Upcoming",
    },

    // TTL for "Hold" status (automatically deleted if not confirmed)
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 },
    },

    reminderSent: {
      type: Boolean,
      default: false,
    },

    reason: {
      type: String,
      default: "",
    },

    notes: {
      type: String,
      default: "",
    },

    fee: {
      type: Number,
      default: 0,
    },

    payment: {
      amount: { type: Number, default: 0 },
      status: { type: String, default: "Pending" },
      method: { type: String, default: "System" },
      transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
      invoiceUrl: { type: String },
    },

    clientSnapshot: {
      name: String,
      email: String,
      mobile: String,
    },

    consultantSnapshot: {
      name: String,
      email: String,
      mobile: String,
      category: String,
      subcategory: String,
    },

    // Agora Video Call fields
    agora: {
      channelName: {
        type: String,
        default: null,
      },
      resourceId: {
        type: String,
        default: null, // Cloud Recording resource ID
      },
      recordingSid: {
        type: String,
        default: null, // Cloud Recording session ID
      },
      recordingStatus: {
        type: String,
        enum: [null, "recording", "stopped", "ready"],
        default: null,
      },
      recordingFileUrl: {
        type: String,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes to speed up overlap queries and consultant-day queries
appointmentSchema.index({ consultant: 1, startAt: 1 });
appointmentSchema.index({ consultant: 1, endAt: 1 });
appointmentSchema.index({ startAt: 1, endAt: 1 });
appointmentSchema.index({ date: 1, consultant: 1 });

// Helper to resolve Consultant ID <-> User ID
async function resolveConsultantIds(id) {
  const Consultant = mongoose.model("Consultant");

  let consultantId = id;
  let userId = id;

  // Try to find as Consultant
  let c = await Consultant.findById(id);
  if (c) {
    consultantId = c._id;
    if (c.user) userId = c.user;
  } else {
    // Try to find as User (who is a consultant)
    // Note: This assumes the passed ID is a User ID if not a Consultant ID
    // But we can check if it's a valid User
    // If we can't find it as Consultant, assume it might be User ID
    // and try to find the linked Consultant
    c = await Consultant.findOne({ user: id });
    if (c) {
      consultantId = c._id;
      userId = id;
    }
  }

  return { consultantId, userId };
}

// Static: check overlap for a consultant
// Returns true if a conflicting appointment exists (overlap)
appointmentSchema.statics.hasConflict = async function (id, startAt, endAt, excludeAppointmentId = null) {
  if (!id || !startAt || !endAt) return false;

  const { consultantId, userId } = await resolveConsultantIds(id);

  const query = {
    $and: [
      { status: { $ne: "Cancelled" } },
      {
        $or: [
          { status: { $ne: "Hold" } }, // Confirmed/Upcoming/Completed are always conflicts
          { status: "Hold", expiresAt: { $gt: new Date() } } // Holds are only conflicts if NOT expired
        ]
      },
      { startAt: { $lt: endAt } },
      { endAt: { $gt: startAt } }
    ],
    $or: [
      { consultant: consultantId },
      { consultant: userId }
    ]
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  // Check Appointments (Upcoming, Completed, Hold)
  const appointmentCount = await this.countDocuments(query);
  return appointmentCount > 0;
};

// Static: get available slots for consultant on a date
// options: { slotDurationMin = 60, startHour = 9, endHour = 17 }
// returns array of "HH:mm - HH:mm" strings
// Static: get available slots for consultant on a date
// options: { slotDurationMin = 60, startHour = 9, endHour = 17 }
// returns array of "HH:mm - HH:mm" strings
appointmentSchema.statics.getAvailableSlots = async function (id, dateISO /* "YYYY-MM-DD" */, options = {}) {
  const { slotDurationMin = 60, startHour = 9, endHour = 17 } = options || {};
  if (!id || !dateISO) return [];

  const dateUtil = require("../utils/date.util");
  const { consultantId, userId } = await resolveConsultantIds(id);

  // Build the day range in UTC covering the full IST day
  const { start: queryStart, end: queryEnd } = dateUtil.getISTDayRangeInUTC(dateISO);

  // Fetch appointments (including Holds) for the consultant that overlap this range
  const query = {
    status: { $ne: "Cancelled" }, // Includes 'Upcoming', 'Completed', 'Hold'
    $or: [
      { consultant: consultantId },
      { consultant: userId }
    ],
    startAt: { $gte: queryStart, $lte: queryEnd }
  };

  const appts = await this.find(query).select("startAt endAt status client").lean();

  // Convert appointments into ranges for overlap checks
  // If a slot is "Hold" AND belongs to the requesting client, treat it as FREE (ignore it)
  const busyRanges = [];
  const reqClientIdStr = options.clientId ? String(options.clientId) : null;

  for (const ap of appts) {
    if (ap.startAt && ap.endAt) {
      if (ap.status === "Hold" && reqClientIdStr && String(ap.client) === reqClientIdStr) {
        // This is MY hold, so I can see it as available to re-book/pay
        continue;
      }
      busyRanges.push({ start: new Date(ap.startAt), end: new Date(ap.endAt) });
    }
  }

  // Fetch Consultant Settings to get generated slots
  const ConsultantSettings = mongoose.model("ConsultantSettings");
  let settings = await ConsultantSettings.findOne({ consultant: userId }).lean();
  if (!settings) {
    settings = await ConsultantSettings.findOne({ consultant: consultantId }).lean();
  }

  let candidateSlots = [];

  // Helper: Correctly parse IST time string to UTC Date on the given IST date
  const createDateAsIST = (timeStr) => {
    // dateUtil.parseBookingDate takes "YYYY-MM-DD" and "HH:mm" and returns UTC Date
    return dateUtil.parseBookingDate(dateISO, timeStr);
  };

  if (settings && settings.availability && settings.availability.workingHours) {
    // Need to get the day of week for dateISO (parsed as IST)
    const dateObj = dateUtil.parseBookingDate(dateISO, "12:00"); // midday IST
    const dayOfWeek = dateUtil.formatToIST(dateObj, "EEEE").toLowerCase(); // e.g. "thursday"

    const daySettings = settings.availability.workingHours[dayOfWeek];

    if (daySettings && daySettings.enabled && daySettings.generatedSlots && daySettings.generatedSlots.length > 0) {
      candidateSlots = daySettings.generatedSlots.map(slotStr => {
        const [startStr, endStr] = slotStr.split(" - ");
        return { startStr, endStr };
      });
    }
  }

  // Fallback: Generate 09:00 to 17:00 IST slots if no settings found
  if (candidateSlots.length === 0) {
    for (let h = startHour; h < endHour; h++) {
      const startStr = `${String(h).padStart(2, "0")}:00`;
      const endStr = `${String(h + 1).padStart(2, "0")}:00`;
      candidateSlots.push({ startStr, endStr });
    }
  }

  // Helper to check overlap
  function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && aEnd > bStart;
  }

  const availableSlots = [];

  for (const slot of candidateSlots) {
    // Convert "HH:mm" (IST) -> Actual UTC Date objects
    let slotStartUTC, slotEndUTC;
    try {
      slotStartUTC = createDateAsIST(slot.startStr);

      if (slot.endStr) {
        slotEndUTC = createDateAsIST(slot.endStr);
      } else {
        // If no end string, add duration
        // We can safely add minutes to the UTC date
        slotEndUTC = new Date(slotStartUTC.getTime() + slotDurationMin * 60 * 1000);
      }
    } catch (e) {
      console.warn(`Invalid slot time: ${slot.startStr} - ${slot.endStr}`, e);
      continue;
    }

    // 1. Check strict overlap with existing appointments
    let isFree = true;
    for (const br of busyRanges) {
      // br.start/end are already Date objects (UTC) from DB
      if (overlaps(slotStartUTC, slotEndUTC, br.start, br.end)) {
        isFree = false;
        break;
      }
    }

    // 2. Check if slot is in the past (Use IST-aware check)
    // 5 minute buffer (Reduced from 15 to allow near-term bookings)
    if (dateUtil.isPastIST(slotStartUTC, 5)) {
      isFree = false;
    }

    if (isFree) {
      // Return the string as expected by frontend (e.g., "09:00 - 10:00")
      // Frontend receives these strings and displays them
      availableSlots.push(`${slot.startStr} - ${slot.endStr || slot.endStr}`);
    }
  }

  return availableSlots;
};

module.exports = mongoose.model("Appointment", appointmentSchema);
