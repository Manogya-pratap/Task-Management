import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Badge,
  Button,
  Table,
  Spinner,
  Modal,
  Form,
  Alert,
} from "react-bootstrap";
import { useAuth } from "../../contexts/AuthContext";
import { useApp } from "../../contexts/AppContext";
import api from "../../services/api";

const MyTeam = () => {
  const { user } = useAuth();
  const { teams, users, loading, errors, fetchTeams, fetchUsers } = useApp();
  const [myTeam, setMyTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [error, setError] = useState("");

  // Add Member Modal State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState("");
  const [addMemberSuccess, setAddMemberSuccess] = useState("");

  // Create Employee Modal State
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
    const fetchMyTeam = async () => {
      setLoadingTeam(true);
      setError("");

      try {
        // For team leads, find teams they lead
        if (user?.role === "team_lead") {
          const ledTeams = teams.filter(
            (team) =>
              team.teamLead?._id === user._id || team.teamLead === user._id
          );

          if (ledTeams.length > 0) {
            // Use the first team they lead
            const team = ledTeams[0];
            setMyTeam(team);

            // Get team members from the assignedMembers array
            const members = team.assignedMembers || [];
            setTeamMembers(members);
          } else {
            // If no team led, check if they're a member of any team
            const memberTeam = teams.find((team) =>
              team.assignedMembers?.some((member) => member._id === user._id)
            );
            setMyTeam(memberTeam || null);
            setTeamMembers(memberTeam?.assignedMembers || []);
          }
        } else {
          // For other roles, find the team they belong to
          const userTeam = teams.find((team) =>
            team.assignedMembers?.some((member) => member._id === user._id)
          );
          setMyTeam(userTeam || null);
          setTeamMembers(userTeam?.assignedMembers || []);
        }
      } catch (error) {
        console.error("Error fetching team data:", error);
        setError("Failed to load team information");
      } finally {
        setLoadingTeam(false);
      }
    };

    if (user && teams.length > 0) {
      fetchMyTeam();
    }
  }, [user, teams]);

  useEffect(() => {
    // Fetch teams and users if not already loaded
    if (!teams.length) fetchTeams();
    if (!users.length) fetchUsers();
  }, [fetchTeams, fetchUsers, teams.length, users.length]);

  // Functions for adding team members
  const handleShowAddMemberModal = async () => {
    if (!myTeam) return;

    try {
      // Get users who are not already in the team
      const teamMemberIds = teamMembers.map((member) => member._id);
      const available = users.filter(
        (user) =>
          !teamMemberIds.includes(user._id) &&
          user.isActive &&
          user.role === "employee"
      );
      setAvailableUsers(available);
      setShowAddMemberModal(true);
      setSelectedUserId("");
      setAddMemberError("");
      setAddMemberSuccess("");
    } catch (error) {
      console.error("Error loading available users:", error);
      setAddMemberError("Failed to load available users");
    }
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
          fetchTeams(true);
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

  // Create Employee handlers
  const handleShowCreateEmployeeModal = () => {
    setShowCreateEmployeeModal(true);
    setCreateEmployeeData({
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      password: "",
      department: user.department || "",
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

    // Check if user has team assignment
    if (!user.teamId) {
      setCreateEmployeeError(
        "You must be assigned to a team to create employees"
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
          fetchTeams(true);
          fetchUsers(true);
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

  const getRoleBadgeColor = (role) => {
    const colors = {
      managing_director: "danger",
      it_admin: "warning",
      team_lead: "primary",
      employee: "secondary",
    };
    return colors[role] || "secondary";
  };

  const getStatusBadgeColor = (isActive) => {
    return isActive ? "success" : "secondary";
  };

  if (loading.global || loadingTeam) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading team information...</p>
      </div>
    );
  }

  if (error || errors.global || errors.teams) {
    const errorMessage = error || errors.global || errors.teams;
    return (
      <div className="alert alert-danger" role="alert">
        <h5 className="alert-heading">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Error Loading Team
        </h5>
        <p>{errorMessage}</p>
        <Button variant="outline-danger" onClick={() => fetchTeams(true)}>
          <i className="fas fa-redo me-2"></i>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="my-team">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="fas fa-users me-2 text-primary"></i>
          My Team
        </h2>
        <div className="d-flex gap-2">
          {myTeam && user?.role === "team_lead" && (
            <Button
              variant="success"
              size="sm"
              onClick={handleShowAddMemberModal}
            >
              <i className="fas fa-user-plus me-2"></i>
              Add Member
            </Button>
          )}
          {myTeam && (
            <Button variant="outline-primary" size="sm">
              <i className="fas fa-edit me-2"></i>
              Edit Team
            </Button>
          )}
        </div>
      </div>

      {!myTeam ? (
        <Card className="text-center py-5">
          <Card.Body>
            <div className="mb-4">
              <i className="fas fa-users fa-3x text-muted"></i>
            </div>
            <h4 className="text-muted mb-3">No Team Assigned</h4>
            <p className="text-muted">
              You are not currently assigned to any team. Please contact your
              administrator.
            </p>
          </Card.Body>
        </Card>
      ) : (
        <>
          {/* Team Overview */}
          <Card className="mb-4 border-0 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <i className="fas fa-info-circle me-2"></i>
                Team Overview
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h6 className="text-muted">Team Name</h6>
                  <p className="fw-bold">{myTeam.name}</p>
                </Col>
                <Col md={6}>
                  <h6 className="text-muted">Department</h6>
                  <p className="fw-bold">
                    {myTeam.department || "Not specified"}
                  </p>
                </Col>
                <Col md={6}>
                  <h6 className="text-muted">Team Lead</h6>
                  <p className="fw-bold">
                    {typeof myTeam.teamLead === "object"
                      ? `${myTeam.teamLead.firstName} ${myTeam.teamLead.lastName}`
                      : users.find((u) => u._id === myTeam.teamLead)
                          ?.firstName +
                          " " +
                          users.find((u) => u._id === myTeam.teamLead)
                            ?.lastName || "Not assigned"}
                  </p>
                </Col>
                <Col md={6}>
                  <h6 className="text-muted">Total Members</h6>
                  <p className="fw-bold">{teamMembers.length}</p>
                </Col>
              </Row>
              {myTeam.description && (
                <Row className="mt-3">
                  <Col md={12}>
                    <h6 className="text-muted">Description</h6>
                    <p>{myTeam.description}</p>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>

          {/* Team Members */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-user-friends me-2"></i>
                Team Members ({teamMembers.length})
              </h5>
              {user?.role === "team_lead" && (
                <div className="d-flex gap-2">
                  <Button
                    variant="light"
                    size="sm"
                    onClick={handleShowAddMemberModal}
                  >
                    <i className="fas fa-user-plus me-2"></i>
                    Add Employee
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleShowCreateEmployeeModal}
                  >
                    <i className="fas fa-user-plus me-2"></i>
                    Create Employee
                  </Button>
                </div>
              )}
            </Card.Header>
            <Card.Body>
              {teamMembers.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-user-slash fa-2x text-muted mb-3"></i>
                  <p className="text-muted">No team members found</p>
                  {user?.role === "team_lead" && (
                    <div className="d-flex gap-2 justify-content-center">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={handleShowAddMemberModal}
                      >
                        <i className="fas fa-user-plus me-2"></i>
                        Add Your First Employee
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleShowCreateEmployeeModal}
                      >
                        <i className="fas fa-user-plus me-2"></i>
                        Create New Employee
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((member) => (
                      <tr key={member._id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div
                              className="rounded-circle me-2 d-flex align-items-center justify-content-center"
                              style={{
                                width: "32px",
                                height: "32px",
                                background:
                                  "linear-gradient(135deg, #800020 0%, #A0002A 100%)",
                                color: "white",
                                fontSize: "0.8rem",
                                fontWeight: "bold",
                              }}
                            >
                              {member.firstName?.[0]}
                              {member.lastName?.[0]}
                            </div>
                            <div>
                              <div className="fw-bold">
                                {member.firstName} {member.lastName}
                              </div>
                              <small className="text-muted">
                                {member.department || "No department"}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>{member.email}</td>
                        <td>
                          <Badge bg={getRoleBadgeColor(member.role)}>
                            {member.role?.replace("_", " ")}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={getStatusBadgeColor(member.isActive)}>
                            {member.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-1"
                            title="View Profile"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          {user?.role === "managing_director" ||
                          user?.role === "it_admin" ||
                          (user?.role === "team_lead" &&
                            member._id !== user._id) ? (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              title="Edit Member"
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      {/* Add Member Modal */}
      <Modal show={showAddMemberModal} onHide={handleCloseAddMemberModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-user-plus me-2"></i>
            Add Team Member
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {addMemberSuccess && (
            <Alert variant="success" className="mb-3">
              {addMemberSuccess}
            </Alert>
          )}

          {addMemberError && (
            <Alert variant="danger" className="mb-3">
              {addMemberError}
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

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={handleCloseAddMemberModal}
                disabled={addMemberLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="success"
                disabled={addMemberLoading || !selectedUserId}
              >
                {addMemberLoading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      className="me-2"
                    />
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus me-1"></i>
                    Add Member
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Create Employee Modal */}
      <Modal
        show={showCreateEmployeeModal}
        onHide={handleCloseCreateEmployeeModal}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-user-plus me-2"></i>
            Create New Employee
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createEmployeeSuccess && (
            <Alert variant="success" className="mb-3">
              {createEmployeeSuccess}
            </Alert>
          )}

          {createEmployeeError && (
            <Alert variant="danger" className="mb-3">
              {createEmployeeError}
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

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={handleCloseCreateEmployeeModal}
                disabled={createEmployeeLoading}
              >
                Cancel
              </Button>
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
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      className="me-2"
                    />
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus me-1"></i>
                    Create Employee
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default MyTeam;
