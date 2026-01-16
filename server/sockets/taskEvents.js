const { getIO } = require('../config/socket');

/**
 * Emit task update event to relevant rooms
 * @param {Object} task - Task object
 */
const emitTaskUpdate = (task) => {
  try {
    const io = getIO();
    
    // Emit to project room
    if (task.project_id) {
      io.to(`project-${task.project_id}`).emit('task-updated', task);
    }
    
    // Emit to requesting department
    if (task.req_dept_id) {
      io.to(`dept-${task.req_dept_id}`).emit('task-updated', task);
    }
    
    // Emit to executing department
    if (task.exec_dept_id) {
      io.to(`dept-${task.exec_dept_id}`).emit('task-updated', task);
    }
    
    // Emit to assigned user
    if (task.assigned_to) {
      io.to(`user-${task.assigned_to}`).emit('task-updated', task);
    }
    
    // Emit to all MDs and ADMINs
    io.to('role-MD').emit('task-updated', task);
    io.to('role-ADMIN').emit('task-updated', task);
    
    console.log(`📡 Task update emitted: ${task._id}`);
  } catch (error) {
    console.error('Error emitting task update:', error);
  }
};

/**
 * Emit Kanban move event
 * @param {Object} task - Task object
 * @param {String} oldStage - Previous Kanban stage
 * @param {String} newStage - New Kanban stage
 */
const emitKanbanMove = (task, oldStage, newStage) => {
  try {
    const io = getIO();
    
    const moveData = {
      task,
      oldStage,
      newStage,
      timestamp: new Date()
    };
    
    // Emit to project room
    if (task.project_id) {
      io.to(`project-${task.project_id}`).emit('kanban-moved', moveData);
    }
    
    // Emit to departments
    if (task.req_dept_id) {
      io.to(`dept-${task.req_dept_id}`).emit('kanban-moved', moveData);
    }
    if (task.exec_dept_id) {
      io.to(`dept-${task.exec_dept_id}`).emit('kanban-moved', moveData);
    }
    
    console.log(`📡 Kanban move emitted: ${task._id} (${oldStage} → ${newStage})`);
  } catch (error) {
    console.error('Error emitting Kanban move:', error);
  }
};

/**
 * Emit task assigned event
 * @param {Object} task - Task object
 */
const emitTaskAssigned = (task) => {
  try {
    const io = getIO();
    
    // Notify assigned user
    if (task.assigned_to) {
      io.to(`user-${task.assigned_to}`).emit('task-assigned', {
        task,
        message: `You have been assigned a new task: ${task.title}`,
        timestamp: new Date()
      });
    }
    
    console.log(`📡 Task assigned notification sent: ${task._id}`);
  } catch (error) {
    console.error('Error emitting task assigned:', error);
  }
};

/**
 * Emit daily update event
 * @param {Object} taskLog - TaskLog object
 * @param {Object} task - Task object
 */
const emitDailyUpdate = (taskLog, task) => {
  try {
    const io = getIO();
    
    const updateData = {
      taskLog,
      task,
      timestamp: new Date()
    };
    
    // Emit to project room
    if (task.project_id) {
      io.to(`project-${task.project_id}`).emit('daily-update-added', updateData);
    }
    
    // Emit to team leads and MDs
    io.to('role-TEAM_LEAD').emit('daily-update-added', updateData);
    io.to('role-MD').emit('daily-update-added', updateData);
    
    console.log(`📡 Daily update emitted for task: ${task._id}`);
  } catch (error) {
    console.error('Error emitting daily update:', error);
  }
};

/**
 * Emit task completion approval request
 * @param {Object} task - Task object
 */
const emitApprovalRequest = (task) => {
  try {
    const io = getIO();
    
    // Notify team leads and MDs
    io.to('role-TEAM_LEAD').emit('approval-requested', {
      task,
      message: `Task "${task.title}" is ready for review`,
      timestamp: new Date()
    });
    
    io.to('role-MD').emit('approval-requested', {
      task,
      message: `Task "${task.title}" is ready for review`,
      timestamp: new Date()
    });
    
    console.log(`📡 Approval request emitted for task: ${task._id}`);
  } catch (error) {
    console.error('Error emitting approval request:', error);
  }
};

module.exports = {
  emitTaskUpdate,
  emitKanbanMove,
  emitTaskAssigned,
  emitDailyUpdate,
  emitApprovalRequest
};
