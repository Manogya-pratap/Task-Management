import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useApp } from "../../contexts/AppContext";
import LoadingSpinner from "../LoadingSpinner";
import ErrorBoundary from "../ErrorBoundary";

const TeamProjects = () => {
  const { user } = useAuth();
  const { projects, teams, loading, errors, fetchProjects, fetchTeams } =
    useApp();
  const [teamProjects, setTeamProjects] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    // Fetch teams and projects if not already loaded
    // Use a ref to prevent infinite loops
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        if (!teams.length) await fetchTeams();
        if (!projects.length) await fetchProjects();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    // Filter projects based on user's team
    const filterTeamProjects = () => {
      if (!user || !teams.length || !projects.length) {
        setTeamProjects([]);
        return;
      }

      let userTeams = [];

      if (user.role === "team_lead") {
        // For team leads, get teams they lead
        userTeams = teams.filter(
          (team) =>
            team.teamLead?._id === user._id || team.teamLead === user._id
        );
      } else {
        // For other roles, get teams they belong to
        userTeams = teams.filter((team) =>
          team.assignedMembers?.some((member) => member._id === user._id)
        );
      }

      // Get projects for user's teams
      const teamProjectIds = userTeams.map((team) => team._id);
      const filteredProjects = projects.filter((project) =>
        teamProjectIds.includes(project.teamId?._id || project.teamId)
      );

      setTeamProjects(filteredProjects);
    };

    filterTeamProjects();
  }, [user, teams, projects]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "active":
        return "bg-success";
      case "on_hold":
        return "bg-warning";
      case "completed":
        return "bg-primary";
      case "cancelled":
        return "bg-danger";
      default:
        return "bg-secondary";
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case "high":
        return "bg-danger";
      case "medium":
        return "bg-warning";
      case "low":
        return "bg-info";
      default:
        return "bg-secondary";
    }
  };

  const filteredProjects = teamProjects.filter((project) => {
    if (filter === "all") return true;
    return project.status === filter;
  });

  const getProjectStats = () => {
    const stats = {
      total: teamProjects.length,
      active: teamProjects.filter((p) => p.status === "In Progress").length,
      completed: teamProjects.filter((p) => p.status === "Completed").length,
      on_hold: teamProjects.filter((p) => p.status === "Not Started").length,
      cancelled: teamProjects.filter((p) => p.status === "cancelled").length,
    };
    return stats;
  };

  const stats = getProjectStats();

  if (loading.global || loading.projects || loading.teams) {
    return <LoadingSpinner text="Loading team projects..." />;
  }

  if (errors.global || errors.projects || errors.teams) {
    const errorMessage = errors.global || errors.projects || errors.teams;
    return (
      <div className="alert alert-danger" role="alert">
        <i className="fas fa-exclamation-triangle me-2"></i>
        {errorMessage}
        <button
          className="btn btn-outline-danger btn-sm ms-3"
          onClick={() => {
            fetchProjects(true);
            fetchTeams(true);
          }}
        >
          <i className="fas fa-redo me-1"></i>
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4">
              <div className="mb-3 mb-sm-0">
                <h2 className="mb-1">
                  <i className="fas fa-project-diagram me-2 text-primary"></i>
                  Team Projects
                </h2>
                <p className="text-muted mb-0">
                  All projects for your team ({teamProjects.length} total)
                </p>
              </div>
              <div className="d-flex flex-column flex-sm-row gap-2">
                <select
                  className="form-select form-select-sm"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  style={{ minWidth: "150px" }}
                >
                  <option value="all">All Projects</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => {
                    fetchProjects(true);
                    fetchTeams(true);
                  }}
                  title="Refresh projects"
                >
                  <i className="fas fa-sync-alt me-1"></i>
                  <span className="d-none d-sm-inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Project Statistics */}
            <div className="row mb-4">
              <div className="col-xl-2 col-lg-3 col-md-4 col-6 mb-3">
                <div className="card text-center h-100">
                  <div className="card-body py-3">
                    <div className="text-primary fw-bold fs-4">
                      {stats.total}
                    </div>
                    <small className="text-muted">Total</small>
                  </div>
                </div>
              </div>
              <div className="col-xl-2 col-lg-3 col-md-4 col-6 mb-3">
                <div className="card text-center h-100">
                  <div className="card-body py-3">
                    <div className="text-success fw-bold fs-4">
                      {stats.active}
                    </div>
                    <small className="text-muted">Active</small>
                  </div>
                </div>
              </div>
              <div className="col-xl-2 col-lg-3 col-md-4 col-6 mb-3">
                <div className="card text-center h-100">
                  <div className="card-body py-3">
                    <div className="text-info fw-bold fs-4">
                      {stats.completed}
                    </div>
                    <small className="text-muted">Completed</small>
                  </div>
                </div>
              </div>
              <div className="col-xl-2 col-lg-3 col-md-4 col-6 mb-3">
                <div className="card text-center h-100">
                  <div className="card-body py-3">
                    <div className="text-warning fw-bold fs-4">
                      {stats.on_hold}
                    </div>
                    <small className="text-muted">On Hold</small>
                  </div>
                </div>
              </div>
              <div className="col-xl-2 col-lg-3 col-md-4 col-6 mb-3">
                <div className="card text-center h-100">
                  <div className="card-body py-3">
                    <div className="text-danger fw-bold fs-4">
                      {stats.cancelled}
                    </div>
                    <small className="text-muted">Cancelled</small>
                  </div>
                </div>
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="text-center py-5">
                <i className="fas fa-project-diagram fa-3x text-muted mb-3"></i>
                <h4 className="text-muted">No Projects Found</h4>
                <p className="text-muted">
                  {filter === "all"
                    ? "Your team doesn't have any projects yet."
                    : `No ${filter.replace("_", " ")} projects found.`}
                </p>
              </div>
            ) : (
              <div className="row">
                {filteredProjects.map((project) => (
                  <div
                    key={project._id}
                    className="col-12 col-md-6 col-lg-4 col-xl-3 mb-4"
                  >
                    <div className="card h-100 shadow-sm">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <h6 className="card-title mb-0 text-truncate flex-grow-1 me-2">
                          {project.name}
                        </h6>
                        <span
                          className={`badge ${getStatusBadgeClass(project.status)} flex-shrink-0`}
                        >
                          {project.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="card-body">
                        <p className="card-text text-muted small mb-3">
                          {project.description || "No description available"}
                        </p>

                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <small className="text-muted">Progress</small>
                            <small className="text-muted">
                              {project.stats?.completionPercentage || 0}%
                            </small>
                          </div>
                          <div className="progress" style={{ height: "6px" }}>
                            <div
                              className="progress-bar bg-success"
                              style={{
                                width: `${project.stats?.completionPercentage || 0}%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        <div className="row text-center mb-3">
                          <div className="col-4">
                            <div className="text-primary fw-bold">
                              {project.stats?.taskCount || 0}
                            </div>
                            <small className="text-muted">Tasks</small>
                          </div>
                          <div className="col-4">
                            <div className="text-info fw-bold">
                              {project.assignedMembers?.length || 0}
                            </div>
                            <small className="text-muted">Members</small>
                          </div>
                          <div className="col-4">
                            <div className="text-warning fw-bold">
                              {project.priority && (
                                <span
                                  className={`badge ${getPriorityBadgeClass(project.priority)}`}
                                >
                                  {project.priority}
                                </span>
                              )}
                            </div>
                            <small className="text-muted">Priority</small>
                          </div>
                        </div>

                        <div className="mb-2">
                          <small className="text-muted">
                            <i className="fas fa-calendar me-1"></i>
                            Due:{" "}
                            {project.endDate
                              ? new Date(project.endDate).toLocaleDateString()
                              : "No due date"}
                          </small>
                        </div>

                        <div className="mb-2">
                          <small className="text-muted">
                            <i className="fas fa-user me-1"></i>
                            Created by: {project.createdBy?.firstName}{" "}
                            {project.createdBy?.lastName}
                          </small>
                        </div>

                        {/* Team members */}
                        {project.assignedMembers &&
                          project.assignedMembers.length > 0 && (
                            <div className="mb-2">
                              <small className="text-muted d-block mb-1">
                                <i className="fas fa-users me-1"></i>
                                Team Members:
                              </small>
                              <div className="d-flex flex-wrap gap-1">
                                {project.assignedMembers
                                  .slice(0, 3)
                                  .map((member, index) => (
                                    <span
                                      key={index}
                                      className="badge bg-light text-dark"
                                    >
                                      {member.firstName} {member.lastName}
                                    </span>
                                  ))}
                                {project.assignedMembers.length > 3 && (
                                  <span className="badge bg-secondary">
                                    +{project.assignedMembers.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                      </div>

                      <div className="card-footer bg-transparent">
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            {user.role === "team_lead" ? "Manage" : "View"}
                          </small>
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() =>
                                (window.location.href = `/projects/${project._id}`)
                              }
                              title="View project details"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() =>
                                (window.location.href = `/projects/${project._id}/tasks`)
                              }
                              title="View project tasks"
                            >
                              <i className="fas fa-tasks"></i>
                            </button>
                            {user.role === "team_lead" && (
                              <button
                                className="btn btn-outline-warning btn-sm"
                                onClick={() =>
                                  (window.location.href = `/projects/${project._id}/edit`)
                                }
                                title="Edit project"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                            )}
                          </div>
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
    </ErrorBoundary>
  );
};

export default TeamProjects;
