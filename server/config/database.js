const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    // Use the working connection string directly
    const connectionString = process.env.MONGO_URI;
    console.log("Attempting to connect to MongoDB...");
    console.log(
      "Connection string:",
      connectionString.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@")
    ); // Hide credentials in logs

    const conn = await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error("Database connection error:", error.message);
    // Don't exit in development, let server run without DB for now
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    } else {
      console.log(
        "Server will continue running without database connection..."
      );
    }
  }
};

module.exports = connectDB;
