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
      enum: ["Upcoming", "Completed", "Cancelled"],
      default: "Upcoming",
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
    status: { $ne: "Cancelled" },
    $or: [
      { consultant: consultantId },
      { consultant: userId }
    ],
    // existing.start < newEnd && existing.end > newStart  ==> overlap
    $and: [{ startAt: { $lt: endAt } }, { endAt: { $gt: startAt } }]
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  // Count conflicting documents directly
  const count = await this.countDocuments(query);
  return count > 0;
};

// Static: get available slots for consultant on a date
// options: { slotDurationMin = 60, startHour = 9, endHour = 17 }
// returns array of "HH:mm - HH:mm" strings
appointmentSchema.statics.getAvailableSlots = async function (id, dateISO /* "YYYY-MM-DD" */, options = {}) {
  const { slotDurationMin = 60, startHour = 9, endHour = 17 } = options || {};
  if (!id || !dateISO) return [];

  const { consultantId, userId } = await resolveConsultantIds(id);

  // Define IST Offset (UTC+5:30)
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

  // Build the day range in UTC covering the full IST day
  // To cover "2023-11-23" in IST, we need to inspect a range that surely includes it in UTC.
  // IST is ahead of UTC, so 00:00 IST is previous day 18:30 UTC.
  // Let's grab a wide enough UTC range to capture all potential overlaps.
  const queryStart = new Date(new Date(`${dateISO}T00:00:00`).getTime() - 24 * 60 * 60 * 1000);
  const queryEnd = new Date(new Date(`${dateISO}T23:59:59`).getTime() + 24 * 60 * 60 * 1000);

  // Fetch appointments for the consultant that overlap this broad range
  const appts = await this.find({
    status: { $ne: "Cancelled" },
    $or: [
      { consultant: consultantId },
      { consultant: userId }
    ],
    startAt: { $gte: queryStart, $lte: queryEnd }
  }).select("startAt endAt").lean();

  // Convert appointments into ranges for overlap checks
  const busyRanges = [];
  for (const ap of appts) {
    if (ap.startAt && ap.endAt) {
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

  // Helper to force Date interpretation as IST
  // Input: "HH:mm" string
  // Output: Date object representing that time on dateISO in UTC (derived from IST)
  // Example: dateISO="2023-11-23", timeStr="09:00"
  // "2023-11-23T09:00:00" is treated as UTC by new Date(ISOString) usually, or Local.
  // We want to treat it as IST.
  // So 09:00 IST = 03:30 UTC.
  const createDateAsIST = (timeStr) => {
    // 1. Create a "UTC" date as if the string was UTC
    // e.g. 2023-11-23T09:00:00.000Z
    const naiveDate = new Date(`${dateISO}T${timeStr}:00.000Z`);
    // 2. Subtract the IST offset (5.5 hours) to shift it to the correct absolute time
    return new Date(naiveDate.getTime() - IST_OFFSET_MS);
  };

  if (settings && settings.availability && settings.availability.workingHours) {
    // Need to get the day of week for dateISO
    const dateObj = new Date(dateISO);
    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
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

  const nowUTC = new Date();
  // We compare "now" vs buffer time.
  // Let's add a small buffer (e.g. 15 mins) to prevent booking immediately
  const nowWithBuffer = new Date(nowUTC.getTime() + 15 * 60 * 1000);

  const availableSlots = [];

  for (const slot of candidateSlots) {
    // Convert "HH:mm" (IST) -> Actual UTC Date objects
    const slotStartUTC = createDateAsIST(slot.startStr);

    let slotEndUTC;
    if (slot.endStr) {
      slotEndUTC = createDateAsIST(slot.endStr);
    } else {
      // If no end string, add duration
      slotEndUTC = new Date(slotStartUTC.getTime() + slotDurationMin * 60 * 1000);
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

    // 2. Check if slot is in the past (using UTC to UTC comparison is safest)
    if (slotStartUTC < nowWithBuffer) {
      isFree = false;
    }

    if (isFree) {
      // Return the string as expected by frontend (e.g., "09:00 - 10:00")
      // Frontend assumes these are "Display Time" which implies IST for this app context
      availableSlots.push(`${slot.startStr} - ${slot.endStr || slot.endStr}`);
    }
  }

  return availableSlots;
};

module.exports = mongoose.model("Appointment", appointmentSchema);
