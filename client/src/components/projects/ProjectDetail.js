import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Button, Badge, ProgressBar, Spinner, Alert, Tab, Tabs } from "react-bootstrap";
import { useApp } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import moment from "moment";

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useApp();
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Debug logging
  console.log('🔍 ProjectDetail component mounted');
  console.log('📋 Project ID from params:', projectId);
  console.log('👤 Current user:', user);

  useEffect(() => {
    console.log('🔄 useEffect triggered for projectId:', projectId);
    fetchProjectDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching project details for ID:', projectId);

      // Fetch project details
      const projectResponse = await api.get(`/projects/${projectId}`);
      const projectData = projectResponse.data.data?.project || projectResponse.data.project;
      setProject(projectData);

      console.log('Project data received:', projectData);

      // Fetch project tasks
      const tasksResponse = await api.get(`/tasks?projectId=${projectId}`);
      const tasksData = tasksResponse.data.data?.tasks || tasksResponse.data.tasks || [];
      setTasks(tasksData);

      console.log('Tasks data received:', tasksData);

    } catch (err) {
      console.error("Error fetching project details:", err);
      setError(err.response?.data?.message || "Failed to load project details");
      
      if (err.response?.status === 404) {
        addNotification({
          type: "error",
          message: "Project not found",
        });
        navigate("/projects");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      draft: "secondary",
      planning: "info", 
      active: "primary",
      completed: "success",
      on_hold: "warning",
      cancelled: "danger",
    };
    return statusColors[status] || "secondary";
  };

  const getPriorityBadge = (priority) => {
    const priorityColors = {
      low: "info",
      medium: "warning", 
      high: "danger",
      urgent: "dark",
    };
    return priorityColors[priority] || "secondary";
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

  const calculateProgress = () => {
    if (!tasks || tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.status === "completed").length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const canEditProject = () => {
    return user?.role === "managing_director" || 
           user?.role === "it_admin" || 
           user?.role === "team_lead" ||
           project?.createdBy?._id === user?._id;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading project details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Project</Alert.Heading>
        <p>{error}</p>
        <Button variant="outline-danger" onClick={() => navigate("/projects")}>
          Back to Projects
        </Button>
      </Alert>
    );
  }

  if (!project) {
    return (
      <Alert variant="warning">
        <Alert.Heading>Project Not Found</Alert.Heading>
        <p>The requested project could not be found.</p>
        <Button variant="outline-warning" onClick={() => navigate("/projects")}>
          Back to Projects
        </Button>
      </Alert>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="project-detail">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={() => navigate("/projects")}
            className="mb-2"
          >
            <i className="fas fa-arrow-left me-2"></i>
            Back to Projects
          </Button>
          <h2 className="mb-0">
            <i className="fas fa-project-diagram me-2 text-primary"></i>
            {project.name}
          </h2>
          <p className="text-muted mb-0">{project.description}</p>
        </div>
        <div className="text-end">
          {canEditProject() && (
            <Button 
              variant="primary" 
              onClick={() => navigate("/projects")}
              className="me-2"
            >
              <i className="fas fa-edit me-2"></i>
              Edit Project
            </Button>
          )}
          <Badge bg={getStatusBadge(project.status)} className="fs-6">
            {project.status?.replace("_", " ").toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Project Overview Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <Card className="text-center h-100">
            <Card.Body>
              <i className="fas fa-tasks fa-2x text-primary mb-3"></i>
              <h4 className="text-primary">{tasks.length}</h4>
              <p className="mb-0">Total Tasks</p>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="text-center h-100">
            <Card.Body>
              <i className="fas fa-check-circle fa-2x text-success mb-3"></i>
              <h4 className="text-success">{tasks.filter(t => t.status === "completed").length}</h4>
              <p className="mb-0">Completed</p>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="text-center h-100">
            <Card.Body>
              <i className="fas fa-clock fa-2x text-warning mb-3"></i>
              <h4 className="text-warning">{tasks.filter(t => t.status === "in_progress").length}</h4>
              <p className="mb-0">In Progress</p>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="text-center h-100">
            <Card.Body>
              <i className="fas fa-chart-line fa-2x text-info mb-3"></i>
              <h4 className="text-info">{progress}%</h4>
              <p className="mb-0">Progress</p>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
        <Tab eventKey="overview" title="Overview">
          <div className="row">
            <div className="col-md-8">
              {/* Project Details */}
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">
                    <i className="fas fa-info-circle me-2"></i>
                    Project Information
                  </h5>
                </Card.Header>
                <Card.Body>
                  <div className="row">
                    <div className="col-md-6">
                      <p><strong>Status:</strong> 
                        <Badge bg={getStatusBadge(project.status)} className="ms-2">
                          {project.status?.replace("_", " ")}
                        </Badge>
                      </p>
                      <p><strong>Priority:</strong> 
                        <Badge bg={getPriorityBadge(project.priority)} className="ms-2">
                          {project.priority}
                        </Badge>
                      </p>
                      <p><strong>Team:</strong> {project.teamId?.name || "No team assigned"}</p>
                      <p><strong>Created By:</strong> {project.createdBy?.firstName} {project.createdBy?.lastName}</p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Start Date:</strong> {project.startDate ? moment(project.startDate).format("MMM DD, YYYY") : "Not set"}</p>
                      <p><strong>End Date:</strong> {project.endDate ? moment(project.endDate).format("MMM DD, YYYY") : "Not set"}</p>
                      <p><strong>Budget:</strong> {project.budget ? `$${project.budget.toLocaleString()}` : "Not set"}</p>
                      <p><strong>Members:</strong> {project.assignedMembers?.length || 0}</p>
                    </div>
                  </div>
                  
                  {project.tags && project.tags.length > 0 && (
                    <div className="mt-3">
                      <strong>Tags:</strong>
                      <div className="mt-2">
                        {project.tags.map((tag, index) => (
                          <Badge key={index} bg="light" text="dark" className="me-2">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Progress */}
              <Card>
                <Card.Header>
                  <h5 className="mb-0">
                    <i className="fas fa-chart-bar me-2"></i>
                    Progress Overview
                  </h5>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span>Overall Progress</span>
                      <span className="fw-bold">{progress}%</span>
                    </div>
                    <ProgressBar 
                      now={progress} 
                      variant={progress === 100 ? "success" : progress > 50 ? "info" : "warning"}
                      style={{ height: "10px" }}
                    />
                  </div>
                  
                  <div className="row text-center">
                    <div className="col-3">
                      <div className="text-muted small">New</div>
                      <div className="fw-bold">{tasks.filter(t => t.status === "new").length}</div>
                    </div>
                    <div className="col-3">
                      <div className="text-muted small">In Progress</div>
                      <div className="fw-bold text-warning">{tasks.filter(t => t.status === "in_progress").length}</div>
                    </div>
                    <div className="col-3">
                      <div className="text-muted small">Completed</div>
                      <div className="fw-bold text-success">{tasks.filter(t => t.status === "completed").length}</div>
                    </div>
                    <div className="col-3">
                      <div className="text-muted small">Total</div>
                      <div className="fw-bold">{tasks.length}</div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>

            <div className="col-md-4">
              {/* Team Members */}
              <Card>
                <Card.Header>
                  <h5 className="mb-0">
                    <i className="fas fa-users me-2"></i>
                    Team Members
                  </h5>
                </Card.Header>
                <Card.Body>
                  {project.assignedMembers && project.assignedMembers.length > 0 ? (
                    <div className="list-group list-group-flush">
                      {project.assignedMembers.map((member, index) => (
                        <div key={index} className="list-group-item border-0 px-0">
                          <div className="d-flex align-items-center">
                            <div 
                              className="avatar-circle me-3"
                              style={{
                                width: "40px",
                                height: "40px", 
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #800020 0%, #A0002A 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: "bold",
                                fontSize: "14px"
                              }}
                            >
                              {member.firstName?.[0]}{member.lastName?.[0]}
                            </div>
                            <div>
                              <div className="fw-medium">{member.firstName} {member.lastName}</div>
                              <small className="text-muted text-capitalize">{member.role?.replace("_", " ")}</small>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No team members assigned</p>
                  )}
                </Card.Body>
              </Card>
            </div>
          </div>
        </Tab>

        <Tab eventKey="tasks" title={`Tasks (${tasks.length})`}>
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-tasks me-2"></i>
                  Project Tasks
                </h5>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => navigate(`/tasks/create?projectId=${projectId}`)}
                >
                  <i className="fas fa-plus me-2"></i>
                  Add Task
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {tasks.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Assigned To</th>
                        <th>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => (
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
                            <Badge bg={getTaskStatusColor(task.status)}>
                              {task.status?.replace("_", " ")}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={getPriorityBadge(task.priority)}>
                              {task.priority}
                            </Badge>
                          </td>
                          <td>
                            {task.assignedTo ? 
                              `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 
                              "Unassigned"
                            }
                          </td>
                          <td>
                            {task.dueDate ? 
                              moment(task.dueDate).format("MMM DD, YYYY") : 
                              "No deadline"
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-tasks fa-3x text-muted mb-3"></i>
                  <h5>No Tasks Yet</h5>
                  <p className="text-muted">No tasks have been created for this project.</p>
                  <Button 
                    variant="primary" 
                    onClick={() => navigate(`/tasks/create?projectId=${projectId}`)}
                  >
                    <i className="fas fa-plus me-2"></i>
                    Create First Task
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
};

export default ProjectDetail;