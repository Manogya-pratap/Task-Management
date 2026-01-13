import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useApp } from "../../contexts/AppContext";
import api from "../../services/api";
import TaskCalendar from "../calendar/TaskCalendar";
import TaskBoard from "../TaskBoard";
import { ComponentLoader } from "../LoadingSpinner";
import { Modal, Button, Form, Alert, Row, Col } from "react-bootstrap";

const TeamLeadDashboard = () => {
  const { user, getUserFullName } = useAuth();
  const { projects, tasks, teams, users, loading, errors, fetchAllData } =
    useApp();

  // Coordinated loading state
  const [isDashboardReady, setIsDashboardReady] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Add Member Modal state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState("");
  const [addMemberSuccess, setAddMemberSuccess] = useState("");

  // Create Employee Modal state
  const [showCreateEmployeeModal, setShowCreateEmployeeModal] = useState(false);
  const [createEmployeeData, setCreateEmployeeData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    department: "",
    phone: "",
    role: "employee",
  });
  const [createEmployeeLoading, setCreateEmployeeLoading] = useState(false);
  const [createEmployeeError, setCreateEmployeeError] = useState("");
  const [createEmployeeSuccess, setCreateEmployeeSuccess] = useState("");

  useEffect(() => {
    // Fetch all data when component mounts (without force to respect caching)
    fetchAllData();

    // Safety timeout - show dashboard after 10 seconds even if still loading
    const timeoutId = setTimeout(() => {
      console.log(
        "TeamLeadDashboard - Loading timeout reached, showing dashboard"
      );
      setLoadingTimeout(true);
    }, 10000);

    // Add event listener for Create Employee modal trigger from sidebar
    const handleOpenCreateEmployeeModal = () => {
      handleShowCreateEmployeeModal();
    };

    window.addEventListener(
      "openCreateEmployeeModal",
      handleOpenCreateEmployeeModal
    );

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener(
        "openCreateEmployeeModal",
        handleOpenCreateEmployeeModal
      );
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if all required data is loaded
  useEffect(() => {
    const isLoading =
      loading.global ||
      loading.projects ||
      loading.tasks ||
      loading.teams ||
      loading.users;

    // Once loaded, don't hide dashboard again for subsequent loads
    if (!isLoading && !hasLoadedOnce) {
      setHasLoadedOnce(true);
      setIsDashboardReady(true);
    } else if (hasLoadedOnce) {
      // Keep dashboard visible once it has loaded at least once
      setIsDashboardReady(true);
    }
  }, [loading, hasLoadedOnce]);

  // Get user's team
  const myTeam = user ? teams.find((team) => team._id === user.teamId) : null;
  const teamMembers = user ? users.filter((u) => u.teamId === user.teamId) : [];

  // Modal handlers
  const handleShowAddMemberModal = () => {
    setShowAddMemberModal(true);
    setSelectedUserId("");
    setAddMemberError("");
    setAddMemberSuccess("");
  };

  const handleCloseAddMemberModal = () => {
    setShowAddMemberModal(false);
    setSelectedUserId("");
    setAddMemberError("");
    setAddMemberSuccess("");
  };

  const handleAddMember = async (e) => {
    e.preventDefault();

    if (!selectedUserId || !myTeam) {
      setAddMemberError("Please select a user to add");
      return;
    }

    setAddMemberLoading(true);
    setAddMemberError("");
    setAddMemberSuccess("");

    try {
      // Add the new member to the team's assignedMembers array
      const updatedMembers = [...teamMembers, selectedUserId];

      const response = await api.patch(`/teams/${myTeam._id}`, {
        assignedMembers: updatedMembers,
      });

      if (response.data.success) {
        setAddMemberSuccess("Team member added successfully!");

        // Refresh team data
        setTimeout(() => {
          fetchAllData();
          handleCloseAddMemberModal();
        }, 1500);
      } else {
        setAddMemberError(response.data.message || "Failed to add team member");
      }
    } catch (error) {
      console.error("Error adding team member:", error);
      setAddMemberError(
        error.response?.data?.message || "Failed to add team member"
      );
    } finally {
      setAddMemberLoading(false);
    }
  };

  // Filter available users (employees not already in team)
  const availableUsers = user
    ? users.filter(
        (u) =>
          u.role === "employee" &&
          u.status === "active" &&
          u.teamId !== user.teamId
      )
    : [];

  // Create Employee handlers
  const handleShowCreateEmployeeModal = () => {
    setShowCreateEmployeeModal(true);
    setCreateEmployeeData({
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      password: "",
      department: user?.department || "",
      phone: "",
      role: "employee",
    });
    setCreateEmployeeError("");
    setCreateEmployeeSuccess("");
  };

  const handleCloseCreateEmployeeModal = () => {
    setShowCreateEmployeeModal(false);
    setCreateEmployeeError("");
    setCreateEmployeeSuccess("");
  };

  const handleCreateEmployeeChange = (e) => {
    const { name, value } = e.target;
    setCreateEmployeeData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();

    if (
      !createEmployeeData.firstName ||
      !createEmployeeData.lastName ||
      !createEmployeeData.email
    ) {
      setCreateEmployeeError("Please fill in all required fields");
      return;
    }

    // Check if user exists and has team assignment
    if (!user || !user.teamId) {
      setCreateEmployeeError(
        user
          ? "You must be assigned to a team to create employees"
          : "User data not loaded. Please refresh the page."
      );
      return;
    }

    setCreateEmployeeLoading(true);
    setCreateEmployeeError("");
    setCreateEmployeeSuccess("");

    try {
      const response = await api.post("/users", {
        ...createEmployeeData,
        teamId: user.teamId, // Assign to team lead's team
      });

      if (response.data.success) {
        setCreateEmployeeSuccess(
          "Employee created and added to team successfully!"
        );

        // Refresh data
        setTimeout(() => {
          fetchAllData();
          handleCloseCreateEmployeeModal();
        }, 1500);
      } else {
        setCreateEmployeeError(
          response.data.message || "Failed to create employee"
        );
      }
    } catch (error) {
      console.error("Error creating employee:", error);
      setCreateEmployeeError(
        error.response?.data?.message || "Failed to create employee"
      );
    } finally {
      setCreateEmployeeLoading(false);
    }
  };

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

  // Show coordinated loading state until all data is ready
  if (!isDashboardReady) {
    return <ComponentLoader text="Loading team dashboard..." />;
  }

  // Show error state if there are critical errors
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
  const userTeam = user ? teams.find((team) => team._id === user.teamId) : null;
  const teamProjects = user
    ? projects.filter((p) => p.teamId === user.teamId)
    : [];
  const teamTasks = user
    ? tasks.filter(
        (t) =>
          teamMembers.some((member) => member._id === t.assignedTo?._id) ||
          teamProjects.some((project) => project._id === t.projectId?._id)
      )
    : [];

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
    <div className={`team-lead-dashboard ${isDashboardReady ? "fade-in" : ""}`}>
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
                    Team Lead - {user?.department || "General"} Department
                    Dashboard
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
                <div className="d-flex gap-2">
                  <a href="/my-team" className="btn btn-sm btn-outline-primary">
                    Manage Team
                  </a>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleShowAddMemberModal}
                  >
                    <i className="fas fa-user-plus me-1"></i>
                    Add Member
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleShowCreateEmployeeModal}
                  >
                    <i className="fas fa-user-plus me-1"></i>
                    Create Employee
                  </Button>
                </div>
              </div>
            </div>
            <div className="card-body">
              {tasksByMember.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-users fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No team members found</p>
                  <div className="d-flex gap-2 justify-content-center">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={handleShowAddMemberModal}
                    >
                      <i className="fas fa-user-plus me-1"></i>
                      Add Your First Team Member
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleShowCreateEmployeeModal}
                    >
                      <i className="fas fa-user-plus me-1"></i>
                      Create New Employee
                    </Button>
                  </div>
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

      {/* Add Member Modal */}
      <Modal
        show={showAddMemberModal}
        onHide={handleCloseAddMemberModal}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-user-plus me-2"></i>
            Add Team Member
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {addMemberError && (
            <Alert
              variant="danger"
              dismissible
              onClose={() => setAddMemberError("")}
            >
              {addMemberError}
            </Alert>
          )}

          {addMemberSuccess && (
            <Alert
              variant="success"
              dismissible
              onClose={() => setAddMemberSuccess("")}
            >
              {addMemberSuccess}
            </Alert>
          )}

          <Form onSubmit={handleAddMember}>
            <Form.Group className="mb-3">
              <Form.Label>Select Employee to Add</Form.Label>
              <Form.Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                disabled={addMemberLoading}
              >
                <option value="">Choose an employee...</option>
                {availableUsers.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.firstName} {user.lastName} - {user.email}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Only active employees not already in your team are shown.
              </Form.Text>
            </Form.Group>

            <div className="d-flex gap-2">
              <Button
                type="submit"
                variant="success"
                disabled={addMemberLoading || !selectedUserId}
              >
                {addMemberLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus me-1"></i>
                    Add Member
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={handleCloseAddMemberModal}
                disabled={addMemberLoading}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Create Employee Modal */}
      <Modal
        show={showCreateEmployeeModal}
        onHide={handleCloseCreateEmployeeModal}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-user-plus me-2"></i>
            Create New Employee
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createEmployeeError && (
            <Alert
              variant="danger"
              dismissible
              onClose={() => setCreateEmployeeError("")}
            >
              {createEmployeeError}
            </Alert>
          )}

          {createEmployeeSuccess && (
            <Alert
              variant="success"
              dismissible
              onClose={() => setCreateEmployeeSuccess("")}
            >
              {createEmployeeSuccess}
            </Alert>
          )}

          <Form onSubmit={handleCreateEmployee}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>First Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="firstName"
                    value={createEmployeeData.firstName}
                    onChange={handleCreateEmployeeChange}
                    required
                    disabled={createEmployeeLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Last Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="lastName"
                    value={createEmployeeData.lastName}
                    onChange={handleCreateEmployeeChange}
                    required
                    disabled={createEmployeeLoading}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email *</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={createEmployeeData.email}
                    onChange={handleCreateEmployeeChange}
                    required
                    disabled={createEmployeeLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    value={createEmployeeData.phone}
                    onChange={handleCreateEmployeeChange}
                    disabled={createEmployeeLoading}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={createEmployeeData.username}
                    onChange={handleCreateEmployeeChange}
                    disabled={createEmployeeLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={createEmployeeData.password}
                    onChange={handleCreateEmployeeChange}
                    disabled={createEmployeeLoading}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Department</Form.Label>
                  <Form.Control
                    type="text"
                    name="department"
                    value={createEmployeeData.department}
                    onChange={handleCreateEmployeeChange}
                    disabled={createEmployeeLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role</Form.Label>
                  <Form.Select
                    name="role"
                    value={createEmployeeData.role}
                    onChange={handleCreateEmployeeChange}
                    disabled={createEmployeeLoading}
                  >
                    <option value="employee">Employee</option>
                    <option value="team_lead">Team Lead</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Text className="text-muted mb-3">
              New employee will be automatically assigned to your team:{" "}
              {myTeam?.name}
            </Form.Text>

            <div className="d-flex gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={
                  createEmployeeLoading ||
                  !createEmployeeData.firstName ||
                  !createEmployeeData.lastName ||
                  !createEmployeeData.email
                }
              >
                {createEmployeeLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus me-1"></i>
                    Create Employee
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={handleCloseCreateEmployeeModal}
                disabled={createEmployeeLoading}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default TeamLeadDashboard;
