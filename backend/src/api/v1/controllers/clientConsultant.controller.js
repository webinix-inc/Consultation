// server/src/controllers/clientConsultant.controller.js
const mongoose = require("mongoose");
const ClientConsultant = require("../../../models/clientConsultant.model");
const User = require("../../../models/user.model");
const { Consultant } = require("../../../models/consultant.model");
const { sendSuccess, sendError, ApiError } = require("../../../utils/response");
const httpStatus = require("../../../constants/httpStatus");
const { resolveConsultantDto } = require("../../../helpers/consultantHelper");

/**
 * Helper: validate ObjectId
 */
function ensureObjectId(id, name = "id") {
  if (!id || !mongoose.isValidObjectId(String(id))) {
    throw new ApiError(`${name} is required and must be a valid id`, httpStatus.BAD_REQUEST);
  }
}

/**
 * Helper: Resolve to User ID
 * Ensures we always work with the User ID for the consultant
 */
async function resolveToUserId(id) {
  // 1. Check if it's already a User ID
  const user = await User.findById(id).select("_id role email").lean();
  if (user && user.role === "Consultant") {
    return user._id;
  }

  // 2. Check if it's a Consultant ID
  const consultant = await Consultant.findById(id).select("user email").lean();
  if (consultant) {
    if (consultant.user) return consultant.user;

    // Fallback: try to find user by email
    if (consultant.email) {
      const linkedUser = await User.findOne({ email: consultant.email, role: "Consultant" }).select("_id").lean();
      if (linkedUser) return linkedUser._id;
    }
  }

  return null;
}

/**
 * Link a client to a consultant (atomic upsert)
 */
exports.linkClientConsultant = async (req, res, next) => {
  try {
    const { clientId, consultantId, notes } = req.body;
    ensureObjectId(clientId, "Client ID");
    ensureObjectId(consultantId, "Consultant ID");

    // verify client exists and has Client role
    const client = await User.findOne({ _id: clientId, role: "Client" }).lean();
    if (!client) throw new ApiError("Client not found", httpStatus.NOT_FOUND);

    // Resolve consultantId to User ID
    const consultantUserId = await resolveToUserId(consultantId);
    if (!consultantUserId) throw new ApiError("Consultant not found", httpStatus.NOT_FOUND);

    // Use atomic upsert to avoid race conditions:
    const filter = { client: clientId, consultant: consultantUserId };
    const update = {
      $set: {
        status: "Active",
        notes: typeof notes === "string" ? notes : "",
        linkedAt: new Date(),
      },
    };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    const rel = await ClientConsultant.findOneAndUpdate(filter, update, options)
      .populate({
        path: "client",
        select: "fullName email mobile status category subcategory avatar",
        populate: [
          { path: "category", select: "title" },
          { path: "subcategory", select: "title" },
        ],
      })
      .lean();

    // Fetch consultant details for response
    const consultantDto = await resolveConsultantDto(consultantUserId);

    const responseObj = {
      ...rel,
      consultant: consultantDto,
    };

    // Send notifications for new link
    try {
      const NotificationService = require("../../../services/notificationService");
      const clientName = rel.client?.fullName || "Client";
      const consultantName = consultantDto?.displayName || consultantDto?.fullName || "Consultant";

      // Notify consultant about new client
      await NotificationService.notifyNewClientLinked(consultantUserId, clientName);

      // Notify client about being linked
      await NotificationService.notifyLinkedToConsultant(clientId, consultantName);
    } catch (notifErr) {
      console.error("Failed to create link notifications:", notifErr);
    }

    return sendSuccess(res, "Client-consultant relationship created/updated", responseObj);
  } catch (error) {
    // Duplicate key fallback
    if (error && (error.code === 11000 || error.name === "MongoServerError")) {
      try {
        // Resolve consultantId again to be safe
        const consultantUserId = await resolveToUserId(req.body.consultantId);

        const existing = await ClientConsultant.findOne({
          client: req.body.clientId,
          consultant: consultantUserId,
        }).lean();
        return sendSuccess(res, "Client-consultant relationship already exists", existing);
      } catch (inner) {
        return next(error);
      }
    }
    return next(error);
  }
};

/**
 * Unlink (delete) a client-consultant relationship
 */
exports.unlinkClientConsultant = async (req, res, next) => {
  try {
    const { id } = req.params;
    ensureObjectId(id, "Relationship id");

    const rel = await ClientConsultant.findById(id).lean();
    if (!rel) throw new ApiError("Relationship not found", httpStatus.NOT_FOUND);

    // Authorization check
    if (req.user && req.user.role === "Consultant") {
      // rel.consultant is now a User ID
      if (String(rel.consultant) !== String(req.user.id) && String(rel.consultant) !== String(req.user._id)) {
        throw new ApiError("Not authorized to remove this relationship", httpStatus.FORBIDDEN);
      }
    }
    if (req.user && req.user.role === "Client") {
      if (String(rel.client) !== String(req.user.id) && String(rel.client) !== String(req.user._id)) {
        throw new ApiError("Not authorized to remove this relationship", httpStatus.FORBIDDEN);
      }
    }

    await ClientConsultant.findByIdAndDelete(id);
    return sendSuccess(res, "Client-consultant relationship removed", null);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all clients for a consultant
 * Includes clients from both ClientConsultant relationships AND appointments
 */
exports.getConsultantClients = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    ensureObjectId(consultantId, "Consultant ID");

    const Consultant = require("../../../models/consultant.model").Consultant;

    // Try to resolve to User ID first
    let consultantUserId = await resolveToUserId(consultantId);

    // Also check if it's a Consultant model ID directly
    let consultantDoc = null;
    let consultantDocId = null;

    // Check if consultantId is a Consultant model ID
    consultantDoc = await Consultant.findById(consultantId).lean();
    if (consultantDoc) {
      consultantDocId = consultantDoc._id;
      // If we found a Consultant doc but no User ID, try to get User ID from the doc
      if (!consultantUserId && consultantDoc.user) {
        consultantUserId = consultantDoc.user;
      } else if (!consultantUserId && consultantDoc.email) {
        // Try to find User by email
        const userByEmail = await User.findOne({ email: consultantDoc.email, role: "Consultant" }).select("_id").lean();
        if (userByEmail) consultantUserId = userByEmail._id;
      }
    }

    // If still no User ID, try finding Consultant by User ID
    if (!consultantDoc && consultantUserId) {
      consultantDoc = await Consultant.findOne({ user: consultantUserId }).lean();
      if (consultantDoc) consultantDocId = consultantDoc._id;
    }

    // If neither User ID nor Consultant doc found, throw error
    if (!consultantUserId && !consultantDoc) {
      throw new ApiError("Consultant not found", httpStatus.NOT_FOUND);
    }

    // Authorization: if caller is Consultant, ensure they match
    if (req.user && req.user.role === "Consultant") {
      const currentUserId = req.user.id || req.user._id;
      const matchesUserId = consultantUserId && String(currentUserId) === String(consultantUserId);
      const matchesConsultantId = consultantDocId && String(currentUserId) === String(consultantDocId);
      const matchesProvidedId = String(currentUserId) === String(consultantId);

      if (!matchesUserId && !matchesConsultantId && !matchesProvidedId) {
        throw new ApiError("Not authorized", httpStatus.FORBIDDEN);
      }
    }

    // Get clients from appointments - these are clients who booked this consultant
    const Appointment = require("../../../models/appointment.model");
    const Client = require("../../../models/client.model");

    // Build appointment query - check all possible consultant ID formats
    const appointmentQueryConditions = [];
    if (consultantUserId) {
      appointmentQueryConditions.push({ consultant: consultantUserId });
    }
    if (consultantDocId) {
      appointmentQueryConditions.push({ consultant: consultantDocId });
    }
    // Also check the provided consultantId directly
    appointmentQueryConditions.push({ consultant: consultantId });

    // Get unique client IDs from appointments
    const appointmentQuery = { $or: appointmentQueryConditions };
    const appointmentClientIds = await Appointment.distinct("client", appointmentQuery);

    // Get unique client IDs (distinct already returns array)
    const uniqueClientIds = [...new Set(appointmentClientIds.map(id => String(id)))];

    if (uniqueClientIds.length === 0) {
      return sendSuccess(res, "Clients fetched successfully", { data: [], total: 0 });
    }

    // Fetch client details from Client model
    // Note: Client model doesn't have category/subcategory fields
    const allClientsMap = new Map();

    // Convert string IDs back to ObjectIds for queries
    const clientObjectIds = uniqueClientIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    if (clientObjectIds.length === 0) {
      return sendSuccess(res, "Clients fetched successfully", { data: [], total: 0 });
    }

    // Fetch clients from Client model
    const clientDocs = await Client.find({
      _id: { $in: clientObjectIds }
    })
      .select("fullName email mobile status createdAt avatar")
      .lean();

    // Add clients to map
    clientDocs.forEach((client) => {
      const id = String(client._id);
      allClientsMap.set(id, client);
    });

    const allClients = Array.from(allClientsMap.values());

    // Aggregate stats for each client (sessions count & last session date)
    // We only want stats for appointments with THIS consultant
    const clientIds = allClients.map(c => c._id);

    // 1. Session Counts (Completed appointments)
    const sessionCounts = await Appointment.aggregate([
      {
        $match: {
          client: { $in: clientIds },
          consultant: { $in: [consultantUserId, consultantDocId, consultantId].filter(Boolean).map(id => new mongoose.Types.ObjectId(id)) },
          status: "Completed"
        }
      },
      { $sort: { startAt: -1 } },
      {
        $group: {
          _id: "$client",
          count: { $sum: 1 },
          lastSessionDate: { $first: "$date" },
          lastSessionAt: { $first: "$startAt" }
        }
      }
    ]);

    const statsMap = {};
    sessionCounts.forEach(stat => {
      statsMap[String(stat._id)] = {
        sessions: stat.count,
        lastSessionDate: stat.lastSessionDate,
        lastSessionAt: stat.lastSessionAt
      };
    });

    // Attach stats to clients
    const clientsWithStats = allClients.map(client => {
      const stat = statsMap[String(client._id)] || { sessions: 0, lastSessionDate: null, lastSessionAt: null };
      return {
        ...client,
        sessions: stat.sessions,
        lastSessionDate: stat.lastSessionDate,
        lastSessionAt: stat.lastSessionAt
      };
    });

    const total = clientsWithStats.length;

    return sendSuccess(res, "Clients fetched successfully", { data: clientsWithStats, total });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all consultants for a client
 */
exports.getClientConsultants = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { live } = req.query;
    ensureObjectId(clientId, "Client ID");

    if (req.user && req.user.role === "Client" && String(req.user.id) !== String(clientId) && String(req.user._id) !== String(clientId)) {
      throw new ApiError("Not authorized", httpStatus.FORBIDDEN);
    }

    let consultantUserIds = [];

    if (live === "true") {
      // Fetch consultants with active appointments (Upcoming or Confirmed)
      const Appointment = require("../../../models/appointment.model");
      consultantUserIds = await Appointment.find({
        client: clientId,
        status: "Upcoming"
      }).distinct("consultant");

      // Convert ObjectIds to strings
      consultantUserIds = consultantUserIds.map(id => String(id));
    } else {
      // Default behavior: fetch from ClientConsultant relationships
      const relationships = await ClientConsultant.find({ client: clientId, status: "Active" })
        .lean()
        .sort({ linkedAt: -1 });

      // consultant field is now User ID
      consultantUserIds = relationships.map((r) => String(r.consultant)).filter(Boolean);
    }

    const uniqueUserIds = [...new Set(consultantUserIds)];

    // Fetch details for these users (using helper to get full consultant profile)
    const consultantMap = new Map();

    for (const userId of uniqueUserIds) {
      const dto = await resolveConsultantDto(userId);
      if (dto) {
        consultantMap.set(String(userId), dto);
      }
    }

    const consultants = uniqueUserIds
      .map((id) => consultantMap.get(id))
      .filter(Boolean);

    const total = consultants.length;

    return sendSuccess(res, "Consultants fetched successfully", { data: consultants, total });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all relationships
 */
exports.getAllRelationships = async (req, res, next) => {
  try {
    let { clientId, consultantId, status } = req.query;

    const query = {};
    if (clientId) {
      ensureObjectId(clientId, "clientId");
      query.client = clientId;
    }
    if (consultantId) {
      ensureObjectId(consultantId, "consultantId");
      // Resolve to User ID
      const userId = await resolveToUserId(consultantId);
      if (userId) query.consultant = userId;
      else query.consultant = consultantId; // Fallback, though likely won't match
    }
    if (status) query.status = status;

    if (req.user && req.user.role === "Consultant") {
      query.consultant = req.user.id || req.user._id;
    }
    if (req.user && req.user.role === "Client") {
      query.client = req.user.id || req.user._id;
    }

    const relationships = await ClientConsultant.find(query)
      .populate("client", "fullName email mobile status avatar")
      .sort({ linkedAt: -1 })
      .lean();

    const enriched = [];
    for (const rel of relationships) {
      let consultantDto = null;
      if (rel.consultant) {
        consultantDto = await resolveConsultantDto(rel.consultant);
      }

      if (consultantDto && !consultantDto.displayName) {
        consultantDto.displayName = consultantDto.fullName || consultantDto.name || "Consultant";
      }

      enriched.push({ ...rel, consultant: consultantDto });
    }

    const total = await ClientConsultant.countDocuments(query);
    return sendSuccess(res, "Relationships fetched successfully", { data: enriched, total });
  } catch (error) {
    next(error);
  }
};

/**
 * Update relationship status
 */
exports.updateRelationshipStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    ensureObjectId(id, "Relationship id");

    if (!status || !["Active", "Inactive"].includes(status)) {
      throw new ApiError("Valid status required", httpStatus.BAD_REQUEST);
    }

    const relationship = await ClientConsultant.findByIdAndUpdate(id, { status }, { new: true })
      .populate("client", "fullName email mobile")
      .lean();

    if (!relationship) throw new ApiError("Relationship not found", httpStatus.NOT_FOUND);

    let consultantDto = null;
    if (relationship.consultant) {
      consultantDto = await resolveConsultantDto(relationship.consultant);
    }

    const response = {
      ...relationship,
      consultant: consultantDto,
    };

    return sendSuccess(res, "Relationship status updated", response);
  } catch (error) {
    next(error);
  }
};