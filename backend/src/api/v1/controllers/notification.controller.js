const Notification = require("../../../models/notification.model");
const { sendSuccess, ApiError } = require("../../../utils/response");
const httpStatus = require("../../../constants/httpStatus");

/**
 * Build a query that strictly matches notifications for the current user
 * - Individual notifications (recipient === user.id)
 * - Role-based notifications (recipientRole === user.role)
 * - Global notifications (isGlobal === true)
 */
const buildUserQuery = (user) => ({
  $or: [
    // Notifications specifically for this user
    { recipient: user.id },
    // Notifications for all users of this role (but NOT individual notifications for others)
    {
      recipientRole: user.role,
      recipient: null
    },
    // Global broadcast notifications
    { isGlobal: true }
  ]
});

// List notifications with pagination and filtering
exports.list = async (req, res, next) => {
  try {
    const { user } = req;
    const {
      page = 1,
      limit = 20,
      category,
      type,
      priority,
      read,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const query = buildUserQuery(user);

    // Apply filters
    if (category) query.category = category;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (read !== undefined) query.read = read === "true";

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * lim;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [items, totalCount, unreadCount] = await Promise.all([
      Notification.find(query).sort(sortOptions).skip(skip).limit(lim).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ ...buildUserQuery(user), read: false })
    ]);

    return sendSuccess(res, "Notifications fetched", {
      data: items,
      pagination: {
        page: pageNum,
        limit: lim,
        total: totalCount,
        pages: Math.ceil(totalCount / lim)
      },
      unreadCount
    });
  } catch (err) {
    next(err);
  }
};

// Get unread count only (for badge)
exports.getUnreadCount = async (req, res, next) => {
  try {
    const { user } = req;
    const query = { ...buildUserQuery(user), read: false };
    const count = await Notification.countDocuments(query);
    return sendSuccess(res, "Unread count fetched", { count });
  } catch (err) {
    next(err);
  }
};

// Create notification (Admin only via API)
exports.create = async (req, res, next) => {
  try {
    const { user } = req;
    const payload = {
      name: req.body.name,
      message: req.body.message,
      avatar: req.body.avatar || "",
      recipient: req.body.recipient || null,
      recipientRole: req.body.recipientRole || null,
      isGlobal: req.body.isGlobal || false,
      type: req.body.type || "other",
      category: req.body.category || "general",
      priority: req.body.priority || "normal",
      actionUrl: req.body.actionUrl || "",
      actionLabel: req.body.actionLabel || "",
      relatedId: req.body.relatedId || null,
      relatedType: req.body.relatedType || null,
      sender: user.id,
      senderRole: user.role,
      metadata: req.body.metadata || {},
      expiresAt: req.body.expiresAt || null,
    };

    // Validation: must have at least one targeting method
    if (!payload.recipient && !payload.recipientRole && !payload.isGlobal) {
      throw new ApiError("Must specify recipient, recipientRole, or isGlobal", httpStatus.BAD_REQUEST);
    }

    // Only Admin can create global notifications
    if (payload.isGlobal && user.role !== "Admin") {
      throw new ApiError("Only admins can create global notifications", httpStatus.FORBIDDEN);
    }

    const item = await Notification.create(payload);
    return sendSuccess(res, "Notification created", item, httpStatus.CREATED);
  } catch (err) {
    next(err);
  }
};

// Mark single notification as read
exports.markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const notification = await Notification.findById(id);
    if (!notification) {
      throw new ApiError("Notification not found", httpStatus.NOT_FOUND);
    }

    // Check if user has access to this notification
    const hasAccess =
      (notification.recipient && notification.recipient.toString() === user.id) ||
      (notification.recipientRole === user.role && !notification.recipient) ||
      notification.isGlobal === true;

    if (!hasAccess) {
      throw new ApiError("Not authorized to modify this notification", httpStatus.FORBIDDEN);
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    return sendSuccess(res, "Notification marked as read", notification);
  } catch (err) {
    next(err);
  }
};

// Mark all notifications as read
exports.markAllRead = async (req, res, next) => {
  try {
    const { user } = req;
    const query = {
      read: false,
      ...buildUserQuery(user)
    };

    const result = await Notification.updateMany(query, {
      read: true,
      readAt: new Date()
    });

    return sendSuccess(res, "All notifications marked as read", {
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
};

// Delete single notification
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const notification = await Notification.findById(id);
    if (!notification) {
      throw new ApiError("Notification not found", httpStatus.NOT_FOUND);
    }

    // Only the recipient or Admin can delete
    const hasAccess =
      (notification.recipient && notification.recipient.toString() === user.id) ||
      user.role === "Admin";

    if (!hasAccess) {
      throw new ApiError("Not authorized to delete this notification", httpStatus.FORBIDDEN);
    }

    await Notification.findByIdAndDelete(id);
    return sendSuccess(res, "Notification deleted", { deletedId: id });
  } catch (err) {
    next(err);
  }
};

// Delete all notifications for user
exports.removeAll = async (req, res, next) => {
  try {
    const { user } = req;
    // Only delete notifications specifically for this user, not role-based or global
    const query = { recipient: user.id };
    const result = await Notification.deleteMany(query);
    return sendSuccess(res, "Your notifications deleted", {
      deletedCount: result.deletedCount
    });
  } catch (err) {
    next(err);
  }
};

// Consultant can send notifications to their linked clients
exports.createForClient = async (req, res, next) => {
  try {
    const { user } = req;
    const {
      name,
      message,
      recipient,
      type = "message",
      category = "messages",
      priority = "normal",
      actionUrl,
      actionLabel,
      avatar
    } = req.body;

    // Verify user is a Consultant
    if (user.role !== "Consultant") {
      throw new ApiError("Only consultants can send notifications to clients", httpStatus.FORBIDDEN);
    }

    if (!name || !message) {
      throw new ApiError("Name and message are required", httpStatus.BAD_REQUEST);
    }

    if (!recipient) {
      throw new ApiError("Recipient client ID is required", httpStatus.BAD_REQUEST);
    }

    // Verify the recipient client is linked to this consultant
    const ClientConsultant = require("../../../models/clientConsultant.model");
    const consultantUserId = user.id || user._id;

    // Also check if consultant profile ID matches
    const ConsultantModel = require("../../../models/consultant.model").Consultant;
    const consultantProfile = await ConsultantModel.findOne({ user: consultantUserId });

    const consultantIds = [consultantUserId];
    if (consultantProfile) {
      consultantIds.push(consultantProfile._id);
    }

    const relationship = await ClientConsultant.findOne({
      consultant: { $in: consultantIds },
      client: recipient,
      status: "Active"
    });

    if (!relationship) {
      throw new ApiError("Client is not linked to this consultant", httpStatus.FORBIDDEN);
    }

    // Get consultant name for avatar
    const consultantName = user.name || user.fullName || "Consultant";

    // Create notification
    const notification = await Notification.create({
      name,
      message,
      recipient: recipient,
      recipientRole: null,
      isGlobal: false,
      type,
      category,
      priority,
      actionUrl: actionUrl || "",
      actionLabel: actionLabel || "",
      sender: consultantUserId,
      senderRole: "Consultant",
      avatar: avatar || user.avatar || ""
    });

    return sendSuccess(res, "Notification sent to client", notification, httpStatus.CREATED);
  } catch (err) {
    next(err);
  }
};

// Get notifications grouped by category
exports.getGroupedByCategory = async (req, res, next) => {
  try {
    const { user } = req;

    // Build the query for aggregation
    const matchStage = {
      $or: [
        { recipient: require("mongoose").Types.ObjectId.createFromHexString(user.id) },
        { recipientRole: user.role, recipient: null },
        { isGlobal: true }
      ]
    };

    const grouped = await Notification.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] }
          },
          latest: { $max: "$createdAt" }
        }
      },
      { $sort: { latest: -1 } }
    ]);

    return sendSuccess(res, "Grouped notifications fetched", grouped);
  } catch (err) {
    next(err);
  }
};
