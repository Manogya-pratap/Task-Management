import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import ErrorBoundary from '../ErrorBoundary';

const MyProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyProjects();
  }, []);

  const fetchMyProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects/my/projects');
      setProjects(response.data.data.projects);
      setError(null);
    } catch (err) {
      console.error('Error fetching my projects:', err);
      setError('Failed to load your projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active': return 'bg-success';
      case 'on_hold': return 'bg-warning';
      case 'completed': return 'bg-primary';
      case 'cancelled': return 'bg-danger';
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

  if (loading) {
    return <LoadingSpinner text="Loading your projects..." />;
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="fas fa-exclamation-triangle me-2"></i>
        {error}
        <button 
          className="btn btn-outline-danger btn-sm ms-3"
          onClick={fetchMyProjects}
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
                  <i className="fas fa-folder-open me-2 text-primary"></i>
                  My Projects
                </h2>
                <p className="text-muted mb-0">
                  Projects you're assigned to or created ({projects.length} total)
                </p>
              </div>
              <button 
                className="btn btn-outline-primary"
                onClick={fetchMyProjects}
                title="Refresh projects"
              >
                <i className="fas fa-sync-alt me-1"></i>
                Refresh
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-5">
                <i className="fas fa-folder-open fa-3x text-muted mb-3"></i>
                <h4 className="text-muted">No Projects Found</h4>
                <p className="text-muted">
                  You haven't been assigned to any projects yet.
                </p>
              </div>
            ) : (
              <div className="row">
                {projects.map((project) => (
                  <div key={project._id} className="col-lg-6 col-xl-4 mb-4">
                    <div className="card h-100 shadow-sm">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <h6 className="card-title mb-0 text-truncate">
                          {project.name}
                        </h6>
                        <span className={`badge ${getStatusBadgeClass(project.status)}`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="card-body">
                        <p className="card-text text-muted small mb-3">
                          {project.description || 'No description available'}
                        </p>
                        
                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <small className="text-muted">Progress</small>
                            <small className="text-muted">
                              {project.stats?.completionPercentage || 0}%
                            </small>
                          </div>
                          <div className="progress" style={{ height: '6px' }}>
                            <div 
                              className="progress-bar bg-success" 
                              style={{ width: `${project.stats?.completionPercentage || 0}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="row text-center mb-3">
                          <div className="col-4">
                            <div className="text-primary fw-bold">
                              {project.stats?.taskCount || 0}
                            </div>
                            <small className="text-muted">Tasks</small>
                          </div>
                          <div className="col-4">
                            <div className="text-info fw-bold">
                              {project.assignedMembers?.length || 0}
                            </div>
                            <small className="text-muted">Members</small>
                          </div>
                          <div className="col-4">
                            <div className="text-warning fw-bold">
                              {project.priority && (
                                <span className={`badge ${getPriorityBadgeClass(project.priority)}`}>
                                  {project.priority}
                                </span>
                              )}
                            </div>
                            <small className="text-muted">Priority</small>
                          </div>
                        </div>

                        <div className="mb-2">
                          <small className="text-muted">
                            <i className="fas fa-users me-1"></i>
                            Team: {project.teamId?.name || 'No team'}
                          </small>
                        </div>

                        <div className="mb-2">
                          <small className="text-muted">
                            <i className="fas fa-calendar me-1"></i>
                            Due: {project.endDate ? 
                              new Date(project.endDate).toLocaleDateString() : 
                              'No due date'
                            }
                          </small>
                        </div>
                      </div>

                      <div className="card-footer bg-transparent">
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            Created by {project.createdBy?.firstName} {project.createdBy?.lastName}
                          </small>
                          <div className="btn-group btn-group-sm">
                            <button 
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => window.location.href = `/projects/${project._id}`}
                              title="View project details"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button 
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => window.location.href = `/tasks?project=${project._id}`}
                              title="View project tasks"
                            >
                              <i className="fas fa-tasks"></i>
                            </button>
                            <button 
                              className="btn btn-outline-info btn-sm"
                              onClick={() => window.location.href = `/timeline?project=${project._id}`}
                              title="View project timeline"
                            >
                              <i className="fas fa-chart-gantt"></i>
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

export default MyProjects;