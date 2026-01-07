import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Modal, Form, Row, Col, Badge, Alert, Spinner } from 'react-bootstrap';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const UserManagement = () => {
  const { users, teams, fetchUsers, fetchTeams } = useApp();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    role: '',
    department: '',
    teamId: '',
    phone: '',
    isActive: true
  });

  const roles = [
    { value: 'employee', label: 'Employee' },
    { value: 'team_lead', label: 'Team Lead' },
    { value: 'it_admin', label: 'IT Admin' },
    { value: 'managing_director', label: 'Managing Director' }
  ];

  const departments = [
    'IT Development',
    'Human Resources', 
    'Finance',
    'Marketing',
    'Operations',
    'Sales'
  ];

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, [fetchUsers, fetchTeams]);

  const handleShowModal = (userToEdit = null) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        firstName: userToEdit.firstName || '',
        lastName: userToEdit.lastName || '',
        email: userToEdit.email || '',
        username: userToEdit.username || '',
        password: '',
        role: userToEdit.role || '',
        department: userToEdit.department || '',
        teamId: userToEdit.teamId?._id || '',
        phone: userToEdit.phone || '',
        isActive: userToEdit.isActive !== false
      });
    } else {
      setEditingUser(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        role: '',
        department: '',
        teamId: '',
        phone: '',
        isActive: true
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
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData = { ...formData };
      if (editingUser && !submitData.password) {
        delete submitData.password; // Don't update password if not provided
      }

      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, submitData);
        setSuccess('User updated successfully!');
      } else {
        await api.post('/users', submitData);
        setSuccess('User created successfully!');
      }
      
      await fetchUsers();
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    setLoading(true);
    try {
      await api.delete(`/users/${userId}`);
      await fetchUsers();
      setSuccess('User deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const canManageUsers = user?.role === 'managing_director' || user?.role === 'it_admin';

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'managing_director': return 'danger';
      case 'it_admin': return 'warning';
      case 'team_lead': return 'info';
      case 'employee': return 'secondary';
      default: return 'secondary';
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
                {users.map(userItem => (
                  <tr key={userItem._id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="avatar-circle me-2">
                          {userItem.firstName?.[0]}{userItem.lastName?.[0]}
                        </div>
                        <div>
                          <strong>{userItem.firstName} {userItem.lastName}</strong>
                          <div className="text-muted small">@{userItem.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>{userItem.email}</td>
                    <td>
                      <Badge bg={getRoleBadgeColor(userItem.role)}>
                        {userItem.role?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg="info">{userItem.department || 'Not assigned'}</Badge>
                    </td>
                    <td>
                      {userItem.teamId ? (
                        <span>{userItem.teamId.name}</span>
                      ) : (
                        <span className="text-muted">No team</span>
                      )}
                    </td>
                    <td>
                      <Badge bg={userItem.isActive ? 'success' : 'danger'}>
                        {userItem.isActive ? 'Active' : 'Inactive'}
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
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(userItem._id)}
                          disabled={userItem._id === user._id}
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={canManageUsers ? 7 : 6} className="text-center py-4">
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
            {editingUser ? 'Edit User' : 'Add New User'}
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
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Password {editingUser ? '(leave blank to keep current)' : '*'}
                  </Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingUser}
                    placeholder="Enter password"
                  />
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
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Department</Form.Label>
                  <Form.Select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </Form.Select>
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
                    {teams.map(team => (
                      <option key={team._id} value={team._id}>
                        {team.name} ({team.department})
                      </option>
                    ))}
                  </Form.Select>
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
            <Button 
              variant="primary" 
              type="submit" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {editingUser ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingUser ? 'Update User' : 'Create User'
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