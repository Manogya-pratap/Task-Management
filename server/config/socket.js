const socketIO = require('socket.io');

let io;

/**
 * Initialize Socket.io server
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.io instance
 */
const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Join rooms based on user data
    socket.on('join-room', (data) => {
      const { userId, role, deptId, projectId } = data;
      
      // Join user-specific room
      if (userId) {
        socket.join(`user-${userId}`);
        console.log(`User ${userId} joined room: user-${userId}`);
      }
      
      // Join role-based room
      if (role) {
        socket.join(`role-${role}`);
        console.log(`User ${userId} joined room: role-${role}`);
      }
      
      // Join department room
      if (deptId) {
        socket.join(`dept-${deptId}`);
        console.log(`User ${userId} joined room: dept-${deptId}`);
      }
      
      // Join project room
      if (projectId) {
        socket.join(`project-${projectId}`);
        console.log(`User ${userId} joined room: project-${projectId}`);
      }
    });

    // Leave rooms
    socket.on('leave-room', (roomName) => {
      socket.leave(roomName);
      console.log(`Socket ${socket.id} left room: ${roomName}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
};

/**
 * Get Socket.io instance
 * @returns {Object} Socket.io instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initSocket first.');
  }
  return io;
};

module.exports = { initSocket, getIO };
