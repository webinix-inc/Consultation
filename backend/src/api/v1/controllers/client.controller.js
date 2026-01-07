const Client = require("../../../models/client.model");
const User = require("../../../models/user.model");
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

        // Search functionality
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { mobile: { $regex: search, $options: "i" } },
            ];
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
        const updateData = req.body;

        console.log(`[updateClient] Admin updating client ${id}`, updateData);

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
