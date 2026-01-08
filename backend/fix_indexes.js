const mongoose = require("mongoose");
require("dotenv").config();

async function fixIndexes() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log("Connected.");

        const collection = mongoose.connection.collection("appointments");
        const indexes = await collection.indexes();

        console.log("Found indexes count:", indexes.length);

        for (const idx of indexes) {
            // Skip _id index
            if (idx.name === "_id_") continue;

            const isUnique = idx.unique === true;
            const keys = Object.keys(idx.key);
            const hasConsultant = keys.includes("consultant");

            if (hasConsultant && isUnique) {
                console.log(`Dropping UNIQUE index '${idx.name}' with keys:`, idx.key);
                try {
                    await collection.dropIndex(idx.name);
                    console.log("Dropped.");
                } catch (e) {
                    console.error("Failed to drop:", e.message);
                }
            } else {
                console.log(`Skipping index '${idx.name}' (Unique: ${isUnique}, Keys: ${keys.join(",")})`);
            }
        }

        await mongoose.disconnect();
        console.log("Done.");
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

fixIndexes();
