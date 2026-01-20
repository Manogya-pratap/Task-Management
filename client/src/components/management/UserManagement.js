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

const UserManagement = () => {
  const { users, teams, fetchUsers, fetchTeams } = useApp();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    role: "",
    department: "",
    teamId: null, // Changed from null to null explicitly
    phone: "",
    isActive: true,
  });

  const roles = [
    { value: "employee", label: "Employee" },
    { value: "team_lead", label: "Team Lead" },
    { value: "it_admin", label: "IT Admin" },
    { value: "managing_director", label: "Managing Director" },
  ];

  // Fetch departments from the API
  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      const deptData = response.data.data?.departments || response.data.data || response.data;
      setDepartments(deptData || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Fallback to hardcoded departments if API fails
      setDepartments([
        { _id: 'it', dept_name: 'IT Development' },
        { _id: 'hr', dept_name: 'Human Resources' },
        { _id: 'finance', dept_name: 'Finance' },
        { _id: 'marketing', dept_name: 'Marketing' },
        { _id: 'operations', dept_name: 'Operations' },
        { _id: 'sales', dept_name: 'Sales' },
      ]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTeams();
    fetchDepartments();
  }, [fetchUsers, fetchTeams]);

  const handleShowModal = (userToEdit = null) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        firstName: userToEdit.firstName || "",
        lastName: userToEdit.lastName || "",
        email: userToEdit.email || "",
        username: userToEdit.username || "",
        password: "",
        role: userToEdit.role || "",
        department: userToEdit.department || "",
        teamId: userToEdit.teamId?._id || null, // Ensure null instead of empty string
        phone: userToEdit.phone || "",
        isActive: userToEdit.isActive !== false,
      });
    } else {
      setEditingUser(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        password: "",
        role: "",
        department: "",
        teamId: null, // Ensure null instead of empty string
        phone: "",
        isActive: true,
      });
    }
    setShowModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setError(null);
    setSuccess(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let processedValue = value;
    
    // Handle teamId specifically - convert empty string to null
    if (name === 'teamId') {
      processedValue = value === '' ? null : value;
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : processedValue,
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const validateForm = () => {
    const errors = [];
    
    // Password validation for new users
    if (!editingUser && formData.password) {
      if (formData.password.length < 6) {
        errors.push('Password must be at least 6 characters long');
      }
      if (!/(?=.*[a-z])/.test(formData.password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      if (!/(?=.*[A-Z])/.test(formData.password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      if (!/(?=.*\d)/.test(formData.password)) {
        errors.push('Password must contain at least one number');
      }
    }
    
    // Username validation
    if (formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }
    
    // Department validation for employee roles
    if (formData.role === 'employee' || formData.role === 'team_lead') {
      if (!formData.department || formData.department.trim() === '') {
        errors.push('Department is required for employees and team leads');
      }
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Client-side validation
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(`Validation failed: ${validationErrors.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      const submitData = { ...formData };
      if (editingUser && !submitData.password) {
        delete submitData.password; // Don't update password if not provided
      }

      // Handle empty teamId - convert empty string to null
      if (submitData.teamId === '' || submitData.teamId === 'null') {
        submitData.teamId = null;
      }

      // Remove empty phone field if not provided
      if (submitData.phone === '') {
        delete submitData.phone;
      }

      console.log('Submitting user data:', {
        ...submitData,
        password: submitData.password ? '[HIDDEN]' : 'Not provided'
      });

      if (editingUser) {
        await api.patch(`/users/${editingUser._id}`, submitData);
        setSuccess("User updated successfully!");
      } else {
        const response = await api.post("/users", submitData);
        console.log('User creation response:', response.data);
        setSuccess("User created successfully!");
      }

      await fetchUsers();
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    } catch (err) {
      console.error('User creation/update error:', err.response?.data);
      
      // Show detailed validation errors if available
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorMessages = err.response.data.errors.map(error => error.msg).join(', ');
        setError(`Validation failed: ${errorMessages}`);
      } else {
        setError(err.response?.data?.message || "Failed to save user");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to deactivate this user? They can be reactivated later.")) return;

    setLoading(true);
    try {
      await api.delete(`/users/${userId}`);

      // Force refresh with a slight delay to ensure backend processes the deletion
      setTimeout(async () => {
        await fetchUsers(true); // Force refresh
      }, 100);

      setSuccess("User deactivated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to deactivate user");
      setTimeout(() => setError(null), 3000);
      // Refresh users even on error to ensure UI consistency
      fetchUsers(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async (userId) => {
    if (!window.confirm("⚠️ WARNING: This will PERMANENTLY delete the user and all their data. This action CANNOT be undone!\n\nAre you absolutely sure?")) return;

    setLoading(true);
    try {
      await api.delete(`/users/${userId}/permanent`);

      // Force refresh with a slight delay to ensure backend processes the deletion
      setTimeout(async () => {
        await fetchUsers(true); // Force refresh
      }, 100);

      setSuccess("User permanently deleted!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete user permanently");
      setTimeout(() => setError(null), 3000);
      // Refresh users even on error to ensure UI consistency
      fetchUsers(true);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (userId) => {
    if (!window.confirm("Are you sure you want to reactivate this user?")) return;

    setLoading(true);
    try {
      await api.patch(`/users/${userId}/reactivate`);

      // Force refresh with a slight delay to ensure backend processes the reactivation
      setTimeout(async () => {
        await fetchUsers(true); // Force refresh
      }, 100);

      setSuccess("User reactivated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reactivate user");
      setTimeout(() => setError(null), 3000);
      // Refresh users even on error to ensure UI consistency
      fetchUsers(true);
    } finally {
      setLoading(false);
    }
  };

  const canManageUsers =
    user?.role === "managing_director" || user?.role === "it_admin";

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "managing_director":
        return "danger";
      case "it_admin":
        return "warning";
      case "team_lead":
        return "info";
      case "employee":
        return "secondary";
      default:
        return "secondary";
    }
  };

  return (
    <div className="user-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="fas fa-user-cog me-2 text-primary"></i>
          User Management
        </h2>
        {canManageUsers && (
          <Button
            variant="primary"
            onClick={() => handleShowModal()}
            disabled={loading}
          >
            <i className="fas fa-user-plus me-2"></i>
            Add New User
          </Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card>
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-users me-2"></i>
            Users Overview
          </h5>
        </Card.Header>
        <Card.Body>
          {loading && !showModal ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2">Loading users...</p>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Team</th>
                  <th>Status</th>
                  {canManageUsers && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((userItem) => (
                  <tr key={userItem._id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="avatar-circle me-2">
                          {userItem.firstName?.[0]}
                          {userItem.lastName?.[0]}
                        </div>
                        <div>
                          <strong>
                            {userItem.firstName} {userItem.lastName}
                          </strong>
                          <div className="text-muted small">
                            @{userItem.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{userItem.email}</td>
                    <td>
                      <Badge bg={getRoleBadgeColor(userItem.role)}>
                        {userItem.role?.replace("_", " ").toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg="info">
                        {userItem.department || "Not assigned"}
                      </Badge>
                    </td>
                    <td>
                      {userItem.teamId ? (
                        <span>{userItem.teamId.name}</span>
                      ) : (
                        <span className="text-muted">No team</span>
                      )}
                    </td>
                    <td>
                      <Badge bg={userItem.isActive ? "success" : "danger"}>
                        {userItem.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    {canManageUsers && (
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleShowModal(userItem)}
                        >
                          <i className="fas fa-edit"></i>
                        </Button>
                        {userItem.isActive ? (
                          <>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="me-2"
                              onClick={() => handleDelete(userItem._id)}
                              title="Deactivate user (can be reactivated)"
                            >
                              <i className="fas fa-ban"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handlePermanentDelete(userItem._id)}
                              title="Delete permanently (cannot be undone)"
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-2"
                              onClick={() => handleReactivate(userItem._id)}
                              title="Reactivate user"
                            >
                              <i className="fas fa-undo"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handlePermanentDelete(userItem._id)}
                              title="Delete permanently (cannot be undone)"
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={canManageUsers ? 7 : 6}
                      className="text-center py-4"
                    >
                      <i className="fas fa-users fa-3x text-muted mb-3"></i>
                      <p className="text-muted">No users found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit User Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingUser ? "Edit User" : "Add New User"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>First Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter first name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Last Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter last name"
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
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter email address"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Username *</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter username"
                    isInvalid={formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)}
                  />
                  <Form.Control.Feedback type="invalid">
                    Username can only contain letters, numbers, and underscores
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Password{" "}
                    {editingUser ? "(leave blank to keep current)" : "*"}
                  </Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingUser}
                    placeholder="Enter password"
                    isInvalid={!editingUser && formData.password && (
                      formData.password.length < 6 ||
                      !/(?=.*[a-z])/.test(formData.password) ||
                      !/(?=.*[A-Z])/.test(formData.password) ||
                      !/(?=.*\d)/.test(formData.password)
                    )}
                  />
                  {!editingUser && (
                    <Form.Text className="text-muted">
                      Password must be at least 6 characters with uppercase, lowercase, and number
                    </Form.Text>
                  )}
                  <Form.Control.Feedback type="invalid">
                    Password must be at least 6 characters with uppercase, lowercase, and number
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role *</Form.Label>
                  <Form.Select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Role</option>
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Department {(formData.role === 'employee' || formData.role === 'team_lead') && '*'}</Form.Label>
                  <Form.Select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required={formData.role === 'employee' || formData.role === 'team_lead'}
                    isInvalid={(formData.role === 'employee' || formData.role === 'team_lead') && !formData.department}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept.dept_name || dept.name}>
                        {dept.dept_name || dept.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    Department is required for employees and team leads
                  </Form.Control.Feedback>
                  {(formData.role === 'managing_director' || formData.role === 'it_admin') && (
                    <Form.Text className="text-muted">
                      Department is optional for admin roles
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Team</Form.Label>
                  <Form.Select
                    name="teamId"
                    value={formData.teamId || ""}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Team</option>
                    {teams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name} ({team.department})
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Team assignment is optional
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    label="Active User"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {editingUser ? "Updating..." : "Creating..."}
                </>
              ) : editingUser ? (
                "Update User"
              ) : (
                "Create User"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <style>{`
        .avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default UserManagement;
