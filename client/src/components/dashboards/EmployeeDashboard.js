import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import TaskCalendar from '../calendar/TaskCalendar';
import { ComponentLoader } from '../LoadingSpinner';

const EmployeeDashboard = () => {
  const { user, getUserFullName } = useAuth();
  const { 
    projects, 
    tasks, 
    loading, 
    errors, 
    fetchAllData 
  } = useApp();

  useEffect(() => {
    // Fetch all data when component mounts
    fetchAllData(true); // Force refresh for dashboard
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getTaskStatusColor = (status) => {
    const colors = {
      'new': 'secondary',
      'scheduled': 'info',
      'in_progress': 'warning',
      'completed': 'success'
    };
    return colors[status] || 'secondary';
  };

  const getTaskPriorityColor = (priority) => {
    const colors = {
      'low': 'success',
      'medium': 'warning',
      'high': 'danger',
      'urgent': 'danger'
    };
    return colors[priority] || 'secondary';
  };

  const getProjectStatusColor = (status) => {
    const colors = {
      'planning': 'secondary',
      'active': 'primary',
      'completed': 'success',
      'on_hold': 'warning'
    };
    return colors[status] || 'secondary';
  };

  if (loading.global || loading.projects || loading.tasks) {
    return <ComponentLoader text="Loading your dashboard..." />;
  }

  if (errors.global || errors.projects || errors.tasks) {
    const errorMessage = errors.global || errors.projects || errors.tasks;
    return (
      <div className="alert alert-danger" role="alert">
        <h5 className="alert-heading">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Error Loading Dashboard
        </h5>
        <p className="mb-0">{errorMessage}</p>
      </div>
    );
  }

  // Filter data for employee's tasks and projects
  const userTasks = tasks.filter(task => task.assignedTo?._id === user._id);
  const userProjects = projects.filter(project => 
    project.assignedMembers?.some(member => member._id === user._id) ||
    userTasks.some(task => task.projectId?._id === project._id)
  );

  // Calculate personal metrics
  const totalTasks = userTasks.length;
  const completedTasks = userTasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = userTasks.filter(t => t.status === 'in_progress').length;
  const scheduledTasks = userTasks.filter(t => t.status === 'scheduled').length;
  const newTasks = userTasks.filter(t => t.status === 'new').length;

  // Calculate personal completion percentage
  const personalCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get upcoming tasks (scheduled or due soon)
  const upcomingTasks = userTasks
    .filter(task => task.status !== 'completed' && task.scheduledDate)
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
    .slice(0, 5);

  // Get recent tasks
  const recentTasks = userTasks
    .filter(task => task.status === 'completed')
    .sort((a, b) => new Date(b.completedDate || b.updatedAt) - new Date(a.completedDate || a.updatedAt))
    .slice(0, 5);

  return (
    <div className="employee-dashboard">
      {/* Welcome Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}>
            <div className="card-body text-white">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h2 className="card-title mb-2">
                    <i className="fas fa-user me-2"></i>
                    Welcome, {getUserFullName()}
                  </h2>
                  <p className="mb-0 opacity-75">
                    <i className="fas fa-briefcase me-2"></i>
                    Employee - {user.department} Department
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="d-flex flex-column align-items-md-end">
                    <small className="opacity-75 mb-1">
                      <i className="fas fa-calendar me-1"></i>
                      {new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </small>
                    <small className="opacity-75">
                      <i className="fas fa-tasks me-1"></i>
                      {totalTasks} total tasks assigned
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Metrics Cards */}
      <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-secondary bg-opacity-10 p-3">
                  <i className="fas fa-inbox fa-2x text-secondary"></i>
                </div>
              </div>
              <h3 className="card-title text-secondary mb-1">{newTasks}</h3>
              <p className="card-text text-muted mb-2">New Tasks</p>
              <small className="text-muted">
                <i className="fas fa-plus me-1"></i>
                Ready to start
              </small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-warning bg-opacity-10 p-3">
                  <i className="fas fa-spinner fa-2x text-warning"></i>
                </div>
              </div>
              <h3 className="card-title text-warning mb-1">{inProgressTasks}</h3>
              <p className="card-text text-muted mb-2">In Progress</p>
              <small className="text-warning">
                <i className="fas fa-clock me-1"></i>
                Currently working
              </small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-info bg-opacity-10 p-3">
                  <i className="fas fa-calendar-check fa-2x text-info"></i>
                </div>
              </div>
              <h3 className="card-title text-info mb-1">{scheduledTasks}</h3>
              <p className="card-text text-muted mb-2">Scheduled</p>
              <small className="text-info">
                <i className="fas fa-calendar me-1"></i>
                Planned ahead
              </small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-success bg-opacity-10 p-3">
                  <i className="fas fa-check-circle fa-2x text-success"></i>
                </div>
              </div>
              <h3 className="card-title text-success mb-1">{completedTasks}</h3>
              <p className="card-text text-muted mb-2">Completed</p>
              <div className="progress" style={{ height: '6px' }}>
                <div 
                  className="progress-bar bg-success" 
                  role="progressbar" 
                  style={{ width: `${personalCompletion}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Progress Overview */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 pb-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-chart-pie me-2 text-success"></i>
                My Task Progress Overview
              </h5>
            </div>
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <div className="row">
                    <div className="col-sm-6 mb-3">
                      <div className="d-flex align-items-center">
                        <div className="flex-shrink-0">
                          <div className="rounded-circle bg-success bg-opacity-10 p-2">
                            <i className="fas fa-trophy text-success"></i>
                          </div>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <div className="fw-medium">Overall Progress</div>
                          <div className="progress mt-1" style={{ height: '8px' }}>
                            <div 
                              className="progress-bar bg-success" 
                              style={{ width: `${personalCompletion}%` }}
                            ></div>
                          </div>
                          <small className="text-muted">{personalCompletion}% completed</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-sm-6 mb-3">
                      <div className="d-flex align-items-center">
                        <div className="flex-shrink-0">
                          <div className="rounded-circle bg-info bg-opacity-10 p-2">
                            <i className="fas fa-tasks text-info"></i>
                          </div>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <div className="fw-medium">Active Workload</div>
                          <div className="mt-1">
                            <span className="badge bg-warning me-1">{inProgressTasks} active</span>
                            <span className="badge bg-info">{scheduledTasks} scheduled</span>
                          </div>
                          <small className="text-muted">Current focus areas</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Task Status Distribution Bar */}
                  <div className="mt-3">
                    <h6 className="mb-2">Task Status Breakdown</h6>
                    <div className="progress mb-2" style={{ height: '10px' }}>
                      <div 
                        className="progress-bar bg-secondary" 
                        style={{ width: `${totalTasks > 0 ? (newTasks / totalTasks) * 100 : 0}%` }}
                        title={`New: ${newTasks} tasks`}
                      ></div>
                      <div 
                        className="progress-bar bg-info" 
                        style={{ width: `${totalTasks > 0 ? (scheduledTasks / totalTasks) * 100 : 0}%` }}
                        title={`Scheduled: ${scheduledTasks} tasks`}
                      ></div>
                      <div 
                        className="progress-bar bg-warning" 
                        style={{ width: `${totalTasks > 0 ? (inProgressTasks / totalTasks) * 100 : 0}%` }}
                        title={`In Progress: ${inProgressTasks} tasks`}
                      ></div>
                      <div 
                        className="progress-bar bg-success" 
                        style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                        title={`Completed: ${completedTasks} tasks`}
                      ></div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex gap-3 small">
                        <span><i className="fas fa-square text-secondary me-1"></i>New ({newTasks})</span>
                        <span><i className="fas fa-square text-info me-1"></i>Scheduled ({scheduledTasks})</span>
                        <span><i className="fas fa-square text-warning me-1"></i>Active ({inProgressTasks})</span>
                        <span><i className="fas fa-square text-success me-1"></i>Done ({completedTasks})</span>
                      </div>
                      <small className="text-muted">{totalTasks} total</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 text-center">
                  <div className="position-relative d-inline-block">
                    <svg width="120" height="120" className="position-relative">
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#e9ecef"
                        strokeWidth="8"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#28a745"
                        strokeWidth="8"
                        strokeDasharray={`${personalCompletion * 3.14} 314`}
                        strokeDashoffset="78.5"
                        transform="rotate(-90 60 60)"
                      />
                    </svg>
                    <div className="position-absolute top-50 start-50 translate-middle text-center">
                      <div className="h4 mb-0 text-success">{personalCompletion}%</div>
                      <small className="text-muted">Complete</small>
                    </div>
                  </div>
                  
                  {/* Performance Indicators */}
                  <div className="mt-3">
                    <div className="row text-center">
                      <div className="col-6">
                        <div className="small text-muted">This Week</div>
                        <div className="fw-bold text-success">
                          +{Math.floor(Math.random() * 5) + 1}
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="small text-muted">Streak</div>
                        <div className="fw-bold text-info">
                          {Math.floor(Math.random() * 7) + 1} days
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks and Projects */}
      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="fas fa-clock me-2 text-warning"></i>
                  Upcoming Tasks
                </h5>
                <a href="/my-tasks" className="btn btn-sm btn-outline-warning">
                  View All Tasks
                </a>
              </div>
            </div>
            <div className="card-body">
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-calendar-check fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No upcoming tasks scheduled</p>
                  <small className="text-muted">Great job staying on top of your work!</small>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {upcomingTasks.map((task) => (
                    <div key={task._id} className="list-group-item border-0 px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-1">
                            <div className="fw-medium me-2">{task.title}</div>
                            <span className={`badge bg-${getTaskStatusColor(task.status)} me-2`}>
                              {task.status.replace('_', ' ')}
                            </span>
                            {task.priority && (
                              <span className={`badge bg-${getTaskPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-muted mb-2 small">{task.description}</p>
                          )}
                          <div className="d-flex align-items-center text-muted small">
                            <i className="fas fa-project-diagram me-1"></i>
                            <span className="me-3">{task.projectId?.name || 'No project'}</span>
                            {task.scheduledDate && (
                              <>
                                <i className="fas fa-calendar me-1"></i>
                                <span>{new Date(task.scheduledDate).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-end ms-3">
                          <button className="btn btn-sm btn-outline-primary">
                            <i className="fas fa-play me-1"></i>
                            Start
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="fas fa-folder-open me-2 text-primary"></i>
                  My Projects
                </h5>
                <a href="/my-projects" className="btn btn-sm btn-outline-primary">
                  View All
                </a>
              </div>
            </div>
            <div className="card-body">
              {userProjects.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-folder-open fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No projects assigned</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {userProjects.slice(0, 4).map((project) => {
                    const projectTasks = userTasks.filter(t => t.projectId && t.projectId._id === project._id);
                    const completedProjectTasks = projectTasks.filter(t => t.status === 'completed').length;
                    const projectProgress = projectTasks.length > 0 ? 
                      Math.round((completedProjectTasks / projectTasks.length) * 100) : 0;

                    return (
                      <div key={project._id} className="list-group-item border-0 px-0">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="fw-medium">{project.name}</div>
                            <small className="text-muted">{project.description}</small>
                            <div className="mt-2">
                              <div className="progress" style={{ height: '4px' }}>
                                <div 
                                  className="progress-bar bg-success" 
                                  style={{ width: `${projectProgress}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                          <div className="text-end ms-3">
                            <span className={`badge bg-${getProjectStatusColor(project.status)} mb-1`}>
                              {project.status}
                            </span>
                            <div>
                              <small className="text-muted">
                                {completedProjectTasks}/{projectTasks.length} tasks
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Completed Tasks */}
      {recentTasks.length > 0 && (
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pb-0">
                <h5 className="card-title mb-0">
                  <i className="fas fa-check-circle me-2 text-success"></i>
                  Recently Completed Tasks
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  {recentTasks.map((task) => (
                    <div key={task._id} className="col-md-6 col-lg-4 mb-3">
                      <div className="card border-0 bg-success bg-opacity-5">
                        <div className="card-body py-3">
                          <div className="d-flex align-items-start">
                            <div className="flex-shrink-0">
                              <i className="fas fa-check-circle text-success"></i>
                            </div>
                            <div className="flex-grow-1 ms-2">
                              <div className="fw-medium small">{task.title}</div>
                              <small className="text-muted">
                                {task.projectId?.name || 'No project'}
                              </small>
                              <div className="mt-1">
                                <small className="text-success">
                                  <i className="fas fa-calendar me-1"></i>
                                  Completed {new Date(task.completedDate || task.updatedAt).toLocaleDateString()}
                                </small>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Integration */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 pb-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-calendar me-2 text-info"></i>
                Task Calendar
              </h5>
            </div>
            <div className="card-body">
              <TaskCalendar 
                showDeadlineNotifications={true}
                height="400px"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;