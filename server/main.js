const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('🚀 Starting Daily Activity Tracker Server...');
console.log('📍 Environment:', process.env.NODE_ENV || 'development');
console.log('🔗 Client URL:', process.env.CLIENT_URL || 'http://localhost:3000');

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// Health check routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Daily Activity Tracker API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database health check route
app.get('/api/health/db', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      res.json({
        status: 'OK',
        database: {
          connected: true,
          host: mongoose.connection.host,
          name: mongoose.connection.name,
          readyState: mongoose.connection.readyState
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'ERROR',
        database: {
          connected: false,
          readyState: mongoose.connection.readyState,
          message: 'Database not connected'
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      database: {
        connected: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong!' 
    : err.message;

  res.status(err.statusCode || 500).json({ 
    status: 'error',
    message,
    error: process.env.NODE_ENV === 'development' ? {
      message: err.message,
      stack: err.stack
    } : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    status: 'fail',
    message: `Route ${req.originalUrl} not found` 
  });
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    const connectionString = 'mongodb+srv://mpsingh1932000_db_user:SjdO4YMSoN3s0Nr2@task-management.4t1yxy0.mongodb.net/?appName=task-management';
    console.log('🔄 Attempting MongoDB connection...');
    
    const conn = await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️  Server will continue without database...');
  }
};

const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS configured for: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  
  // Connect to database after server starts
  setTimeout(connectDB, 1000);
});

module.exports = app;