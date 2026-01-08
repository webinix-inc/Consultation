const mongoose = require("mongoose");
const path = require("path");

// Load env vars
require("dotenv").config();

async function checkIndexes() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        console.log("Using URI:", uri ? "Defined" : "Undefined");

        if (!uri) {
            throw new Error("MONGO_URI is not defined");
        }

        await mongoose.connect(uri);
        console.log("Connected to MongoDB via Mongoose");

        const collection = mongoose.connection.collection("appointments");
        const indexes = await collection.indexes();

        console.log("\nIndexes on 'appointments' collection:");
        console.log(JSON.stringify(indexes, null, 2));

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error Checking Indexes:", error);
        process.exit(1);
    }
}

checkIndexes();
