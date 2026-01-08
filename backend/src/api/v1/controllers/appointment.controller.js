// controllers/appointment.controller.js
const Appointment = require("../../../models/appointment.model");
const User = require("../../../models/user.model");
const { Consultant } = require("../../../models/consultant.model");
const { sendSuccess, sendError, ApiError } = require("../../../utils/response");
const httpStatus = require("../../../constants/httpStatus");
const { createAppointmentSchema, updateAppointmentSchema, availableSlotsQuerySchema } = require("../validators/appointment.validator");
const agoraService = require("../../../services/agora.service");

// Helper: parse "HH:mm" on dateISO -> Date
function buildDateFromDateAndHHMM(dateISO, hhmm) {
  return new Date(`${dateISO}T${hhmm}:00`);
}

// Create new appointment - with role-based validation
// Create new appointment - with role-based validation
exports.createAppointment = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const user = req.user;
    const userRole = user?.role;
    const userId = user?._id || user?.id;

    // Validate payload shape
    const { error, value } = createAppointmentSchema.validate(payload, { abortEarly: false });
    if (error) {
      throw new ApiError(error.details.map((d) => d.message).join(", "), httpStatus.BAD_REQUEST);
    }

    // Role-based validation: Ensure users can only create appointments for themselves
    if (userRole === "Client") {
      // Client must be the logged-in user
      if (String(value.client) !== String(userId)) {
        throw new ApiError("Clients can only create appointments for themselves", httpStatus.FORBIDDEN);
      }
      // Consultant must be provided and must be an active consultant
      if (!value.consultant) {
        throw new ApiError("Consultant is required", httpStatus.BAD_REQUEST);
      }
    } else if (userRole === "Consultant") {
      // Consultant must be the logged-in user
      const consultantModel = await Consultant.findOne({ email: user.email }).lean();
      const consultantModelId = consultantModel?._id;

      if (String(value.consultant) !== String(userId) && String(value.consultant) !== String(consultantModelId)) {
        throw new ApiError("Consultants can only create appointments for themselves", httpStatus.FORBIDDEN);
      }
      // Client must be provided and must be linked to this consultant
      if (!value.client) {
        throw new ApiError("Client is required", httpStatus.BAD_REQUEST);
      }
    }

    // Resolve client & consultant existence (defensive)
    // Clients are stored in Client model, not User model
    const Client = require("../../../models/client.model");
    let client = await Client.findById(value.client);

    // Fallback: Check User model for backward compatibility (though clients should be in Client model)
    if (!client) {
      const userClient = await User.findById(value.client);
      if (userClient && userClient.role === "Client") {
        client = userClient;
      }
    }

    if (!client) throw new ApiError("Client not found", httpStatus.NOT_FOUND);

    // Resolve Consultant to User ID and Consultant Document
    let consultantUser = null;
    let consultantDoc = null;

    // 1. Try finding as User ID
    consultantUser = await User.findOne({ _id: value.consultant, role: "Consultant" });
    if (consultantUser) {
      // Found as User ID
      consultantDoc = await Consultant.findOne({ user: consultantUser._id });
    } else {
      // 2. Try finding as Consultant ID
      consultantDoc = await Consultant.findById(value.consultant);
      if (consultantDoc) {
        if (consultantDoc.user) {
          consultantUser = await User.findById(consultantDoc.user);
        } else if (consultantDoc.email) {
          consultantUser = await User.findOne({ email: consultantDoc.email, role: "Consultant" });
        }
        // If consultant exists but no user linked, that's okay - we'll use consultant ID directly
      }
    }

    // Consultant must exist (either as User or as Consultant document)
    if (!consultantDoc && !consultantUser) {
      throw new ApiError("Consultant not found", httpStatus.NOT_FOUND);
    }

    // Populate category/subcategory for snapshot if user exists
    if (consultantUser) {
      await consultantUser.populate("category subcategory");
    }

    // Ensure we have the Consultant Profile for notifications/display
    if (!consultantDoc && consultantUser) {
      consultantDoc = await Consultant.findOne({ user: consultantUser._id });
      // If still no profile, use user data as fallback
      if (!consultantDoc) consultantDoc = consultantUser;
    }

    // Use the User ID if available, otherwise use Consultant ID
    // For ClientConsultant linking, prefer User ID but fallback to Consultant ID
    const consultantUserId = consultantUser ? consultantUser._id : (consultantDoc ? consultantDoc._id : null);

    if (!consultantUserId) {
      throw new ApiError("Consultant not found", httpStatus.NOT_FOUND);
    }

    // For Consultant role: Verify client is linked to this consultant
    if (userRole === "Consultant") {
      const ClientConsultant = require("../../../models/clientConsultant.model");
      const relationship = await ClientConsultant.findOne({
        consultant: consultantUserId,
        client: value.client,
        status: "Active"
      });
      if (!relationship) {
        throw new ApiError("Client is not linked to this consultant", httpStatus.FORBIDDEN);
      }
    }

    // Auto-link Client and Consultant if not already linked (regardless of who booked)
    try {
      const ClientConsultant = require("../../../models/clientConsultant.model");
      const existingLink = await ClientConsultant.findOne({
        client: value.client,
        consultant: consultantUserId
      });

      if (!existingLink) {
        await ClientConsultant.create({
          client: value.client,
          consultant: consultantUserId,
          status: "Active",
          linkedAt: new Date(),
          notes: "Auto-linked via appointment booking"
        });
        console.log(`Auto-linked Client ${value.client} with Consultant ${consultantUserId}`);
      } else if (existingLink.status !== "Active") {
        // Optional: Reactivate if inactive?
        // await ClientConsultant.updateOne({ _id: existingLink._id }, { status: "Active" });
      }
    } catch (linkErr) {
      console.error("Failed to auto-link client and consultant:", linkErr);
      // Don't fail appointment creation for this
    }

    // Normalize startAt/endAt:
    let startAt = value.startAt ? new Date(value.startAt) : null;
    let endAt = value.endAt ? new Date(value.endAt) : null;

    if (!startAt || !endAt) {
      // If date + timeStart provided convert to Date
      if (value.date && value.timeStart) {
        startAt = buildDateFromDateAndHHMM(value.date, value.timeStart);
        if (value.timeEnd) {
          endAt = buildDateFromDateAndHHMM(value.date, value.timeEnd);
        } else {
          endAt = new Date(startAt.getTime() + 60 * 60 * 1000); // default 1 hour
        }
      }
    }

    if (!startAt || !endAt) {
      throw new ApiError("startAt/endAt or date+timeStart (and optional timeEnd) required", httpStatus.BAD_REQUEST);
    }

    if (startAt >= endAt) {
      throw new ApiError("Invalid time range: startAt must be before endAt", httpStatus.BAD_REQUEST);
    }

    // Prevent booking appointments in the past
    const now = new Date();
    if (startAt < now) {
      throw new ApiError("Cannot book appointments in the past", httpStatus.BAD_REQUEST);
    }

    // Conflict detection: use model static
    const hasConflict = await Appointment.hasConflict(value.consultant, startAt, endAt);
    if (hasConflict) {
      // Return 409 Conflict
      return res.status(httpStatus.CONFLICT).json({
        success: false,
        message: "Time slot not available for this consultant",
        code: httpStatus.CONFLICT,
      });
    }

    // Prepare snapshots for historical data preservation
    const clientSnapshot = {
      name: client.fullName,
      email: client.email,
      mobile: client.mobile,
    };

    // Build consultant snapshot - use consultantUser if available, otherwise use consultantDoc
    const consultantSnapshot = {
      name: consultantUser?.fullName || consultantDoc?.name || consultantDoc?.fullName || consultantDoc?.displayName || "Consultant",
      email: consultantUser?.email || consultantDoc?.email || "",
      mobile: consultantUser?.mobile || consultantDoc?.mobile || consultantDoc?.phone || "",
      category: consultantUser?.category?.title || consultantDoc?.category?.name || consultantDoc?.category || "General",
      subcategory: consultantUser?.subcategory?.title || consultantDoc?.subcategory?.name || consultantDoc?.subcategory || "",
    };

    // Build document — use consultantUserId if available (for proper querying), otherwise use Consultant ID
    // The appointment model expects consultant to reference User, but we need to handle both cases
    // Store with User ID if available (preferred), otherwise Consultant ID
    const doc = {
      client: value.client,
      consultant: consultantUserId || value.consultant, // Use User ID if available, otherwise Consultant ID
      clientSnapshot,
      consultantSnapshot,
      category: value.category || consultantSnapshot.category || "General",
      session: value.session || "Video Call",
      date: value.date || startAt.toISOString().split("T")[0],
      // Legacy fields removed - they are no longer in the schema
      startAt,
      endAt,
      status: value.status || "Upcoming",
      reason: value.reason || "",
      notes: value.notes || "",
      fee: value.fee || 0,
    };

    const appointment = await Appointment.create(doc);

    // ✅ Generate Agora channel name and store in appointment
    try {
      const channelName = agoraService.generateChannelName(appointment._id.toString());
      appointment.agora = {
        channelName,
        resourceId: null,
        recordingSid: null,
        recordingStatus: null,
        recordingFileUrl: null,
      };
      await appointment.save();
    } catch (agoraErr) {
      console.error("Failed to create Agora channel:", agoraErr);
      // Don't fail appointment creation if Agora setup fails
    }

    // Populate some fields to return a friendly response
    await appointment.populate("client", "fullName email mobile");
    await appointment.populate("consultant", "fullName email mobile role");

    // Trigger Notifications for both Consultant and Client using NotificationService
    // Only trigger duplication notification if NO payment is required (fee is 0)
    // If fee > 0, it's a paid appointment and notification will be sent after payment verification
    const isPaidAppointment = appointment.fee && appointment.fee > 0;

    if (!isPaidAppointment) {
      try {
        const NotificationService = require("../../../services/notificationService");
        const clientName = client.fullName || client.name || "Client";
        const consultantName = consultantDoc?.fullName || consultantDoc?.name || consultantDoc?.displayName || "Consultant";

        await NotificationService.notifyAppointmentBooked(
          { ...doc, _id: appointment._id, client: value.client, consultant: consultantUserId },
          clientName,
          consultantName
        );
      } catch (notifErr) {
        console.error("Failed to create appointment notifications:", notifErr);
      }
    }

    // 5. Handle Payment & Transaction Creation (if payment details provided)
    if (value.payment && value.payment.amount > 0) {
      const Transaction = require("../../../models/transaction.model");

      const transaction = await Transaction.create({
        user: value.client,
        consultant: consultantUserId, // Ensure we use the User ID of the consultant
        appointment: appointment._id,
        amount: value.payment.amount,
        currency: "INR", // Default or from payload if added
        type: "Payment",
        status: value.payment.status || "Pending",
        paymentMethod: value.payment.method || "System",
        transactionId: value.payment.transactionId || `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userSnapshot: clientSnapshot,
        consultantSnapshot: consultantSnapshot,
      });

      // Link Transaction to Appointment
      appointment.payment = {
        amount: transaction.amount,
        status: transaction.status,
        transactionId: transaction._id,
        method: transaction.paymentMethod,
      };
      await appointment.save();
    }

    return sendSuccess(res, "Appointment created successfully", appointment, httpStatus.CREATED);
  } catch (error) {
    // allow duplicate index handling etc (not likely here)
    next(error);
  }
};

// Get appointments list (supports filters + role-based filtering)
exports.getAppointments = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 1000, status, consultant, client, from, to } = req.query;
    const user = req.user; // From auth middleware
    const userRole = user?.role;
    const userId = user?._id || user?.id;

    console.log("📋 [GET APPOINTMENTS] Request received");
    console.log("  User ID:", userId);
    console.log("  User Role:", userRole);
    console.log("  Query Params:", { q, page, limit, status, consultant, client, from, to });

    const query = {};

    // Role-based filtering: Users can only see their own appointments
    if (userRole === "Client") {
      // Clients see appointments where they are the client
      query.client = userId;
      console.log("  Filtering for Client - query.client =", userId);
    } else if (userRole === "Consultant") {
      // Consultants authenticate with their Consultant ID (not User ID)
      // Need to check both Consultant ID (direct) and User ID (if linked)
      const Consultant = require("../../../models/consultant.model").Consultant;
      let consultantDoc = null;
      let consultantId = userId; // Default: assume userId is Consultant ID
      let linkedUserId = null;

      // First, try to find consultant by ID (most likely case - consultants auth with Consultant ID)
      consultantDoc = await Consultant.findById(userId).lean();

      // If found, check if it has a linked User ID
      if (consultantDoc) {
        consultantId = consultantDoc._id;
        linkedUserId = consultantDoc.user; // May be null if no User record linked
      } else {
        // If not found by ID, try to find by User ID (in case consultant has User record)
        consultantDoc = await Consultant.findOne({ user: userId }).lean();
        if (consultantDoc) {
          consultantId = consultantDoc._id;
          linkedUserId = userId; // The userId is actually a User ID in this case
        } else if (user.email) {
          // Last resort: try to find by email
          consultantDoc = await Consultant.findOne({ email: user.email }).lean();
          if (consultantDoc) {
            consultantId = consultantDoc._id;
            linkedUserId = consultantDoc.user;
          }
        }
      }

      // Build query to match either Consultant ID or User ID (if linked)
      if (consultantDoc) {
        if (linkedUserId) {
          // Consultant has linked User - check both IDs
          query.$or = [
            { consultant: consultantId }, // Matches if appointment stored with Consultant ID
            { consultant: linkedUserId }  // Matches if appointment stored with User ID
          ];
          console.log("  Filtering for Consultant - checking Consultant ID:", consultantId, "and User ID:", linkedUserId);
        } else {
          // Consultant has no linked User - only check Consultant ID
          query.consultant = consultantId;
          console.log("  Filtering for Consultant - query.consultant =", consultantId, "(no User record linked)");
        }
      } else {
        // Fallback: assume userId is Consultant ID
        query.consultant = userId;
        console.log("  Filtering for Consultant - query.consultant =", userId, "(assuming Consultant ID, no doc found)");
      }
    } else if (userRole === "Admin") {
      // Admin can see all appointments (no filtering)
      console.log("  Admin user - no filtering applied");
    } else {
      // Unknown role - restrict to user's own appointments
      query.$or = [
        { client: userId },
        { consultant: userId }
      ];
      console.log("  Unknown role - filtering with $or");
    }

    // Additional filters
    if (status) query.status = status;
    if (consultant && userRole === "Admin") query.consultant = consultant; // Only admin can filter by consultant
    if (client && (userRole === "Admin" || userRole === "Consultant")) query.client = client; // Admin and Consultant can filter by client

    // date range filter using startAt
    if (from || to) {
      query.startAt = {};
      if (from) query.startAt.$gte = new Date(from);
      if (to) query.startAt.$lte = new Date(to);
    }

    // Basic text search across reason/notes (simple)
    if (q) {
      const textSearch = {
        $or: [
          { reason: new RegExp(q, "i") },
          { notes: new RegExp(q, "i") },
        ]
      };
      // Combine with existing query using $and if we have role-based $or
      if (query.$or) {
        // If we already have $or, combine it with text search using $and
        if (query.$and) {
          query.$and.push(textSearch);
        } else {
          query.$and = [
            { $or: query.$or },
            textSearch
          ];
          delete query.$or;
        }
      } else {
        query.$or = textSearch.$or;
      }
    }

    console.log("  Final MongoDB Query:", JSON.stringify(query, null, 2));

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const lim = Math.max(parseInt(limit, 10) || 1000, 1);

    // Find appointments first
    const docs = await Appointment.find(query)
      .sort({ startAt: 1 })
      .skip((pageNum - 1) * lim)
      .limit(lim)
      .lean();

    // Manually populate client and consultant since they might be from different models
    const Client = require("../../../models/client.model");
    const populatedDocs = await Promise.all(
      docs.map(async (doc) => {
        // Populate client - try Client model first, then User model
        let clientData = null;
        if (doc.client) {
          clientData = await Client.findById(doc.client).lean();
          if (!clientData) {
            const userClient = await User.findById(doc.client).lean();
            if (userClient && userClient.role === "Client") {
              clientData = userClient;
            }
          }
        }

        // Populate consultant - try Consultant model first, then User model
        let consultantData = null;
        if (doc.consultant) {
          consultantData = await Consultant.findById(doc.consultant).lean();
          if (!consultantData) {
            const userConsultant = await User.findById(doc.consultant).lean();
            if (userConsultant && userConsultant.role === "Consultant") {
              consultantData = userConsultant;
            }
          }
        }

        return {
          ...doc,
          client: clientData ? {
            _id: clientData._id,
            fullName: clientData.fullName || clientData.name,
            email: clientData.email,
            mobile: clientData.mobile || clientData.phone
          } : null,
          consultant: consultantData ? {
            _id: consultantData._id,
            fullName: consultantData.fullName || consultantData.name || consultantData.displayName,
            email: consultantData.email,
            mobile: consultantData.mobile || consultantData.phone,
            role: "Consultant",
            category: consultantData.category?.name || "General",
          } : null,
        };
      })
    );

    console.log("  ✅ Found", populatedDocs.length, "appointments");
    console.log("  Sample appointment (first):", populatedDocs[0] ? {
      id: populatedDocs[0]._id,
      client: populatedDocs[0].client ? { _id: populatedDocs[0].client._id, fullName: populatedDocs[0].client.fullName } : null,
      consultant: populatedDocs[0].consultant ? { _id: populatedDocs[0].consultant._id, fullName: populatedDocs[0].consultant.fullName } : null,
      date: populatedDocs[0].date,
      status: populatedDocs[0].status
    } : "No appointments found");

    // respond with standard shape
    return sendSuccess(res, "Appointments fetched", { data: populatedDocs, page: pageNum, limit: lim });
  } catch (error) {
    next(error);
  }
};

// Get appointment by id (with role-based authorization)
exports.getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const userRole = user?.role;
    const userId = user?._id || user?.id;

    const appt = await Appointment.findById(id).lean();

    if (!appt) throw new ApiError("Appointment not found", httpStatus.NOT_FOUND);

    // Manually populate client and consultant
    const Client = require("../../../models/client.model");
    let clientData = null;
    if (appt.client) {
      clientData = await Client.findById(appt.client).lean();
      if (!clientData) {
        const userClient = await User.findById(appt.client).lean();
        if (userClient && userClient.role === "Client") {
          clientData = userClient;
        }
      }
    }

    let consultantData = null;
    if (appt.consultant) {
      consultantData = await Consultant.findById(appt.consultant).lean();
      if (!consultantData) {
        const userConsultant = await User.findById(appt.consultant).lean();
        if (userConsultant && userConsultant.role === "Consultant") {
          consultantData = userConsultant;
        }
      }
    }

    // Add populated data to appointment
    appt.client = clientData ? {
      _id: clientData._id,
      fullName: clientData.fullName || clientData.name,
      email: clientData.email,
      mobile: clientData.mobile || clientData.phone
    } : null;
    appt.consultant = consultantData ? {
      _id: consultantData._id,
      fullName: consultantData.fullName || consultantData.name || consultantData.displayName,
      email: consultantData.email,
      mobile: consultantData.mobile || consultantData.phone,
      role: "Consultant"
    } : null;

    // Role-based authorization check
    if (userRole === "Client") {
      const clientId = appt.client?._id || appt.client;
      if (String(clientId) !== String(userId)) {
        throw new ApiError("Not authorized to view this appointment", httpStatus.FORBIDDEN);
      }
    } else if (userRole === "Consultant") {
      const consultantId = appt.consultant?._id || appt.consultant;
      // For consultants, userId is their Consultant ID (from JWT)
      // Check if appointment's consultant matches the logged-in consultant
      let isAuthorized = String(consultantId) === String(userId);

      if (!isAuthorized) {
        // Try to check if consultant has linked User ID that matches
        const Consultant = require("../../../models/consultant.model").Consultant;
        const consultantDoc = await Consultant.findById(userId).lean();
        if (consultantDoc) {
          // If consultant has linked User, check if appointment uses that User ID
          if (consultantDoc.user && String(consultantId) === String(consultantDoc.user)) {
            isAuthorized = true;
          }
        }
        // Also check if the appointment consultant ID matches the logged-in consultant ID
        if (!isAuthorized && String(consultantId) === String(userId)) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        throw new ApiError("Not authorized to view this appointment", httpStatus.FORBIDDEN);
      }
    } else if (userRole !== "Admin") {
      // Unknown role - check if user is client or consultant
      const clientId = appt.client?._id || appt.client;
      const consultantId = appt.consultant?._id || appt.consultant;
      if (String(clientId) !== String(userId) && String(consultantId) !== String(userId)) {
        throw new ApiError("Not authorized to view this appointment", httpStatus.FORBIDDEN);
      }
    }

    return sendSuccess(res, "Appointment fetched", appt);
  } catch (error) {
    next(error);
  }
};

// Update appointment (partial patch) - with role-based authorization
exports.updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const user = req.user;
    const userRole = user?.role;
    const userId = user?._id || user?.id;

    const { error, value } = updateAppointmentSchema.validate(payload, { abortEarly: false });
    if (error) throw new ApiError(error.details.map((d) => d.message).join(", "), httpStatus.BAD_REQUEST);

    const appt = await Appointment.findById(id);
    if (!appt) throw new ApiError("Appointment not found", httpStatus.NOT_FOUND);

    // Role-based authorization check
    if (userRole === "Client") {
      const clientId = appt.client?._id || appt.client;
      if (String(clientId) !== String(userId)) {
        throw new ApiError("Not authorized to update this appointment", httpStatus.FORBIDDEN);
      }
    } else if (userRole === "Consultant") {
      const consultantId = appt.consultant?._id || appt.consultant;
      // For consultants, userId is their Consultant ID (from JWT)
      // Check if appointment's consultant matches the logged-in consultant
      let isAuthorized = String(consultantId) === String(userId);

      if (!isAuthorized) {
        // Try to check if consultant has linked User ID that matches
        const Consultant = require("../../../models/consultant.model").Consultant;
        const consultantDoc = await Consultant.findById(userId).lean();
        if (consultantDoc) {
          // If consultant has linked User, check if appointment uses that User ID
          if (consultantDoc.user && String(consultantId) === String(consultantDoc.user)) {
            isAuthorized = true;
          }
        }
        // Also check if the appointment consultant ID matches the logged-in consultant ID
        if (!isAuthorized && String(consultantId) === String(userId)) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        throw new ApiError("Not authorized to update this appointment", httpStatus.FORBIDDEN);
      }
    } else if (userRole !== "Admin") {
      // Unknown role - check if user is client or consultant
      const clientId = appt.client?._id || appt.client;
      const consultantId = appt.consultant?._id || appt.consultant;
      if (String(clientId) !== String(userId) && String(consultantId) !== String(userId)) {
        throw new ApiError("Not authorized to update this appointment", httpStatus.FORBIDDEN);
      }
    }

    // If times are being updated, compute new startAt/endAt
    let newStart = appt.startAt ? new Date(appt.startAt) : null;
    let newEnd = appt.endAt ? new Date(appt.endAt) : null;

    if (value.startAt || value.endAt) {
      newStart = value.startAt ? new Date(value.startAt) : newStart;
      newEnd = value.endAt ? new Date(value.endAt) : newEnd;
    } else if (value.date || value.timeStart || value.timeEnd) {
      const dateToUse = value.date || appt.date || (appt.startAt ? appt.startAt.toISOString().split("T")[0] : null);
      const timeStartToUse = value.timeStart || appt.timeStart;
      const timeEndToUse = value.timeEnd || appt.timeEnd;
      if (dateToUse && timeStartToUse) {
        newStart = buildDateFromDateAndHHMM(dateToUse, timeStartToUse);
        if (timeEndToUse) {
          newEnd = buildDateFromDateAndHHMM(dateToUse, timeEndToUse);
        } else {
          newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
        }
      }
    }

    if (newStart && newEnd && newStart >= newEnd) {
      throw new ApiError("Invalid time range", httpStatus.BAD_REQUEST);
    }

    // If consultant or time changed, check conflicts
    const consultantId = value.consultant || appt.consultant;
    if (newStart && newEnd) {
      const hasConflict = await Appointment.hasConflict(consultantId, newStart, newEnd, appt._id);
      if (hasConflict) {
        return res.status(httpStatus.CONFLICT).json({
          success: false,
          message: "Updated time conflicts with another appointment",
        });
      }
    }

    // Capture original values before verification/modification
    const originalStartAt = appt.startAt;
    const originalStatus = appt.status;

    // Apply updates
    if (value.client) appt.client = value.client;
    if (value.consultant) appt.consultant = value.consultant;
    if (value.category) appt.category = value.category;
    if (value.session) appt.session = value.session;
    if (value.reason !== undefined) appt.reason = value.reason;
    if (value.notes !== undefined) appt.notes = value.notes;
    if (value.fee !== undefined) appt.fee = value.fee;
    if (value.status) appt.status = value.status;

    if (newStart) {
      appt.startAt = newStart;
      appt.date = newStart.toISOString().split("T")[0];
    }
    if (newEnd) {
      appt.endAt = newEnd;
    }

    // Store old values for comparison
    const oldStatus = appt.status;
    const oldDate = appt.date;
    // const oldTimeStart = appt.timeStart; // Removed

    await appt.save();

    // Manually populate client and consultant for response
    const Client = require("../../../models/client.model");
    let clientData = null;
    if (appt.client) {
      clientData = await Client.findById(appt.client).lean();
      if (!clientData) {
        const userClient = await User.findById(appt.client).lean();
        if (userClient && userClient.role === "Client") {
          clientData = userClient;
        }
      }
    }

    let consultantData = null;
    if (appt.consultant) {
      consultantData = await Consultant.findById(appt.consultant).lean();
      if (!consultantData) {
        const userConsultant = await User.findById(appt.consultant).lean();
        if (userConsultant && userConsultant.role === "Consultant") {
          consultantData = userConsultant;
        }
      }
    }

    // Convert to plain object and add populated data
    const apptObj = appt.toObject();
    apptObj.client = clientData ? {
      _id: clientData._id,
      fullName: clientData.fullName || clientData.name,
      email: clientData.email,
      mobile: clientData.mobile || clientData.phone
    } : null;
    apptObj.consultant = consultantData ? {
      _id: consultantData._id,
      fullName: consultantData.fullName || consultantData.name || consultantData.displayName,
      email: consultantData.email,
      mobile: consultantData.mobile || consultantData.phone,
      role: "Consultant"
    } : null;

    // Send notifications for appointment updates
    try {
      const Notification = require("../../../models/notification.model");
      const client = apptObj.client;
      const consultant = apptObj.consultant;
      const consultantUserId = consultant?._id || consultant;
      const clientUserId = client?._id || client;

      const consultantName = consultant?.fullName || consultant?.name || "Consultant";
      const clientName = client?.fullName || client?.name || "Client";

      // Check if status changed
      if (appt.status !== originalStatus) {
        // Notification to Client
        await Notification.create({
          name: "Appointment Status Updated",
          message: `Your appointment with ${consultantName} has been updated to ${appt.status}.`,
          recipient: clientUserId,
          recipientRole: "Client",
          type: "appointment",
          avatar: consultant?.avatar || consultant?.profileImage || ""
        });

        // Notification to Consultant
        await Notification.create({
          name: "Appointment Status Updated",
          message: `Appointment with ${clientName} has been updated to ${appt.status}.`,
          recipient: consultantUserId,
          recipientRole: "Consultant",
          type: "appointment",
          avatar: client?.avatar || client?.profileImage || ""
        });
      }

      // Check if time/date changed
      const timeChanged = originalStartAt && appt.startAt && originalStartAt.getTime() !== appt.startAt.getTime();

      if (timeChanged) {
        const dateStr = appt.startAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = appt.startAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        // Notification to Client
        await Notification.create({
          name: "Appointment Rescheduled",
          message: `Your appointment with ${consultantName} has been rescheduled to ${dateStr} at ${timeStr}.`,
          recipient: clientUserId,
          recipientRole: "Client",
          type: "appointment",
          avatar: consultant?.avatar || consultant?.profileImage || ""
        });

        // Notification to Consultant
        await Notification.create({
          name: "Appointment Rescheduled",
          message: `Appointment with ${clientName} has been rescheduled to ${dateStr} at ${timeStr}.`,
          recipient: consultantUserId,
          recipientRole: "Consultant",
          type: "appointment",
          avatar: client?.avatar || client?.profileImage || ""
        });
      }
    } catch (notifErr) {
      console.error("Failed to create update notifications:", notifErr);
      // Don't fail the update if notifications fail
    }

    return sendSuccess(res, "Appointment updated", apptObj);
  } catch (error) {
    next(error);
  }
};

// Delete appointment - with role-based authorization
exports.deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const userRole = user?.role;
    const userId = user?._id || user?.id;

    const appt = await Appointment.findById(id);
    if (!appt) throw new ApiError("Appointment not found", httpStatus.NOT_FOUND);

    // Role-based authorization check
    if (userRole === "Client") {
      const clientId = appt.client?._id || appt.client;
      if (String(clientId) !== String(userId)) {
        throw new ApiError("Not authorized to delete this appointment", httpStatus.FORBIDDEN);
      }
    } else if (userRole === "Consultant") {
      const consultantId = appt.consultant?._id || appt.consultant;
      // For consultants, userId is their Consultant ID (from JWT)
      // Check if appointment's consultant matches the logged-in consultant
      let isAuthorized = String(consultantId) === String(userId);

      if (!isAuthorized) {
        // Try to check if consultant has linked User ID that matches
        const Consultant = require("../../../models/consultant.model").Consultant;
        const consultantDoc = await Consultant.findById(userId).lean();
        if (consultantDoc) {
          // If consultant has linked User, check if appointment uses that User ID
          if (consultantDoc.user && String(consultantId) === String(consultantDoc.user)) {
            isAuthorized = true;
          }
        }
        // Also check if the appointment consultant ID matches the logged-in consultant ID
        if (!isAuthorized && String(consultantId) === String(userId)) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        throw new ApiError("Not authorized to delete this appointment", httpStatus.FORBIDDEN);
      }
    } else if (userRole !== "Admin") {
      // Unknown role - check if user is client or consultant
      const clientId = appt.client?._id || appt.client;
      const consultantId = appt.consultant?._id || appt.consultant;
      if (String(clientId) !== String(userId) && String(consultantId) !== String(userId)) {
        throw new ApiError("Not authorized to delete this appointment", httpStatus.FORBIDDEN);
      }
    }

    // Manually populate before deletion to get names for notifications
    const Client = require("../../../models/client.model");
    let clientData = null;
    if (appt.client) {
      clientData = await Client.findById(appt.client).lean();
      if (!clientData) {
        const userClient = await User.findById(appt.client).lean();
        if (userClient && userClient.role === "Client") {
          clientData = userClient;
        }
      }
    }

    let consultantData = null;
    if (appt.consultant) {
      consultantData = await Consultant.findById(appt.consultant).lean();
      if (!consultantData) {
        const userConsultant = await User.findById(appt.consultant).lean();
        if (userConsultant && userConsultant.role === "Consultant") {
          consultantData = userConsultant;
        }
      }
    }

    const client = clientData ? {
      _id: clientData._id,
      fullName: clientData.fullName || clientData.name,
      email: clientData.email,
      mobile: clientData.mobile || clientData.phone
    } : null;
    const consultant = consultantData ? {
      _id: consultantData._id,
      fullName: consultantData.fullName || consultantData.name || consultantData.displayName,
      email: consultantData.email,
      mobile: consultantData.mobile || consultantData.phone
    } : null;
    const consultantUserId = consultant?._id || consultant;
    const clientUserId = client?._id || client;

    const consultantName = consultant?.fullName || consultant?.name || "Consultant";
    const clientName = client?.fullName || client?.name || "Client";
    const dateStr = appt.date || (appt.startAt ? appt.startAt.toISOString().split("T")[0] : "");
    const timeStr = appt.timeStart || (appt.startAt ? `${String(appt.startAt.getHours()).padStart(2, "0")}:${String(appt.startAt.getMinutes()).padStart(2, "0")}` : "");

    await Appointment.findByIdAndDelete(id);

    // Send cancellation notifications using NotificationService
    try {
      const NotificationService = require("../../../services/notificationService");

      await NotificationService.notifyAppointmentCancelled(
        { ...appointment.toObject(), client: clientUserId, consultant: consultantUserId, date: dateStr, timeStart: timeStr },
        userRole === "Client" ? "client" : "consultant",
        clientName,
        consultantName
      );
    } catch (notifErr) {
      console.error("Failed to create cancellation notifications:", notifErr);
      // Don't fail the deletion if notifications fail
    }

    return sendSuccess(res, "Appointment deleted", null);
  } catch (error) {
    next(error);
  }
};

// Available slots endpoint
exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { error, value } = availableSlotsQuerySchema.validate(req.query, { abortEarly: false });
    if (error) throw new ApiError(error.details.map((d) => d.message).join(", "), httpStatus.BAD_REQUEST);

    const { consultant, date, slotDurationMin = 60, startHour = 9, endHour = 17 } = value;

    // ensure consultant exists (optional)
    let consultantExists = true;
    try {
      const c = await Consultant.findById(consultant);
      if (!c) {
        const cUser = await User.findOne({ _id: consultant, role: "Consultant" });
        if (!cUser) consultantExists = false;
      }
    } catch (e) {
      consultantExists = false;
    }
    if (!consultantExists) throw new ApiError("Consultant not found", httpStatus.NOT_FOUND);

    const slots = await Appointment.getAvailableSlots(consultant, date, { slotDurationMin, startHour, endHour });

    return sendSuccess(res, "Available slots fetched", slots);
  } catch (error) {
    next(error);
  }
};
