const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Import Models
const Transaction = require("./src/models/transaction.model");
const User = require("./src/models/user.model");
const { Consultant } = require("./src/models/consultant.model");

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/consultation_app";
        console.log("Connecting to:", uri.replace(/:([^:@]{1,})@/, ":****@")); // Mask password
        await mongoose.connect(uri);
        console.log("MongoDB Connected");
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("Collections:", collections.map(c => c.name));
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
        process.exit(1);
    }
};

const fs = require('fs');
const util = require('util');
const logFile = fs.createWriteStream('debug_output.txt', { flags: 'w' });
const logStdout = process.stdout;

console.log = function (d) { //
    logFile.write(util.format(d) + '\n');
    logStdout.write(util.format(d) + '\n');
};

const runDebug = async () => {
    await connectDB();

    console.log("--- DEBUGGING ANALYTICS DATA ---");

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    console.log("Start of Month:", startOfMonth);

    const consultants = await User.find({});
    console.log(`Found ${consultants.length} users total.`);

    for (const user of consultants) {
        console.log(`\nFound User: ${user.fullName} [Role: ${user.role}] (ID: ${user._id})`);

        // Find Consultant Profile
        const profile = await Consultant.findOne({ user: user._id });
        const consultantIds = [user._id];
        if (profile) {
            consultantIds.push(profile._id);
            console.log(`Profile ID: ${profile._id}, PlatformPercent: ${profile.commission?.platformPercent}`);
        }

        // 2. Check Transactions
        const transactions = await Transaction.find({
            consultant: { $in: consultantIds },
        });

        console.log(`Total Transactions found: ${transactions.length}`);

        if (transactions.length > 0) {
            transactions.forEach(t => {
                console.log(` - [${t.createdAt.toISOString()}] Type: ${t.type}, Status: ${t.status}, Amount: ${t.amount}, Net: ${t.netAmount}, Fee: ${t.platformFee}`);
            });
        }

        // 3. Run Aggregation logic manually
        const agg = await Transaction.aggregate([
            {
                $match: {
                    consultant: { $in: consultantIds },
                    createdAt: { $gte: startOfMonth },
                    status: "Success",
                    type: "Payment"
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: {
                        $sum: { $ifNull: ["$netAmount", "$amount"] }
                    }
                }
            },
        ]);
        console.log("Aggregation Result (Current Logic):", agg);
    }

    // Allow time for file write
    setTimeout(() => process.exit(0), 1000);
};

runDebug();
