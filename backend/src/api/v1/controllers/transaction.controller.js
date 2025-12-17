const Transaction = require("../../../models/transaction.model");

exports.getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10, type } = req.query;

        const query = {
            $or: [{ user: userId }, { consultant: userId }],
        };

        if (type) {
            query.type = type;
        }

        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate("user", "name email")
            .populate("consultant", "name email")
            .populate("appointment", "reason session");

        const total = await Transaction.countDocuments(query);

        res.status(200).json({
            data: transactions,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
