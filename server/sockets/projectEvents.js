const { getIO } = require('../config/socket');

/**
 * Emit project update event
 * @param {Object} project - Project object
 */
const emitProjectUpdate = (project) => {
  try {
    const io = getIO();
    
    // Emit to project room
    io.to(`project-${project._id}`).emit('project-updated', project);
    
    // Emit to department
    if (project.dept_id) {
      io.to(`dept-${project.dept_id}`).emit('project-updated', project);
    }
    
    // Emit to MDs and ADMINs
    io.to('role-MD').emit('project-updated', project);
    io.to('role-ADMIN').emit('project-updated', project);
    
    console.log(`📡 Project update emitted: ${project._id}`);
  } catch (error) {
    console.error('Error emitting project update:', error);
  }
};

/**
 * Emit project progress update
 * @param {Object} project - Project object
 * @param {Number} oldProgress - Previous progress value
 * @param {Number} newProgress - New progress value
 */
const emitProgressUpdate = (project, oldProgress, newProgress) => {
  try {
    const io = getIO();
    
    const progressData = {
      project,
      oldProgress,
      newProgress,
      timestamp: new Date()
    };
    
    // Emit to project room
    io.to(`project-${project._id}`).emit('project-progress-updated', progressData);
    
    // Emit to department
    if (project.dept_id) {
      io.to(`dept-${project.dept_id}`).emit('project-progress-updated', progressData);
    }
    
    // Emit to MDs
    io.to('role-MD').emit('project-progress-updated', progressData);
    
    console.log(`📡 Progress update emitted: ${project._id} (${oldProgress}% → ${newProgress}%)`);
  } catch (error) {
    console.error('Error emitting progress update:', error);
  }
};

/**
 * Emit project created event
 * @param {Object} project - Project object
 */
const emitProjectCreated = (project) => {
  try {
    const io = getIO();
    
    // Emit to department
    if (project.dept_id) {
      io.to(`dept-${project.dept_id}`).emit('project-created', {
        project,
        message: `New project created: ${project.name}`,
        timestamp: new Date()
      });
    }
    
    // Emit to all team leads and MDs
    io.to('role-TEAM_LEAD').emit('project-created', {
      project,
      message: `New project created: ${project.name}`,
      timestamp: new Date()
    });
    
    io.to('role-MD').emit('project-created', {
      project,
      message: `New project created: ${project.name}`,
      timestamp: new Date()
    });
    
    console.log(`📡 Project created notification sent: ${project._id}`);
  } catch (error) {
    console.error('Error emitting project created:', error);
  }
};

/**
 * Emit project completion event
 * @param {Object} project - Project object
 */
const emitProjectCompleted = (project) => {
  try {
    const io = getIO();
    
    const completionData = {
      project,
      message: `Project completed: ${project.name}`,
      timestamp: new Date()
    };
    
    // Emit to project room
    io.to(`project-${project._id}`).emit('project-completed', completionData);
    
    // Emit to department
    if (project.dept_id) {
      io.to(`dept-${project.dept_id}`).emit('project-completed', completionData);
    }
    
    // Emit to all MDs
    io.to('role-MD').emit('project-completed', completionData);
    
    console.log(`📡 Project completion notification sent: ${project._id}`);
  } catch (error) {
    console.error('Error emitting project completed:', error);
  }
};

module.exports = {
  emitProjectUpdate,
  emitProgressUpdate,
  emitProjectCreated,
  emitProjectCompleted
};
