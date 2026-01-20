const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware - Production safe
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - Works for both dev and production
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:3001"
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Load routes with error handling
const routes = [
  { path: '/api/auth', file: './routes/auth', name: 'Auth' },
  { path: '/api/users', file: './routes/users', name: 'User' },
  { path: '/api/teams', file: './routes/teams', name: 'Team' },
  { path: '/api/projects', file: './routes/projects', name: 'Project' },
  { path: '/api/tasks', file: './routes/tasks', name: 'Task' },
  { path: '/api/audit', file: './routes/audit', name: 'Audit' },
  { path: '/api/reports', file: './routes/reports', name: 'Reports' },
  { path: '/api/departments', file: './routes/departments', name: 'Department' },
  { path: '/api/task-logs', file: './routes/taskLogs', name: 'Task Log' },
  { path: '/api/progressboard', file: './routes/kanban', name: 'Progress Board' }
];

routes.forEach(({ path, file, name }) => {
  try {
    const route = require(file);
    app.use(path, route);
    console.log(`✅ ${name} routes loaded`);
  } catch (error) {
    console.error(`❌ Error loading ${name} routes:`, error.message);
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Daily Activity Tracker API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root route - API status (instead of serving React build)
app.get('/', (req, res) => {
  res.json({
    message: 'Task Management Backend API',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      projects: '/api/projects',
      tasks: '/api/tasks',
      progressboard: '/api/progressboard'
    }
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

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `API route ${req.originalUrl} not found`
  });
});

// 404 handler for non-API routes
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Route ${req.originalUrl} not found`,
    note: 'This is a backend API server. Frontend should be deployed separately.'
  });
});

module.exports = app;