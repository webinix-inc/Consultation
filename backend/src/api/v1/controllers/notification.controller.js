const Notification = require("../../../models/notification.model");
const { sendSuccess, ApiError } = require("../../../utils/response");
const httpStatus = require("../../../constants/httpStatus");

exports.list = async (req, res, next) => {
  try {
    const { user } = req;
    const query = {
      $or: [
        { recipient: user.id },
        { recipientRole: user.role },
        { recipient: null, recipientRole: null } // Global notifications (optional)
      ]
    };
    const items = await Notification.find(query).sort({ createdAt: -1 });
    return sendSuccess(res, "Notifications fetched", items);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const item = await Notification.create(req.body);
    return sendSuccess(res, "Notification created", item, httpStatus.CREATED);
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );
    if (!updated) throw new ApiError("Notification not found", httpStatus.NOT_FOUND);
    return sendSuccess(res, "Notification marked as read", updated);
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const { user } = req;
    const query = {
      read: false,
      $or: [
        { recipient: user.id },
        { recipientRole: user.role }
      ]
    };
    await Notification.updateMany(query, { read: true });
    return sendSuccess(res, "All notifications marked as read", {});
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Notification.findByIdAndDelete(id);
    if (!deleted) throw new ApiError("Notification not found", httpStatus.NOT_FOUND);
    return sendSuccess(res, "Notification deleted", { deletedId: id });
  } catch (err) {
    next(err);
  }
};

exports.removeAll = async (req, res, next) => {
  try {
    const { user } = req;
    const query = {
      $or: [
        { recipient: user.id },
        { recipientRole: user.role }
      ]
    };
    await Notification.deleteMany(query);
    return sendSuccess(res, "All notifications deleted", {});
  } catch (err) {
    next(err);
  }
};

// Consultant can send notifications to their linked clients only
exports.createForClient = async (req, res, next) => {
  try {
    const { user } = req;
    const { name, message, recipient, type = "other", avatar } = req.body;

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

    const relationship = await ClientConsultant.findOne({
      consultant: consultantUserId,
      client: recipient,
      status: "Active"
    });

    if (!relationship) {
      throw new ApiError("Client is not linked to this consultant", httpStatus.FORBIDDEN);
    }

    // Verify recipient is a Client
    const User = require("../../../models/user.model");
    const recipientUser = await User.findById(recipient);
    if (!recipientUser || recipientUser.role !== "Client") {
      throw new ApiError("Recipient must be a client", httpStatus.BAD_REQUEST);
    }

    // Create notification
    const notification = await Notification.create({
      name,
      message,
      recipient: recipient,
      recipientRole: "Client",
      type,
      avatar: avatar || ""
    });

    return sendSuccess(res, "Notification sent to client", notification, httpStatus.CREATED);
  } catch (err) {
    next(err);
  }
};









