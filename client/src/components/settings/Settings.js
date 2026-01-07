import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    notifications: {
      email: true,
      push: true,
      taskDeadlines: true,
      projectUpdates: true,
      teamMessages: true
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      dashboardLayout: 'default'
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    allowRegistration: true,
    sessionTimeout: 30,
    maxFileSize: 10,
    backupFrequency: 'daily'
  });

  const departments = [
    'IT Development',
    'Human Resources', 
    'Finance',
    'Marketing',
    'Operations',
    'Sales'
  ];

  const themes = [
    { value: 'light', label: 'Light Theme' },
    { value: 'dark', label: 'Dark Theme' },
    { value: 'auto', label: 'Auto (System)' }
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' }
  ];

  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' }
  ];

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
        notifications: user.notifications || {
          email: true,
          push: true,
          taskDeadlines: true,
          projectUpdates: true,
          teamMessages: true
        },
        preferences: user.preferences || {
          theme: 'light',
          language: 'en',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          dashboardLayout: 'default'
        }
      });
    }
    
    if (user?.role === 'managing_director' || user?.role === 'it_admin') {
      fetchSystemSettings();
    }
  }, [user]);

  const fetchSystemSettings = async () => {
    try {
      const response = await api.get('/settings/system');
      setSystemSettings(response.data.data);
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setProfileData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSystemChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSystemSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.put('/users/profile', profileData);
      updateUser(response.data.data);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.put('/users/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setSuccess('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSystemSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.put('/settings/system', systemSettings);
      setSuccess('System settings updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update system settings');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const canManageSystem = user?.role === 'managing_director' || user?.role === 'it_admin';

  return (
    <div className="settings">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="fas fa-cog me-2 text-primary"></i>
          Settings
        </h2>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Row>
        <Col lg={8}>
          {/* Profile Settings */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-user me-2"></i>
                Profile Settings
              </h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleProfileSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>First Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleProfileChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Last Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="lastName"
                        value={profileData.lastName}
                        onChange={handleProfileChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleProfileChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleProfileChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Department</Form.Label>
                  <Form.Select
                    name="department"
                    value={profileData.department}
                    onChange={handleProfileChange}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <div className="d-flex gap-2">
                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Updating...
                      </>
                    ) : (
                      'Update Profile'
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline-secondary"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    <i className="fas fa-key me-2"></i>
                    Change Password
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>

          {/* Notification Settings */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-bell me-2"></i>
                Notification Preferences
              </h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleProfileSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Check
                      type="checkbox"
                      name="notifications.email"
                      label="Email Notifications"
                      checked={profileData.notifications.email}
                      onChange={handleProfileChange}
                      className="mb-3"
                    />
                    <Form.Check
                      type="checkbox"
                      name="notifications.push"
                      label="Push Notifications"
                      checked={profileData.notifications.push}
                      onChange={handleProfileChange}
                      className="mb-3"
                    />
                    <Form.Check
                      type="checkbox"
                      name="notifications.taskDeadlines"
                      label="Task Deadline Reminders"
                      checked={profileData.notifications.taskDeadlines}
                      onChange={handleProfileChange}
                      className="mb-3"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="checkbox"
                      name="notifications.projectUpdates"
                      label="Project Updates"
                      checked={profileData.notifications.projectUpdates}
                      onChange={handleProfileChange}
                      className="mb-3"
                    />
                    <Form.Check
                      type="checkbox"
                      name="notifications.teamMessages"
                      label="Team Messages"
                      checked={profileData.notifications.teamMessages}
                      onChange={handleProfileChange}
                      className="mb-3"
                    />
                  </Col>
                </Row>
                
                <Button 
                  type="submit" 
                  variant="primary"
                  disabled={loading}
                >
                  Save Notification Settings
                </Button>
              </Form>
            </Card.Body>
          </Card>

          {/* Appearance & Preferences */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-palette me-2"></i>
                Appearance & Preferences
              </h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleProfileSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Theme</Form.Label>
                      <Form.Select
                        name="preferences.theme"
                        value={profileData.preferences.theme}
                        onChange={handleProfileChange}
                      >
                        {themes.map(theme => (
                          <option key={theme.value} value={theme.value}>
                            {theme.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Language</Form.Label>
                      <Form.Select
                        name="preferences.language"
                        value={profileData.preferences.language}
                        onChange={handleProfileChange}
                      >
                        {languages.map(lang => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Timezone</Form.Label>
                      <Form.Select
                        name="preferences.timezone"
                        value={profileData.preferences.timezone}
                        onChange={handleProfileChange}
                      >
                        {timezones.map(tz => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date Format</Form.Label>
                      <Form.Select
                        name="preferences.dateFormat"
                        value={profileData.preferences.dateFormat}
                        onChange={handleProfileChange}
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Button 
                  type="submit" 
                  variant="primary"
                  disabled={loading}
                >
                  Save Preferences
                </Button>
              </Form>
            </Card.Body>
          </Card>

          {/* System Settings (Admin Only) */}
          {canManageSystem && (
            <Card className="mb-4">
              <Card.Header className="bg-warning text-dark">
                <h5 className="mb-0">
                  <i className="fas fa-server me-2"></i>
                  System Settings
                  <Badge bg="danger" className="ms-2">Admin Only</Badge>
                </h5>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleSystemSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Check
                        type="checkbox"
                        name="maintenanceMode"
                        label="Maintenance Mode"
                        checked={systemSettings.maintenanceMode}
                        onChange={handleSystemChange}
                        className="mb-3"
                      />
                      <Form.Check
                        type="checkbox"
                        name="allowRegistration"
                        label="Allow New User Registration"
                        checked={systemSettings.allowRegistration}
                        onChange={handleSystemChange}
                        className="mb-3"
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Session Timeout (minutes)</Form.Label>
                        <Form.Control
                          type="number"
                          name="sessionTimeout"
                          value={systemSettings.sessionTimeout}
                          onChange={handleSystemChange}
                          min="5"
                          max="480"
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Max File Size (MB)</Form.Label>
                        <Form.Control
                          type="number"
                          name="maxFileSize"
                          value={systemSettings.maxFileSize}
                          onChange={handleSystemChange}
                          min="1"
                          max="100"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Backup Frequency</Form.Label>
                    <Form.Select
                      name="backupFrequency"
                      value={systemSettings.backupFrequency}
                      onChange={handleSystemChange}
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </Form.Select>
                  </Form.Group>
                  
                  <Button 
                    type="submit" 
                    variant="warning"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Updating...
                      </>
                    ) : (
                      'Update System Settings'
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          )}
        </Col>

        <Col lg={4}>
          {/* Account Info */}
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">Account Information</h6>
            </Card.Header>
            <Card.Body>
              <div className="text-center mb-3">
                <div className="avatar-circle mx-auto mb-2" style={{ width: '80px', height: '80px', fontSize: '24px' }}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <h6>{user?.firstName} {user?.lastName}</h6>
                <Badge bg="primary">{user?.role?.replace('_', ' ').toUpperCase()}</Badge>
              </div>
              
              <div className="small">
                <div className="d-flex justify-content-between mb-2">
                  <span>Username:</span>
                  <strong>{user?.username}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Member Since:</span>
                  <strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Status:</span>
                  <Badge bg={user?.isActive ? 'success' : 'danger'}>
                    {user?.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Quick Actions */}
          <Card>
            <Card.Header>
              <h6 className="mb-0">Quick Actions</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button variant="outline-primary" size="sm">
                  <i className="fas fa-download me-2"></i>
                  Export My Data
                </Button>
                <Button variant="outline-info" size="sm">
                  <i className="fas fa-history me-2"></i>
                  View Activity Log
                </Button>
                <Button variant="outline-warning" size="sm">
                  <i className="fas fa-shield-alt me-2"></i>
                  Security Settings
                </Button>
                <Button variant="outline-danger" size="sm">
                  <i className="fas fa-sign-out-alt me-2"></i>
                  Sign Out All Devices
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Change Password Modal */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Change Password</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePasswordSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <Form.Control
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                minLength="6"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
                minLength="6"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Updating...
                </>
              ) : (
                'Update Password'
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

export default Settings;