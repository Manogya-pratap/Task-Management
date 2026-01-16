const TaskLog = require('../models/TaskLog');
const Task = require('../models/Task');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { emitDailyUpdate } = require('../sockets/taskEvents');

/**
 * Create daily update for a task
 */
const createDailyUpdate = catchAsync(async (req, res, next) => {
  const { progress, remark, hours_worked } = req.body;
  const taskId = req.params.taskId;

  // Validate task exists
  const task = await Task.findById(taskId)
    .populate('project_id', 'name')
    .populate('assigned_to', 'name unique_id')
    .populate('req_dept_id', 'dept_name')
    .populate('exec_dept_id', 'dept_name');

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Check if user has permission to update this task
  const canUpdate = 
    task.assigned_to._id.equals(req.user._id) || // Assigned user
    req.user.role === 'TEAM_LEAD' || // Team lead
    req.user.role === 'MD' || // MD
    req.user.role === 'ADMIN'; // Admin

  if (!canUpdate) {
    return next(new AppError('You do not have permission to update this task', 403));
  }

  // Check if user already submitted update today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existingLog = await TaskLog.findOne({
    task_id: taskId,
    updated_by: req.user._id,
    date: { $gte: today }
  });

  if (existingLog) {
    return next(new AppError('You have already submitted an update for this task today', 400));
  }

  // Create task log
  const taskLog = await TaskLog.create({
    task_id: taskId,
    updated_by: req.user._id,
    progress,
    remark,
    hours_worked: hours_worked || 0
  });

  // Update task progress
  task.progress = progress;
  await task.save();

  // Populate the created log
  await taskLog.populate('updated_by', 'name unique_id');

  // Emit WebSocket event
  emitDailyUpdate(taskLog, task);

  res.status(201).json({
    status: 'success',
    data: {
      taskLog,
      task: {
        _id: task._id,
        title: task.title,
        progress: task.progress
      }
    }
  });
});

/**
 * Get all logs for a task
 */
const getTaskLogs = catchAsync(async (req, res, next) => {
  const taskId = req.params.taskId;

  // Validate task exists
  const task = await Task.findById(taskId);
  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Check if user has access to this task
  if (!task.canUserAccess(req.user)) {
    return next(new AppError('You do not have permission to view this task', 403));
  }

  const limit = parseInt(req.query.limit) || 30;
  const logs = await TaskLog.getTaskLogs(taskId, limit);

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: {
      logs
    }
  });
});

/**
 * Get logs by date range
 */
const getLogsByDateRange = catchAsync(async (req, res, next) => {
  const taskId = req.params.taskId;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(new AppError('Start date and end date are required', 400));
  }

  // Validate task exists
  const task = await Task.findById(taskId);
  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Check if user has access to this task
  if (!task.canUserAccess(req.user)) {
    return next(new AppError('You do not have permission to view this task', 403));
  }

  const logs = await TaskLog.getLogsByDateRange(
    taskId,
    new Date(startDate),
    new Date(endDate)
  );

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: {
      logs
    }
  });
});

/**
 * Get user's daily logs
 */
const getMyDailyLogs = catchAsync(async (req, res, next) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  
  const logs = await TaskLog.getUserDailyLogs(req.user._id, date);

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: {
      date: date.toISOString().split('T')[0],
      logs
    }
  });
});

/**
 * Get task progress history (for charts)
 */
const getTaskProgressHistory = catchAsync(async (req, res, next) => {
  const taskId = req.params.taskId;

  // Validate task exists
  const task = await Task.findById(taskId);
  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Check if user has access to this task
  if (!task.canUserAccess(req.user)) {
    return next(new AppError('You do not have permission to view this task', 403));
  }

  const logs = await TaskLog.find({ task_id: taskId })
    .select('date progress updated_by')
    .populate('updated_by', 'name')
    .sort({ date: 1 });

  // Format for chart
  const chartData = logs.map(log => ({
    date: log.date.toISOString().split('T')[0],
    progress: log.progress,
    updatedBy: log.updated_by.name
  }));

  res.status(200).json({
    status: 'success',
    data: {
      task: {
        _id: task._id,
        title: task.title,
        currentProgress: task.progress
      },
      history: chartData
    }
  });
});

/**
 * Update a task log (same day only)
 */
const updateTaskLog = catchAsync(async (req, res, next) => {
  const logId = req.params.id;
  const { progress, remark, hours_worked } = req.body;

  const taskLog = await TaskLog.findById(logId);
  
  if (!taskLog) {
    return next(new AppError('Task log not found', 404));
  }

  // Only the creator can update
  if (!taskLog.updated_by.equals(req.user._id)) {
    return next(new AppError('You can only update your own logs', 403));
  }

  // Can only update today's log
  if (!taskLog.isToday()) {
    return next(new AppError('You can only update today\'s log', 400));
  }

  // Update fields
  if (progress !== undefined) taskLog.progress = progress;
  if (remark) taskLog.remark = remark;
  if (hours_worked !== undefined) taskLog.hours_worked = hours_worked;

  await taskLog.save();

  // Update task progress
  const task = await Task.findById(taskLog.task_id);
  if (task) {
    task.progress = progress;
    await task.save();
  }

  await taskLog.populate('updated_by', 'name unique_id');

  res.status(200).json({
    status: 'success',
    data: {
      taskLog
    }
  });
});

/**
 * Delete a task log (same day only, ADMIN/MD only)
 */
const deleteTaskLog = catchAsync(async (req, res, next) => {
  const logId = req.params.id;

  // Only ADMIN and MD can delete logs
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MD') {
    return next(new AppError('Only ADMIN or MD can delete task logs', 403));
  }

  const taskLog = await TaskLog.findById(logId);
  
  if (!taskLog) {
    return next(new AppError('Task log not found', 404));
  }

  await TaskLog.findByIdAndDelete(logId);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * Get team's daily logs (for Team Lead)
 */
const getTeamDailyLogs = catchAsync(async (req, res, next) => {
  // Only Team Lead, MD, and ADMIN can access
  if (!['TEAM_LEAD', 'MD', 'ADMIN'].includes(req.user.role)) {
    return next(new AppError('Access denied', 403));
  }

  const date = req.query.date ? new Date(req.query.date) : new Date();
  
  // Get all users in the same department
  const User = require('../models/User');
  const users = await User.find({ 
    dept_id: req.user.dept_id,
    is_active: true 
  }).select('_id');

  const userIds = users.map(u => u._id);

  // Get logs for all team members
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const logs = await TaskLog.find({
    updated_by: { $in: userIds },
    date: { $gte: startOfDay, $lte: endOfDay }
  })
    .populate('updated_by', 'name unique_id')
    .populate('task_id', 'title project_id')
    .populate({
      path: 'task_id',
      populate: {
        path: 'project_id',
        select: 'name'
      }
    })
    .sort({ date: -1 });

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: {
      date: date.toISOString().split('T')[0],
      logs
    }
  });
});

module.exports = {
  createDailyUpdate,
  getTaskLogs,
  getLogsByDateRange,
  getMyDailyLogs,
  getTaskProgressHistory,
  updateTaskLog,
  deleteTaskLog,
  getTeamDailyLogs
};
