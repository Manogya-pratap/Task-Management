import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Row,
  Col,
  Badge,
  Alert,
  Spinner,
  ProgressBar,
} from "react-bootstrap";
import { useApp } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import moment from "moment";

const ProjectManagement = () => {
  const navigate = useNavigate();
  const { projects, teams, users, fetchProjects, fetchTeams, fetchUsers } =
    useApp();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Draft",  // Use proper status value
    priority: "medium",
    startDate: "",
    endDate: "",
    budget: "",
    progress: 0,  // Add progress field
    teamId: null,
    assignedMembers: [],
    tags: "",
  });

  const projectStatuses = [
    { value: "Draft", label: "Draft", color: "secondary" },
    { value: "Planning", label: "Planning", color: "info" },
    { value: "Designing", label: "Designing", color: "warning" },
    { value: "Not Started", label: "Not Started", color: "light" },
    { value: "In Progress", label: "In Progress", color: "primary" },
    { value: "Completed", label: "Completed", color: "success" },
  ];

  const priorities = [
    { value: "low", label: "Low", color: "info" },
    { value: "medium", label: "Medium", color: "warning" },
    { value: "high", label: "High", color: "danger" },
    { value: "urgent", label: "Urgent", color: "dark" },
  ];

  useEffect(() => {
    fetchProjects();
    fetchTeams();
    fetchUsers();
  }, [fetchProjects, fetchTeams, fetchUsers]);

  const handleShowModal = (project = null) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name || "",
        description: project.description || "",
        status: project.status || "Draft",
        priority: project.priority || "medium",
        startDate: project.startDate
          ? moment(project.startDate).format("YYYY-MM-DD")
          : "",
        endDate: project.endDate
          ? moment(project.endDate).format("YYYY-MM-DD")
          : "",
        budget: project.budget || "",
        progress: project.progress || 0,  // Add progress field
        teamId: project.teamId?._id || null,
        assignedMembers: project.assignedMembers?.map((m) => m._id) || [],
        tags: project.tags?.join(", ") || "",
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: "",
        description: "",
        status: "Draft",  // Use proper status value
        priority: "medium",
        startDate: "",
        endDate: "",
        budget: "",
        progress: 0,  // Add progress field
        teamId: null,
        assignedMembers: [],
        tags: "",
      });
    }
    setShowModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProject(null);
    setError(null);
    setSuccess(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMemberChange = (e) => {
    const { value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      assignedMembers: checked
        ? [...prev.assignedMembers, value]
        : prev.assignedMembers.filter((id) => id !== value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 🔥 NORMALIZE PAYLOAD TO MATCH BACKEND EXPECTATIONS
      const submitData = {
        name: formData.name,
        description: formData.description,
        status: formData.status,           // Frontend status (Draft, Not Started, In Progress, Completed)
        priority: formData.priority,
        startDate: formData.startDate,     // Keep camelCase for validation middleware
        endDate: formData.endDate,         // Keep camelCase for validation middleware
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        progress: formData.progress ? parseInt(formData.progress) : 0,  // Add progress field
        teamId: formData.teamId || null,
        assignedMembers: formData.assignedMembers.filter(id => id !== null && id !== undefined && id !== ''),
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
      };

      console.log("Form submitted with normalized data:", submitData);
      console.log("Editing project:", editingProject);

      if (editingProject) {
        console.log("Updating project:", editingProject._id, submitData);
        const response = await api.patch(`/projects/${editingProject._id}`, submitData);
        console.log("Project update response:", response.data);
        setSuccess("Project updated successfully!");
        // Force refresh to ensure UI updates
        setTimeout(async () => {
          console.log("Force refreshing projects after update");
          await fetchProjects(true);
        }, 100);
      } else {
        console.log("Creating new project with payload:", submitData);
        const response = await api.post("/projects", submitData);
        console.log("Project creation response:", response.data);
        setSuccess("Project created successfully!");
      }

      console.log("Calling fetchProjects after operation");
      await fetchProjects();
      setTimeout(() => {
        console.log("Closing modal");
        handleCloseModal();
      }, 1500);
    } catch (err) {
      console.error("Error saving project:", err);
      console.error("Error response:", err.response?.data);
      
      // Show detailed error message
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error ||
                          "Failed to save project";
      setError(errorMessage);
      
      // If validation errors, show them
      if (err.response?.data?.errors) {
        const validationErrors = err.response.data.errors.map(e => e.msg).join(", ");
        setError(`Validation errors: ${validationErrors}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?"))
      return;

    setLoading(true);
    try {
      await api.delete(`/projects/${projectId}`);
      await fetchProjects();
      setSuccess("Project deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete project");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusObj = projectStatuses.find((s) => s.value === status);
    return statusObj || { label: status, color: "secondary" };
  };

  const getPriorityBadge = (priority) => {
    const priorityObj = priorities.find((p) => p.value === priority);
    return priorityObj || { label: priority, color: "secondary" };
  };

  const calculateProgress = (project) => {
    // Multi-factor progress calculation
    let progress = 0;
    
    // 1. Status-based base progress
    const statusProgress = {
      "Draft": 0,
      "Planning": 10,
      "Designing": 20,
      "Not Started": 5,
      "In Progress": 30,
      "Completed": 100
    };
    
    progress = statusProgress[project.status] || 0;
    
    // 2. Task-based progress (if tasks exist)
    if (project.tasks && project.tasks.length > 0) {
      const completedTasks = project.tasks.filter(
        (task) => task.status === "completed" || task.status === "Completed"
      ).length;
      const taskProgress = Math.round((completedTasks / project.tasks.length) * 100);
      
      // Use the higher of status-based or task-based progress
      progress = Math.max(progress, taskProgress);
    }
    
    // 3. Use manual progress if set (from project.progress field)
    if (project.progress && project.progress > 0) {
      progress = Math.max(progress, project.progress);
    }
    
    // 4. Use completionPercentage if available
    if (project.completionPercentage && project.completionPercentage > 0) {
      progress = Math.max(progress, project.completionPercentage);
    }
    
    // 5. Timeline-based progress (optional enhancement)
    if (project.startDate && project.endDate && project.status === "In Progress") {
      const now = new Date();
      const start = new Date(project.startDate);
      const end = new Date(project.endDate);
      
      if (now >= start && now <= end) {
        const totalDuration = end - start;
        const elapsed = now - start;
        const timelineProgress = Math.round((elapsed / totalDuration) * 100);
        
        // Don't let timeline progress exceed task/manual progress by too much
        const maxTimelineProgress = Math.min(timelineProgress, progress + 20);
        progress = Math.max(progress, maxTimelineProgress);
      }
    }
    
    // Ensure progress is within bounds
    return Math.min(Math.max(progress, 0), 100);
  };

  const canManageProjects =
    user?.role === "managing_director" ||
    user?.role === "it_admin" ||
    user?.role === "team_lead";

  return (
    <div className="project-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="fas fa-project-diagram me-2 text-primary"></i>
          Project Management
        </h2>
        {canManageProjects && (
          <Button
            variant="primary"
            onClick={() => handleShowModal()}
            disabled={loading}
          >
            <i className="fas fa-plus me-2"></i>
            Add New Project
          </Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Projects Overview
              </h5>
              <small className="text-muted">
                <i className="fas fa-info-circle me-1"></i>
                Click on project names to view detailed information
              </small>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          {loading && !showModal ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2">Loading projects...</p>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>
                    Project Name 
                    <small className="text-muted ms-1">
                      <i className="fas fa-mouse-pointer" title="Click project names to view details"></i>
                    </small>
                  </th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Progress</th>
                  <th>Team</th>
                  <th>Timeline</th>
                  {canManageProjects && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const statusBadge = getStatusBadge(project.status);
                  const priorityBadge = getPriorityBadge(project.priority);
                  const progress = calculateProgress(project);

                  return (
                    <tr key={project._id}>
                      <td>
                        <div>
                          <strong 
                            className="text-primary fw-bold clickable-project-name" 
                            style={{ 
                              cursor: "pointer",
                              textDecoration: "underline",
                              fontSize: "1.1em",
                              transition: "all 0.2s ease-in-out"
                            }}
                            onClick={() => {
                              console.log('🔍 Project name clicked:', project.name, 'ID:', project._id);
                              console.log('🚀 Navigating to:', `/projects/${project._id}`);
                              navigate(`/projects/${project._id}`);
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.color = "#0056b3";
                              e.target.style.backgroundColor = "rgba(13, 110, 253, 0.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.color = "#0d6efd";
                              e.target.style.backgroundColor = "transparent";
                            }}
                            title="Click to view project details"
                          >
                            {project.name}
                          </strong>
                          {project.description && (
                            <div className="text-muted small">
                              {project.description.substring(0, 100)}...
                            </div>
                          )}
                          {project.tags && project.tags.length > 0 && (
                            <div className="mt-1">
                              {project.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  bg="light"
                                  text="dark"
                                  className="me-1 small"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge bg={statusBadge.color}>
                          {statusBadge.label}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={priorityBadge.color}>
                          {priorityBadge.label}
                        </Badge>
                      </td>
                      <td>
                        <div style={{ minWidth: "100px" }}>
                          <ProgressBar
                            now={progress}
                            label={`${progress}%`}
                            variant={
                              progress === 100
                                ? "success"
                                : progress >= 75
                                  ? "info"
                                  : progress >= 50
                                    ? "primary"
                                    : progress >= 25
                                      ? "warning"
                                      : "danger"
                            }
                            style={{ height: "20px" }}
                          />
                          <small className="text-muted d-flex justify-content-between mt-1">
                            <span>{project.tasks?.length || 0} tasks</span>
                            <span>
                              {project.tasks?.filter(t => t.status === "completed" || t.status === "Completed").length || 0} completed
                            </span>
                          </small>
                        </div>
                      </td>
                      <td>
                        {project.teamId ? (
                          <div>
                            <i className="fas fa-users me-1"></i>
                            {project.teamId.name}
                            <div className="text-muted small">
                              {project.assignedMembers?.length || 0} members
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">No team assigned</span>
                        )}
                      </td>
                      <td>
                        <div className="small">
                          {project.startDate && (
                            <div>
                              <i className="fas fa-play me-1 text-success"></i>
                              {moment(project.startDate).format("MMM DD, YYYY")}
                            </div>
                          )}
                          {project.endDate && (
                            <div>
                              <i className="fas fa-flag me-1 text-danger"></i>
                              {moment(project.endDate).format("MMM DD, YYYY")}
                            </div>
                          )}
                        </div>
                      </td>
                      {canManageProjects && (
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="primary"
                              size="sm"
                              className="me-1"
                              onClick={() => navigate(`/projects/${project._id}`)}
                              title="View project details"
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-1"
                              onClick={() => handleShowModal(project)}
                              title="Edit project"
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(project._id)}
                              title="Delete project"
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {projects.length === 0 && (
                  <tr>
                    <td
                      colSpan={canManageProjects ? 7 : 6}
                      className="text-center py-4"
                    >
                      <i className="fas fa-project-diagram fa-3x text-muted mb-3"></i>
                      <p className="text-muted">No projects found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Project Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingProject ? "Edit Project" : "Add New Project"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Form.Group className="mb-3">
              <Form.Label>Project Name *</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter project name"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter project description"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status *</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                  >
                    {projectStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Priority *</Form.Label>
                  <Form.Select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    required
                  >
                    {priorities.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Start Date {formData.status !== "draft" && "*"}
                  </Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required={formData.status !== "draft"}
                  />
                  {formData.status === "draft" && (
                    <Form.Text className="text-muted">
                      Optional for draft projects
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    End Date {formData.status !== "draft" && "*"}
                  </Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required={formData.status !== "draft"}
                  />
                  {formData.status === "draft" && (
                    <Form.Text className="text-muted">
                      Optional for draft projects
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Budget</Form.Label>
                  <Form.Control
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleInputChange}
                    placeholder="Enter budget amount"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Manual Progress (%)</Form.Label>
                  <Form.Control
                    type="number"
                    name="progress"
                    value={formData.progress}
                    onChange={handleInputChange}
                    placeholder="0-100"
                    min="0"
                    max="100"
                  />
                  <Form.Text className="text-muted">
                    Override automatic progress calculation (0-100%)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Team</Form.Label>
                  <Form.Select
                    name="teamId"
                    value={formData.teamId}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Team</option>
                    {teams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name} ({team.department})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                {/* Space for future fields */}
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Tags (comma separated)</Form.Label>
              <Form.Control
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="e.g., web, mobile, urgent"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Assigned Members</Form.Label>
              <div
                className="border rounded p-3"
                style={{ maxHeight: "200px", overflowY: "auto" }}
              >
                {users.map((user) => (
                  <Form.Check
                    key={user._id}
                    type="checkbox"
                    id={`member-${user._id}`}
                    label={`${user.firstName} ${user.lastName} (${user.role})`}
                    value={user._id}
                    checked={formData.assignedMembers.includes(user._id)}
                    onChange={handleMemberChange}
                  />
                ))}
              </div>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {editingProject ? "Updating..." : "Creating..."}
                </>
              ) : editingProject ? (
                "Update Project"
              ) : (
                "Create Project"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectManagement;
