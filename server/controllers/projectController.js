const Project = require("../models/Project");
const Task = require("../models/Task");
const Team = require("../models/Team");
const User = require("../models/User");
const { catchAsync } = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { logDataChange, logAccessDenied } = require("../middleware/audit");

/**
 * Get all projects with role-based filtering
 */
const getAllProjects = catchAsync(async (req, res, next) => {
  let filter = {};

  // Apply role-based filtering
  if (req.user.role === "team_lead") {
    // Team leads can only see their team's projects
    filter.teamId = req.user.teamId;
  } else if (req.user.role === "employee") {
    // Employees can only see projects they're assigned to
    filter.assignedMembers = req.user._id;
  }
  // MD and IT_Admin can see all projects (no filter)

  const projects = await Project.find(filter)
    .populate("teamId", "name department")
    .populate("createdBy", "firstName lastName")
    .populate("assignedMembers", "firstName lastName role")
    .populate({
      path: "tasks",
      select: "title status priority dueDate",
      populate: {
        path: "assignedTo",
        select: "firstName lastName",
      },
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: projects.length,
    data: {
      projects,
    },
  });
});

/**
 * Get single project by ID
 */
const getProject = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id)
    .populate("teamId", "name department")
    .populate("createdBy", "firstName lastName")
    .populate("assignedMembers", "firstName lastName role")
    .populate({
      path: "tasks",
      populate: {
        path: "assignedTo",
        select: "firstName lastName",
      },
    });

  if (!project) {
    return next(new AppError("No project found with that ID", 404));
  }

  // Check if user has access to this project
  if (!canUserAccessProject(req.user, project)) {
    return next(
      new AppError("You do not have permission to access this project", 403)
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      project,
    },
  });
});

/**
 * Create new project with task sections initialization
 */
const createProject = catchAsync(async (req, res, next) => {
  // Validate team assignment (only if teamId is provided)
  if (req.body.teamId) {
    const team = await Team.findById(req.body.teamId);
    if (!team) {
      return next(new AppError("Invalid team ID", 400));
    }

    // Check if user can create projects for this team
    if (
      req.user.role === "team_lead" &&
      !req.user.teamId.equals(req.body.teamId)
    ) {
      await logAccessDenied(
        req,
        "Team",
        req.body.teamId,
        `Access denied to create project for team: ${team.name}`
      );
      return next(
        new AppError("You can only create projects for your own team", 403)
      );
    }
  } else {
    // For MD/IT Admin, teamId is optional
    req.body.teamId = null;
  }

  // Set creator
  req.body.createdBy = req.user._id;

  // Validate assigned members belong to the team
  if (req.body.assignedMembers && req.body.assignedMembers.length > 0) {
    const members = await User.find({
      _id: { $in: req.body.assignedMembers },
      teamId: req.body.teamId,
    });

    if (members.length !== req.body.assignedMembers.length) {
      return next(
        new AppError(
          "All assigned members must belong to the project team",
          400
        )
      );
    }
  }

  // Create project using static method that initializes task sections
  const project = await Project.createProject(req.body);

  // Populate the created project
  await project.populate([
    { path: "teamId", select: "name department" },
    { path: "createdBy", select: "firstName lastName" },
    { path: "assignedMembers", select: "firstName lastName role" },
  ]);

  // Audit log for project creation
  await logDataChange(
    req,
    "CREATE",
    "Project",
    project._id,
    null,
    project.toObject(),
    `Created project: ${project.name}`
  );

  res.status(201).json({
    status: "success",
    data: {
      project,
    },
  });
});

/**
 * Update project
 */
const updateProject = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError("No project found with that ID", 404));
  }

  // Check permissions
  if (!canUserModifyProject(req.user, project)) {
    await logAccessDenied(
      req,
      "Project",
      req.params.id,
      `Access denied to modify project: ${project.name}`
    );
    return next(
      new AppError("You do not have permission to modify this project", 403)
    );
  }

  // Store original data for audit log
  const originalProject = project.toObject();

  // Validate team change if provided
  if (req.body.teamId && !req.body.teamId.equals(project.teamId)) {
    const team = await Team.findById(req.body.teamId);
    if (!team) {
      return next(new AppError("Invalid team ID", 400));
    }

    // Check if user can assign to this team
    if (
      req.user.role === "team_lead" &&
      !req.user.teamId.equals(req.body.teamId)
    ) {
      return next(
        new AppError("You can only assign projects to your own team", 403)
      );
    }
  }

  // Validate assigned members if provided
  if (req.body.assignedMembers) {
    const teamId = req.body.teamId || project.teamId;
    const members = await User.find({
      _id: { $in: req.body.assignedMembers },
      teamId: teamId,
    });

    if (members.length !== req.body.assignedMembers.length) {
      return next(
        new AppError(
          "All assigned members must belong to the project team",
          400
        )
      );
    }
  }

  // Update project
  const updatedProject = await Project.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  ).populate([
    { path: "teamId", select: "name department" },
    { path: "createdBy", select: "firstName lastName" },
    { path: "assignedMembers", select: "firstName lastName role" },
  ]);

  // Audit log for project update
  await logDataChange(
    req,
    "UPDATE",
    "Project",
    updatedProject._id,
    originalProject,
    updatedProject.toObject(),
    `Updated project: ${updatedProject.name}`
  );

  res.status(200).json({
    status: "success",
    data: {
      project: updatedProject,
    },
  });
});

/**
 * Delete project
 */
const deleteProject = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError("No project found with that ID", 404));
  }

  // Only MD and IT_Admin can delete projects
  if (req.user.role !== "managing_director" && req.user.role !== "it_admin") {
    await logAccessDenied(
      req,
      "Project",
      req.params.id,
      `Access denied to delete project: ${project.name}`
    );
    return next(
      new AppError("You do not have permission to delete projects", 403)
    );
  }

  // Store project data for audit log before deletion
  const projectData = project.toObject();

  // Delete associated tasks first
  await Task.deleteMany({ projectId: req.params.id });

  // Delete project
  await Project.findByIdAndDelete(req.params.id);

  // Audit log for project deletion
  await logDataChange(
    req,
    "DELETE",
    "Project",
    project._id,
    projectData,
    null,
    `Deleted project: ${projectData.name}`
  );

  res.status(204).json({
    status: "success",
    data: null,
  });
});

/**
 * Add member to project
 */
const addProjectMember = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError("No project found with that ID", 404));
  }

  // Check permissions
  if (!canUserModifyProject(req.user, project)) {
    return next(
      new AppError("You do not have permission to modify this project", 403)
    );
  }

  // Validate user exists and belongs to project team
  const user = await User.findOne({
    _id: req.body.userId,
    teamId: project.teamId,
  });

  if (!user) {
    return next(
      new AppError("User not found or does not belong to project team", 400)
    );
  }

  // Add member
  await project.addMember(req.body.userId);

  res.status(200).json({
    status: "success",
    message: "Member added to project successfully",
  });
});

/**
 * Remove member from project
 */
const removeProjectMember = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError("No project found with that ID", 404));
  }

  // Check permissions
  if (!canUserModifyProject(req.user, project)) {
    return next(
      new AppError("You do not have permission to modify this project", 403)
    );
  }

  // Remove member
  await project.removeMember(req.params.userId);

  res.status(200).json({
    status: "success",
    message: "Member removed from project successfully",
  });
});

/**
 * Get all tasks for a specific project
 */
const getProjectTasks = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError("No project found with that ID", 404));
  }

  // Check access
  if (!canUserAccessProject(req.user, project)) {
    return next(
      new AppError("You do not have permission to access this project", 403)
    );
  }

  // Get all tasks for this project
  const tasks = await Task.find({ projectId: req.params.id })
    .populate("assignedTo", "firstName lastName")
    .populate("createdBy", "firstName lastName")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: tasks.length,
    data: tasks,
  });
});

/**
 * Get project statistics
 */
const getProjectStats = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError("No project found with that ID", 404));
  }

  // Check access
  if (!canUserAccessProject(req.user, project)) {
    return next(
      new AppError("You do not have permission to access this project", 403)
    );
  }

  // Get task statistics
  const taskStats = await Task.getStatusStats({ projectId: req.params.id });

  // Calculate completion percentage
  await project.calculateCompletion();

  res.status(200).json({
    status: "success",
    data: {
      projectId: project._id,
      completionPercentage: project.completionPercentage,
      taskCount: project.taskCount,
      memberCount: project.memberCount,
      durationDays: project.durationDays,
      daysRemaining: project.daysRemaining,
      isOverdue: project.isOverdue,
      taskStats,
    },
  });
});

/**
 * Get projects assigned to current user (My Projects)
 */
const getMyProjects = catchAsync(async (req, res, next) => {
  console.log(
    "getMyProjects called for user:",
    req.user._id,
    "role:",
    req.user.role
  );

  try {
    let filter = {};

    if (req.user.role === "employee") {
      // Employees see projects they're assigned to
      filter.assignedMembers = req.user._id;
      console.log("Employee filter:", filter);
    } else if (req.user.role === "team_lead") {
      // Team leads see projects they created or are assigned to
      filter.$or = [
        { createdBy: req.user._id },
        { assignedMembers: req.user._id },
      ];
      console.log("Team lead filter:", filter);
    } else {
      // MD and IT_Admin see all projects they created
      filter.createdBy = req.user._id;
      console.log("Admin filter:", filter);
    }

    console.log("About to query projects with filter:", filter);

    // Simplified query without complex population to avoid timeouts
    const projects = await Project.find(filter)
      .select("name status createdAt createdBy assignedMembers teamId")
      .populate("createdBy", "firstName lastName")
      .populate("assignedMembers", "firstName lastName role")
      .populate("teamId", "name department")
      .sort({ createdAt: -1 })
      .limit(50); // Add limit to prevent timeouts

    console.log(
      "getMyProjects: Found",
      projects.length,
      "projects for user",
      req.user._id
    );

    // Return simplified response without complex stats calculation
    res.status(200).json({
      status: "success",
      results: projects.length,
      data: {
        projects,
      },
    });
  } catch (error) {
    console.error("getMyProjects: Error:", error);
    next(error);
  }
});

/**
 * Get team projects (for team leads and employees)
 */
const getTeamProjects = catchAsync(async (req, res, next) => {
  let filter = {};

  if (req.user.role === "team_lead" || req.user.role === "employee") {
    // Show all projects for user's team
    filter.teamId = req.user.teamId;
  } else {
    // MD and IT_Admin can see all projects
    filter = {};
  }

  const projects = await Project.find(filter)
    .populate("teamId", "name department")
    .populate("createdBy", "firstName lastName")
    .populate("assignedMembers", "firstName lastName role")
    .populate({
      path: "tasks",
      select: "title status priority dueDate assignedTo",
      populate: {
        path: "assignedTo",
        select: "firstName lastName",
      },
    })
    .sort({ createdAt: -1 });

  // Calculate project statistics
  const projectsWithStats = await Promise.all(
    projects.map(async (project) => {
      await project.calculateCompletion();
      const taskStats = await Task.getStatusStats({ projectId: project._id });

      return {
        ...project.toObject(),
        stats: {
          completionPercentage: project.completionPercentage,
          taskCount: project.taskCount,
          taskStats,
        },
      };
    })
  );

  res.status(200).json({
    status: "success",
    results: projectsWithStats.length,
    data: {
      projects: projectsWithStats,
    },
  });
});

/**
 * Get user's assigned tasks across all projects
 */
const getMyTasks = catchAsync(async (req, res, next) => {
  let filter = { assignedTo: req.user._id };

  // Add status filter if provided
  if (req.query.status) {
    filter.status = req.query.status;
  }

  // Add priority filter if provided
  if (req.query.priority) {
    filter.priority = req.query.priority;
  }

  const tasks = await Task.find(filter)
    .populate("projectId", "name status")
    .populate("assignedTo", "firstName lastName")
    .populate("createdBy", "firstName lastName")
    .sort({ dueDate: 1, createdAt: -1 });

  // Group tasks by status for better organization
  const tasksByStatus = {
    new: [],
    scheduled: [],
    in_progress: [],
    completed: [],
  };

  tasks.forEach((task) => {
    if (tasksByStatus[task.status]) {
      tasksByStatus[task.status].push(task);
    }
  });

  res.status(200).json({
    status: "success",
    results: tasks.length,
    data: {
      tasks,
      tasksByStatus,
    },
  });
});

/**
 * Get team tasks (for team leads)
 */
const getTeamTasks = catchAsync(async (req, res, next) => {
  // Only team leads and above can access team tasks
  if (req.user.role === "employee") {
    return next(
      new AppError("You do not have permission to view team tasks", 403)
    );
  }

  let filter = {};

  if (req.user.role === "team_lead") {
    // Get tasks for projects in user's team
    const teamProjects = await Project.find({ teamId: req.user.teamId }).select(
      "_id"
    );
    const projectIds = teamProjects.map((p) => p._id);
    filter.projectId = { $in: projectIds };
  }
  // MD and IT_Admin see all tasks (no filter)

  // Add status filter if provided
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const tasks = await Task.find(filter)
    .populate("projectId", "name status")
    .populate("assignedTo", "firstName lastName role")
    .populate("createdBy", "firstName lastName")
    .sort({ dueDate: 1, createdAt: -1 });

  // Group tasks by assignee for team view
  const tasksByAssignee = {};
  tasks.forEach((task) => {
    const assigneeId = task.assignedTo?._id?.toString() || "unassigned";
    const assigneeName = task.assignedTo
      ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
      : "Unassigned";

    if (!tasksByAssignee[assigneeId]) {
      tasksByAssignee[assigneeId] = {
        assignee: assigneeName,
        tasks: [],
      };
    }
    tasksByAssignee[assigneeId].tasks.push(task);
  });

  res.status(200).json({
    status: "success",
    results: tasks.length,
    data: {
      tasks,
      tasksByAssignee,
    },
  });
});
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

module.exports = {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectTasks,
  getProjectStats,
  getMyProjects,
  getTeamProjects,
  getMyTasks,
  getTeamTasks,
};
