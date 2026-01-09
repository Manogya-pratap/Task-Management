import React, { useState, useEffect } from "react";
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
    status: "planning",
    priority: "medium",
    startDate: "",
    endDate: "",
    budget: "",
    teamId: null,
    assignedMembers: [],
    tags: "",
  });

  const projectStatuses = [
    { value: "planning", label: "Planning", color: "secondary" },
    { value: "active", label: "Active", color: "primary" },
    { value: "on_hold", label: "On Hold", color: "warning" },
    { value: "completed", label: "Completed", color: "success" },
    { value: "cancelled", label: "Cancelled", color: "danger" },
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
        status: project.status || "planning",
        priority: project.priority || "medium",
        startDate: project.startDate
          ? moment(project.startDate).format("YYYY-MM-DD")
          : "",
        endDate: project.endDate
          ? moment(project.endDate).format("YYYY-MM-DD")
          : "",
        budget: project.budget || "",
        teamId: project.teamId?._id || null,
        assignedMembers: project.assignedMembers?.map((m) => m._id) || [],
        tags: project.tags?.join(", ") || "",
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: "",
        description: "",
        status: "planning",
        priority: "medium",
        startDate: "",
        endDate: "",
        budget: "",
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
      const submitData = {
        ...formData,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
      };

      console.log("Form submitted with data:", submitData);
      console.log("Editing project:", editingProject);

      if (editingProject) {
        console.log("Updating project:", editingProject._id, submitData);
        await api.patch(`/projects/${editingProject._id}`, submitData);
        setSuccess("Project updated successfully!");
        // Force refresh to ensure UI updates
        setTimeout(async () => {
          console.log("Force refreshing projects after update");
          await fetchProjects(true);
        }, 100);
      } else {
        await api.post("/projects", submitData);
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
      setError(err.response?.data?.message || "Failed to save project");
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
    if (!project.tasks || project.tasks.length === 0) return 0;
    const completedTasks = project.tasks.filter(
      (task) => task.status === "completed"
    ).length;
    return Math.round((completedTasks / project.tasks.length) * 100);
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
          <h5 className="mb-0">
            <i className="fas fa-list me-2"></i>
            Projects Overview
          </h5>
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
                  <th>Project Name</th>
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
                          <strong>{project.name}</strong>
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
                                : progress > 50
                                  ? "info"
                                  : "warning"
                            }
                          />
                          <small className="text-muted">
                            {project.tasks?.length || 0} tasks
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
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleShowModal(project)}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(project._id)}
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
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
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                  />
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
