const Client = require("../../../models/client.model");
const User = require("../../../models/user.model");
const Appointment = require("../../../models/appointment.model");
const { Document } = require("../../../models/document.model");
const Transaction = require("../../../models/transaction.model");
const { sendSuccess, sendError, ApiError } = require("../../../utils/response");
const { SUCCESS, ERROR } = require("../../../constants/messages");
const httpStatus = require("../../../constants/httpStatus");
const { deleteFile, extractKeyFromUrl } = require("../../../services/s3.service");

exports.getProfile = async (req, res, next) => {
    try {
        const clientId = req.user.id; // For Client role, this is the Client's _id directly
        const userRole = req.user.role;

        console.log(`[getProfile] Client ID: ${clientId}, Role: ${userRole}`);

        // Since this route is only accessible to Clients (authorizeRoles("Client")),
        // req.user.id is the Client's _id, not a User's _id
        // Try to find Client by _id first (direct Client model)
        let client = await Client.findById(clientId);

        // If not found by _id, try finding by user field (for backward compatibility with legacy Clients)
        if (!client) {
            console.log(`[getProfile] Client not found by _id, trying user field...`);
            client = await Client.findOne({ user: clientId });
        }

        if (!client) {
            console.error(`[getProfile] Client not found with ID: ${clientId}`);
            throw new ApiError(ERROR.USER_NOT_FOUND || "Client profile not found", httpStatus.NOT_FOUND);
        }

        console.log(`[getProfile] Client found: ${client.fullName} (${client.email})`);

        // Convert to plain object and return
        const profileData = {
            ...client.toObject(),
            _id: client._id,
        };

        return sendSuccess(res, "Client profile fetched successfully", profileData);
    } catch (error) {
        console.error(`[getProfile] Error:`, error);
        next(error);
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const clientId = req.user.id; // For Client role, this is the Client's _id directly
        const updateData = req.body;

        // Handle avatar upload from S3 (if uploaded via multer middleware)
        if (req.file) {
            // Get existing client to delete old avatar
            const existingClient = await Client.findById(clientId);
            if (existingClient && existingClient.avatar) {
                try {
                    // Extract S3 key from old avatar URL and delete it
                    const oldKey = extractKeyFromUrl(existingClient.avatar);
                    if (oldKey) {
                        await deleteFile(oldKey);
                    }
                } catch (deleteError) {
                    console.error("Error deleting old avatar from S3:", deleteError);
                    // Continue with update even if old avatar deletion fails
                }
            }
            // Set new avatar URL from S3
            updateData.avatar = req.file.location;
        }

        // Prepare Client updates
        const clientUpdates = {
            fullName: updateData.fullName,
            mobile: updateData.mobile,
            dob: updateData.dob,
            address: updateData.address,
            city: updateData.city,
            state: updateData.state,
            country: updateData.country,
            pincode: updateData.pincode,
            emergencyContact: updateData.emergencyContact,
            avatar: updateData.avatar,
        };

        // Remove undefined fields
        Object.keys(clientUpdates).forEach(key => clientUpdates[key] === undefined && delete clientUpdates[key]);

        // Update Client model
        const client = await Client.findByIdAndUpdate(
            clientId,
            { $set: clientUpdates },
            { new: true, runValidators: true }
        );

        if (!client) {
            throw new ApiError(ERROR.USER_NOT_FOUND, httpStatus.NOT_FOUND);
        }

        // Return the updated profile
        const fullProfile = {
            ...client.toObject(),
            _id: client._id,
        };

        return sendSuccess(res, "Profile updated successfully", fullProfile);
    } catch (error) {
        next(error);
    }
};

exports.getClientProfileById = async (req, res, next) => {
    try {
        const id = req.params.id;

        console.log(`[getClientProfileById] Looking for client with ID: ${id}`);

        // First, try to find Client directly by _id (modern Clients have their own IDs)
        let client = await Client.findById(id);

        // If not found, try to find by user field (for backward compatibility with legacy Clients linked to User)
        if (!client) {
            console.log(`[getClientProfileById] Client not found by _id, trying user field...`);
            client = await Client.findOne({ user: id });
        }

        // If still not found, try legacy approach: find User first, then Client linked to User
        if (!client) {
            console.log(`[getClientProfileById] Client not found, trying legacy User approach...`);
            const user = await User.findById(id);

            if (user) {
                // Found a User, try to find Client linked to this User
                client = await Client.findOne({ user: id });

                if (client) {
                    // Merge User and Client data (legacy approach)
                    const profileData = {
                        ...user.toObject(),
                        ...(client.toObject ? client.toObject() : client),
                        _id: user._id,
                        clientId: client._id,
                    };
                    console.log(`[getClientProfileById] Found legacy Client linked to User`);
                    return sendSuccess(res, "Client profile fetched successfully", profileData);
                } else {
                    // User exists but no Client linked - return User data with empty Client fields
                    const profileData = {
                        ...user.toObject(),
                        dob: null,
                        address: "",
                        city: "",
                        state: "",
                        country: "",
                        pincode: "",
                        emergencyContact: "",
                        avatar: "",
                        _id: user._id,
                    };
                    console.log(`[getClientProfileById] Found User but no linked Client`);
                    return sendSuccess(res, "Client profile fetched successfully", profileData);
                }
            }
        }

        // If Client found directly (modern approach)
        if (client) {
            console.log(`[getClientProfileById] Client found: ${client.fullName} (${client.email})`);
            const profileData = {
                ...client.toObject(),
                _id: client._id,
            };
            return sendSuccess(res, "Client profile fetched successfully", profileData);
        }

        // Not found at all
        console.error(`[getClientProfileById] Client not found with ID: ${id}`);
        throw new ApiError(ERROR.USER_NOT_FOUND || "Client profile not found", httpStatus.NOT_FOUND);
    } catch (error) {
        console.error(`[getClientProfileById] Error:`, error.message || error);
        next(error);
    }
};

exports.getAllClients = async (req, res, next) => {
    try {
        const { search, page = 1, limit = 10, status } = req.query;
        const query = {};

        // Search functionality (escape regex to prevent ReDoS)
        if (search) {
            const { escapeRegex } = require("../../../utils/string.util");
            const escaped = escapeRegex(search.slice(0, 100)); // Limit length
            if (escaped) {
                query.$or = [
                    { fullName: { $regex: escaped, $options: "i" } },
                    { email: { $regex: escaped, $options: "i" } },
                    { mobile: { $regex: escaped, $options: "i" } },
                ];
            }
        }

        // Status filter
        if (status) {
            query.status = status;
        }

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Fetch clients
        const clients = await Client.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Client.countDocuments(query);

        return sendSuccess(res, "Clients fetched successfully", {
            clients,
            pagination: {
                total,
                page: pageNum,
                pages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        console.error(`[getAllClients] Error:`, error);
        next(error);
    }
};

exports.updateClient = async (req, res, next) => {
    try {
        const { id } = req.params;
        // updateData is validated by updateClientSchema - only allowlisted fields (no password, otp, etc.)
        const updateData = req.body;

        const client = await Client.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!client) {
            throw new ApiError(ERROR.USER_NOT_FOUND, httpStatus.NOT_FOUND);
        }

        return sendSuccess(res, "Client updated successfully", client);
    } catch (error) {
        next(error);
    }
};

/**
 * GDPR Art. 15 - Right to Access: Export all personal data
 * GET /api/v1/clients/profile/export
 */
exports.exportMyData = async (req, res, next) => {
    try {
        const clientId = req.user.id;
        let client = await Client.findById(clientId);
        if (!client) client = await Client.findOne({ user: clientId });
        if (!client) throw new ApiError(ERROR.USER_NOT_FOUND || "Client not found", httpStatus.NOT_FOUND);

        const [appointments, documents, transactions] = await Promise.all([
            Appointment.find({ client: { $in: [clientId, client._id] } })
                .select("date startAt endAt status session fee reason notes clientSnapshot consultantSnapshot")
                .lean(),
            Document.find({ client: { $in: [clientId, client._id] }, status: { $ne: "Deleted" } })
                .select("title type appointment createdAt description status")
                .lean(),
            Transaction.find({ user: { $in: [clientId, client._id] } })
                .select("amount currency type status createdAt userSnapshot consultantSnapshot")
                .lean(),
        ]);

        const exportData = {
            exportedAt: new Date().toISOString(),
            profile: {
                fullName: client.fullName,
                email: client.email,
                mobile: client.mobile,
                dob: client.dob,
                address: client.address,
                city: client.city,
                state: client.state,
                country: client.country,
                pincode: client.pincode,
                emergencyContact: client.emergencyContact,
                createdAt: client.createdAt,
            },
            appointments,
            documents,
            transactions,
        };

        res.setHeader("Content-Disposition", `attachment; filename="my-data-export-${Date.now()}.json"`);
        res.setHeader("Content-Type", "application/json");
        return res.status(200).json(exportData);
    } catch (error) {
        next(error);
    }
};

/**
 * GDPR Art. 17 - Right to Erasure: Self-service account deletion
 * DELETE /api/v1/clients/profile
 * Requires password confirmation in body
 */
exports.deleteMyAccount = async (req, res, next) => {
    try {
        const clientId = req.user.id;
        const { password } = req.body || {};

        let client = await Client.findById(clientId).select("+password");
        if (!client) client = await Client.findOne({ user: clientId }).select("+password");
        if (!client) throw new ApiError(ERROR.USER_NOT_FOUND || "Client not found", httpStatus.NOT_FOUND);

        if (client.password) {
            if (!password) throw new ApiError("Password is required to delete your account", httpStatus.BAD_REQUEST);
            const isMatch = await client.matchPassword(password);
            if (!isMatch) throw new ApiError("Invalid password", httpStatus.UNAUTHORIZED);
        }

        const cId = client._id.toString();
        const ids = [clientId, cId];

        const documents = await Document.find({ client: { $in: ids } }).select("fileKey");
        for (const doc of documents) {
            try {
                if (doc.fileKey) await deleteFile(doc.fileKey);
            } catch (e) { /* ignore S3 errors */ }
        }

        await Promise.all([
            Document.deleteMany({ client: { $in: ids } }),
            Transaction.deleteMany({ user: { $in: ids } }),
            Appointment.deleteMany({ client: { $in: ids } }),
        ]);

        const Notification = require("../../../models/notification.model");
        await Notification.deleteMany({ recipient: { $in: ids } });

        const ClientConsultant = require("../../../models/clientConsultant.model");
        await ClientConsultant.deleteMany({ client: { $in: ids } });

        await Client.findByIdAndDelete(client._id);

        return sendSuccess(res, "Your account and all associated data have been permanently deleted.");
    } catch (error) {
        next(error);
    }
};

/**
 * GDPR - Update consent preferences
 * PATCH /api/v1/clients/profile/consent
 */
exports.updateConsent = async (req, res, next) => {
    try {
        const clientId = req.user.id;
        const { marketingConsent, dataProcessingConsent } = req.body || {};

        const update = {};
        if (typeof marketingConsent === "boolean") update.marketingConsent = marketingConsent;
        if (typeof dataProcessingConsent === "boolean") update.dataProcessingConsent = dataProcessingConsent;

        if (Object.keys(update).length === 0) {
            throw new ApiError("No valid consent fields to update", httpStatus.BAD_REQUEST);
        }

        let client = await Client.findByIdAndUpdate(clientId, { $set: update }, { new: true });
        if (!client) client = await Client.findOneAndUpdate({ user: clientId }, { $set: update }, { new: true });
        if (!client) throw new ApiError(ERROR.USER_NOT_FOUND, httpStatus.NOT_FOUND);

        return sendSuccess(res, "Consent preferences updated", {
            marketingConsent: client.marketingConsent,
            dataProcessingConsent: client.dataProcessingConsent,
        });
    } catch (error) {
        next(error);
    }
};
