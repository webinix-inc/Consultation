const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("\nMongoDB connected");
  } catch (error) {
    console.error("DB connection failed:", error.message);
    process.exit(1);
  }

  // Optional: Listen to ongoing MongoDB events
  // mongoose.connection.on("connected", () => {
  //   logger.info("MongoDB connection open (event)");
  // });

  // mongoose.connection.on("disconnected", () => {
  //   logger.warn("MongoDB disconnected");
  // });

  // mongoose.connection.on("error", (err) => {
  //   logger.error("MongoDB error event: " + err.message);
  // });
};

module.exports = { connectDB };
