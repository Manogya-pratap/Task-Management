import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner, Badge, Table } from 'react-bootstrap';
import { useSocket } from '../../contexts/SocketContext';
import taskLogService from '../../services/taskLogService';
import './TeamDailyLogs.css';

const TeamDailyLogs = ({ userRole }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupBy, setGroupBy] = useState('user'); // 'user' or 'task'
  const { socket } = useSocket();

  useEffect(() => {
    if (['TEAM_LEAD', 'MD', 'ADMIN'].includes(userRole)) {
      loadTeamLogs();
    }
  }, [selectedDate, userRole]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleDailyUpdate = ({ taskLog }) => {
      const logDate = new Date(taskLog.date).toISOString().split('T')[0];
      if (logDate === selectedDate) {
        loadTeamLogs();
      }
    };

    socket.on('daily-update-added', handleDailyUpdate);

    return () => {
      socket.off('daily-update-added', handleDailyUpdate);
    };
  }, [socket, selectedDate]);

  const loadTeamLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await taskLogService.getTeamDailyLogs(selectedDate);
      setLogs(response.data.logs);
    } catch (err) {
      console.error('Error loading team logs:', err);
      setError(err.response?.data?.message || 'Failed to load team logs');
    } finally {
      setLoading(false);
    }
  };

  const groupLogsByUser = () => {
    const grouped = {};
    logs.forEach(log => {
      const userId = log.updated_by?._id;
      const userName = log.updated_by?.name || 'Unknown';
      
      if (!grouped[userId]) {
        grouped[userId] = {
          name: userName,
          logs: [],
          totalHours: 0,
          avgProgress: 0
        };
      }
      
      grouped[userId].logs.push(log);
      grouped[userId].totalHours += log.hours_worked || 0;
    });

    // Calculate average progress
    Object.keys(grouped).forEach(userId => {
      const userLogs = grouped[userId].logs;
      grouped[userId].avgProgress = Math.round(
        userLogs.reduce((sum, log) => sum + log.progress, 0) / userLogs.length
      );
    });

    return grouped;
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  if (!['TEAM_LEAD', 'MD', 'ADMIN'].includes(userRole)) {
    return (
      <Alert variant="warning">
        Only Team Leads, MDs, and Admins can view team daily logs.
      </Alert>
    );
  }

  const groupedLogs = groupBy === 'user' ? groupLogsByUser() : null;

  return (
    <div className="team-daily-logs">
      <div className="logs-header">
        <h4>
          <i className="bi bi-people me-2"></i>
          Team Daily Logs
        </h4>
        <p className="text-muted">Monitor your team's daily progress</p>
      </div>

      {/* Controls */}
      <Card className="mb-4">
        <Card.Body>
          <div className="logs-controls">
            {/* Date Selector */}
            <div className="date-selector">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={goToPreviousDay}
              >
                <i className="bi bi-chevron-left"></i>
              </Button>

              <Form.Control
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                max={new Date().toISOString().split('T')[0]}
                className="date-input"
              />

              <Button
                variant="outline-primary"
                size="sm"
                onClick={goToNextDay}
                disabled={isToday}
              >
                <i className="bi bi-chevron-right"></i>
              </Button>

              {!isToday && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={goToToday}
                >
                  Today
                </Button>
              )}
            </div>

            {/* Group By Selector */}
            <div className="group-selector">
              <Form.Label className="mb-0 me-2">Group by:</Form.Label>
              <div className="btn-group" role="group">
                <Button
                  variant={groupBy === 'user' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setGroupBy('user')}
                >
                  <i className="bi bi-person me-1"></i>
                  User
                </Button>
                <Button
                  variant={groupBy === 'task' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setGroupBy('task')}
                >
                  <i className="bi bi-list-task me-1"></i>
                  Task
                </Button>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="text-center p-4">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading team logs...</p>
        </div>
      ) : error ? (
        <Alert variant="danger">
          <h6>Error</h6>
          <p>{error}</p>
          <Button size="sm" onClick={loadTeamLogs}>Retry</Button>
        </Alert>
      ) : logs.length === 0 ? (
        <Alert variant="info">
          <i className="bi bi-info-circle me-2"></i>
          No team updates recorded for {new Date(selectedDate).toLocaleDateString()}.
        </Alert>
      ) : groupBy === 'user' ? (
        // Group by User View
        <div className="user-groups">
          {Object.entries(groupedLogs).map(([userId, userData]) => (
            <Card key={userId} className="user-group-card mb-3">
              <Card.Header>
                <div className="user-header">
                  <div>
                    <h6 className="mb-0">
                      <i className="bi bi-person-circle me-2"></i>
                      {userData.name}
                    </h6>
                  </div>
                  <div className="user-stats">
                    <Badge bg="primary">{userData.logs.length} updates</Badge>
                    <Badge bg="success">{userData.totalHours.toFixed(1)}h</Badge>
                    <Badge bg="info">{userData.avgProgress}% avg</Badge>
                  </div>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="user-logs">
                  {userData.logs.map(log => (
                    <div key={log._id} className="log-item">
                      <div className="log-task">
                        <strong>{log.task_id?.title}</strong>
                        <Badge bg="primary">{log.progress}%</Badge>
                      </div>
                      <p className="log-remark">{log.remark}</p>
                      <small className="text-muted">
                        <i className="bi bi-diagram-3 me-1"></i>
                        {log.task_id?.project_id?.name}
                      </small>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      ) : (
        // Group by Task View
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Task</th>
              <th>Project</th>
              <th>User</th>
              <th>Progress</th>
              <th>Hours</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log._id}>
                <td>{log.task_id?.title || 'Unknown'}</td>
                <td>{log.task_id?.project_id?.name || 'Unknown'}</td>
                <td>{log.updated_by?.name || 'Unknown'}</td>
                <td>
                  <Badge bg="primary">{log.progress}%</Badge>
                </td>
                <td>{log.hours_worked || 0}h</td>
                <td className="remark-cell">{log.remark}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default TeamDailyLogs;
