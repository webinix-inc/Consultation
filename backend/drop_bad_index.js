const mongoose = require("mongoose");
require("dotenv").config();

async function dropIndex() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGO_URI undefined");

        await mongoose.connect(uri);
        console.log("Connected to MongoDB");

        const collection = mongoose.connection.collection("appointments");

        // Check if index exists first
        const indexName = "consultant_1";
        const exists = await collection.indexExists(indexName);

        if (exists) {
            console.log(`Dropping index '${indexName}'...`);
            await collection.dropIndex(indexName);
            console.log(`Index '${indexName}' dropped successfully.`);
        } else {
            console.log(`Index '${indexName}' does not exist.`);
        }

        // Also checking for other potentially bad indexes like "client_1" if it was unique
        // But error specifically said "Consultant ... already exists"

        console.log("Done.");
        await mongoose.disconnect();
    } catch (error) {
        if (error.code === 27) { // Index not found code sometimes
            console.log("Index not found (error code 27)");
        } else {
            console.error("Error dropping index:", error);
        }
        process.exit(1);
    }
}

dropIndex();
