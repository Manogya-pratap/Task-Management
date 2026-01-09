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
} from "react-bootstrap";
import { useApp } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";

const TeamManagement = () => {
  const { teams, users, fetchTeams, fetchUsers } = useApp();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    department: "",
    description: "",
    teamLeadId: "", // Changed from teamLead to match backend validation
    members: [],
  });

  const departments = [
    "IT Development",
    "Human Resources",
    "Finance",
    "Marketing",
    "Operations",
    "Sales",
  ];

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, [fetchTeams, fetchUsers]);

  const handleShowModal = (team = null) => {
    if (team) {
      setEditingTeam(team);
      setFormData({
        name: team.name || "",
        department: team.department || "",
        description: team.description || "",
        teamLeadId: team.teamLead?._id || "",
        members: team.members?.map((m) => m._id) || [],
      });
    } else {
      setEditingTeam(null);
      setFormData({
        name: "",
        department: "",
        description: "",
        teamLeadId: "",
        members: [],
      });
    }
    setShowModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTeam(null);
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
      members: checked
        ? [...prev.members, value]
        : prev.members.filter((id) => id !== value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (editingTeam) {
        await api.patch(`/teams/${editingTeam._id}`, formData);
        setSuccess("Team updated successfully!");
      } else {
        await api.post("/teams", formData);
        setSuccess("Team created successfully!");
      }

      await fetchTeams();
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save team");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teamId) => {
    if (!window.confirm("Are you sure you want to delete this team?")) return;

    setLoading(true);
    try {
      await api.delete(`/teams/${teamId}`);
      await fetchTeams();
      setSuccess("Team deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete team");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const canManageTeams =
    user?.role === "managing_director" || user?.role === "it_admin";

  return (
    <div className="team-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="fas fa-users me-2 text-primary"></i>
          Team Management
        </h2>
        {canManageTeams && (
          <Button
            variant="primary"
            onClick={() => handleShowModal()}
            disabled={loading}
          >
            <i className="fas fa-plus me-2"></i>
            Add New Team
          </Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card>
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-list me-2"></i>
            Teams Overview
          </h5>
        </Card.Header>
        <Card.Body>
          {loading && !showModal ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2">Loading teams...</p>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Team Name</th>
                  <th>Department</th>
                  <th>Team Lead</th>
                  <th>Members</th>
                  <th>Status</th>
                  {canManageTeams && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team._id}>
                    <td>
                      <strong>{team.name}</strong>
                      {team.description && (
                        <div className="text-muted small">
                          {team.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge bg="info">{team.department}</Badge>
                    </td>
                    <td>
                      {team.teamLead ? (
                        <div>
                          <i className="fas fa-user-tie me-1"></i>
                          {team.teamLead.firstName} {team.teamLead.lastName}
                        </div>
                      ) : (
                        <span className="text-muted">No lead assigned</span>
                      )}
                    </td>
                    <td>
                      <Badge bg="secondary">
                        {team.members?.length || 0} members
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={team.isActive ? "success" : "danger"}>
                        {team.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    {canManageTeams && (
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleShowModal(team)}
                        >
                          <i className="fas fa-edit"></i>
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(team._id)}
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {teams.length === 0 && (
                  <tr>
                    <td
                      colSpan={canManageTeams ? 6 : 5}
                      className="text-center py-4"
                    >
                      <i className="fas fa-users fa-3x text-muted mb-3"></i>
                      <p className="text-muted">No teams found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Team Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingTeam ? "Edit Team" : "Add New Team"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Team Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter team name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Department *</Form.Label>
                  <Form.Select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter team description"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Team Lead</Form.Label>
              <Form.Select
                name="teamLeadId"
                value={formData.teamLeadId}
                onChange={handleInputChange}
              >
                <option value="">Select Team Lead</option>
                {users
                  .filter(
                    (u) =>
                      u.role === "team_lead" || u.role === "managing_director"
                  )
                  .map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.firstName} {user.lastName} ({user.role})
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Team Members</Form.Label>
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
                    checked={formData.members.includes(user._id)}
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
                  {editingTeam ? "Updating..." : "Creating..."}
                </>
              ) : editingTeam ? (
                "Update Team"
              ) : (
                "Create Team"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default TeamManagement;
