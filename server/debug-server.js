const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('Starting debug server...');
console.log('JWT_SECRET loaded:', !!process.env.JWT_SECRET);

// Connect to database
const connectDB = async () => {
  try {
    const connectionString = 'mongodb+srv://mpsingh1932000_db_user:SjdO4YMSoN3s0Nr2@task-management.4t1yxy0.mongodb.net/?appName=task-management';
    console.log('Attempting MongoDB connection...');
    
    const conn = await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
  }
};

const app = express();

app.use(cors());
app.use(express.json());

console.log('Middleware loaded');

// Test route
app.get('/api/test', (req, res) => {
  console.log('Test route hit');
  res.json({ message: 'Debug server working!' });
});

// Try to load auth routes
try {
  console.log('Loading auth routes...');
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('Auth routes loaded successfully');
} catch (error) {
  console.error('Error loading auth routes:', error.message);
}

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
  // Connect to database after server starts
  setTimeout(connectDB, 1000);
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 for:', req.originalUrl);
  res.status(404).json({ 
    status: 'fail',
    message: `Route ${req.originalUrl} not found` 
  });
});