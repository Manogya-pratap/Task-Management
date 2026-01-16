import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { useSocket } from '../../contexts/SocketContext';
import taskLogService from '../../services/taskLogService';
import './MyDailyLogs.css';

const MyDailyLogs = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalTasks: 0,
    totalHours: 0,
    avgProgress: 0
  });
  const { socket } = useSocket();

  useEffect(() => {
    loadDailyLogs();
  }, [selectedDate]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleDailyUpdate = ({ taskLog }) => {
      const logDate = new Date(taskLog.date).toISOString().split('T')[0];
      if (logDate === selectedDate) {
        loadDailyLogs();
      }
    };

    socket.on('daily-update-added', handleDailyUpdate);

    return () => {
      socket.off('daily-update-added', handleDailyUpdate);
    };
  }, [socket, selectedDate]);

  const loadDailyLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await taskLogService.getMyDailyLogs(selectedDate);
      setLogs(response.data.logs);
      calculateStats(response.data.logs);
    } catch (err) {
      console.error('Error loading daily logs:', err);
      setError(err.response?.data?.message || 'Failed to load daily logs');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logsList) => {
    if (logsList.length === 0) {
      setStats({ totalTasks: 0, totalHours: 0, avgProgress: 0 });
      return;
    }

    const totalHours = logsList.reduce((sum, log) => sum + (log.hours_worked || 0), 0);
    const avgProgress = Math.round(
      logsList.reduce((sum, log) => sum + log.progress, 0) / logsList.length
    );

    setStats({
      totalTasks: logsList.length,
      totalHours: totalHours.toFixed(1),
      avgProgress
    });
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

  return (
    <div className="my-daily-logs">
      <div className="logs-header">
        <h4>
          <i className="bi bi-journal-text me-2"></i>
          My Daily Logs
        </h4>
        <p className="text-muted">Track your daily progress and updates</p>
      </div>

      {/* Date Selector */}
      <Card className="mb-4">
        <Card.Body>
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
        </Card.Body>
      </Card>

      {/* Statistics */}
      <div className="logs-stats mb-4">
        <Card className="stat-card">
          <Card.Body>
            <div className="stat-icon bg-primary">
              <i className="bi bi-list-task"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.totalTasks}</h3>
              <p>Tasks Updated</p>
            </div>
          </Card.Body>
        </Card>

        <Card className="stat-card">
          <Card.Body>
            <div className="stat-icon bg-success">
              <i className="bi bi-clock"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.totalHours}h</h3>
              <p>Hours Worked</p>
            </div>
          </Card.Body>
        </Card>

        <Card className="stat-card">
          <Card.Body>
            <div className="stat-icon bg-info">
              <i className="bi bi-graph-up"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.avgProgress}%</h3>
              <p>Avg Progress</p>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="text-center p-4">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading logs...</p>
        </div>
      ) : error ? (
        <Alert variant="danger">
          <h6>Error</h6>
          <p>{error}</p>
          <Button size="sm" onClick={loadDailyLogs}>Retry</Button>
        </Alert>
      ) : logs.length === 0 ? (
        <Alert variant="info">
          <i className="bi bi-info-circle me-2"></i>
          No updates recorded for {new Date(selectedDate).toLocaleDateString()}.
          {isToday && ' Start working on your tasks and add daily updates!'}
        </Alert>
      ) : (
        <div className="logs-list">
          {logs.map((log, index) => (
            <Card key={log._id} className="log-card">
              <Card.Body>
                <div className="log-header">
                  <div>
                    <h6 className="mb-1">{log.task_id?.title || 'Unknown Task'}</h6>
                    <small className="text-muted">
                      <i className="bi bi-diagram-3 me-1"></i>
                      {log.task_id?.project_id?.name || 'Unknown Project'}
                    </small>
                  </div>
                  <Badge bg="primary">{log.progress}%</Badge>
                </div>

                <div className="log-remark">
                  <p>{log.remark}</p>
                </div>

                <div className="log-footer">
                  <div className="log-meta">
                    <span>
                      <i className="bi bi-clock me-1"></i>
                      {new Date(log.date).toLocaleTimeString()}
                    </span>
                    {log.hours_worked > 0 && (
                      <span>
                        <i className="bi bi-hourglass-split me-1"></i>
                        {log.hours_worked}h worked
                      </span>
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyDailyLogs;
