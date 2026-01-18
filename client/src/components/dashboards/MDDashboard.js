import React, { useEffect, useState } from "react";
import { Card, Row, Col, Badge, Button, Table, Modal, Form, Alert } from "react-bootstrap";
import { useAuth } from "../../contexts/AuthContext";
import { useApp } from "../../contexts/AppContext";
import { useLazyDashboard } from "../../hooks/useLazyDashboard";
import TaskCalendar from "../calendar/TaskCalendar";
import AnimatedProgressBar from "../shared/AnimatedProgressBar";
import PulseTest from "../shared/PulseTest";
import { ComponentLoader } from "../LoadingSpinner";
import projectService from "../../services/projectService";
import taskService from "../../services/taskService";
import departmentService from "../../services/departmentService";

const MDDashboard = () => {
  const { getUserFullName } = useAuth();
  const { addNotification } = useApp();
  const { projects, tasks, teams, loadingStatus, initializeDashboard } =
    useLazyDashboard();

  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  useEffect(() => {
    // Initialize dashboard with lazy loading - only run once
    console.log('MDDashboard useEffect called');
    initializeDashboard();
  }, []); // Empty dependency array to run only once

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

  // Check if data is available
  if (!projects && !loadingStatus.hasData) {
    console.log("MDDashboard: No data available yet", {
      projects,
      loadingStatus,
    });
    return <ComponentLoader text="Initializing company dashboard..." />;
  }

  // Check if data arrays are empty but not loading
  if (
    projects.length === 0 &&
    tasks.length === 0 &&
    teams.length === 0 &&
    !loadingStatus.isLoading &&
    !loadingStatus.hasData
  ) {
    console.log("MDDashboard: No data found");
    return (
      <div className="alert alert-info" role="alert">
        <h5 className="alert-heading">
          <i className="fas fa-info-circle me-2"></i>
          No Data Available
        </h5>
        <p className="mb-0">
          No projects, tasks, or teams found. Please create some data to get
          started.
        </p>
      </div>
    );
  }

  // Show loading state while critical data is loading
  if (loadingStatus.isLoading && !loadingStatus.criticalLoaded) {
    console.log("MDDashboard: Still loading critical data", { loadingStatus });
    return <ComponentLoader text="Loading company dashboard..." />;
  }

  // Show partial loading state
  if (loadingStatus.isPartiallyLoaded) {
    console.log("MDDashboard: Partially loaded", { loadingStatus });
  }

  console.log("MDDashboard: Rendering with data", {
    totalProjects: projects?.length,
    totalTasks: tasks?.length,
    totalTeams: teams?.length,
  });

  // Calculate company-wide metrics
  const totalProjects = projects?.length || 0;
  const activeProjects =
    projects?.filter((p) => p.status === "active").length || 0;
  const totalTasks = tasks?.length || 0;
  const completedTasks =
    tasks?.filter((t) => t.status === "completed").length || 0;
  const totalTeams = teams?.length || 0;
  const totalMembers =
    teams?.reduce((sum, team) => sum + (team.members?.length || 0), 0) || 0;

  // Calculate completion percentage
  const overallCompletion =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate task stats
  const taskStats = {
    statusStats: [
      {
        _id: "new",
        count: tasks?.filter((t) => t.status === "new").length || 0,
      },
      {
        _id: "scheduled",
        count: tasks?.filter((t) => t.status === "scheduled").length || 0,
      },
      {
        _id: "in_progress",
        count: tasks?.filter((t) => t.status === "in_progress").length || 0,
      },
      {
        _id: "completed",
        count: tasks?.filter((t) => t.status === "completed").length || 0,
      },
    ].filter((stat) => stat.count > 0),
  };

  return (
    <div className="md-dashboard">
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
                    <i className="fas fa-crown me-2 text-white"></i>
                    Welcome, {getUserFullName()}
                  </h2>
                  <p className="mb-0 text-white opacity-75">
                    <i className="fas fa-building me-2 text-white"></i>
                    Managing Director - Company Overview Dashboard
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="d-flex flex-column align-items-md-end">
                    {/* Test Notification Button */}
                    <button
                      className="btn btn-light btn-sm mb-2"
                      onClick={() => {
                        addNotification({
                          type: "success",
                          message: "Notification system is working!",
                          title: "Test Notification",
                        });
                      }}
                    >
                      <i className="fas fa-bell me-1"></i>
                      Test Notifications
                    </button>
                    <small className="opacity-75 mb-1 text-white">
                      <i className="fas fa-calendar me-1 text-white"></i>
                      {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-primary bg-opacity-10 p-3">
                  <i className="fas fa-project-diagram fa-2x text-primary"></i>
                </div>
              </div>
              <h3 className="card-title text-primary mb-1">{totalProjects}</h3>
              <p className="card-text text-muted mb-2">Total Projects</p>
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
              <p className="card-text text-muted mb-2">Total Tasks</p>
              <small className="text-success">
                <i className="fas fa-check me-1"></i>
                {completedTasks} Completed
              </small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-info bg-opacity-10 p-3">
                  <i className="fas fa-users fa-2x text-info"></i>
                </div>
              </div>
              <h3 className="card-title text-info mb-1">{totalTeams}</h3>
              <p className="card-text text-muted mb-2">Active Teams</p>
              <small className="text-info">
                <i className="fas fa-user me-1"></i>
                {totalMembers} Members
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
                {overallCompletion}%
              </h3>
              <p className="card-text text-muted mb-2">Overall Progress</p>
              <AnimatedProgressBar
                value={overallCompletion}
                variant="success"
                height="6px"
                showLabel={false}
                showSyncStatus={true}
                dataType="all"
                className="mb-2"
              />
              <div className="live-indicator">
                <i className="fas fa-circle me-1"></i>
                Live
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
                <h5 className="card-title mb-0" style={{ color: "#800020" }}>
                  <i
                    className="fas fa-chart-bar me-2"
                    style={{ color: "#800020" }}
                  ></i>
                  Task Status Distribution
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

                {/* Visual Progress Bar */}
                <div className="mt-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">Company-wide Task Progress</h6>
                    <div className="d-flex align-items-center">
                      <AnimatedProgressBar
                        value={overallCompletion}
                        variant="success"
                        height="8px"
                        showLabel={true}
                        showSyncStatus={true}
                        dataType="all"
                        className="me-3"
                        style={{ minWidth: "200px" }}
                      />
                    </div>
                  </div>

                  {/* Multi-stage Progress Bar */}
                  <div
                    className="progress-enhanced mb-3"
                    style={{ height: "16px" }}
                  >
                    <div className="progress-multi-stage">
                      {taskStats.statusStats &&
                        taskStats.statusStats.map((stat, index) => {
                          const percentage =
                            totalTasks > 0
                              ? (stat.count / totalTasks) * 100
                              : 0;
                          return (
                            <div
                              key={index}
                              className={`progress-stage progress-bar-animated bg-${getTaskStatusColor(stat._id)}`}
                              style={{
                                width: `${percentage}%`,
                                minWidth: percentage > 0 ? "30px" : "0",
                                position: "relative",
                              }}
                              title={`${stat._id.replace("_", " ")}: ${stat.count} tasks (${percentage.toFixed(1)}%)`}
                            >
                              {percentage > 5 && (
                                <span className="progress-stage-text">
                                  {stat.count}
                                </span>
                              )}
                              <div className="progress-stage-pulse" />
                            </div>
                          );
                        })}
                    </div>
                    {/* Sync Indicator */}
                    <div className="progress-sync-indicator" />
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <div className="small text-muted">
                      <i className="fas fa-chart-pie me-1"></i>
                      Task Distribution by Status
                    </div>
                    <div className="small text-muted">
                      <strong>{totalTasks}</strong> Total Tasks
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="row mt-4">
                  <div className="col-md-4">
                    <div className="text-center">
                      <div
                        className="h5 text-success mb-1 cursor-pointer"
                        onClick={() => setShowCompletedTasks(true)}
                        style={{ cursor: "pointer" }}
                        title="Click to view completed tasks"
                      >
                        {overallCompletion}%
                      </div>
                      <small className="text-muted">Completion Rate</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <div className="h5 text-info mb-1">{activeProjects}</div>
                      <small className="text-muted">Active Projects</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <div className="h5 text-warning mb-1">
                        {tasks.filter((t) => t.status === "in_progress").length}
                      </div>
                      <small className="text-muted">In Progress</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Projects and Teams */}
      <div className="row mb-4">
        <div className="col-lg-8 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="fas fa-project-diagram me-2 text-primary"></i>
                  Recent Projects
                </h5>
                <div className="d-flex align-items-center">
                  <a
                    href="/projects"
                    className="btn btn-sm btn-outline-primary"
                  >
                    View All
                  </a>
                </div>
              </div>
            </div>
            <div className="card-body">
              {projects.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-folder-open fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No projects found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Project Name</th>
                        <th>Team</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.slice(0, 5).map((project) => (
                        <tr
                          key={project._id}
                          className="hover:bg-light"
                          style={{ transition: "background-color 0.2s ease" }}
                        >
                          <td className="py-3">
                            <div className="fw-medium">{project.name}</div>
                            <small
                              className="text-muted text-truncate d-block"
                              style={{ maxWidth: "200px" }}
                              title={project.description}
                            >
                              {project.description}
                            </small>
                          </td>
                          <td className="py-3">
                            <span className="badge bg-light text-dark">
                              {project.teamId?.name || "Unassigned"}
                            </span>
                          </td>
                          <td className="py-3">
                            <span
                              className={`badge bg-${getProjectStatusColor(project.status)}`}
                            >
                              {project.status}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="d-flex align-items-center">
                              <div
                                className="progress me-2"
                                style={{ width: "60px", height: "6px" }}
                              >
                                <div
                                  className="progress-bar bg-success"
                                  style={{
                                    width: `${project.completionPercentage || 0}%`,
                                  }}
                                ></div>
                              </div>
                              <small className="text-muted">
                                {project.completionPercentage || 0}%
                              </small>
                            </div>
                          </td>
                          <td className="py-3">
                            <small className="text-muted">
                              {project.endDate
                                ? new Date(project.endDate).toLocaleDateString()
                                : "No deadline"}
                            </small>
                          </td>
                        </tr>
                      ))}
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
                  <i className="fas fa-users me-2 text-info"></i>
                  Teams Overview
                </h5>
                <div className="d-flex align-items-center">
                  <a href="/teams" className="btn btn-sm btn-outline-info">
                    View All
                  </a>
                </div>
              </div>
            </div>
            <div className="card-body">
              {teams.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-users fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No teams found</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {teams.slice(0, 6).map((team) => (
                    <div
                      key={team._id}
                      className="list-group-item border-0 px-0"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-medium">{team.name}</div>
                          <small className="text-muted">
                            {team.department}
                          </small>
                        </div>
                        <div className="text-end">
                          <div className="badge bg-primary rounded-pill">
                            {team.members?.length || 0} members
                          </div>
                          <div>
                            <small className="text-muted">
                              Lead: {team.teamLead?.firstName}{" "}
                              {team.teamLead?.lastName}
                            </small>
                          </div>
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

      {/* Calendar Integration */}
      <div className="row">
        <div className="col-12">
          <TaskCalendar showDeadlineNotifications={true} height="500px" />
        </div>
      </div>

      {/* Completed Tasks Modal */}
      <div
        className={`modal fade ${showCompletedTasks ? "show" : ""}`}
        style={{ display: showCompletedTasks ? "block" : "none" }}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="fas fa-check-circle me-2 text-success"></i>
                Completed Tasks ({completedTasks})
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowCompletedTasks(false)}
              ></button>
            </div>
            <div className="modal-body">
              {tasks.filter((t) => t.status === "completed").length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-check-circle fa-3x text-muted mb-3"></i>
                  <h5>No Completed Tasks</h5>
                  <p className="text-muted">
                    No tasks have been completed yet.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Project</th>
                        <th>Assigned To</th>
                        <th>Completed Date</th>
                        <th>Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks
                        .filter((t) => t.status === "completed")
                        .map((task) => (
                          <tr key={task._id}>
                            <td>
                              <div className="fw-medium">{task.title}</div>
                              {task.description && (
                                <small className="text-muted">
                                  {task.description.substring(0, 100)}...
                                </small>
                              )}
                            </td>
                            <td>
                              <span className="badge bg-light text-dark">
                                {projects.find((p) => p._id === task.projectId)
                                  ?.name || "No project"}
                              </span>
                            </td>
                            <td>
                              {task.assignedTo
                                ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
                                : "Unassigned"}
                            </td>
                            <td>
                              {task.completedDate
                                ? new Date(
                                    task.completedDate
                                  ).toLocaleDateString()
                                : new Date(task.updatedAt).toLocaleDateString()}
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  task.priority === "high"
                                    ? "bg-danger"
                                    : task.priority === "medium"
                                      ? "bg-warning"
                                      : task.priority === "low"
                                        ? "bg-info"
                                        : "bg-secondary"
                                }`}
                              >
                                {task.priority}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCompletedTasks(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pulse Animation Test - Temporary for testing */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-pulse me-2 text-primary"></i>
                Pulse Animation Test
              </h5>
            </div>
            <div className="card-body">
              <PulseTest />
            </div>
          </div>
        </div>
      </div>

      {showCompletedTasks && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default MDDashboard;
