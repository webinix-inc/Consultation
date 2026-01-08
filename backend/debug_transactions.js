const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Connect to DB
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/consultation_db", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        runDebug();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const fs = require('fs');

const runDebug = async () => {
    try {
        const Transaction = require("./src/models/transaction.model");
        const Appointment = require("./src/models/appointment.model");

        let output = "--- DEBUGGING TRANSACTIONS ---\n";

        const allTransactions = await Transaction.countDocuments({});
        output += `Total Transactions: ${allTransactions}\n`;

        const paymentSuccess = await Transaction.countDocuments({ type: "Payment", status: "Success" });
        output += `Successful Payments: ${paymentSuccess}\n`;

        if (paymentSuccess > 0) {
            output += "\nLast 5 Successful Payments:\n";
            const last5 = await Transaction.find({ type: "Payment", status: "Success" })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean();

            last5.forEach(t => {
                output += `- ID: ${t._id}, Amount: ${t.amount}, Fee: ${t.platformFee}, Date: ${t.createdAt}, Consultant: ${t.consultant}\n`;
            });
        } else {
            output += "\nChecking Pending Payments:\n";
            const pending = await Transaction.countDocuments({ status: "Pending" });
            output += `Pending Payments: ${pending}\n`;
        }

        output += "\n--- DEBUGGING APPOINTMENTS ---\n";
        const allAppts = await Appointment.countDocuments({});
        output += `Total Appointments: ${allAppts}\n`;

        const completedAppts = await Appointment.countDocuments({ status: "Completed" });
        output += `Completed Appointments: ${completedAppts}\n`;

        fs.writeFileSync('debug_output.txt', output);
        console.log("Debug output written to debug_output.txt");

        process.exit();
    } catch (error) {
        console.error("Debug Error:", error);
        fs.writeFileSync('debug_output.txt', "Debug Error: " + error.message);
        process.exit(1);
    }
};

connectDB();
