const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        consultant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        appointment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            default: "INR",
        },
        type: {
            type: String,
            enum: ["Payment", "Refund", "Payout", "Adjustment"],
            default: "Payment",
        },
        status: {
            type: String,
            enum: ["Pending", "Success", "Failed", "Refunded"],
            default: "Pending",
        },
        paymentMethod: {
            type: String,
            default: "System",
        },
        transactionId: {
            type: String,
        },
        metadata: {
            type: Object,
        },
        userSnapshot: {
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
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Transaction", transactionSchema);
