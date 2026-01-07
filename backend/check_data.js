require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./src/models/transaction.model');
const Appointment = require('./src/models/appointment.model');
const User = require('./src/models/user.model');

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/consultation_db"; // Fallback if env not picked up

async function checkData() {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected.");

        const txCount = await Transaction.countDocuments({});
        console.log(`Total Transactions: ${txCount}`);

        const successPaymentTx = await Transaction.countDocuments({ status: "Success", type: "Payment" });
        console.log(`Successful Payment Transactions: ${successPaymentTx}`);

        const apptCount = await Appointment.countDocuments({});
        console.log(`Total Appointments: ${apptCount}`);

        // Check dates of transactions
        const transactions = await Transaction.find({ status: "Success", type: "Payment" }).sort({ createdAt: -1 }).limit(5);
        console.log("Latest 5 Successful Transactions:");
        transactions.forEach(t => {
            console.log(`- ID: ${t._id}, Date: ${t.createdAt}, Amount: ${t.amount}`);
        });

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

checkData();
