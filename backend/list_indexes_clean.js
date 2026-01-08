const mongoose = require("mongoose");
require("dotenv").config();

async function listIndexes() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);

        const collection = mongoose.connection.collection("appointments");
        const indexes = await collection.indexes();

        // Print purely the JSON, no other logs
        console.log("JSON_START");
        console.log(JSON.stringify(indexes, null, 2));
        console.log("JSON_END");

        await mongoose.disconnect();
    } catch (error) {
        console.log("ERROR:", error.message);
        process.exit(1);
    }
}

listIndexes();
