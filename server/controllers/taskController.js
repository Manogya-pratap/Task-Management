const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const { catchAsync } = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { logDataChange, logAccessDenied } = require("../middleware/audit");

/**
 * Get all tasks with role-based filtering
 */
const getAllTasks = catchAsync(async (req, res, next) => {
  let filter = {};

  console.log(
    "getAllTasks: User role:",
    req.user.role,
    "teamId:",
    req.user.teamId
  );

  // Apply role-based filtering
  if (req.user.role === "employee") {
    // Employees can only see tasks assigned to them
    filter.assigned_to = req.user._id;
  } else if (req.user.role === "team_lead") {
    // Team leads can see tasks in their team's projects
    if (req.user.teamId) {
      const teamProjects = await Project.find({ teamId: req.user.teamId });
      const projectIds = teamProjects.map((project) => project._id);
      console.log("Team lead projects:", projectIds);
      filter.project_id = { $in: projectIds };
    } else {
      console.log("Team lead has no team assigned");
      // If team lead has no team, return empty array
      return res.status(200).json({
        status: "success",
        data: {
          tasks: [],
        },
      });
    }
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
      filter.project_id = req.query.projectId;
    } else {
      return next(new AppError("You do not have access to this project", 403));
    }
  }
  if (req.query.assignedTo) {
    filter.assigned_to = req.query.assignedTo;
  }

  try {
    const tasks = await Task.find(filter)
      .populate({
        path: "assigned_to",
        select: "firstName lastName name role unique_id",
        options: { strictPopulate: false }
      })
      .populate({
        path: "created_by",
        select: "firstName lastName name unique_id",
        options: { strictPopulate: false }
      })
      .populate({
        path: "project_id",
        select: "name status teamId",
        options: { strictPopulate: false }
      })
      .populate({
        path: "req_dept_id",
        select: "dept_name name",
        options: { strictPopulate: false }
      })
      .populate({
        path: "exec_dept_id",
        select: "dept_name name",
        options: { strictPopulate: false }
      })
      .lean()
      .sort({ createdAt: -1 });

    console.log(
      "getAllTasks: Found",
      tasks.length,
      "tasks for user",
      req.user.role
    );

    res.status(200).json({
      status: "success",
      results: tasks.length,
      data: {
        tasks,
      },
    });
  } catch (error) {
    console.error("Error in getAllTasks:", error);
    // Return empty array instead of error to prevent dashboard crash
    res.status(200).json({
      status: "success",
      results: 0,
      data: {
        tasks: [],
      },
    });
  }
});

/**
 * Get single task by ID
 */
const getTask = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id)
    .populate("assignedTo", "firstName lastName role")
    .populate("createdBy", "firstName lastName")
    .populate("projectId", "name status teamId")
    .populate({
      path: "comments.author",
      select: "firstName lastName",
    });

  if (!task) {
    return next(new AppError("No task found with that ID", 404));
  }

  // Check if user has access to this task
  if (!task.canUserAccess(req.user)) {
    await logAccessDenied(
      req,
      "Task",
      req.params.id,
      `Access denied to task: ${task.title}`
    );
    return next(
      new AppError("You do not have permission to access this task", 403)
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      task,
    },
  });
});

/**
 * Create new task
 */
const createTask = catchAsync(async (req, res, next) => {
  // Validate project exists and user has access
  const project = await Project.findById(req.body.projectId);
  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  if (!canUserModifyProject(req.user, project)) {
    await logAccessDenied(
      req,
      "Project",
      req.body.projectId,
      `Access denied to create task in project: ${project.name}`
    );
    return next(
      new AppError(
        "You do not have permission to create tasks in this project",
        403
      )
    );
  }

  // Validate assigned user if provided
  if (req.body.assignedTo) {
    const assignedUser = await User.findById(req.body.assignedTo);
    if (!assignedUser) {
      return next(new AppError("Assigned user not found", 404));
    }

    // Check if assigned user has access to the project
    if (
      !project.isAssigned(assignedUser._id) &&
      assignedUser.role === "employee" &&
      !assignedUser.teamId.equals(project.teamId)
    ) {
      return next(
        new AppError("Cannot assign task to user outside project team", 400)
      );
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
    { path: "assignedTo", select: "firstName lastName role" },
    { path: "createdBy", select: "firstName lastName" },
    { path: "projectId", select: "name status teamId" },
  ]);

  // Audit log for task creation
  await logDataChange(
    req,
    "CREATE",
    "Task",
    task._id,
    null,
    task.toObject(),
    `Created task: ${task.title}`
  );

  res.status(201).json({
    status: "success",
    data: {
      task,
    },
  });
});

/**
 * Update task
 */
const updateTask = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id).populate("projectId");

  if (!task) {
    return next(new AppError("No task found with that ID", 404));
  }

  // Check permissions
  if (!canUserModifyTask(req.user, task)) {
    await logAccessDenied(
      req,
      "Task",
      req.params.id,
      `Access denied to modify task: ${task.title}`
    );
    return next(
      new AppError("You do not have permission to modify this task", 403)
    );
  }

  // Store original data for audit log
  const originalTask = task.toObject();

  // Validate assigned user if being changed
  if (
    req.body.assignedTo &&
    req.body.assignedTo !== task.assignedTo?.toString()
  ) {
    const assignedUser = await User.findById(req.body.assignedTo);
    if (!assignedUser) {
      return next(new AppError("Assigned user not found", 404));
    }

    // Check if assigned user has access to the project
    if (
      !task.projectId.isAssigned(assignedUser._id) &&
      assignedUser.role === "employee" &&
      !assignedUser.teamId.equals(task.projectId.teamId)
    ) {
      return next(
        new AppError("Cannot assign task to user outside project team", 400)
      );
    }
  }

  // Update task
  const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate([
    { path: "assignedTo", select: "firstName lastName role" },
    { path: "createdBy", select: "firstName lastName" },
    { path: "projectId", select: "name status teamId" },
  ]);

  // Audit log for task update
  await logDataChange(
    req,
    "UPDATE",
    "Task",
    updatedTask._id,
    originalTask,
    updatedTask.toObject(),
    `Updated task: ${updatedTask.title}`
  );

  res.status(200).json({
    status: "success",
    data: {
      task: updatedTask,
    },
  });
});

/**
 * Update task status with automatic date handling
 */
const updateTaskStatus = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id).populate("projectId");

  if (!task) {
    return next(new AppError("No task found with that ID", 404));
  }

  // Check permissions - users can update status of their own tasks or if they can modify the task
  if (
    !canUserModifyTask(req.user, task) &&
    !(task.assignedTo && task.assignedTo.equals(req.user._id))
  ) {
    await logAccessDenied(
      req,
      "Task",
      req.params.id,
      `Access denied to update task status: ${task.title}`
    );
    return next(
      new AppError("You do not have permission to update this task status", 403)
    );
  }

  // Store original status for audit log
  const originalStatus = task.status;

  // Validate status
  const validStatuses = ["new", "scheduled", "in_progress", "completed"];
  if (!validStatuses.includes(req.body.status)) {
    return next(new AppError("Invalid task status", 400));
  }

  // Update status using the model method that handles automatic date updates
  await task.updateStatus(req.body.status);

  // Update project completion percentage
  await task.projectId.calculateCompletion();

  // Populate and return updated task
  await task.populate([
    { path: "assignedTo", select: "firstName lastName role" },
    { path: "createdBy", select: "firstName lastName" },
    { path: "projectId", select: "name status teamId" },
  ]);

  // Audit log for task status update
  await logDataChange(
    req,
    "UPDATE",
    "Task",
    task._id,
    { status: originalStatus },
    { status: task.status },
    `Updated task status from ${originalStatus} to ${task.status}: ${task.title}`
  );

  res.status(200).json({
    status: "success",
    data: {
      task,
    },
  });
});

/**
 * Delete task
 */
const deleteTask = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id).populate("projectId");

  if (!task) {
    return next(new AppError("No task found with that ID", 404));
  }

  // Check permissions - only task creator, project managers, or admins can delete
  if (
    !canUserModifyTask(req.user, task) &&
    !task.createdBy.equals(req.user._id)
  ) {
    await logAccessDenied(
      req,
      "Task",
      req.params.id,
      `Access denied to delete task: ${task.title}`
    );
    return next(
      new AppError("You do not have permission to delete this task", 403)
    );
  }

  // Store task data for audit log before deletion
  const taskData = task.toObject();

  // Remove task from project
  const project = task.projectId;
  project.tasks = project.tasks.filter((taskId) => !taskId.equals(task._id));
  await project.save();

  // Delete task
  await Task.findByIdAndDelete(req.params.id);

  // Update project completion percentage
  await project.calculateCompletion();

  // Audit log for task deletion
  await logDataChange(
    req,
    "DELETE",
    "Task",
    task._id,
    taskData,
    null,
    `Deleted task: ${taskData.title}`
  );

  res.status(204).json({
    status: "success",
    data: null,
  });
});

/**
 * Get tasks by status (for Kanban board organization)
 */
const getTasksByStatus = catchAsync(async (req, res, next) => {
  const { status } = req.params;

  // Validate status
  const validStatuses = ["new", "scheduled", "in_progress", "completed"];
  if (!validStatuses.includes(status)) {
    return next(new AppError("Invalid task status", 400));
  }

  let filter = { status };

  // Apply role-based filtering
  if (req.user.role === "employee") {
    filter.assignedTo = req.user._id;
  } else if (req.user.role === "team_lead") {
    const teamProjects = await Project.find({ teamId: req.user.teamId });
    const projectIds = teamProjects.map((project) => project._id);
    filter.projectId = { $in: projectIds };
  }

  // Apply project filter if provided
  if (req.query.projectId) {
    const project = await Project.findById(req.query.projectId);
    if (project && canUserAccessProject(req.user, project)) {
      filter.projectId = req.query.projectId;
    } else {
      return next(new AppError("You do not have access to this project", 403));
    }
  }

  const tasks = await Task.find(filter)
    .populate("assignedTo", "firstName lastName role")
    .populate("createdBy", "firstName lastName")
    .populate("projectId", "name status")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: tasks.length,
    data: {
      tasks,
      statusInfo: {
        status,
        color:
          tasks.length > 0 ? tasks[0].getStatusColor() : getStatusColor(status),
        count: tasks.length,
      },
    },
  });
});

/**
 * Add comment to task
 */
const addTaskComment = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return next(new AppError("No task found with that ID", 404));
  }

  // Check if user has access to this task
  if (!task.canUserAccess(req.user)) {
    return next(
      new AppError("You do not have permission to comment on this task", 403)
    );
  }

  // Add comment
  await task.addComment(req.user._id, req.body.content);

  // Populate and return updated task
  await task.populate([
    { path: "assignedTo", select: "firstName lastName role" },
    { path: "createdBy", select: "firstName lastName" },
    { path: "projectId", select: "name status teamId" },
    { path: "comments.author", select: "firstName lastName" },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      task,
    },
  });
});

/**
 * Get task statistics
 */
const getTaskStats = catchAsync(async (req, res, next) => {
  let filter = {};

  // Apply role-based filtering
  if (req.user.role === "employee") {
    filter.assignedTo = req.user._id;
  } else if (req.user.role === "team_lead") {
    const teamProjects = await Project.find({ teamId: req.user.teamId });
    const projectIds = teamProjects.map((project) => project._id);
    filter.projectId = { $in: projectIds };
  }

  // Apply project filter if provided
  if (req.query.projectId) {
    const project = await Project.findById(req.query.projectId);
    if (project && canUserAccessProject(req.user, project)) {
      filter.projectId = req.query.projectId;
    } else {
      return next(new AppError("You do not have access to this project", 403));
    }
  }

  const stats = await Task.getStatusStats(filter);
  const overdueTasks = await Task.findOverdue();

  // Filter overdue tasks based on user permissions
  const accessibleOverdueTasks = overdueTasks.filter((task) =>
    task.canUserAccess(req.user)
  );

  res.status(200).json({
    status: "success",
    data: {
      statusStats: stats,
      overdueCount: accessibleOverdueTasks.length,
      overdueTasks: accessibleOverdueTasks,
    },
  });
});

/**
 * Helper function to check if user can access project
 */
function canUserAccessProject(user, project) {
  // MD and IT_Admin can access all projects
  if (user.role === "managing_director" || user.role === "it_admin") {
    return true;
  }

  // Team leads can access their team's projects
  if (user.role === "team_lead" && user.teamId.equals(project.teamId)) {
    return true;
  }

  // Employees can access projects they're assigned to
  if (user.role === "employee" && project.isAssigned(user._id)) {
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
  if (user.role === "managing_director" || user.role === "it_admin") {
    return true;
  }

  // Team leads can modify their team's projects
  if (user.role === "team_lead" && user.teamId.equals(project.teamId)) {
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
  if (user.role === "managing_director" || user.role === "it_admin") {
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
    new: "#6c757d", // Gray - New tasks
    scheduled: "#007bff", // Blue - Scheduled tasks
    in_progress: "#ffc107", // Yellow/Amber - In progress tasks
    completed: "#28a745", // Green - Completed tasks
  };
  return statusColors[status] || "#6c757d";
}

// Create personal task (for employees)
const createPersonalTask = catchAsync(async (req, res, next) => {
  console.log(
    "createPersonalTask: Creating personal task for user:",
    req.user._id
  );

  // Set creator and assign to current user
  req.body.createdBy = req.user._id;
  req.body.assignedTo = req.user._id;

  // Remove projectId if present to avoid validation issues
  if (req.body.projectId) {
    delete req.body.projectId;
  }

  // Validate required fields
  if (!req.body.title) {
    return next(new AppError("Task title is required", 400));
  }

  if (!req.body.scheduledDate && !req.body.dueDate) {
    return next(new AppError("Task date is required", 400));
  }

  console.log("createPersonalTask: Creating task with data:", req.body);

  // Create task
  const task = new Task(req.body);
  await task.save();

  // Log the creation
  await logDataChange(req, "TASK", task._id, "CREATE", {
    title: task.title,
    status: task.status,
    priority: task.priority,
    assignedTo: task.assignedTo,
    scheduledDate: task.scheduledDate,
    dueDate: task.dueDate,
  });

  res.status(201).json({
    status: "success",
    data: {
      task,
    },
  });
});

/**
 * Get my tasks (for employees)
 */
const getMyTasks = catchAsync(async (req, res, next) => {
  console.log("getMyTasks: Getting tasks for user:", req.user._id);

  try {
    // Employees can only see tasks assigned to them
    const filter = {
      assignedTo: req.user._id,
    };

    // Apply additional filters from query parameters
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }
    if (req.query.projectId) {
      filter.projectId = req.query.projectId;
    }

    console.log("getMyTasks: Filter:", filter);

    // First, let's check if there are any tasks at all for this user
    const totalTasksCount = await Task.countDocuments({
      assignedTo: req.user._id,
    });
    console.log("getMyTasks: Total tasks count for user:", totalTasksCount);

    // Simplified query without complex population to avoid timeouts
    const tasks = await Task.find(filter)
      .select(
        "title status priority dueDate scheduledDate createdAt projectId assignedTo createdBy"
      )
      .populate("assignedTo", "firstName lastName")
      .populate("createdBy", "firstName lastName")
      .populate("projectId", "name")
      .sort({ createdAt: -1 })
      .limit(100); // Add limit to prevent timeouts

    console.log(
      "getMyTasks: Found",
      tasks.length,
      "tasks for user",
      req.user._id
    );

    // Log the actual tasks found
    if (tasks.length > 0) {
      console.log("getMyTasks: Sample task:", tasks[0]);
    } else {
      console.log(
        "getMyTasks: No tasks found, checking all tasks in database..."
      );
      const allTasks = await Task.find({}).limit(5);
      console.log(
        "getMyTasks: Sample tasks from database:",
        allTasks.map((t) => ({
          id: t._id,
          title: t.title,
          assignedTo: t.assignedTo,
        }))
      );
    }

    res.status(200).json({
      status: "success",
      data: {
        tasks,
      },
    });
  } catch (error) {
    console.error("getMyTasks: Error:", error);
    next(error);
  }
});

/**
 * Get my projects (for employees)
 */
const getMyProjects = catchAsync(async (req, res, next) => {
  console.log("getMyProjects: Getting projects for user:", req.user._id);

  // Employees can only see projects they're assigned to
  const projects = await Project.find({
    $or: [{ assignedMembers: req.user._id }, { createdBy: req.user._id }],
  })
    .populate("assignedMembers", "firstName lastName role")
    .populate("createdBy", "firstName lastName")
    .populate("teamId", "name")
    .sort({ createdAt: -1 });

  console.log(
    "getMyProjects: Found",
    projects.length,
    "projects for user",
    req.user._id
  );

  res.status(200).json({
    status: "success",
    data: {
      projects,
    },
  });
});

/**
 * Get team tasks (for team leads)
 */
const getTeamTasks = catchAsync(async (req, res, next) => {
  console.log("getTeamTasks: Getting team tasks for team lead:", req.user._id);

  if (!req.user.teamId) {
    return res.status(200).json({
      status: "success",
      data: {
        tasks: [],
      },
    });
  }

  // Get team projects first
  const teamProjects = await Project.find({ teamId: req.user.teamId });
  const projectIds = teamProjects.map((project) => project._id);

  // Get tasks in team projects
  const tasks = await Task.find({
    projectId: { $in: projectIds },
  })
    .populate("assignedTo", "firstName lastName role")
    .populate("createdBy", "firstName lastName")
    .populate("projectId", "name status")
    .sort({ createdAt: -1 });

  console.log(
    "getTeamTasks: Found",
    tasks.length,
    "team tasks for team lead",
    req.user._id
  );

  res.status(200).json({
    status: "success",
    data: {
      tasks,
    },
  });
});

/**
 * Get team projects (for team leads)
 */
const getTeamProjects = catchAsync(async (req, res, next) => {
  console.log(
    "getTeamProjects: Getting team projects for team lead:",
    req.user._id
  );

  if (!req.user.teamId) {
    return res.status(200).json({
      status: "success",
      data: {
        projects: [],
      },
    });
  }

  const projects = await Project.find({ teamId: req.user.teamId })
    .populate("assignedMembers", "firstName lastName role")
    .populate("createdBy", "firstName lastName")
    .populate("teamId", "name")
    .sort({ createdAt: -1 });

  console.log(
    "getTeamProjects: Found",
    projects.length,
    "team projects for team lead",
    req.user._id
  );

  res.status(200).json({
    status: "success",
    data: {
      projects,
    },
  });
});

module.exports = {
  getAllTasks,
  getTask,
  createTask,
  createPersonalTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTasksByStatus,
  addTaskComment,
  getTaskStats,
  getStatusColor,
  getMyTasks,
  getMyProjects,
  getTeamTasks,
  getTeamProjects,
};
