import React, { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useApp } from "../../contexts/AppContext";
import TaskCalendar from "../calendar/TaskCalendar";
import TaskBoard from "../TaskBoard";
import { ComponentLoader } from "../LoadingSpinner";

const TeamLeadDashboard = () => {
  const { user, getUserFullName } = useAuth();
  const { projects, tasks, teams, users, loading, errors, fetchAllData } =
    useApp();

  useEffect(() => {
    // Fetch all data when component mounts
    fetchAllData(true); // Force refresh for dashboard
  }, [fetchAllData]); // eslint-disable-line react-hooks/exhaustive-deps

  const getProjectStatusColor = (status) => {
    const colors = {
      planning: "secondary",
      active: "primary",
      completed: "success",
      on_hold: "warning",
    };
    return colors[status] || "secondary";
  };

  const getTaskStatusColor = (status) => {
    const colors = {
      new: "secondary",
      scheduled: "info",
      in_progress: "warning",
      completed: "success",
    };
    return colors[status] || "secondary";
  };

  if (loading.global || loading.projects || loading.tasks || loading.teams) {
    return <ComponentLoader text="Loading team dashboard..." />;
  }

  if (errors.global || errors.projects || errors.tasks || errors.teams) {
    const errorMessage =
      errors.global || errors.projects || errors.tasks || errors.teams;
    return (
      <div className="alert alert-danger" role="alert">
        <h5 className="alert-heading">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Error Loading Dashboard
        </h5>
        <p className="mb-0">{errorMessage}</p>
      </div>
    );
  }

  // Filter data for team lead's team
  const userTeam = teams.find((team) => team._id === user.teamId);
  const teamMembers = users.filter((u) => u.teamId === user.teamId) || [];
  const teamProjects = projects.filter((p) => p.teamId === user.teamId);
  const teamTasks = tasks.filter(
    (t) =>
      teamMembers.some((member) => member._id === t.assignedTo?._id) ||
      teamProjects.some((project) => project._id === t.projectId?._id)
  );

  // Calculate team metrics
  const totalProjects = teamProjects.length;
  const activeProjects = teamProjects.filter(
    (p) => p.status === "active"
  ).length;
  const totalTasks = teamTasks.length;
  const completedTasks = teamTasks.filter(
    (t) => t.status === "completed"
  ).length;
  const inProgressTasks = teamTasks.filter(
    (t) => t.status === "in_progress"
  ).length;
  const teamSize = teamMembers.length;

  // Calculate team completion percentage
  const teamCompletion =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate task stats for team
  const taskStats = {
    statusStats: [
      { _id: "new", count: teamTasks.filter((t) => t.status === "new").length },
      {
        _id: "scheduled",
        count: teamTasks.filter((t) => t.status === "scheduled").length,
      },
      {
        _id: "in_progress",
        count: teamTasks.filter((t) => t.status === "in_progress").length,
      },
      {
        _id: "completed",
        count: teamTasks.filter((t) => t.status === "completed").length,
      },
    ].filter((stat) => stat.count > 0),
  };

  // Get tasks by team member
  const tasksByMember = teamMembers.map((member) => {
    const memberTasks = teamTasks.filter(
      (task) => task.assignedTo && task.assignedTo._id === member._id
    );
    const completedCount = memberTasks.filter(
      (t) => t.status === "completed"
    ).length;
    const inProgressCount = memberTasks.filter(
      (t) => t.status === "in_progress"
    ).length;

    return {
      ...member,
      totalTasks: memberTasks.length,
      completedTasks: completedCount,
      inProgressTasks: inProgressCount,
      completion:
        memberTasks.length > 0
          ? Math.round((completedCount / memberTasks.length) * 100)
          : 0,
    };
  });

  return (
    <div className="team-lead-dashboard">
      {/* Welcome Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div
            className="card border-0 shadow-sm"
            style={{
              background: "linear-gradient(135deg, #800020 0%, #A0002A 100%)",
            }}
          >
            <div className="card-body text-white">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h2 className="card-title mb-2 text-white">
                    <i className="fas fa-users-cog me-2 text-white"></i>
                    Welcome, {getUserFullName()}
                  </h2>
                  <p className="mb-0 text-white opacity-75">
                    <i className="fas fa-user-tie me-2 text-white"></i>
                    Team Lead - {user.department} Department Dashboard
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="d-flex flex-column align-items-md-end">
                    <small className="opacity-75 mb-1 text-white">
                      <i className="fas fa-calendar me-1 text-white"></i>
                      {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </small>
                    <small className="opacity-75 text-white">
                      <i className="fas fa-users me-1 text-white"></i>
                      Managing {teamSize} team members
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Metrics Cards */}
      <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-info bg-opacity-10 p-3">
                  <i className="fas fa-project-diagram fa-2x text-info"></i>
                </div>
              </div>
              <h3 className="card-title text-info mb-1">{totalProjects}</h3>
              <p className="card-text text-muted mb-2">Team Projects</p>
              <small className="text-success">
                <i className="fas fa-play me-1"></i>
                {activeProjects} Active
              </small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-warning bg-opacity-10 p-3">
                  <i className="fas fa-tasks fa-2x text-warning"></i>
                </div>
              </div>
              <h3 className="card-title text-warning mb-1">{totalTasks}</h3>
              <p className="card-text text-muted mb-2">Team Tasks</p>
              <small className="text-info">
                <i className="fas fa-spinner me-1"></i>
                {inProgressTasks} In Progress
              </small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-primary bg-opacity-10 p-3">
                  <i className="fas fa-users fa-2x text-primary"></i>
                </div>
              </div>
              <h3 className="card-title text-primary mb-1">{teamSize}</h3>
              <p className="card-text text-muted mb-2">Team Members</p>
              <small className="text-primary">
                <i className="fas fa-user-check me-1"></i>
                Active Team
              </small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-success bg-opacity-10 p-3">
                  <i className="fas fa-chart-line fa-2x text-success"></i>
                </div>
              </div>
              <h3 className="card-title text-success mb-1">
                {teamCompletion}%
              </h3>
              <p className="card-text text-muted mb-2">Team Progress</p>
              <div className="progress" style={{ height: "6px" }}>
                <div
                  className="progress-bar bg-success"
                  role="progressbar"
                  style={{ width: `${teamCompletion}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Status Overview */}
      {taskStats && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pb-0">
                <h5 className="card-title mb-0">
                  <i className="fas fa-chart-bar me-2 text-info"></i>
                  Team Task Status Distribution
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  {taskStats.statusStats &&
                    taskStats.statusStats.map((stat, index) => (
                      <div key={index} className="col-lg-3 col-md-6 mb-3">
                        <div
                          className={`card border-0 bg-${getTaskStatusColor(stat._id)} bg-opacity-10`}
                        >
                          <div className="card-body text-center py-3">
                            <h4
                              className={`text-${getTaskStatusColor(stat._id)} mb-1`}
                            >
                              {stat.count}
                            </h4>
                            <p className="card-text text-capitalize mb-0">
                              {stat._id.replace("_", " ")} Tasks
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Team Performance Visualization */}
                <div className="mt-4">
                  <h6 className="mb-3">Team Performance Overview</h6>
                  <div className="row">
                    <div className="col-md-8">
                      <div className="progress mb-2" style={{ height: "10px" }}>
                        {taskStats.statusStats &&
                          taskStats.statusStats.map((stat, index) => {
                            const percentage =
                              totalTasks > 0
                                ? (stat.count / totalTasks) * 100
                                : 0;
                            return (
                              <div
                                key={index}
                                className={`progress-bar bg-${getTaskStatusColor(stat._id)}`}
                                role="progressbar"
                                style={{ width: `${percentage}%` }}
                                title={`${stat._id}: ${stat.count} tasks (${percentage.toFixed(1)}%)`}
                              ></div>
                            );
                          })}
                      </div>
                      <div className="d-flex justify-content-between small text-muted">
                        <span>Team Task Distribution</span>
                        <span>{totalTasks} Total Tasks</span>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="text-center">
                        <div className="position-relative d-inline-block">
                          <svg width="80" height="80">
                            <circle
                              cx="40"
                              cy="40"
                              r="35"
                              fill="none"
                              stroke="#e9ecef"
                              strokeWidth="6"
                            />
                            <circle
                              cx="40"
                              cy="40"
                              r="35"
                              fill="none"
                              stroke="#17a2b8"
                              strokeWidth="6"
                              strokeDasharray={`${teamCompletion * 2.2} 220`}
                              strokeDashoffset="55"
                              transform="rotate(-90 40 40)"
                            />
                          </svg>
                          <div className="position-absolute top-50 start-50 translate-middle text-center">
                            <div className="h6 mb-0 text-info">
                              {teamCompletion}%
                            </div>
                            <small className="text-muted">Complete</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Performance and Projects */}
      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="fas fa-project-diagram me-2 text-info"></i>
                  Team Projects
                </h5>
                <a
                  href="/team-projects"
                  className="btn btn-sm btn-outline-info"
                >
                  View All
                </a>
              </div>
            </div>
            <div className="card-body">
              {teamProjects.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-folder-open fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No team projects found</p>
                  <a href="/team-projects" className="btn btn-primary">
                    Create First Project
                  </a>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Project Name</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Tasks</th>
                        <th>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamProjects.slice(0, 5).map((project) => {
                        const projectTasks = teamTasks.filter(
                          (t) => t.projectId && t.projectId._id === project._id
                        );
                        const completedProjectTasks = projectTasks.filter(
                          (t) => t.status === "completed"
                        ).length;
                        const projectProgress =
                          projectTasks.length > 0
                            ? Math.round(
                                (completedProjectTasks / projectTasks.length) *
                                  100
                              )
                            : 0;

                        return (
                          <tr key={project._id}>
                            <td>
                              <div className="fw-medium">{project.name}</div>
                              <small className="text-muted">
                                {project.description}
                              </small>
                            </td>
                            <td>
                              <span
                                className={`badge bg-${getProjectStatusColor(project.status)}`}
                              >
                                {project.status}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div
                                  className="progress me-2"
                                  style={{ width: "60px", height: "6px" }}
                                >
                                  <div
                                    className="progress-bar bg-success"
                                    style={{ width: `${projectProgress}%` }}
                                  ></div>
                                </div>
                                <small className="text-muted">
                                  {projectProgress}%
                                </small>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark">
                                {completedProjectTasks}/{projectTasks.length}
                              </span>
                            </td>
                            <td>
                              <small className="text-muted">
                                {project.endDate
                                  ? new Date(
                                      project.endDate
                                    ).toLocaleDateString()
                                  : "No deadline"}
                              </small>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="fas fa-users me-2 text-primary"></i>
                  Team Performance
                </h5>
                <a href="/my-team" className="btn btn-sm btn-outline-primary">
                  Manage Team
                </a>
              </div>
            </div>
            <div className="card-body">
              {tasksByMember.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-users fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No team members found</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {tasksByMember.slice(0, 6).map((member) => (
                    <div
                      key={member._id}
                      className="list-group-item border-0 px-0"
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="fw-medium">
                            {member.firstName} {member.lastName}
                          </div>
                          <small className="text-muted text-capitalize">
                            {member.role.replace("_", " ")}
                          </small>
                          <div className="mt-2">
                            <div className="progress" style={{ height: "4px" }}>
                              <div
                                className="progress-bar bg-success"
                                style={{ width: `${member.completion}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-end ms-3">
                          <div className="badge bg-primary rounded-pill mb-1">
                            {member.completion}%
                          </div>
                          <div>
                            <small className="text-muted">
                              {member.completedTasks}/{member.totalTasks} tasks
                            </small>
                          </div>
                          {member.inProgressTasks > 0 && (
                            <div>
                              <small className="text-warning">
                                {member.inProgressTasks} in progress
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Team Task Board */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="fas fa-tasks me-2 text-primary"></i>
                  {userTeam ? `${userTeam.name} Team Board` : "Team Task Board"}
                </h5>
                <a
                  href="/team-tasks"
                  className="btn btn-sm btn-outline-primary"
                >
                  Full Board View
                </a>
              </div>
            </div>
            <div className="card-body p-0">
              <TaskBoard
                projectId={null} // Show all team tasks
                className="team-task-board"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Integration */}
      <div className="row">
        <div className="col-12">
          <TaskCalendar showDeadlineNotifications={true} height="500px" />
        </div>
      </div>
    </div>
  );
};

export default TeamLeadDashboard;
