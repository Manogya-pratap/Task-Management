const Department = require('../models/Department');
const Project = require('../models/Project');
const User = require('../models/User');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * Get all departments
 */
const getAllDepartments = catchAsync(async (req, res, next) => {
  const departments = await Department.find({ is_active: true })
    .populate('active_project', 'name status progress')
    .sort({ dept_name: 1 });

  res.status(200).json({
    status: 'success',
    results: departments.length,
    data: {
      departments
    }
  });
});

/**
 * Get single department by ID
 */
const getDepartment = catchAsync(async (req, res, next) => {
  const department = await Department.findById(req.params.id)
    .populate('active_project', 'name status progress start_date deadline');

  if (!department) {
    return next(new AppError('Department not found', 404));
  }

  // Get department statistics
  const userCount = await User.countDocuments({ dept_id: req.params.id, is_active: true });
  const projectCount = await Project.countDocuments({ dept_id: req.params.id });

  res.status(200).json({
    status: 'success',
    data: {
      department,
      stats: {
        userCount,
        projectCount
      }
    }
  });
});

/**
 * Get department by name
 */
const getDepartmentByName = catchAsync(async (req, res, next) => {
  const department = await Department.findOne({ 
    dept_name: req.params.name,
    is_active: true 
  }).populate('active_project', 'name status progress');

  if (!department) {
    return next(new AppError('Department not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      department
    }
  });
});

/**
 * Update department (ADMIN/MD only)
 */
const updateDepartment = catchAsync(async (req, res, next) => {
  // Only ADMIN and MD can update departments
  if (req.user.role !== 'it_admin' && req.user.role !== 'managing_director') {
    return next(new AppError('Only ADMIN or MD can update departments', 403));
  }

  const { active_project, description, is_active } = req.body;

  // Validate active_project if provided
  if (active_project) {
    const project = await Project.findById(active_project);
    if (!project) {
      return next(new AppError('Invalid project ID', 400));
    }
    
    // Ensure project belongs to this department
    if (!project.dept_id.equals(req.params.id)) {
      return next(new AppError('Project does not belong to this department', 400));
    }
  }

  const department = await Department.findByIdAndUpdate(
    req.params.id,
    { active_project, description, is_active },
    { new: true, runValidators: true }
  ).populate('active_project', 'name status progress');

  if (!department) {
    return next(new AppError('Department not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      department
    }
  });
});

/**
 * Get department users
 */
const getDepartmentUsers = catchAsync(async (req, res, next) => {
  const department = await Department.findById(req.params.id);
  
  if (!department) {
    return next(new AppError('Department not found', 404));
  }

  const users = await User.find({ 
    dept_id: req.params.id,
    is_active: true 
  })
    .select('unique_id name email role team_id')
    .populate('team_id', 'name')
    .sort({ role: 1, name: 1 });

  // Group users by role
  const usersByRole = {
    TEAM_LEAD: [],
    EMPLOYEE: []
  };

  users.forEach(user => {
    if (usersByRole[user.role]) {
      usersByRole[user.role].push(user);
    }
  });

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      department: department.dept_name,
      users,
      usersByRole
    }
  });
});

/**
 * Get department projects
 */
const getDepartmentProjects = catchAsync(async (req, res, next) => {
  const department = await Department.findById(req.params.id);
  
  if (!department) {
    return next(new AppError('Department not found', 404));
  }

  const projects = await Project.find({ dept_id: req.params.id })
    .populate('created_by', 'name unique_id')
    .sort({ createdAt: -1 });

  // Calculate statistics
  const stats = {
    total: projects.length,
    notStarted: projects.filter(p => p.status === 'Not Started').length,
    inProgress: projects.filter(p => p.status === 'In Progress').length,
    completed: projects.filter(p => p.status === 'Completed').length,
    averageProgress: projects.length > 0 
      ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
      : 0
  };

  res.status(200).json({
    status: 'success',
    results: projects.length,
    data: {
      department: department.dept_name,
      projects,
      stats
    }
  });
});

/**
 * Get department statistics
 */
const getDepartmentStats = catchAsync(async (req, res, next) => {
  const department = await Department.findById(req.params.id);
  
  if (!department) {
    return next(new AppError('Department not found', 404));
  }

  // Get user count
  const userCount = await User.countDocuments({ 
    dept_id: req.params.id,
    is_active: true 
  });

  // Get project statistics
  const projects = await Project.find({ dept_id: req.params.id });
  const projectStats = {
    total: projects.length,
    notStarted: projects.filter(p => p.status === 'Not Started').length,
    inProgress: projects.filter(p => p.status === 'In Progress').length,
    completed: projects.filter(p => p.status === 'Completed').length,
    averageProgress: projects.length > 0 
      ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
      : 0
  };

  // Get task statistics (tasks where this dept is requesting or executing)
  const Task = require('../models/Task');
  const requestingTasks = await Task.countDocuments({ req_dept_id: req.params.id });
  const executingTasks = await Task.countDocuments({ exec_dept_id: req.params.id });
  const crossDeptTasks = await Task.countDocuments({
    req_dept_id: req.params.id,
    exec_dept_id: { $ne: req.params.id }
  });

  res.status(200).json({
    status: 'success',
    data: {
      department: department.dept_name,
      stats: {
        users: userCount,
        projects: projectStats,
        tasks: {
          requesting: requestingTasks,
          executing: executingTasks,
          crossDepartment: crossDeptTasks
        }
      }
    }
  });
});

/**
 * Create new department (ADMIN/MD only)
 */
const createDepartment = catchAsync(async (req, res, next) => {
  // Only ADMIN and MD can create departments
  if (req.user.role !== 'it_admin' && req.user.role !== 'managing_director') {
    return next(new AppError('Only ADMIN or MD can create departments', 403));
  }

  const { dept_name, description, active_project } = req.body;

  // Check if department name already exists
  const existingDept = await Department.findOne({ 
    dept_name: { $regex: new RegExp(`^${dept_name}$`, 'i') }
  });

  if (existingDept) {
    return next(new AppError('Department with this name already exists', 400));
  }

  // Validate active_project if provided
  if (active_project) {
    const project = await Project.findById(active_project);
    if (!project) {
      return next(new AppError('Invalid project ID', 400));
    }
  }

  const department = await Department.create({
    dept_name,
    description: description || '',
    active_project: active_project || null,
    is_active: true
  });

  res.status(201).json({
    status: 'success',
    data: {
      department
    }
  });
});

/**
 * Delete department (ADMIN/MD only)
 */
const deleteDepartment = catchAsync(async (req, res, next) => {
  // Only ADMIN and MD can delete departments
  if (req.user.role !== 'it_admin' && req.user.role !== 'managing_director') {
    return next(new AppError('Only ADMIN or MD can delete departments', 403));
  }

  const department = await Department.findById(req.params.id);
  
  if (!department) {
    return next(new AppError('Department not found', 404));
  }

  // Check if department has users
  const userCount = await User.countDocuments({ dept_id: req.params.id, is_active: true });
  if (userCount > 0) {
    return next(new AppError('Cannot delete department with active users. Please reassign users first.', 400));
  }

  // Check if department has projects
  const projectCount = await Project.countDocuments({ dept_id: req.params.id });
  if (projectCount > 0) {
    return next(new AppError('Cannot delete department with projects. Please reassign projects first.', 400));
  }

  // Soft delete - deactivate department
  await Department.findByIdAndUpdate(req.params.id, { is_active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

module.exports = {
  getAllDepartments,
  getDepartment,
  getDepartmentByName,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentUsers,
  getDepartmentProjects,
  getDepartmentStats
};
