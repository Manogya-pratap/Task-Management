const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Basic security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Load routes one by one with error handling
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
}

try {
  const userRoutes = require('./routes/users');
  app.use('/api/users', userRoutes);
  console.log('✅ User routes loaded');
} catch (error) {
  console.error('❌ Error loading user routes:', error.message);
}

try {
  const teamRoutes = require('./routes/teams');
  app.use('/api/teams', teamRoutes);
  console.log('✅ Team routes loaded');
} catch (error) {
  console.error('❌ Error loading team routes:', error.message);
}

try {
  const projectRoutes = require('./routes/projects');
  app.use('/api/projects', projectRoutes);
  console.log('✅ Project routes loaded');
} catch (error) {
  console.error('❌ Error loading project routes:', error.message);
}

try {
  const taskRoutes = require('./routes/tasks');
  app.use('/api/tasks', taskRoutes);
  console.log('✅ Task routes loaded');
} catch (error) {
  console.error('❌ Error loading task routes:', error.message);
}

try {
  const auditRoutes = require('./routes/audit');
  app.use('/api/audit', auditRoutes);
  console.log('✅ Audit routes loaded');
} catch (error) {
  console.error('❌ Error loading audit routes:', error.message);
}

try {
  const reportsRoutes = require('./routes/reports');
  app.use('/api/reports', reportsRoutes);
  console.log('✅ Reports routes loaded');
} catch (error) {
  console.error('❌ Error loading reports routes:', error.message);
}

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Daily Activity Tracker API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
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

module.exports = app;