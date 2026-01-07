const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());

// Test route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Auth route for testing
app.post('/api/auth/login', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Login endpoint working',
    body: req.body
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`CORS configured for: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
});

// Try MongoDB connection separately
const connectDB = async () => {
  try {
    const connectionString = 'mongodb+srv://mpsingh1932000_db_user:SjdO4YMSoN3s0Nr2@task-management.4t1yxy0.mongodb.net/?appName=task-management';
    console.log('Attempting MongoDB connection...');
    
    const conn = await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.log('Server will continue without database...');
  }
};

// Connect to database after server starts
setTimeout(connectDB, 1000);