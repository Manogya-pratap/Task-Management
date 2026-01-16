const Task = require('../models/Task');
const Project = require('../models/Project');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { emitKanbanMove, emitTaskUpdate, emitApprovalRequest } = require('../sockets/taskEvents');
const { emitProgressUpdate } = require('../sockets/projectEvents');

/**
 * Get Kanban board for a project
 */
const getKanbanBoard = catchAsync(async (req, res, next) => {
  const projectId = req.params.projectId;

  // Validate project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  // Get all tasks for this project
  const tasks = await Task.find({ project_id: projectId })
    .populate('assigned_to', 'name unique_id')
    .populate('created_by', 'name unique_id')
    .populate('req_dept_id', 'dept_name')
    .populate('exec_dept_id', 'dept_name')
    .sort({ createdAt: -1 });

  // Group tasks by Kanban stage
  const kanbanStages = ['Backlog', 'Todo', 'In Progress', 'Review', 'Done'];
  const board = {};

  kanbanStages.forEach(stage => {
    board[stage] = tasks.filter(task => task.kanban_stage === stage);
  });

  // Calculate statistics
  const stats = {
    total: tasks.length,
    byStage: {}
  };

  kanbanStages.forEach(stage => {
    stats.byStage[stage] = board[stage].length;
  });

  res.status(200).json({
    status: 'success',
    data: {
      project: {
        _id: project._id,
        name: project.name,
        progress: project.progress
      },
      board,
      stats
    }
  });
});

/**
 * Get Kanban board for current user (all their tasks)
 */
const getMyKanbanBoard = catchAsync(async (req, res, next) => {
  // Build filter based on user role
  let filter = {};

  if (req.user.role === 'EMPLOYEE') {
    // Employees see only their assigned tasks
    filter.assigned_to = req.user._id;
  } else if (req.user.role === 'TEAM_LEAD') {
    // Team leads see their team's tasks
    if (req.user.dept_id) {
      filter.$or = [
        { assigned_to: req.user._id },
        { req_dept_id: req.user.dept_id },
        { exec_dept_id: req.user.dept_id }
      ];
    } else {
      filter.assigned_to = req.user._id;
    }
  } else {
    // MD and ADMIN see all tasks
    // No filter needed
  }

  // Get all tasks for the user
  const tasks = await Task.find(filter)
    .populate('assigned_to', 'name unique_id')
    .populate('created_by', 'name unique_id')
    .populate('project_id', 'name progress')
    .populate('req_dept_id', 'dept_name')
    .populate('exec_dept_id', 'dept_name')
    .sort({ createdAt: -1 });

  // Group tasks by Kanban stage
  const kanbanStages = ['Backlog', 'Todo', 'In Progress', 'Review', 'Done'];
  const board = {};

  kanbanStages.forEach(stage => {
    board[stage] = tasks.filter(task => task.kanban_stage === stage);
  });

  // Calculate statistics
  const stats = {
    total: tasks.length,
    byStage: {}
  };

  kanbanStages.forEach(stage => {
    stats.byStage[stage] = board[stage].length;
  });

  res.status(200).json({
    status: 'success',
    data: {
      board,
      stats
    }
  });
});

/**
 * Move task to different Kanban stage
 */
const moveTaskStage = catchAsync(async (req, res, next) => {
  const taskId = req.params.taskId;
  const { newStage } = req.body;

  // Validate new stage
  const validStages = ['Backlog', 'Todo', 'In Progress', 'Review', 'Done'];
  if (!validStages.includes(newStage)) {
    return next(new AppError('Invalid Kanban stage', 400));
  }

  // Get task
  const task = await Task.findById(taskId)
    .populate('assigned_to', 'name unique_id')
    .populate('created_by', 'name unique_id')
    .populate('project_id', 'name progress')
    .populate('req_dept_id', 'dept_name')
    .populate('exec_dept_id', 'dept_name');

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Check if user has permission to move this task
  // Log for debugging
  console.log('Move task permission check:', {
    userId: req.user._id,
    userRole: req.user.role,
    userRoleType: typeof req.user.role,
    taskId: task._id,
    taskAssignedTo: task.assigned_to?._id,
    taskCreatedBy: task.created_by?._id
  });

  // Normalize role to uppercase for comparison
  const userRole = (req.user.role || '').toUpperCase().replace('_', '_');

  const canMove = 
    (task.assigned_to && task.assigned_to._id.equals(req.user._id)) || // Assigned user
    (task.created_by && task.created_by._id.equals(req.user._id)) || // Creator
    userRole === 'TEAM_LEAD' || // Team lead
    userRole === 'TEAMLEAD' || // Team lead (alternative format)
    userRole === 'MD' || // MD
    userRole === 'ADMIN' || // Admin
    userRole === 'IT_ADMIN'; // IT Admin

  console.log('User role normalized:', userRole, 'Can move:', canMove);

  if (!canMove) {
    return next(new AppError('You do not have permission to move this task', 403));
  }

  // Move task (this will validate approval for Review → Done)
  try {
    const { oldStage, newStage: movedStage } = await task.moveToStage(newStage, req.user._id);

    // If moved to Review, emit approval request
    if (movedStage === 'Review') {
      emitApprovalRequest(task);
    }

    // Emit Kanban move event
    emitKanbanMove(task, oldStage, movedStage);

    // Update project progress if task is done
    if (movedStage === 'Done') {
      const project = await Project.findById(task.project_id);
      const oldProgress = project.progress;
      
      // Recalculate project progress
      const allTasks = await Task.find({ project_id: project._id });
      const completedTasks = allTasks.filter(t => t.kanban_stage === 'Done');
      const autoProgress = Math.round((completedTasks.length / allTasks.length) * 100);
      
      project.progress = Math.min(100, Math.max(0, autoProgress + project.manual_adjustment));
      await project.save();

      // Emit progress update
      emitProgressUpdate(project, oldProgress, project.progress);
    }

    res.status(200).json({
      status: 'success',
      data: {
        task,
        movement: {
          from: oldStage,
          to: movedStage
        }
      }
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * Approve task completion (Review → Done)
 */
const approveTaskCompletion = catchAsync(async (req, res, next) => {
  const taskId = req.params.taskId;

  // Only Team Lead, MD, and ADMIN can approve
  if (!['TEAM_LEAD', 'MD', 'ADMIN'].includes(req.user.role)) {
    return next(new AppError('Only Team Lead, MD, or ADMIN can approve task completion', 403));
  }

  // Get task
  const task = await Task.findById(taskId)
    .populate('assigned_to', 'name unique_id')
    .populate('created_by', 'name unique_id')
    .populate('project_id', 'name progress')
    .populate('req_dept_id', 'dept_name')
    .populate('exec_dept_id', 'dept_name');

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Task must be in Review stage
  if (task.kanban_stage !== 'Review') {
    return next(new AppError('Task must be in Review stage to approve', 400));
  }

  // Move to Done
  const { oldStage } = await task.moveToStage('Done', req.user._id);

  // Emit Kanban move event
  emitKanbanMove(task, oldStage, 'Done');

  // Update project progress
  const project = await Project.findById(task.project_id);
  const oldProgress = project.progress;
  
  // Recalculate project progress
  const allTasks = await Task.find({ project_id: project._id });
  const completedTasks = allTasks.filter(t => t.kanban_stage === 'Done');
  const autoProgress = Math.round((completedTasks.length / allTasks.length) * 100);
  
  project.progress = Math.min(100, Math.max(0, autoProgress + project.manual_adjustment));
  await project.save();

  // Emit progress update
  emitProgressUpdate(project, oldProgress, project.progress);

  res.status(200).json({
    status: 'success',
    message: 'Task approved and marked as complete',
    data: {
      task,
      project: {
        _id: project._id,
        name: project.name,
        progress: project.progress
      }
    }
  });
});

/**
 * Reject task (move back from Review)
 */
const rejectTask = catchAsync(async (req, res, next) => {
  const taskId = req.params.taskId;
  const { reason } = req.body;

  // Only Team Lead, MD, and ADMIN can reject
  if (!['TEAM_LEAD', 'MD', 'ADMIN'].includes(req.user.role)) {
    return next(new AppError('Only Team Lead, MD, or ADMIN can reject tasks', 403));
  }

  // Get task
  const task = await Task.findById(taskId)
    .populate('assigned_to', 'name unique_id')
    .populate('created_by', 'name unique_id')
    .populate('project_id', 'name')
    .populate('req_dept_id', 'dept_name')
    .populate('exec_dept_id', 'dept_name');

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Task must be in Review stage
  if (task.kanban_stage !== 'Review') {
    return next(new AppError('Only tasks in Review can be rejected', 400));
  }

  // Move back to In Progress
  const { oldStage } = await task.moveToStage('In Progress', req.user._id);

  // Add rejection reason to remark
  if (reason) {
    task.remark = `Rejected: ${reason}`;
    await task.save();
  }

  // Emit Kanban move event
  emitKanbanMove(task, oldStage, 'In Progress');

  res.status(200).json({
    status: 'success',
    message: 'Task rejected and moved back to In Progress',
    data: {
      task,
      reason
    }
  });
});

/**
 * Get tasks by Kanban stage
 */
const getTasksByStage = catchAsync(async (req, res, next) => {
  const { stage } = req.params;
  const { projectId, deptId } = req.query;

  // Validate stage
  const validStages = ['Backlog', 'Todo', 'In Progress', 'Review', 'Done'];
  if (!validStages.includes(stage)) {
    return next(new AppError('Invalid Kanban stage', 400));
  }

  // Build filter
  const filter = { kanban_stage: stage };

  if (projectId) {
    filter.project_id = projectId;
  }

  // Apply department filter if user is not MD/ADMIN
  if (req.user.role !== 'MD' && req.user.role !== 'ADMIN') {
    if (deptId) {
      filter.$or = [
        { req_dept_id: deptId },
        { exec_dept_id: deptId }
      ];
    } else if (req.user.dept_id) {
      filter.$or = [
        { req_dept_id: req.user.dept_id },
        { exec_dept_id: req.user.dept_id }
      ];
    }
  }

  const tasks = await Task.find(filter)
    .populate('assigned_to', 'name unique_id')
    .populate('created_by', 'name unique_id')
    .populate('project_id', 'name')
    .populate('req_dept_id', 'dept_name')
    .populate('exec_dept_id', 'dept_name')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: tasks.length,
    data: {
      stage,
      tasks
    }
  });
});

/**
 * Get tasks pending approval (in Review stage)
 */
const getPendingApprovals = catchAsync(async (req, res, next) => {
  // Only Team Lead, MD, and ADMIN can access
  if (!['TEAM_LEAD', 'MD', 'ADMIN'].includes(req.user.role)) {
    return next(new AppError('Access denied', 403));
  }

  // Build filter
  const filter = { kanban_stage: 'Review' };

  // Team Leads see only their department's tasks
  if (req.user.role === 'TEAM_LEAD' && req.user.dept_id) {
    filter.$or = [
      { req_dept_id: req.user.dept_id },
      { exec_dept_id: req.user.dept_id }
    ];
  }

  const tasks = await Task.find(filter)
    .populate('assigned_to', 'name unique_id')
    .populate('created_by', 'name unique_id')
    .populate('project_id', 'name')
    .populate('req_dept_id', 'dept_name')
    .populate('exec_dept_id', 'dept_name')
    .sort({ updatedAt: 1 }); // Oldest first

  res.status(200).json({
    status: 'success',
    results: tasks.length,
    data: {
      tasks
    }
  });
});

module.exports = {
  getKanbanBoard,
  getMyKanbanBoard,
  moveTaskStage,
  approveTaskCompletion,
  rejectTask,
  getTasksByStage,
  getPendingApprovals
};
