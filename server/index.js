const mongoose = require("mongoose");
const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = require("./app");
const { initSocket } = require("./config/socket");

const PORT = process.env.PORT || 10000;

// Connect to database - REQUIRED for production
const connectDB = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is required");
    }
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    
    // In production, exit if database fails
    if (process.env.NODE_ENV === "production") {
      console.error("🚨 Database connection required in production. Exiting...");
      process.exit(1);
    } else {
      console.log("⚠️  Server will continue without database (development only)...");
    }
  }
};

// Graceful shutdown handling
const gracefulShutdown = (server) => {
  const shutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    server.close(() => {
      console.log("🔌 HTTP server closed");
      
      mongoose.connection.close(false, () => {
        console.log("🔌 MongoDB connection closed");
        process.exit(0);
      });
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error("⏰ Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// Start server
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Initialize Socket.io
    initSocket(server);
    
    // Start listening
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 Client URL: ${process.env.CLIENT_URL || "http://localhost:3000"}`);
      console.log(`⚡ WebSocket enabled`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    });
    
    // Setup graceful shutdown
    gracefulShutdown(server);
    
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

// Only start server if not in test environment
if (process.env.NODE_ENV !== "test") {
  startServer();
}

module.exports = app;
