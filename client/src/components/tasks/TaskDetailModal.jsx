import React, { useState, useEffect } from 'react';
import { Modal, Button, Tabs, Tab, Badge, Alert } from 'react-bootstrap';
import taskLogService from '../../services/taskLogService';
import kanbanService from '../../services/kanbanService';
import DailyUpdateForm from './DailyUpdateForm';
import './TaskDetailModal.css';

const TaskDetailModal = ({ show, onHide, task, onUpdate, userRole }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [taskLogs, setTaskLogs] = useState([]);
  const [progressHistory, setProgressHistory] = useState([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (show && task) {
      loadTaskLogs();
      loadProgressHistory();
    }
  }, [show, task]);

  const loadTaskLogs = async () => {
    try {
      const response = await taskLogService.getTaskLogs(task._id);
      setTaskLogs(response.data.logs);
    } catch (err) {
      console.error('Error loading task logs:', err);
    }
  };

  const loadProgressHistory = async () => {
    try {
      const response = await taskLogService.getProgressHistory(task._id);
      setProgressHistory(response.data.history);
    } catch (err) {
      console.error('Error loading progress history:', err);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this task?')) {
      return;
    }

    try {
      setActionLoading(true);
      await kanbanService.approveTask(task._id);
      alert('Task approved successfully!');
      if (onUpdate) onUpdate();
      onHide();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      setActionLoading(true);
      await kanbanService.rejectTask(task._id, reason);
      alert('Task rejected and moved back to In Progress');
      if (onUpdate) onUpdate();
      onHide();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject task');
    } finally {
      setActionLoading(false);
    }
  };

  const canApprove = ['TEAM_LEAD', 'MD', 'ADMIN'].includes(userRole) && task?.kanban_stage === 'Review';

  if (!task) return null;

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{task.title}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
            {/* Details Tab */}
            <Tab eventKey="details" title="Details">
              <div className="task-details">
                {/* Status and Priority */}
                <div className="detail-row">
                  <strong>Status:</strong>
                  <Badge bg={task.kanban_stage === 'Done' ? 'success' : 'primary'}>
                    {task.kanban_stage}
                  </Badge>
                </div>

                <div className="detail-row">
                  <strong>Priority:</strong>
                  <Badge bg={
                    task.priority === 'Urgent' ? 'danger' :
                    task.priority === 'High' ? 'warning' :
                    task.priority === 'Medium' ? 'info' : 'secondary'
                  }>
                    {task.priority}
                  </Badge>
                </div>

                {/* Progress */}
                <div className="detail-row">
                  <strong>Progress:</strong>
                  <div className="progress flex-grow-1 ms-3" style={{ height: '20px' }}>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      style={{ width: `${task.progress}%` }}
                      aria-valuenow={task.progress}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      {task.progress}%
                    </div>
                  </div>
                </div>

                {/* Description */}
                {task.description && (
                  <div className="detail-section">
                    <strong>Description:</strong>
                    <p className="mt-2">{task.description}</p>
                  </div>
                )}

                {/* Assigned To */}
                <div className="detail-row">
                  <strong>Assigned To:</strong>
                  <span>{task.assigned_to?.name || 'Unassigned'}</span>
                </div>

                {/* Departments */}
                {task.req_dept_id && task.exec_dept_id && (
                  <div className="detail-row">
                    <strong>Departments:</strong>
                    <span>
                      {task.req_dept_id.dept_name} → {task.exec_dept_id.dept_name}
                      {task.req_dept_id._id !== task.exec_dept_id._id && (
                        <Badge bg="info" className="ms-2">Cross-Department</Badge>
                      )}
                    </span>
                  </div>
                )}

                {/* Due Date */}
                {task.due_date && (
                  <div className="detail-row">
                    <strong>Due Date:</strong>
                    <span>{new Date(task.due_date).toLocaleDateString()}</span>
                  </div>
                )}

                {/* Remark */}
                {task.remark && (
                  <div className="detail-section">
                    <strong>Remark:</strong>
                    <p className="mt-2 text-muted">{task.remark}</p>
                  </div>
                )}
              </div>
            </Tab>

            {/* Progress History Tab */}
            <Tab eventKey="history" title={`History (${taskLogs.length})`}>
              <div className="task-history">
                {taskLogs.length === 0 ? (
                  <Alert variant="info">No updates yet</Alert>
                ) : (
                  <div className="timeline">
                    {taskLogs.map((log, index) => (
                      <div key={log._id} className="timeline-item">
                        <div className="timeline-marker"></div>
                        <div className="timeline-content">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <strong>{log.updated_by?.name}</strong>
                              <small className="text-muted ms-2">
                                {new Date(log.date).toLocaleDateString()}
                              </small>
                            </div>
                            <Badge bg="primary">{log.progress}%</Badge>
                          </div>
                          <p className="mt-2 mb-0">{log.remark}</p>
                          {log.hours_worked > 0 && (
                            <small className="text-muted">
                              Hours worked: {log.hours_worked}
                            </small>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tab>

            {/* Progress Chart Tab */}
            <Tab eventKey="chart" title="Progress Chart">
              <div className="progress-chart">
                {progressHistory.length === 0 ? (
                  <Alert variant="info">No progress data yet</Alert>
                ) : (
                  <div className="chart-container">
                    {progressHistory.map((point, index) => (
                      <div key={index} className="chart-point">
                        <div className="chart-bar" style={{ height: `${point.progress}%` }}>
                          <span className="chart-value">{point.progress}%</span>
                        </div>
                        <small className="chart-label">{point.date}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </Modal.Body>

        <Modal.Footer>
          {/* Approval Buttons (Team Lead only, Review stage only) */}
          {canApprove && (
            <>
              <Button
                variant="success"
                onClick={handleApprove}
                disabled={actionLoading}
              >
                <i className="bi bi-check-circle me-2"></i>
                Approve
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                disabled={actionLoading}
              >
                <i className="bi bi-x-circle me-2"></i>
                Reject
              </Button>
            </>
          )}

          {/* Daily Update Button */}
          {task.kanban_stage !== 'Done' && (
            <Button
              variant="primary"
              onClick={() => setShowUpdateForm(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add Daily Update
            </Button>
          )}

          <Button variant="secondary" onClick={onHide}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Daily Update Form */}
      <DailyUpdateForm
        show={showUpdateForm}
        onHide={() => setShowUpdateForm(false)}
        task={task}
        onSuccess={() => {
          loadTaskLogs();
          loadProgressHistory();
          if (onUpdate) onUpdate();
        }}
      />
    </>
  );
};

export default TaskDetailModal;
