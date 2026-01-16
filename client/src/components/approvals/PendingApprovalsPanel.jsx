import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { useSocket } from '../../contexts/SocketContext';
import kanbanService from '../../services/kanbanService';
import TaskDetailModal from '../tasks/TaskDetailModal';
import './PendingApprovalsPanel.css';

const PendingApprovalsPanel = ({ userRole }) => {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleApprovalRequest = () => {
      loadPendingApprovals();
    };

    const handleKanbanMoved = ({ task, newStage }) => {
      if (newStage === 'Review') {
        loadPendingApprovals();
      } else if (newStage === 'Done' || newStage === 'In Progress') {
        // Remove from pending if moved out of Review
        setPendingTasks(prev => prev.filter(t => t._id !== task._id));
      }
    };

    socket.on('approval-requested', handleApprovalRequest);
    socket.on('kanban-moved', handleKanbanMoved);

    return () => {
      socket.off('approval-requested', handleApprovalRequest);
      socket.off('kanban-moved', handleKanbanMoved);
    };
  }, [socket]);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await kanbanService.getPendingApprovals();
      setPendingTasks(response.data.tasks);
    } catch (err) {
      console.error('Error loading pending approvals:', err);
      setError(err.response?.data?.message || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (taskId) => {
    if (!window.confirm('Are you sure you want to approve this task?')) {
      return;
    }

    try {
      await kanbanService.approveTask(taskId);
      setPendingTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve task');
    }
  };

  const handleReject = async (taskId) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await kanbanService.rejectTask(taskId, reason);
      setPendingTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject task');
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  const getDaysInReview = (updatedAt) => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffTime = Math.abs(now - updated);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!['TEAM_LEAD', 'MD', 'ADMIN'].includes(userRole)) {
    return (
      <Alert variant="warning">
        Only Team Leads, MDs, and Admins can view pending approvals.
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading pending approvals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <h6>Error</h6>
        <p>{error}</p>
        <Button size="sm" onClick={loadPendingApprovals}>Retry</Button>
      </Alert>
    );
  }

  return (
    <div className="pending-approvals-panel">
      <div className="panel-header">
        <h5>
          <i className="bi bi-clock-history me-2"></i>
          Pending Approvals
        </h5>
        <Badge bg="warning" text="dark">{pendingTasks.length}</Badge>
      </div>

      {pendingTasks.length === 0 ? (
        <Alert variant="success" className="mb-0">
          <i className="bi bi-check-circle me-2"></i>
          No tasks pending approval. Great job!
        </Alert>
      ) : (
        <div className="approvals-list">
          {pendingTasks.map(task => (
            <Card key={task._id} className="approval-card">
              <Card.Body>
                <div className="approval-header">
                  <div>
                    <h6 className="mb-1">{task.title}</h6>
                    <small className="text-muted">
                      <i className="bi bi-person me-1"></i>
                      {task.assigned_to?.name}
                    </small>
                  </div>
                  <Badge 
                    bg={task.priority === 'Urgent' ? 'danger' : 
                        task.priority === 'High' ? 'warning' : 'info'}
                  >
                    {task.priority}
                  </Badge>
                </div>

                {task.description && (
                  <p className="approval-description">
                    {task.description.length > 100 
                      ? `${task.description.substring(0, 100)}...` 
                      : task.description}
                  </p>
                )}

                <div className="approval-meta">
                  <div className="meta-item">
                    <i className="bi bi-diagram-3 me-1"></i>
                    <small>{task.project_id?.name}</small>
                  </div>
                  {task.req_dept_id && task.exec_dept_id && (
                    <div className="meta-item">
                      <i className="bi bi-building me-1"></i>
                      <small>
                        {task.req_dept_id.dept_name} → {task.exec_dept_id.dept_name}
                      </small>
                    </div>
                  )}
                  <div className="meta-item">
                    <i className="bi bi-clock me-1"></i>
                    <small>
                      {getDaysInReview(task.updatedAt)} day(s) in review
                    </small>
                  </div>
                </div>

                <div className="approval-progress">
                  <div className="progress" style={{ height: '8px' }}>
                    <div
                      className="progress-bar bg-success"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                  <small className="text-muted">{task.progress}% Complete</small>
                </div>

                <div className="approval-actions">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => handleTaskClick(task)}
                  >
                    <i className="bi bi-eye me-1"></i>
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleApprove(task._id)}
                  >
                    <i className="bi bi-check-circle me-1"></i>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleReject(task._id)}
                  >
                    <i className="bi bi-x-circle me-1"></i>
                    Reject
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          show={showModal}
          onHide={() => setShowModal(false)}
          task={selectedTask}
          onUpdate={loadPendingApprovals}
          userRole={userRole}
        />
      )}
    </div>
  );
};

export default PendingApprovalsPanel;
