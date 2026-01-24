/**
 * Middleware to check if user has required role
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Unauthorized. Please log in.'
      });
    }

    const userRole = req.user.role || '';
    
    // Create role mapping for backward compatibility
    const roleMapping = {
      'ADMIN': ['it_admin', 'ADMIN'],
      'MD': ['managing_director', 'MD'],
      'TEAM_LEAD': ['team_lead', 'TEAM_LEAD'],
      'EMPLOYEE': ['employee', 'EMPLOYEE']
    };

    // Check if user role matches any of the allowed roles
    const hasPermission = allowedRoles.some(allowedRole => {
      const mappedRoles = roleMapping[allowedRole.toUpperCase()] || [allowedRole];
      return mappedRoles.includes(userRole);
    });

    if (!hasPermission) {
      return res.status(403).json({
        status: 'fail',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Middleware to check if user can access task
 */
const checkTaskAccess = async (req, res, next) => {
  try {
    const Task = require('../models/Task');
    const task = await Task.findById(req.params.id || req.params.taskId)
      .populate('req_dept_id exec_dept_id');

    if (!task) {
      return res.status(404).json({
        status: 'fail',
        message: 'Task not found'
      });
    }

    const user = req.user;

    // Check if user can access this task
    if (!task.canUserAccess(user)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to access this task'
      });
    }

    // Attach task to request for use in controller
    req.task = task;
    next();
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error checking task access'
    });
  }
};

/**
 * Middleware to check if user can modify task
 */
const checkTaskModifyPermission = async (req, res, next) => {
  try {
    const Task = require('../models/Task');
    const task = await Task.findById(req.params.id || req.params.taskId)
      .populate('project_id');

    if (!task) {
      return res.status(404).json({
        status: 'fail',
        message: 'Task not found'
      });
    }

    const user = req.user;

    // MD and ADMIN can modify all tasks
    if (user.role === 'managing_director' || user.role === 'it_admin') {
      req.task = task;
      return next();
    }

    // Task creator can modify
    if (task.created_by.equals(user._id)) {
      req.task = task;
      return next();
    }

    // Team Lead can modify tasks in their department
    if (user.role === 'team_lead' && user.dept_id) {
      if (user.dept_id.equals(task.req_dept_id) || user.dept_id.equals(task.exec_dept_id)) {
        req.task = task;
        return next();
      }
    }

    return res.status(403).json({
      status: 'fail',
      message: 'You do not have permission to modify this task'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error checking task permissions'
    });
  }
};

/**
 * Middleware to check if user can approve task completion
 */
const checkApprovalPermission = (req, res, next) => {
  const user = req.user;

  // Normalize role for comparison
  const userRole = user.role || '';

  // Only Team Lead, MD, and ADMIN can approve
  if (!['team_lead', 'managing_director', 'it_admin'].includes(userRole)) {
    return res.status(403).json({
      status: 'fail',
      message: 'Only Team Lead, MD, or ADMIN can approve task completion'
    });
  }

  next();
};

/**
 * Middleware to check if user can access project
 */
const checkProjectAccess = async (req, res, next) => {
  try {
    const Project = require('../models/Project');
    const project = await Project.findById(req.params.id || req.params.projectId);

    if (!project) {
      return res.status(404).json({
        status: 'fail',
        message: 'Project not found'
      });
    }

    const user = req.user;

    // MD and ADMIN can access all projects
    if (user.role === 'managing_director' || user.role === 'it_admin') {
      req.project = project;
      return next();
    }

    // Users from the same department can access
    if (user.dept_id && user.dept_id.equals(project.dept_id)) {
      req.project = project;
      return next();
    }

    // Project creator can access
    if (project.created_by.equals(user._id)) {
      req.project = project;
      return next();
    }

    return res.status(403).json({
      status: 'fail',
      message: 'You do not have permission to access this project'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error checking project access'
    });
  }
};

module.exports = {
  checkRole,
  checkTaskAccess,
  checkTaskModifyPermission,
  checkApprovalPermission,
  checkProjectAccess
};
