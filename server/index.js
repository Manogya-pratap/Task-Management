const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = require("./app-working");

// Connect to database with working configuration
const connectDB = async () => {
  try {
    const connectionString = process.env.MONGODB_URI;
    console.log("Attempting MongoDB connection...");

    const conn = await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.log("Server will continue without database...");
  }
};

const PORT = process.env.PORT || 5000;

// Only start server if not in test environment
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(
      `🔗 CORS configured for: ${process.env.CLIENT_URL || "http://localhost:3000"}`
    );

    // Connect to database after server starts
    setTimeout(connectDB, 1000);
  });
}

module.exports = app;
