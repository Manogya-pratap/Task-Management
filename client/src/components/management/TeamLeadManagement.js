import React, { useState, useEffect, useCallback } from "react";
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
  Tab,
  Tabs
} from "react-bootstrap";
import { useApp } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import taskService from "../../services/taskService";
import userService from "../../services/userService";

const TeamLeadManagement = () => {
  const { addNotification } = useApp();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // State for team management
  const [teamMembers, setTeamMembers] = useState([]);
  const [departmentUsers, setDepartmentUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [myTeam, setMyTeam] = useState(null);

  // State for task assignment
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [projects, setProjects] = useState([]);

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    projectId: "",
    assignedTo: "",
    priority: "medium",
    dueDate: "",
    status: "new"
  });

  // Add member modal state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const loadTeamData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get team lead's team
      const teamsResponse = await api.get('/teams');
      const myTeams = teamsResponse.data.data.teams.filter(
        team => team.teamLead && team.teamLead._id === user._id
      );
      
      let currentTeamMembers = [];
      if (myTeams.length > 0) {
        setMyTeam(myTeams[0]);
        currentTeamMembers = myTeams[0].members || [];
        setTeamMembers(currentTeamMembers);
      }

      // Get all users in the department
      try {
        const departmentResponse = await api.get(`/teams/departments/${encodeURIComponent(user.department)}/users`);
        setDepartmentUsers(departmentResponse.data.data.users || []);
        
        // Filter available users (employees not in current team)
        const deptUsers = departmentResponse.data.data.users || [];
        const availableEmployees = deptUsers.filter(u => 
          u.role === 'employee' && 
          !currentTeamMembers.some(member => member._id === u._id)
        );
        setAvailableUsers(availableEmployees);
        
      } catch (deptError) {
        console.error("Error loading department users:", deptError);
        // Fallback: Get all users and filter by department
        const allUsersResponse = await userService.getAllUsers();
        const allUsers = allUsersResponse.data?.data?.users || [];
        const usersInDept = allUsers.filter(u => 
          u.department === user.department && 
          u.role === 'employee' && 
          u.isActive
        );
        setDepartmentUsers(usersInDept);
        
        const usersWithoutTeam = usersInDept.filter(u => 
          !currentTeamMembers.some(member => member._id === u._id)
        );
        setAvailableUsers(usersWithoutTeam);
      }

    } catch (error) {
      console.error("Error loading team data:", error);
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [user._id, user.department]); // Removed teamMembers dependency to avoid circular dependency

  const loadProjects = useCallback(async () => {
    try {
      const response = await api.get('/projects');
      const userProjects = response.data.data.projects.filter(
        project => project.dept_id === user.dept_id || project.created_by === user._id
      );
      setProjects(userProjects);
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  }, [user.dept_id, user._id]);

  useEffect(() => {
    loadTeamData();
    loadProjects();
  }, [loadTeamData, loadProjects]);

  const handleAddTeamMembers = async () => {
    if (selectedUsers.length === 0) {
      setError("Please select at least one user to add");
      return;
    }

    try {
      setLoading(true);
      
      for (const userId of selectedUsers) {
        await api.post(`/teams/${myTeam._id}/members`, { userId });
      }

      addNotification(`Added ${selectedUsers.length} member(s) to team`, "success");
      setShowAddMemberModal(false);
      setSelectedUsers([]);
      loadTeamData();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to add team members");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTeamMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this member from the team?")) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/teams/${myTeam._id}/members/${memberId}`);
      addNotification("Team member removed successfully", "success");
      loadTeamData();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to remove team member");
    } finally {
      setLoading(false);
    }
  };

  const handleShowTaskModal = (member) => {
    setSelectedMember(member);
    setTaskForm({
      ...taskForm,
      assignedTo: member._id
    });
    setShowTaskModal(true);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const taskData = {
        ...taskForm,
        req_dept_id: user.dept_id,
        exec_dept_id: user.dept_id,
        created_by: user._id
      };

      await taskService.createTask(taskData);
      addNotification(`Task assigned to ${selectedMember.firstName} ${selectedMember.lastName}`, "success");
      
      setShowTaskModal(false);
      setTaskForm({
        title: "",
        description: "",
        projectId: "",
        assignedTo: "",
        priority: "medium",
        dueDate: "",
        status: "new"
      });
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create and assign task");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelection = (userId, checked) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  if (loading && !teamMembers.length) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" />
        <p className="mt-2">Loading team management...</p>
      </div>
    );
  }

  return (
    <div className="team-lead-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>
            <i className="fas fa-users-cog me-2 text-primary"></i>
            Team Management
          </h2>
          <p className="text-muted mb-0">
            Manage your team members and assign tasks - {user.department} Department
          </p>
        </div>
        {myTeam && (
          <Button
            variant="primary"
            onClick={() => setShowAddMemberModal(true)}
            disabled={loading}
          >
            <i className="fas fa-user-plus me-2"></i>
            Add Team Members
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Tabs defaultActiveKey="myTeam" className="mb-4">
        <Tab eventKey="myTeam" title={`My Team (${teamMembers.length})`}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-users me-2"></i>
                {myTeam ? `${myTeam.name} Members` : 'Team Members'}
              </h5>
            </Card.Header>
            <Card.Body>
              {teamMembers.length > 0 ? (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Role</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((member) => (
                      <tr key={member._id}>
                        <td>
                          <div>
                            <strong>{member.firstName} {member.lastName}</strong>
                            <br />
                            <small className="text-muted">{member.unique_id}</small>
                          </div>
                        </td>
                        <td>
                          <Badge bg={member.role === 'team_lead' ? 'warning' : 'secondary'}>
                            {member.role.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td>{member.email}</td>
                        <td>
                          <Badge bg="success">Active</Badge>
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="me-2"
                            onClick={() => handleShowTaskModal(member)}
                            disabled={member.role === 'team_lead'}
                          >
                            <i className="fas fa-tasks"></i> Assign Task
                          </Button>
                          {member.role !== 'team_lead' && (
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleRemoveTeamMember(member._id)}
                            >
                              <i className="fas fa-user-minus"></i>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-users fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No team members found</p>
                  <Button
                    variant="primary"
                    onClick={() => setShowAddMemberModal(true)}
                  >
                    Add Team Members
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="department" title={`Department (${departmentUsers.length})`}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-building me-2"></i>
                {user.department} Department Members
              </h5>
            </Card.Header>
            <Card.Body>
              {departmentUsers.length > 0 ? (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Role</th>
                      <th>Team</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentUsers.map((member) => (
                      <tr key={member._id}>
                        <td>
                          <div>
                            <strong>{member.firstName} {member.lastName}</strong>
                            <br />
                            <small className="text-muted">{member.unique_id}</small>
                          </div>
                        </td>
                        <td>
                          <Badge bg={
                            member.role === 'team_lead' ? 'warning' : 
                            member.role === 'managing_director' ? 'primary' : 'secondary'
                          }>
                            {member.role.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td>
                          {member.team_id ? (
                            <Badge bg="info">{member.team_id.name}</Badge>
                          ) : (
                            <span className="text-muted">No team</span>
                          )}
                        </td>
                        <td>{member.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-building fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No department members found</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Add Team Members Modal */}
      <Modal show={showAddMemberModal} onHide={() => setShowAddMemberModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add Team Members</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">
            Select employees from your department to add to your team:
          </p>
          
          {availableUsers.length > 0 ? (
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              {availableUsers.map((user) => (
                <Form.Check
                  key={user._id}
                  type="checkbox"
                  id={`user-${user._id}`}
                  className="mb-2 p-2 border rounded"
                  label={
                    <div>
                      <strong>{user.firstName} {user.lastName}</strong>
                      <br />
                      <small className="text-muted">
                        {user.email} • {user.role.replace('_', ' ').toUpperCase()}
                      </small>
                    </div>
                  }
                  checked={selectedUsers.includes(user._id)}
                  onChange={(e) => handleUserSelection(user._id, e.target.checked)}
                />
              ))}
            </div>
          ) : (
            <Alert variant="info">
              No available employees found in your department. All employees may already be assigned to teams.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddMemberModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddTeamMembers}
            disabled={loading || selectedUsers.length === 0}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Adding...
              </>
            ) : (
              `Add ${selectedUsers.length} Member(s)`
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Assign Task Modal */}
      <Modal show={showTaskModal} onHide={() => setShowTaskModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Assign Task to {selectedMember?.firstName} {selectedMember?.lastName}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleTaskSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Task Title *</Form.Label>
                  <Form.Control
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                    required
                    placeholder="Enter task title"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Priority</Form.Label>
                  <Form.Select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={taskForm.description}
                onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                placeholder="Enter task description"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Project (Optional)</Form.Label>
                  <Form.Select
                    value={taskForm.projectId}
                    onChange={(e) => setTaskForm({...taskForm, projectId: e.target.value})}
                  >
                    <option value="">Select Project</option>
                    {projects.map((project) => (
                      <option key={project._id} value={project._id}>
                        {project.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Due Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowTaskModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Assigning...
                </>
              ) : (
                'Assign Task'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default TeamLeadManagement;