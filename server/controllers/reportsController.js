const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const Team = require("../models/Team");

/**
 * Generate a report based on specified criteria
 */
const generateReport = async (req, res) => {
  try {
    const {
      reportType,
      dateRange,
      teamId,
      projectId,
      userId,
      format = "json",
    } = req.body;

    let reportData = {};
    const startDate = dateRange?.start
      ? new Date(dateRange.start)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.end ? new Date(dateRange.end) : new Date();

    // Build query filters
    let taskFilter = {
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (teamId) taskFilter.team = teamId;
    if (projectId) taskFilter.project = projectId;
    if (userId) taskFilter.assignedTo = userId;

    switch (reportType) {
      case "task_summary":
        console.log("Generating task summary report with filter:", taskFilter);
        reportData = await generateTaskSummaryReport(taskFilter);
        break;
      case "project_progress":
        console.log(
          "Generating project progress report with filter:",
          taskFilter,
          "projectId:",
          projectId
        );
        reportData = await generateProjectProgressReport(taskFilter, projectId);
        break;
      case "team_performance":
        console.log(
          "Generating team performance report with filter:",
          taskFilter,
          "teamId:",
          teamId
        );
        reportData = await generateTeamPerformanceReport(taskFilter, teamId);
        break;
      case "user_activity":
        console.log(
          "Generating user activity report with filter:",
          taskFilter,
          "userId:",
          userId
        );
        reportData = await generateUserActivityReport(taskFilter, userId);
        break;
      default:
        console.error("Invalid report type:", reportType);
        return res.status(400).json({
          status: "fail",
          message: "Invalid report type",
        });
    }

    // Add metadata
    reportData.metadata = {
      reportType,
      dateRange: { startDate, endDate },
      generatedAt: new Date(),
      generatedBy: req.user.id,
      filters: { teamId, projectId, userId },
    };

    res.status(200).json({
      status: "success",
      data: {
        report: reportData,
      },
    });
  } catch (error) {
    console.error("Report generation error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate report",
    });
  }
};

/**
 * Generate task summary report
 */
const generateTaskSummaryReport = async (filter) => {
  const tasks = await Task.find(filter)
    .populate("assignedTo", "firstName lastName username")
    .populate("project", "name")
    .populate("team", "name");

  const summary = {
    totalTasks: tasks.length,
    statusBreakdown: {},
    priorityBreakdown: {},
    completionRate: 0,
    averageCompletionTime: 0,
  };

  // Calculate status breakdown
  tasks.forEach((task) => {
    summary.statusBreakdown[task.status] =
      (summary.statusBreakdown[task.status] || 0) + 1;
    summary.priorityBreakdown[task.priority] =
      (summary.priorityBreakdown[task.priority] || 0) + 1;
  });

  // Calculate completion rate
  const completedTasks = tasks.filter((task) => task.status === "completed");
  summary.completionRate =
    tasks.length > 0
      ? ((completedTasks.length / tasks.length) * 100).toFixed(2)
      : 0;

  // Calculate average completion time for completed tasks
  if (completedTasks.length > 0) {
    const totalCompletionTime = completedTasks.reduce((total, task) => {
      if (task.completedAt && task.createdAt) {
        return total + (new Date(task.completedAt) - new Date(task.createdAt));
      }
      return total;
    }, 0);
    summary.averageCompletionTime = Math.round(
      totalCompletionTime / completedTasks.length / (1000 * 60 * 60 * 24)
    ); // in days
  }

  return {
    type: "task_summary",
    summary,
    tasks: tasks.map((task) => ({
      id: task._id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo
        ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
        : "Unassigned",
      project: task.project?.name || "No Project",
      team: task.team?.name || "No Team",
      createdAt: task.createdAt,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
    })),
  };
};

/**
 * Generate project progress report
 */
const generateProjectProgressReport = async (filter, projectId) => {
  let projects;

  if (projectId) {
    projects = await Project.find({ _id: projectId });
  } else {
    projects = await Project.find({});
  }

  const projectReports = await Promise.all(
    projects.map(async (project) => {
      const projectTasks = await Task.find({
        ...filter,
        project: project._id,
      }).populate("assignedTo", "firstName lastName");

      const totalTasks = projectTasks.length;
      const completedTasks = projectTasks.filter(
        (task) => task.status === "completed"
      ).length;
      const inProgressTasks = projectTasks.filter(
        (task) => task.status === "in_progress"
      ).length;
      const pendingTasks = projectTasks.filter(
        (task) => task.status === "pending"
      ).length;

      return {
        projectId: project._id,
        projectName: project.name,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        progress: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          pendingTasks,
          completionPercentage:
            totalTasks > 0
              ? ((completedTasks / totalTasks) * 100).toFixed(2)
              : 0,
        },
        tasks: projectTasks.map((task) => ({
          id: task._id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          assignedTo: task.assignedTo
            ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
            : "Unassigned",
          dueDate: task.dueDate,
        })),
      };
    })
  );

  return {
    type: "project_progress",
    projects: projectReports,
  };
};

/**
 * Generate team performance report
 */
const generateTeamPerformanceReport = async (filter, teamId) => {
  let teams;

  if (teamId) {
    teams = await Team.find({ _id: teamId }).populate(
      "members",
      "firstName lastName username"
    );
  } else {
    teams = await Team.find({}).populate(
      "members",
      "firstName lastName username"
    );
  }

  const teamReports = await Promise.all(
    teams.map(async (team) => {
      const teamTasks = await Task.find({
        ...filter,
        team: team._id,
      }).populate("assignedTo", "firstName lastName");

      const memberPerformance = await Promise.all(
        team.members.map(async (member) => {
          const memberTasks = teamTasks.filter(
            (task) =>
              task.assignedTo &&
              task.assignedTo._id.toString() === member._id.toString()
          );

          const completedTasks = memberTasks.filter(
            (task) => task.status === "completed"
          );

          return {
            userId: member._id,
            name: `${member.firstName} ${member.lastName}`,
            username: member.username,
            totalTasks: memberTasks.length,
            completedTasks: completedTasks.length,
            completionRate:
              memberTasks.length > 0
                ? ((completedTasks.length / memberTasks.length) * 100).toFixed(
                    2
                  )
                : 0,
          };
        })
      );

      return {
        teamId: team._id,
        teamName: team.name,
        department: team.department,
        totalMembers: team.members.length,
        totalTasks: teamTasks.length,
        completedTasks: teamTasks.filter((task) => task.status === "completed")
          .length,
        memberPerformance,
      };
    })
  );

  return {
    type: "team_performance",
    teams: teamReports,
  };
};

/**
 * Generate user activity report
 */
const generateUserActivityReport = async (filter, userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const userTasks = await Task.find({
    ...filter,
    assignedTo: userId,
  })
    .populate("project", "name")
    .populate("team", "name");

  const activitySummary = {
    totalTasks: userTasks.length,
    completedTasks: userTasks.filter((task) => task.status === "completed")
      .length,
    inProgressTasks: userTasks.filter((task) => task.status === "in_progress")
      .length,
    pendingTasks: userTasks.filter((task) => task.status === "pending").length,
    overdueTasks: userTasks.filter(
      (task) =>
        task.dueDate &&
        new Date(task.dueDate) < new Date() &&
        task.status !== "completed"
    ).length,
  };

  return {
    type: "user_activity",
    user: {
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      username: user.username,
      role: user.role,
      department: user.department,
    },
    summary: activitySummary,
    tasks: userTasks.map((task) => ({
      id: task._id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      project: task.project?.name || "No Project",
      team: task.team?.name || "No Team",
      createdAt: task.createdAt,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
    })),
  };
};

/**
 * Get a specific report by ID
 */
const getReport = async (req, res) => {
  try {
    // For now, we'll regenerate reports on demand
    // In a production system, you might want to store generated reports
    res.status(200).json({
      status: "success",
      message:
        "Report retrieval not implemented - reports are generated on demand",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve report",
    });
  }
};

/**
 * Get all reports for the current user
 */
const getUserReports = async (req, res) => {
  try {
    // For now, return empty array as reports are generated on demand
    res.status(200).json({
      status: "success",
      data: {
        reports: [],
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve reports",
    });
  }
};

/**
 * Delete a report
 */
const deleteReport = async (req, res) => {
  try {
    res.status(200).json({
      status: "success",
      message:
        "Report deletion not implemented - reports are generated on demand",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete report",
    });
  }
};

module.exports = {
  generateReport,
  getReport,
  getUserReports,
  deleteReport,
};
