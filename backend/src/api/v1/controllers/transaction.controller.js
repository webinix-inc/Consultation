const Transaction = require("../../../models/transaction.model");

exports.getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10, type, consultant } = req.query;

        let query = {};

        // If user is Admin, they can view any consultant's transactions if 'consultant' query param is provided
        // Otherwise, they view their own transactions by default (unless we want admins to see everything by default, 
        // but typically Admin dashboard views a specific consultant).
        // Standard users can ONLY view their own transactions.

        if (req.user.role === "Admin" && consultant) {
            query = {
                $or: [{ user: consultant }, { consultant: consultant }],
            };
        } else {
            query = {
                $or: [{ user: userId }, { consultant: userId }],
            };
        }

        if (type) {
            query.type = type;
        }

        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate("appointment", "reason session status")
            .lean();

        // Manually populate user (could be User or Client) and consultant (could be User or Consultant)
        // This is needed because Transaction.user is ref: "User" but might store Client ID
        const User = require("../../../models/user.model");
        const Client = require("../../../models/client.model");
        const { Consultant } = require("../../../models/consultant.model");

        const populatedTransactions = await Promise.all(transactions.map(async (t) => {
            let userData = null;
            if (t.user) {
                userData = await User.findById(t.user).select("name fullName email").lean();
                if (!userData) {
                    userData = await Client.findById(t.user).select("fullName email").lean();
                }
            }

            let consultantData = null;
            if (t.consultant) {
                // 1. Try finding User first
                const consultantUser = await User.findById(t.consultant).select("name fullName email").lean();

                // 2. Find Consultant Profile to get Category info
                let consultantProfile = null;
                if (consultantUser) {
                    consultantProfile = await Consultant.findOne({ user: t.consultant }).select("category subcategory name displayName").lean();
                } else {
                    // Fallback: t.consultant might be Consultant ID
                    consultantProfile = await Consultant.findById(t.consultant).select("category subcategory name displayName email").lean();
                }

                if (consultantUser) {
                    consultantData = { ...consultantUser, ...consultantProfile }; // Merge profile info (category) into user info
                } else {
                    consultantData = consultantProfile;
                }
            }

            return {
                ...t,
                user: userData || t.user,
                consultant: consultantData || t.consultant
            };
        }));

        const total = await Transaction.countDocuments(query);

        res.status(200).json({
            data: populatedTransactions,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.createPayout = async (req, res) => {
    try {
        const { consultantId, amount, notes, referenceId } = req.body;
        const adminId = req.user.id; // The admin creating the payout

        if (!consultantId || !amount) {
            return res.status(400).json({ message: "Consultant ID and Amount are required" });
        }

        const payoutTransaction = await Transaction.create({
            user: adminId, // Admin is the 'user' initiating the payout
            consultant: consultantId,
            amount: Number(amount),
            type: "Payout",
            status: "Success",
            currency: "INR",
            paymentMethod: "Manual",
            metadata: {
                notes,
                referenceId,
                recordedBy: adminId
            }
        });

        res.status(201).json({
            message: "Payout recorded successfully",
            data: payoutTransaction
        });

        // Notify Consultant
        try {
            const NotificationService = require("../../../services/notificationService");
            await NotificationService.notifyPayoutProcessed(
                consultantId,
                amount,
                "INR",
                notes
            );
        } catch (notifErr) {
            console.error("Failed to send payout notification:", notifErr);
        }

    } catch (error) {
        console.error("Error creating payout:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
