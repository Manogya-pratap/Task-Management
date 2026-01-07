const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { logDataChange, logAccessDenied } = require('../middleware/audit');

/**
 * Get all tasks with role-based filtering
 */
const getAllTasks = catchAsync(async (req, res, next) => {
  let filter = {};
  
  // Apply role-based filtering
  if (req.user.role === 'employee') {
    // Employees can only see tasks assigned to them
    filter.assignedTo = req.user._id;
  } else if (req.user.role === 'team_lead') {
    // Team leads can see tasks in their team's projects
    const teamProjects = await Project.find({ teamId: req.user.teamId });
    const projectIds = teamProjects.map(project => project._id);
    filter.projectId = { $in: projectIds };
  }
  // MD and IT_Admin can see all tasks (no filter)
  
  // Apply additional filters from query parameters
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.priority) {
    filter.priority = req.query.priority;
  }
  if (req.query.projectId) {
    // Ensure user has access to the project
    const project = await Project.findById(req.query.projectId);
    if (project && canUserAccessProject(req.user, project)) {
      filter.projectId = req.query.projectId;
    } else {
      return next(new AppError('You do not have access to this project', 403));
    }
  }
  if (req.query.assignedTo) {
    filter.assignedTo = req.query.assignedTo;
  }

  const tasks = await Task.find(filter)
    .populate('assignedTo', 'firstName lastName role')
    .populate('createdBy', 'firstName lastName')
    .populate('projectId', 'name status teamId')
    .populate({
      path: 'comments.author',
      select: 'firstName lastName'
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: tasks.length,
    data: {
      tasks
    }
  });
});

/**
 * Get single task by ID
 */
const getTask = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'firstName lastName role')
    .populate('createdBy', 'firstName lastName')
    .populate('projectId', 'name status teamId')
    .populate({
      path: 'comments.author',
      select: 'firstName lastName'
    });

  if (!task) {
    return next(new AppError('No task found with that ID', 404));
  }

  // Check if user has access to this task
  if (!task.canUserAccess(req.user)) {
    await logAccessDenied(req, 'Task', req.params.id, `Access denied to task: ${task.title}`);
    return next(new AppError('You do not have permission to access this task', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      task
    }
  });
});

/**
 * Create new task
 */
const createTask = catchAsync(async (req, res, next) => {
  // Validate project exists and user has access
  const project = await Project.findById(req.body.projectId);
  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  if (!canUserModifyProject(req.user, project)) {
    await logAccessDenied(req, 'Project', req.body.projectId, `Access denied to create task in project: ${project.name}`);
    return next(new AppError('You do not have permission to create tasks in this project', 403));
  }

  // Validate assigned user if provided
  if (req.body.assignedTo) {
    const assignedUser = await User.findById(req.body.assignedTo);
    if (!assignedUser) {
      return next(new AppError('Assigned user not found', 404));
    }

    // Check if assigned user has access to the project
    if (!project.isAssigned(assignedUser._id) && 
        assignedUser.role === 'employee' && 
        !assignedUser.teamId.equals(project.teamId)) {
      return next(new AppError('Cannot assign task to user outside project team', 400));
    }
  }

  // Set creator
  req.body.createdBy = req.user._id;

  // Create task
  const task = new Task(req.body);
  await task.save();

  // Add task to project
  await project.addTask(task._id);

  // Populate the created task
  await task.populate([
    { path: 'assignedTo', select: 'firstName lastName role' },
    { path: 'createdBy', select: 'firstName lastName' },
    { path: 'projectId', select: 'name status teamId' }
  ]);
  
  // Audit log for task creation
  await logDataChange(req, 'CREATE', 'Task', task._id, null, task.toObject(), `Created task: ${task.title}`);

  res.status(201).json({
    status: 'success',
    data: {
      task
    }
  });
});

/**
 * Update task
 */
const updateTask = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id).populate('projectId');

  if (!task) {
    return next(new AppError('No task found with that ID', 404));
  }

  // Check permissions
  if (!canUserModifyTask(req.user, task)) {
    await logAccessDenied(req, 'Task', req.params.id, `Access denied to modify task: ${task.title}`);
    return next(new AppError('You do not have permission to modify this task', 403));
  }
  
  // Store original data for audit log
  const originalTask = task.toObject();

  // Validate assigned user if being changed
  if (req.body.assignedTo && req.body.assignedTo !== task.assignedTo?.toString()) {
    const assignedUser = await User.findById(req.body.assignedTo);
    if (!assignedUser) {
      return next(new AppError('Assigned user not found', 404));
    }

    // Check if assigned user has access to the project
    if (!task.projectId.isAssigned(assignedUser._id) && 
        assignedUser.role === 'employee' && 
        !assignedUser.teamId.equals(task.projectId.teamId)) {
      return next(new AppError('Cannot assign task to user outside project team', 400));
    }
  }

  // Update task
  const updatedTask = await Task.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).populate([
    { path: 'assignedTo', select: 'firstName lastName role' },
    { path: 'createdBy', select: 'firstName lastName' },
    { path: 'projectId', select: 'name status teamId' }
  ]);
  
  // Audit log for task update
  await logDataChange(req, 'UPDATE', 'Task', updatedTask._id, originalTask, updatedTask.toObject(), `Updated task: ${updatedTask.title}`);

  res.status(200).json({
    status: 'success',
    data: {
      task: updatedTask
    }
  });
});

/**
 * Update task status with automatic date handling
 */
const updateTaskStatus = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id).populate('projectId');

  if (!task) {
    return next(new AppError('No task found with that ID', 404));
  }

  // Check permissions - users can update status of their own tasks or if they can modify the task
  if (!canUserModifyTask(req.user, task) && 
      !(task.assignedTo && task.assignedTo.equals(req.user._id))) {
    await logAccessDenied(req, 'Task', req.params.id, `Access denied to update task status: ${task.title}`);
    return next(new AppError('You do not have permission to update this task status', 403));
  }

  // Store original status for audit log
  const originalStatus = task.status;

  // Validate status
  const validStatuses = ['new', 'scheduled', 'in_progress', 'completed'];
  if (!validStatuses.includes(req.body.status)) {
    return next(new AppError('Invalid task status', 400));
  }

  // Update status using the model method that handles automatic date updates
  await task.updateStatus(req.body.status);

  // Update project completion percentage
  await task.projectId.calculateCompletion();

  // Populate and return updated task
  await task.populate([
    { path: 'assignedTo', select: 'firstName lastName role' },
    { path: 'createdBy', select: 'firstName lastName' },
    { path: 'projectId', select: 'name status teamId' }
  ]);
  
  // Audit log for task status update
  await logDataChange(req, 'UPDATE', 'Task', task._id, 
    { status: originalStatus }, 
    { status: task.status }, 
    `Updated task status from ${originalStatus} to ${task.status}: ${task.title}`
  );

  res.status(200).json({
    status: 'success',
    data: {
      task
    }
  });
});

/**
 * Delete task
 */
const deleteTask = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id).populate('projectId');

  if (!task) {
    return next(new AppError('No task found with that ID', 404));
  }

  // Check permissions - only task creator, project managers, or admins can delete
  if (!canUserModifyTask(req.user, task) && !task.createdBy.equals(req.user._id)) {
    await logAccessDenied(req, 'Task', req.params.id, `Access denied to delete task: ${task.title}`);
    return next(new AppError('You do not have permission to delete this task', 403));
  }
  
  // Store task data for audit log before deletion
  const taskData = task.toObject();

  // Remove task from project
  const project = task.projectId;
  project.tasks = project.tasks.filter(taskId => !taskId.equals(task._id));
  await project.save();

  // Delete task
  await Task.findByIdAndDelete(req.params.id);

  // Update project completion percentage
  await project.calculateCompletion();
  
  // Audit log for task deletion
  await logDataChange(req, 'DELETE', 'Task', task._id, taskData, null, `Deleted task: ${taskData.title}`);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * Get tasks by status (for Kanban board organization)
 */
const getTasksByStatus = catchAsync(async (req, res, next) => {
  const { status } = req.params;
  
  // Validate status
  const validStatuses = ['new', 'scheduled', 'in_progress', 'completed'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid task status', 400));
  }

  let filter = { status };
  
  // Apply role-based filtering
  if (req.user.role === 'employee') {
    filter.assignedTo = req.user._id;
  } else if (req.user.role === 'team_lead') {
    const teamProjects = await Project.find({ teamId: req.user.teamId });
    const projectIds = teamProjects.map(project => project._id);
    filter.projectId = { $in: projectIds };
  }

  // Apply project filter if provided
  if (req.query.projectId) {
    const project = await Project.findById(req.query.projectId);
    if (project && canUserAccessProject(req.user, project)) {
      filter.projectId = req.query.projectId;
    } else {
      return next(new AppError('You do not have access to this project', 403));
    }
  }

  const tasks = await Task.find(filter)
    .populate('assignedTo', 'firstName lastName role')
    .populate('createdBy', 'firstName lastName')
    .populate('projectId', 'name status')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: tasks.length,
    data: {
      tasks,
      statusInfo: {
        status,
        color: tasks.length > 0 ? tasks[0].getStatusColor() : getStatusColor(status),
        count: tasks.length
      }
    }
  });
});

/**
 * Add comment to task
 */
const addTaskComment = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return next(new AppError('No task found with that ID', 404));
  }

  // Check if user has access to this task
  if (!task.canUserAccess(req.user)) {
    return next(new AppError('You do not have permission to comment on this task', 403));
  }

  // Add comment
  await task.addComment(req.user._id, req.body.content);

  // Populate and return updated task
  await task.populate([
    { path: 'assignedTo', select: 'firstName lastName role' },
    { path: 'createdBy', select: 'firstName lastName' },
    { path: 'projectId', select: 'name status teamId' },
    { path: 'comments.author', select: 'firstName lastName' }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      task
    }
  });
});

/**
 * Get task statistics
 */
const getTaskStats = catchAsync(async (req, res, next) => {
  let filter = {};
  
  // Apply role-based filtering
  if (req.user.role === 'employee') {
    filter.assignedTo = req.user._id;
  } else if (req.user.role === 'team_lead') {
    const teamProjects = await Project.find({ teamId: req.user.teamId });
    const projectIds = teamProjects.map(project => project._id);
    filter.projectId = { $in: projectIds };
  }

  // Apply project filter if provided
  if (req.query.projectId) {
    const project = await Project.findById(req.query.projectId);
    if (project && canUserAccessProject(req.user, project)) {
      filter.projectId = req.query.projectId;
    } else {
      return next(new AppError('You do not have access to this project', 403));
    }
  }

  const stats = await Task.getStatusStats(filter);
  const overdueTasks = await Task.findOverdue();

  // Filter overdue tasks based on user permissions
  const accessibleOverdueTasks = overdueTasks.filter(task => task.canUserAccess(req.user));

  res.status(200).json({
    status: 'success',
    data: {
      statusStats: stats,
      overdueCount: accessibleOverdueTasks.length,
      overdueTasks: accessibleOverdueTasks
    }
  });
});

/**
 * Helper function to check if user can access project
 */
function canUserAccessProject(user, project) {
  // MD and IT_Admin can access all projects
  if (user.role === 'managing_director' || user.role === 'it_admin') {
    return true;
  }

  // Team leads can access their team's projects
  if (user.role === 'team_lead' && user.teamId.equals(project.teamId)) {
    return true;
  }

  // Employees can access projects they're assigned to
  if (user.role === 'employee' && project.isAssigned(user._id)) {
    return true;
  }

  // Project creator can access
  if (project.createdBy.equals(user._id)) {
    return true;
  }

  return false;
}

/**
 * Helper function to check if user can modify project
 */
function canUserModifyProject(user, project) {
  // MD and IT_Admin can modify all projects
  if (user.role === 'managing_director' || user.role === 'it_admin') {
    return true;
  }

  // Team leads can modify their team's projects
  if (user.role === 'team_lead' && user.teamId.equals(project.teamId)) {
    return true;
  }

  // Project creator can modify
  if (project.createdBy.equals(user._id)) {
    return true;
  }

  return false;
}

/**
 * Helper function to check if user can modify task
 */
function canUserModifyTask(user, task) {
  // MD and IT_Admin can modify all tasks
  if (user.role === 'managing_director' || user.role === 'it_admin') {
    return true;
  }

  // Task creator can modify
  if (task.createdBy.equals(user._id)) {
    return true;
  }

  // Check if user can modify the project this task belongs to
  if (canUserModifyProject(user, task.projectId)) {
    return true;
  }

  return false;
}

/**
 * Helper function to get status color
 */
function getStatusColor(status) {
  const statusColors = {
    'new': '#6c757d',        // Gray - New tasks
    'scheduled': '#007bff',   // Blue - Scheduled tasks
    'in_progress': '#ffc107', // Yellow/Amber - In progress tasks
    'completed': '#28a745'    // Green - Completed tasks
  };
  return statusColors[status] || '#6c757d';
}

module.exports = {
  getAllTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTasksByStatus,
  addTaskComment,
  getTaskStats
};