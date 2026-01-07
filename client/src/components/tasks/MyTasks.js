import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import ErrorBoundary from '../ErrorBoundary';

const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [tasksByStatus, setTasksByStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    fetchMyTasks();
  }, [filter, priorityFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      
      const response = await api.get(`/projects/my/tasks?${params.toString()}`);
      setTasks(response.data.data.tasks);
      setTasksByStatus(response.data.data.tasksByStatus);
      setError(null);
    } catch (err) {
      console.error('Error fetching my tasks:', err);
      setError('Failed to load your tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'new': return 'bg-secondary';
      case 'scheduled': return 'bg-info';
      case 'in_progress': return 'bg-warning';
      case 'completed': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'high': return 'bg-danger';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  const getTaskStats = () => {
    const stats = {
      total: tasks.length,
      new: tasksByStatus.new?.length || 0,
      scheduled: tasksByStatus.scheduled?.length || 0,
      in_progress: tasksByStatus.in_progress?.length || 0,
      completed: tasksByStatus.completed?.length || 0
    };
    return stats;
  };

  const isTaskOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && tasks.find(t => t.dueDate === dueDate)?.status !== 'completed';
  };

  const stats = getTaskStats();

  if (loading) {
    return <LoadingSpinner text="Loading your tasks..." />;
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="fas fa-exclamation-triangle me-2"></i>
        {error}
        <button 
          className="btn btn-outline-danger btn-sm ms-3"
          onClick={fetchMyTasks}
        >
          <i className="fas fa-redo me-1"></i>
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="mb-1">
                  <i className="fas fa-clipboard-list me-2 text-primary"></i>
                  My Tasks
                </h2>
                <p className="text-muted mb-0">
                  Tasks assigned to you ({tasks.length} total)
                </p>
              </div>
              <div className="d-flex gap-2">
                <select 
                  className="form-select form-select-sm"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  style={{ width: 'auto' }}
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <select 
                  className="form-select form-select-sm"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  style={{ width: 'auto' }}
                >
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={fetchMyTasks}
                  title="Refresh tasks"
                >
                  <i className="fas fa-sync-alt me-1"></i>
                  Refresh
                </button>
              </div>
            </div>

            {/* Task Statistics */}
            <div className="row mb-4">
              <div className="col-md-2 col-6 mb-3">
                <div className="card text-center">
                  <div className="card-body py-3">
                    <div className="text-primary fw-bold fs-4">{stats.total}</div>
                    <small className="text-muted">Total</small>
                  </div>
                </div>
              </div>
              <div className="col-md-2 col-6 mb-3">
                <div className="card text-center">
                  <div className="card-body py-3">
                    <div className="text-secondary fw-bold fs-4">{stats.new}</div>
                    <small className="text-muted">New</small>
                  </div>
                </div>
              </div>
              <div className="col-md-2 col-6 mb-3">
                <div className="card text-center">
                  <div className="card-body py-3">
                    <div className="text-info fw-bold fs-4">{stats.scheduled}</div>
                    <small className="text-muted">Scheduled</small>
                  </div>
                </div>
              </div>
              <div className="col-md-2 col-6 mb-3">
                <div className="card text-center">
                  <div className="card-body py-3">
                    <div className="text-warning fw-bold fs-4">{stats.in_progress}</div>
                    <small className="text-muted">In Progress</small>
                  </div>
                </div>
              </div>
              <div className="col-md-2 col-6 mb-3">
                <div className="card text-center">
                  <div className="card-body py-3">
                    <div className="text-success fw-bold fs-4">{stats.completed}</div>
                    <small className="text-muted">Completed</small>
                  </div>
                </div>
              </div>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-5">
                <i className="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                <h4 className="text-muted">No Tasks Found</h4>
                <p className="text-muted">
                  {filter === 'all' && priorityFilter === 'all'
                    ? "You don't have any tasks assigned yet."
                    : "No tasks match the selected filters."
                  }
                </p>
              </div>
            ) : (
              <div className="row">
                {tasks.map((task) => (
                  <div key={task._id} className="col-lg-6 col-xl-4 mb-4">
                    <div className={`card h-100 shadow-sm ${isTaskOverdue(task.dueDate) ? 'border-danger' : ''}`}>
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <h6 className="card-title mb-0 text-truncate">
                          {task.title}
                        </h6>
                        <div className="d-flex gap-1">
                          <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          {task.priority && (
                            <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="card-body">
                        <p className="card-text text-muted small mb-3">
                          {task.description || 'No description available'}
                        </p>
                        
                        <div className="mb-2">
                          <small className="text-muted">
                            <i className="fas fa-project-diagram me-1"></i>
                            Project: {task.projectId?.name || 'No project'}
                          </small>
                        </div>

                        {task.dueDate && (
                          <div className="mb-2">
                            <small className={`${isTaskOverdue(task.dueDate) ? 'text-danger fw-bold' : 'text-muted'}`}>
                              <i className={`fas fa-calendar ${isTaskOverdue(task.dueDate) ? 'text-danger' : ''} me-1`}></i>
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                              {isTaskOverdue(task.dueDate) && (
                                <span className="ms-1">
                                  <i className="fas fa-exclamation-triangle text-danger"></i>
                                  OVERDUE
                                </span>
                              )}
                            </small>
                          </div>
                        )}

                        {task.createdBy && (
                          <div className="mb-2">
                            <small className="text-muted">
                              <i className="fas fa-user me-1"></i>
                              Created by: {task.createdBy.firstName} {task.createdBy.lastName}
                            </small>
                          </div>
                        )}

                        <div className="mb-2">
                          <small className="text-muted">
                            <i className="fas fa-clock me-1"></i>
                            Created: {new Date(task.createdAt).toLocaleDateString()}
                          </small>
                        </div>
                      </div>

                      <div className="card-footer bg-transparent">
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            Task #{task._id.slice(-6)}
                          </small>
                          <div className="btn-group btn-group-sm">
                            <button 
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => window.location.href = `/tasks/${task._id}`}
                              title="View task details"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button 
                              className="btn btn-outline-success btn-sm"
                              onClick={() => window.location.href = `/tasks/${task._id}/edit`}
                              title="Edit task"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default MyTasks;