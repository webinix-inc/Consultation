require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./src/models/transaction.model');
const fs = require('fs');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/consultation_db";

async function check() {
    try {
        await mongoose.connect(MONGO_URI);

        let output = "--- TRANSACTIONS ---\n";
        const transactions = await Transaction.find({ type: "Payment", status: "Success" }).lean();

        if (transactions.length === 0) {
            output += "No successful payment transactions found.\n";
        } else {
            transactions.forEach(t => {
                output += `ID: ${t._id}\n`;
                output += `  User: ${t.user} (${typeof t.user})\n`;
                output += `  Consultant: ${t.consultant} (${typeof t.consultant})\n`;
                output += `  Amount: ${t.amount}, Net: ${t.netAmount}\n`;
                output += `  Type: ${t.type}, Status: ${t.status}\n\n`;
            });
        }

        fs.writeFileSync('revenue_log.txt', output);
        console.log("Log written to revenue_log.txt");

    } catch (e) {
        console.error(e);
        fs.writeFileSync('revenue_log.txt', `Error: ${e.message}`);
    } finally {
        await mongoose.disconnect();
    }
}

check();
