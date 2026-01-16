const mongoose = require('mongoose');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const { initSocket } = require('./config/socket');

console.log('Starting server...');
console.log('Environment variables:');
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);

// Connect to database
const connectDB = async () => {
  try {
    const connectionString = process.env.MONGODB_URI || 'mongodb+srv://mpsingh1932000_db_user:SjdO4YMSoN3s0Nr2@task-management.4t1yxy0.mongodb.net/?appName=task-management';
    console.log('Attempting MongoDB connection...');
    
    const conn = await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('Server will continue without database...');
  }
};

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS configured for: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`⚡ WebSocket enabled`);
  
  // Connect to database after server starts
  setTimeout(connectDB, 1000);
});

module.exports = server;