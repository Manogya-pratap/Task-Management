import React, { useState } from 'react';
import { Modal, Button, Badge, Row, Col, Card, ProgressBar, Alert } from 'react-bootstrap';
import moment from 'moment';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

const TaskDetailModal = ({ show, onHide, task, onEdit, onDelete }) => {
  const { user } = useAuth();
  const { projects, users, updateTaskStatus } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!task) return null;

  const project = projects.find(p => p._id === task.projectId?._id || p._id === task.projectId);
  const assignedUser = users.find(u => u._id === task.assignedTo?._id || u._id === task.assignedTo);
  const createdByUser = users.find(u => u._id === task.createdBy?._id || u._id === task.createdBy);

  const statusColors = {
    'new': '#6c757d',
    'scheduled': '#007bff',
    'in_progress': '#ffc107',
    'completed': '#28a745'
  };

  const priorityColors = {
    'low': '#17a2b8',
    'medium': '#6f42c1',
    'high': '#fd7e14',
    'urgent': '#dc3545'
  };

  const getStatusBadge = (status) => {
    const color = statusColors[status] || '#6c757d';
    return (
      <Badge style={{ backgroundColor: color }} className="me-2">
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const color = priorityColors[priority] || '#6c757d';
    return (
      <Badge style={{ backgroundColor: color }}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const getProgressPercentage = () => {
    switch (task.status) {
      case 'new': return 0;
      case 'scheduled': return 25;
      case 'in_progress': return 50;
      case 'completed': return 100;
      default: return 0;
    }
  };

  const canEdit = user && (
    user.role === 'managing_director' || 
    user.role === 'it_admin' || 
    user.role === 'team_lead' ||
    (task.assignedTo && (task.assignedTo._id === user._id || task.assignedTo === user._id)) ||
    (task.createdBy && (task.createdBy._id === user._id || task.createdBy === user._id))
  );

  const canDelete = user && (
    user.role === 'managing_director' || 
    user.role === 'it_admin' || 
    user.role === 'team_lead' ||
    (task.createdBy && (task.createdBy._id === user._id || task.createdBy === user._id))
  );

  const handleStatusChange = async (newStatus) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await updateTaskStatus(task._id, newStatus);
      if (!result.success) {
        setError(result.error || 'Failed to update task status');
      }
    } catch (err) {
      setError('Failed to update task status');
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = task.dueDate && moment(task.dueDate).isBefore(moment(), 'day') && task.status !== 'completed';
  const daysUntilDue = task.dueDate ? moment(task.dueDate).diff(moment(), 'days') : null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title className="d-flex align-items-center">
          <i className="fas fa-tasks me-2"></i>
          Task Details
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="p-0">
        {error && (
          <Alert variant="danger" className="m-3 mb-0">
            {error}
          </Alert>
        )}
        
        {/* Task Header */}
        <div className="p-4 border-bottom bg-light">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h4 className="mb-0 text-primary">{task.title}</h4>
            <div>
              {getStatusBadge(task.status)}
              {getPriorityBadge(task.priority)}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small className="text-muted">Progress</small>
              <small className="text-muted">{getProgressPercentage()}%</small>
            </div>
            <ProgressBar 
              now={getProgressPercentage()} 
              variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'info'}
              style={{ height: '8px' }}
            />
          </div>

          {/* Due Date Alert */}
          {isOverdue && (
            <Alert variant="danger" className="py-2 mb-0">
              <i className="fas fa-exclamation-triangle me-2"></i>
              <strong>Overdue:</strong> This task was due {moment(task.dueDate).fromNow()}
            </Alert>
          )}
          
          {daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0 && task.status !== 'completed' && (
            <Alert variant="warning" className="py-2 mb-0">
              <i className="fas fa-clock me-2"></i>
              <strong>Due Soon:</strong> This task is due {daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`}
            </Alert>
          )}
        </div>

        {/* Task Content */}
        <div className="p-4">
          {/* Description */}
          {task.description && (
            <div className="mb-4">
              <h6 className="text-muted mb-2">
                <i className="fas fa-align-left me-2"></i>
                Description
              </h6>
              <p className="mb-0">{task.description}</p>
            </div>
          )}

          {/* Task Details Grid */}
          <Row>
            <Col md={6}>
              <Card className="border-0 bg-light mb-3">
                <Card.Body className="py-3">
                  <h6 className="text-muted mb-2">
                    <i className="fas fa-project-diagram me-2"></i>
                    Project
                  </h6>
                  <p className="mb-0 fw-bold">
                    {project?.name || 'No project assigned'}
                  </p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="border-0 bg-light mb-3">
                <Card.Body className="py-3">
                  <h6 className="text-muted mb-2">
                    <i className="fas fa-user me-2"></i>
                    Assigned To
                  </h6>
                  <p className="mb-0 fw-bold">
                    {assignedUser ? 
                      `${assignedUser.firstName} ${assignedUser.lastName}` : 
                      'Unassigned'
                    }
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Card className="border-0 bg-light mb-3">
                <Card.Body className="py-3">
                  <h6 className="text-muted mb-2">
                    <i className="fas fa-calendar-plus me-2"></i>
                    Created
                  </h6>
                  <p className="mb-1 fw-bold">
                    {moment(task.createdAt).format('MMM DD, YYYY')}
                  </p>
                  <small className="text-muted">
                    by {createdByUser ? `${createdByUser.firstName} ${createdByUser.lastName}` : 'Unknown'}
                  </small>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="border-0 bg-light mb-3">
                <Card.Body className="py-3">
                  <h6 className="text-muted mb-2">
                    <i className="fas fa-calendar-check me-2"></i>
                    Due Date
                  </h6>
                  <p className="mb-1 fw-bold">
                    {task.dueDate ? 
                      moment(task.dueDate).format('MMM DD, YYYY') : 
                      'No due date set'
                    }
                  </p>
                  {task.dueDate && (
                    <small className="text-muted">
                      {moment(task.dueDate).fromNow()}
                    </small>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Quick Status Actions */}
          {canEdit && (
            <div className="mt-4">
              <h6 className="text-muted mb-3">
                <i className="fas fa-bolt me-2"></i>
                Quick Actions
              </h6>
              <div className="d-flex flex-wrap gap-2">
                {task.status !== 'new' && (
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={() => handleStatusChange('new')}
                    disabled={loading}
                  >
                    <i className="fas fa-inbox me-1"></i>
                    Mark as New
                  </Button>
                )}
                {task.status !== 'in_progress' && (
                  <Button 
                    variant="outline-warning" 
                    size="sm"
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={loading}
                  >
                    <i className="fas fa-play me-1"></i>
                    Start Progress
                  </Button>
                )}
                {task.status !== 'completed' && (
                  <Button 
                    variant="outline-success" 
                    size="sm"
                    onClick={() => handleStatusChange('completed')}
                    disabled={loading}
                  >
                    <i className="fas fa-check me-1"></i>
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Task Metadata */}
          <div className="mt-4 pt-3 border-top">
            <Row className="text-muted small">
              <Col md={6}>
                <div className="mb-2">
                  <strong>Task ID:</strong> {task._id}
                </div>
                <div className="mb-2">
                  <strong>Last Updated:</strong> {moment(task.updatedAt).format('MMM DD, YYYY HH:mm')}
                </div>
              </Col>
              <Col md={6}>
                {task.tags && task.tags.length > 0 && (
                  <div className="mb-2">
                    <strong>Tags:</strong>
                    <div className="mt-1">
                      {task.tags.map(tag => (
                        <Badge key={tag} bg="light" text="dark" className="me-1">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Col>
            </Row>
          </div>
        </div>
      </Modal.Body>
      
      <Modal.Footer className="d-flex justify-content-between">
        <div>
          {canDelete && (
            <Button 
              variant="outline-danger" 
              onClick={() => onDelete && onDelete(task)}
              disabled={loading}
            >
              <i className="fas fa-trash me-2"></i>
              Delete Task
            </Button>
          )}
        </div>
        
        <div className="d-flex gap-2">
          <Button variant="secondary" onClick={onHide}>
            Close
          </Button>
          {canEdit && (
            <Button 
              variant="primary" 
              onClick={() => onEdit && onEdit(task)}
              disabled={loading}
            >
              <i className="fas fa-edit me-2"></i>
              Edit Task
            </Button>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default TaskDetailModal;