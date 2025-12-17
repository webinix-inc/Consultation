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

    category: {
      type: String,
      default: "General",
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
    timeStart: {
      // "HH:mm"
      type: String,
    },
    timeEnd: {
      // "HH:mm"
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
      enum: ["Upcoming", "Confirmed", "Completed", "Cancelled"],
      default: "Upcoming",
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
    $and: [
      {
        $or: [
          // existing.start < newEnd && existing.end > newStart  ==> overlap
          { $and: [{ startAt: { $lt: endAt } }, { endAt: { $gt: startAt } }] },
          // Fallback: if existing only has date/timeStart/timeEnd (legacy)
          {
            $and: [
              { date: startAt.toISOString().split("T")[0] }, // same date
              {
                $or: [
                  { timeStart: { $exists: true } },
                  { timeEnd: { $exists: true } },
                ],
              },
            ],
          },
        ]
      }
    ]
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const candidates = await this.find(query).lean();

  // For candidates using startAt/endAt do exact overlap check; otherwise try legacy fields
  for (const c of candidates) {
    if (c.startAt && c.endAt) {
      const aStart = new Date(c.startAt);
      const aEnd = new Date(c.endAt);
      if (startAt < aEnd && endAt > aStart) return true;
    } else if (c.date && (c.timeStart || c.timeEnd)) {
      const apptDate = c.date;
      // build candidate start/end
      const apptStartStr = c.timeStart || null;
      const apptEndStr = c.timeEnd || null;
      try {
        if (!apptStartStr && !apptEndStr) continue;
        const aStart = apptStartStr ? new Date(`${apptDate}T${apptStartStr}:00`) : null;
        const aEnd = apptEndStr ? new Date(`${apptDate}T${apptEndStr}:00`) : (aStart ? new Date(aStart.getTime() + 60 * 60 * 1000) : null);
        if (!aStart || !aEnd) continue;
        if (startAt < aEnd && endAt > aStart) return true;
      } catch (e) {
        // ignore parse errors and continue
      }
    }
  }

  return false;
};

// Static: get available slots for consultant on a date
// options: { slotDurationMin = 60, startHour = 9, endHour = 17 }
// returns array of "HH:mm" strings
appointmentSchema.statics.getAvailableSlots = async function (id, dateISO /* "YYYY-MM-DD" */, options = {}) {
  const { slotDurationMin = 60, startHour = 9, endHour = 17 } = options || {};
  if (!id || !dateISO) return [];

  const { consultantId, userId } = await resolveConsultantIds(id);

  // Build the day's start and end as Date objects (UTC / server timezone)
  const dayStart = new Date(`${dateISO}T00:00:00`);
  const dayEnd = new Date(`${dateISO}T23:59:59`);

  // Fetch appointments for the consultant that overlap the day
  const appts = await this.find({
    status: { $ne: "Cancelled" },
    $or: [
      { consultant: consultantId },
      { consultant: userId }
    ],
    $and: [
      {
        $or: [
          { startAt: { $gte: dayStart, $lte: dayEnd } },
          { endAt: { $gte: dayStart, $lte: dayEnd } },
          { $and: [{ startAt: { $lte: dayStart } }, { endAt: { $gte: dayEnd } }] }, // fully covering
          // Legacy: same date and have timeStart/timeEnd
          { date: dateISO },
        ]
      }
    ]
  }).lean();

  // Convert appointments into ranges for overlap checks
  const busyRanges = [];
  for (const ap of appts) {
    if (ap.startAt && ap.endAt) {
      busyRanges.push({ start: new Date(ap.startAt), end: new Date(ap.endAt) });
      continue;
    }
    if (ap.date && (ap.timeStart || ap.timeEnd)) {
      try {
        const s = ap.timeStart ? new Date(`${ap.date}T${ap.timeStart}:00`) : null;
        const e = ap.timeEnd ? new Date(`${ap.date}T${ap.timeEnd}:00`) : (s ? new Date(s.getTime() + slotDurationMin * 60 * 1000) : null);
        if (s && e) busyRanges.push({ start: s, end: e });
      } catch (e) {
        // ignore
      }
    }
  }

  // Helper to check overlap
  function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && aEnd > bStart;
  }

  // Fetch Consultant Settings to get generated slots
  const ConsultantSettings = mongoose.model("ConsultantSettings");
  // Try to find settings by User ID first (preferred), then Consultant ID
  let settings = await ConsultantSettings.findOne({ consultant: userId }).lean();
  if (!settings) {
    settings = await ConsultantSettings.findOne({ consultant: consultantId }).lean();
  }

  let candidateSlots = [];

  if (settings && settings.availability && settings.availability.workingHours) {
    const dayOfWeek = dayStart.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const daySettings = settings.availability.workingHours[dayOfWeek];

    if (daySettings && daySettings.enabled && daySettings.generatedSlots && daySettings.generatedSlots.length > 0) {
      // Use generated slots from settings
      candidateSlots = daySettings.generatedSlots.map(slotStr => {
        // slotStr is "HH:mm - HH:mm"
        const [startStr, endStr] = slotStr.split(" - ");
        return { start: startStr, end: endStr };
      });
    }
  }

  // Fallback if no settings or generated slots: generate hourly slots
  // if (candidateSlots.length === 0) {
  //   for (let h = startHour; h <= endHour; h++) {
  //     const hh = String(h).padStart(2, "0");
  //     candidateSlots.push({ start: `${hh}:00`, end: `${String(h + 1).padStart(2, "0")}:00` }); // Default 1 hour duration
  //   }
  // }

  // Filter candidate slots against busy ranges
  const availableSlots = [];
  for (const slot of candidateSlots) {
    const slotStart = new Date(`${dateISO}T${slot.start}:00`);
    // Handle end time crossing midnight if needed, but for now assume same day
    // If slot.end is smaller than slot.start, it might mean next day, but generatedSlots usually within day
    let slotEnd = new Date(`${dateISO}T${slot.end}:00`);

    // If using default hourly slots, calculate end based on duration if not explicit
    if (!slot.end) {
      slotEnd = new Date(slotStart.getTime() + slotDurationMin * 60 * 1000);
    }

    let isFree = true;
    for (const br of busyRanges) {
      if (overlaps(slotStart, slotEnd, br.start, br.end)) {
        isFree = false;
        break;
      }
    }

    if (isFree) {
      availableSlots.push(`${slot.start} - ${slot.end}`);
    }
  }

  return availableSlots;
};

module.exports = mongoose.model("Appointment", appointmentSchema);
