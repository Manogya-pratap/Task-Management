import React, { useEffect, useState } from "react";
import { Card, Row, Col, Badge, Button, Table, Modal, Form, Alert } from "react-bootstrap";
import { useAuth } from "../../contexts/AuthContext";
import { useApp } from "../../contexts/AppContext";
import { useLazyDashboard } from "../../hooks/useLazyDashboard";
import AnimatedProgressBar from "../shared/AnimatedProgressBar";
import { ComponentLoader } from "../LoadingSpinner";
import userService from "../../services/userService";
import departmentService from "../../services/departmentService";
import projectService from "../../services/projectService";
import taskService from "../../services/taskService";

const ITAdminDashboard = () => {
  const { user, getUserFullName } = useAuth();
  const { addNotification } = useApp();
  const { projects, tasks, teams, loadingStatus, initializeDashboard } = useLazyDashboard();

  // State for admin functions
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // User form state
  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    role: "employee",
    department: "",
    password: ""
  });

  // Department form state
  const [deptForm, setDeptForm] = useState({
    name: "",
    description: ""
  });

  useEffect(() => {
    initializeDashboard();
    loadAdminData();
  }, [initializeDashboard]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [usersRes, deptsRes] = await Promise.all([
        userService.getAllUsers(),
        departmentService.getAllDepartments()
      ]);
      
      // Fix: The API returns data in data.data.users and data.data.departments
      setUsers(usersRes.data?.data?.users || usersRes.data?.users || []);
      setDepartments(deptsRes.data?.data?.departments || deptsRes.data?.departments || []);
      
      console.log('Loaded users:', usersRes.data?.data?.users?.length || 0);
      console.log('Loaded departments:', deptsRes.data?.data?.departments?.length || 0);
    } catch (error) {
      console.error("Error loading admin data:", error);
      setError("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await userService.createUser(userForm);
      addNotification("User created successfully", "success");
      setShowUserModal(false);
      setUserForm({
        username: "",
        email: "",
        firstName: "",
        lastName: "",
        role: "employee",
        department: "",
        password: ""
      });
      loadAdminData();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await departmentService.createDepartment(deptForm);
      addNotification("Department created successfully", "success");
      setShowDeptModal(false);
      setDeptForm({ name: "", description: "" });
      loadAdminData();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create department");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      if (currentStatus) {
        await userService.deactivateUser(userId);
        addNotification("User deactivated", "warning");
      } else {
        await userService.reactivateUser(userId);
        addNotification("User reactivated", "success");
      }
      loadAdminData();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update user status");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to permanently delete this user?")) {
      try {
        await userService.deleteUserPermanently(userId);
        addNotification("User deleted permanently", "success");
        loadAdminData();
      } catch (error) {
        setError(error.response?.data?.message || "Failed to delete user");
      }
    }
  };

  const getSystemStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const totalProjects = projects?.length || 0;
    const activeProjects = projects?.filter(p => p.status === 'In Progress').length || 0;
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
    const totalDepartments = departments.length;

    return {
      totalUsers,
      activeUsers,
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks,
      totalDepartments
    };
  };

  const stats = getSystemStats();

  if (loading && !users.length) {
    return <ComponentLoader text="Loading IT Admin Dashboard..." />;
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">
            <i className="fas fa-cogs me-2" style={{ color: "var(--primary-maroon)" }}></i>
            IT Admin Dashboard
          </h2>
          <p className="text-muted mb-0">
            Welcome back, {getUserFullName()} - Full System Control
          </p>
        </div>
        <div>
          <Button 
            variant="primary" 
            className="me-2"
            onClick={() => setShowUserModal(true)}
          >
            <i className="fas fa-user-plus me-2"></i>
            Create User
          </Button>
          <Button 
            variant="outline-primary"
            onClick={() => setShowDeptModal(true)}
          >
            <i className="fas fa-building me-2"></i>
            Create Department
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* System Statistics */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="display-6 text-primary mb-2">
                <i className="fas fa-users"></i>
              </div>
              <h3 className="mb-1">{stats.totalUsers}</h3>
              <p className="text-muted mb-0">Total Users</p>
              <small className="text-success">
                {stats.activeUsers} active
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="display-6 text-info mb-2">
                <i className="fas fa-project-diagram"></i>
              </div>
              <h3 className="mb-1">{stats.totalProjects}</h3>
              <p className="text-muted mb-0">Total Projects</p>
              <small className="text-success">
                {stats.activeProjects} active
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="display-6 text-warning mb-2">
                <i className="fas fa-tasks"></i>
              </div>
              <h3 className="mb-1">{stats.totalTasks}</h3>
              <p className="text-muted mb-0">Total Tasks</p>
              <small className="text-success">
                {stats.completedTasks} completed
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="display-6 text-secondary mb-2">
                <i className="fas fa-building"></i>
              </div>
              <h3 className="mb-1">{stats.totalDepartments}</h3>
              <p className="text-muted mb-0">Departments</p>
              <small className="text-muted">
                Active departments
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* System Management Tabs */}
      <Row>
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="fas fa-users-cog me-2"></i>
                User Management
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td>
                          <div>
                            <strong>{user.firstName} {user.lastName}</strong>
                            <br />
                            <small className="text-muted">
                              {user.username} • {user.email}
                            </small>
                          </div>
                        </td>
                        <td>
                          <Badge 
                            bg={user.role === 'it_admin' ? 'danger' : 
                                user.role === 'managing_director' ? 'primary' :
                                user.role === 'team_lead' ? 'warning' : 'secondary'}
                          >
                            {user.role.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td>{user.department}</td>
                        <td>
                          <Badge bg={user.isActive ? 'success' : 'secondary'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>
                          {user.lastLogin ? 
                            new Date(user.lastLogin).toLocaleDateString() : 
                            'Never'
                          }
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant={user.isActive ? 'outline-warning' : 'outline-success'}
                            className="me-1"
                            onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                          >
                            <i className={`fas fa-${user.isActive ? 'ban' : 'check'}`}></i>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDeleteUser(user._id)}
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="fas fa-building me-2"></i>
                Departments
              </h5>
            </Card.Header>
            <Card.Body>
              {departments.map((dept) => (
                <div key={dept._id} className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                  <div>
                    <strong>{dept.name}</strong>
                    <br />
                    <small className="text-muted">{dept.description}</small>
                  </div>
                  <Badge bg="primary">
                    {users.filter(u => u.department === dept.name).length} users
                  </Badge>
                </div>
              ))}
            </Card.Body>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-sm mt-4">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="fas fa-bolt me-2"></i>
                Quick Actions
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button variant="outline-primary" onClick={() => setShowUserModal(true)}>
                  <i className="fas fa-user-plus me-2"></i>
                  Create New User
                </Button>
                <Button variant="outline-info" onClick={() => setShowDeptModal(true)}>
                  <i className="fas fa-building me-2"></i>
                  Add Department
                </Button>
                <Button variant="outline-success" onClick={loadAdminData}>
                  <i className="fas fa-sync me-2"></i>
                  Refresh Data
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create User Modal */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New User</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateUser}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>First Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={userForm.firstName}
                    onChange={(e) => setUserForm({...userForm, firstName: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Last Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={userForm.lastName}
                    onChange={(e) => setUserForm({...userForm, lastName: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role</Form.Label>
                  <Form.Select
                    value={userForm.role}
                    onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                  >
                    <option value="employee">Employee</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="managing_director">Managing Director</option>
                    <option value="it_admin">IT Admin</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Department</Form.Label>
                  <Form.Select
                    value={userForm.department}
                    onChange={(e) => setUserForm({...userForm, department: e.target.value})}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                required
                minLength={6}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowUserModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Create Department Modal */}
      <Modal show={showDeptModal} onHide={() => setShowDeptModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Department</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateDepartment}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Department Name</Form.Label>
              <Form.Control
                type="text"
                value={deptForm.name}
                onChange={(e) => setDeptForm({...deptForm, name: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={deptForm.description}
                onChange={(e) => setDeptForm({...deptForm, description: e.target.value})}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeptModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Department'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default ITAdminDashboard;