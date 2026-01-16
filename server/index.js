const mongoose = require("mongoose");
const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = require("./app-working");
const { initSocket } = require("./config/socket");

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
  // Create HTTP server
  const server = http.createServer(app);

  // Initialize Socket.io
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(
      `🔗 CORS configured for: ${process.env.CLIENT_URL || "http://localhost:3000"}`
    );
    console.log(`⚡ WebSocket enabled`);

    // Connect to database after server starts
    setTimeout(connectDB, 1000);
  });
}

module.exports = app;
