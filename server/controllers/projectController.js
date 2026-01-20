const Project = require("../models/Project");
const Task = require("../models/Task");
const Team = require("../models/Team");
const User = require("../models/User");
const Department = require("../models/Department");
const { catchAsync } = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { logDataChange, logAccessDenied } = require("../middleware/audit");

/**
 * 🔥 HELPER FUNCTIONS FOR PROJECT CREATION
 */

// Status normalizer - maps frontend status to backend enum
function normalizeStatus(status) {
  if (!status) return "Draft";
  
  const statusMap = {
    draft: "Draft",
    planning: "Not Started", 
    active: "In Progress",
    completed: "Completed",
    "in_progress": "In Progress",
    "not_started": "Not Started",
  };
  
  return statusMap[status?.toLowerCase()] || "Draft";
}

// Department resolver with role-aware fallback
async function resolveDepartment({ deptId, user }) {
  // If department ID is provided, use it
  if (deptId) {
    const dept = await Department.findById(deptId);
    if (!dept) {
      throw new Error("Invalid department ID");
    }
    return deptId;
  }
  
  // Team Lead → use their own department
  if (user.role === "team_lead" && user.departmentId) {
    return user.departmentId;
  }
  
  // Admin / MD → use default department or first available
  const defaultDept = await Department.findOne({ 
    $or: [
      { dept_name: "IT/Software" },
      { name: "IT/Software" },
      { is_active: true }
    ]
  }).sort({ dept_name: 1 });
  
  if (!defaultDept) {
    throw new Error("No departments available. Please create a department first.");
  }
  
  return defaultDept._id;
}

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

  // Calculate and update progress for each project
  const updatedProjects = await Promise.all(
    projects.map(async (project) => {
      // Calculate progress based on multiple factors
      let calculatedProgress = 0;
      
      // 1. Status-based base progress
      const statusProgress = {
        "Draft": 0,
        "Planning": 10,
        "Designing": 20,
        "Not Started": 5,
        "In Progress": 30,
        "Completed": 100
      };
      
      calculatedProgress = statusProgress[project.status] || 0;
      
      // 2. Task-based progress (if tasks exist)
      if (project.tasks && project.tasks.length > 0) {
        const completedTasks = project.tasks.filter(
          (task) => task.status === "completed" || task.status === "Completed"
        ).length;
        const taskProgress = Math.round((completedTasks / project.tasks.length) * 100);
        
        // Use the higher of status-based or task-based progress
        calculatedProgress = Math.max(calculatedProgress, taskProgress);
      }
      
      // 3. Use manual progress if set and higher
      if (project.progress && project.progress > calculatedProgress) {
        calculatedProgress = project.progress;
      }
      
      // 4. Timeline-based progress for "In Progress" projects
      if (project.startDate && project.endDate && project.status === "In Progress") {
        const now = new Date();
        const start = new Date(project.startDate);
        const end = new Date(project.endDate);
        
        if (now >= start && now <= end) {
          const totalDuration = end - start;
          const elapsed = now - start;
          const timelineProgress = Math.round((elapsed / totalDuration) * 100);
          
          // Don't let timeline progress exceed other progress by too much
          const maxTimelineProgress = Math.min(timelineProgress, calculatedProgress + 20);
          calculatedProgress = Math.max(calculatedProgress, maxTimelineProgress);
        }
      }
      
      // Ensure progress is within bounds
      calculatedProgress = Math.min(Math.max(calculatedProgress, 0), 100);
      
      // Update the project's progress field if it has changed significantly
      if (Math.abs(project.progress - calculatedProgress) > 5) {
        // Only save if the project has required fields or is a Draft
        const hasRequiredFields = project.start_date && project.deadline;
        const isDraft = project.status === "Draft";
        
        if (isDraft || hasRequiredFields) {
          project.progress = calculatedProgress;
          await project.save({ validateBeforeSave: false }); // Skip validation for progress updates
        } else {
          // Just update the progress in memory without saving to avoid validation errors
          project.progress = calculatedProgress;
          console.log(`Progress updated in memory for project ${project.name}: ${calculatedProgress}% (missing required dates)`);
        }
      }
      
      return project;
    })
  );

  res.status(200).json({
    status: "success",
    results: updatedProjects.length,
    data: {
      projects: updatedProjects,
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
  const {
    name,
    description,
    status,
    priority,
    startDate,
    endDate,
    budget,
    teamId,
    assignedMembers,
    tags,
  } = req.body;

  console.log("Creating project with payload:", req.body);

  // 🔥 STEP 1: Resolve department (with fallback)
  let dept_id;
  try {
    dept_id = await resolveDepartment({
      deptId: req.body.departmentId,
      user: req.user,
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }

  // 🔥 STEP 2: Normalize status from frontend to backend enum
  const normalizedStatus = normalizeStatus(status);

  // 🔥 STEP 3: Map frontend payload to backend schema
  const projectData = {
    name,
    description,
    dept_id,                          // REQUIRED - resolved above
    created_by: req.user._id,         // REQUIRED - auto-filled
    start_date: normalizedStatus === "Draft" ? null : startDate,  // REQUIRED (unless Draft)
    deadline: normalizedStatus === "Draft" ? null : endDate,      // REQUIRED (unless Draft)
    status: normalizedStatus,         // REQUIRED - normalized
    priority,
    // Legacy fields for backward compatibility
    startDate,
    endDate,
    teamId,
    createdBy: req.user._id,
    assignedMembers,
    tags,
  };

  console.log("Normalized project data:", projectData);

  // Validate team assignment (only if teamId is provided)
  if (teamId) {
    const team = await Team.findById(teamId);
    if (!team) {
      return next(new AppError("Invalid team ID", 400));
    }

    // Check if user can create projects for this team
    if (
      req.user.role === "team_lead" &&
      req.user.teamId && 
      req.user.teamId.toString() !== teamId.toString()
    ) {
      await logAccessDenied(
        req,
        "Team",
        teamId,
        `Access denied to create project for team: ${team.name}`
      );
      return next(
        new AppError("You can only create projects for your own team", 403)
      );
    }
  }

  // Validate assigned members belong to the team
  if (assignedMembers && assignedMembers.length > 0) {
    const members = await User.find({
      _id: { $in: assignedMembers },
      teamId: teamId,
    });

    if (members.length !== assignedMembers.length) {
      return next(
        new AppError(
          "All assigned members must belong to the project team",
          400
        )
      );
    }
  }

  // Create project using static method that initializes task sections
  const project = await Project.createProject(projectData);

  // Populate the created project
  await project.populate([
    { path: "teamId", select: "name department" },
    { path: "createdBy", select: "firstName lastName" },
    { path: "assignedMembers", select: "firstName lastName role" },
    { path: "dept_id", select: "dept_name name" },
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
  if (req.body.teamId && req.body.teamId.toString() !== (project.teamId ? project.teamId.toString() : null)) {
    const team = await Team.findById(req.body.teamId);
    if (!team) {
      return next(new AppError("Invalid team ID", 400));
    }

    // Check if user can assign to this team
    if (
      req.user.role === "team_lead" &&
      req.user.teamId && 
      req.user.teamId.toString() !== req.body.teamId.toString()
    ) {
      return next(
        new AppError("You can only assign projects to your own team", 403)
      );
    }
  }

  // Validate assigned members if provided
  if (req.body.assignedMembers && req.body.assignedMembers.length > 0) {
    // Filter out null, undefined, and empty string values first
    req.body.assignedMembers = req.body.assignedMembers.filter(id => 
      id !== null && id !== undefined && id !== ''
    );
    
    console.log('Validating assigned members (after filtering nulls):', req.body.assignedMembers);
    
    // If no valid members remain after filtering, set to empty array
    if (req.body.assignedMembers.length === 0) {
      req.body.assignedMembers = [];
      console.log('No valid assigned members found, setting to empty array');
    } else {
      // Check if assigned members exist and are active
      const members = await User.find({
        _id: { $in: req.body.assignedMembers },
        is_active: true, // Only allow active users
      });

      console.log('Found members:', members.map(m => ({ id: m._id, name: m.name, active: m.is_active })));

      if (members.length !== req.body.assignedMembers.length) {
        // Find which members were not found
        const foundIds = members.map(m => m._id.toString());
        const notFoundIds = req.body.assignedMembers.filter(id => 
          id && !foundIds.includes(id.toString())
        );
        
        console.log('Members not found or inactive:', notFoundIds);
        
        // Instead of blocking, just filter out invalid members and continue
        req.body.assignedMembers = foundIds;
        console.log('Filtered assigned members to valid ones:', req.body.assignedMembers);
        
        // Log a warning but don't block the update
        if (notFoundIds.length > 0) {
          console.log(`Warning: ${notFoundIds.length} assigned members were invalid and removed from project ${project.name}`);
        }
      }
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
  if (user.role === "team_lead" && user.teamId && project.teamId && user.teamId.equals(project.teamId)) {
    return true;
  }

  // Employees can access projects they're assigned to
  if (user.role === "employee" && project.isAssigned(user._id)) {
    return true;
  }

  // Project creator can access
  if (project.createdBy && user._id && project.createdBy.equals(user._id)) {
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
  if (user.role === "team_lead" && user.teamId && project.teamId && user.teamId.equals(project.teamId)) {
    return true;
  }

  // Project creator can modify
  if (project.createdBy && user._id && project.createdBy.equals(user._id)) {
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
