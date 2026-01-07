import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { TaskCalendar } from '../calendar';
import { ComponentLoader } from '../LoadingSpinner';

const MDDashboard = () => {
  const { user, getUserFullName } = useAuth();
  const { 
    projects, 
    tasks, 
    teams, 
    loading, 
    errors, 
    fetchAllData 
  } = useApp();

  useEffect(() => {
    // Fetch all data when component mounts
    fetchAllData(true); // Force refresh for dashboard
  }, []);

  const getProjectStatusColor = (status) => {
    const colors = {
      'planning': 'secondary',
      'active': 'primary',
      'completed': 'success',
      'on_hold': 'warning'
    };
    return colors[status] || 'secondary';
  };

  const getTaskStatusColor = (status) => {
    const colors = {
      'new': 'secondary',
      'scheduled': 'info',
      'in_progress': 'warning',
      'completed': 'success'
    };
    return colors[status] || 'secondary';
  };

  if (loading.global || loading.projects || loading.tasks || loading.teams) {
    return <ComponentLoader text="Loading company dashboard..." />;
  }

  if (errors.global || errors.projects || errors.tasks || errors.teams) {
    const errorMessage = errors.global || errors.projects || errors.tasks || errors.teams;
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

  // Calculate company-wide metrics
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTeams = teams.length;
  const totalMembers = teams.reduce((sum, team) => sum + (team.members?.length || 0), 0);

  // Calculate completion percentage
  const overallCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate task stats
  const taskStats = {
    statusStats: [
      { _id: 'new', count: tasks.filter(t => t.status === 'new').length },
      { _id: 'scheduled', count: tasks.filter(t => t.status === 'scheduled').length },
      { _id: 'in_progress', count: tasks.filter(t => t.status === 'in_progress').length },
      { _id: 'completed', count: tasks.filter(t => t.status === 'completed').length }
    ].filter(stat => stat.count > 0)
  };

  return (
    <div className="md-dashboard">
      {/* Welcome Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #8B0000 0%, #A52A2A 100%)' }}>
            <div className="card-body text-white">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h2 className="card-title mb-2">
                    <i className="fas fa-crown me-2"></i>
                    Welcome, {getUserFullName()}
                  </h2>
                  <p className="mb-0 opacity-75">
                    <i className="fas fa-building me-2"></i>
                    Managing Director - Company Overview Dashboard
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
                      <i className="fas fa-clock me-1"></i>
                      {new Date().toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-primary bg-opacity-10 p-3">
                  <i className="fas fa-project-diagram fa-2x text-primary"></i>
                </div>
              </div>
              <h3 className="card-title text-primary mb-1">{totalProjects}</h3>
              <p className="card-text text-muted mb-2">Total Projects</p>
              <small className="text-success">
                <i className="fas fa-play me-1"></i>
                {activeProjects} Active
              </small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-warning bg-opacity-10 p-3">
                  <i className="fas fa-tasks fa-2x text-warning"></i>
                </div>
              </div>
              <h3 className="card-title text-warning mb-1">{totalTasks}</h3>
              <p className="card-text text-muted mb-2">Total Tasks</p>
              <small className="text-success">
                <i className="fas fa-check me-1"></i>
                {completedTasks} Completed
              </small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-info bg-opacity-10 p-3">
                  <i className="fas fa-users fa-2x text-info"></i>
                </div>
              </div>
              <h3 className="card-title text-info mb-1">{totalTeams}</h3>
              <p className="card-text text-muted mb-2">Active Teams</p>
              <small className="text-info">
                <i className="fas fa-user me-1"></i>
                {totalMembers} Members
              </small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-success bg-opacity-10 p-3">
                  <i className="fas fa-chart-line fa-2x text-success"></i>
                </div>
              </div>
              <h3 className="card-title text-success mb-1">{overallCompletion}%</h3>
              <p className="card-text text-muted mb-2">Overall Progress</p>
              <div className="progress" style={{ height: '6px' }}>
                <div 
                  className="progress-bar bg-success" 
                  role="progressbar" 
                  style={{ width: `${overallCompletion}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Status Overview */}
      {taskStats && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pb-0">
                <h5 className="card-title mb-0">
                  <i className="fas fa-chart-bar me-2 text-primary"></i>
                  Task Status Distribution
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  {taskStats.statusStats && taskStats.statusStats.map((stat, index) => (
                    <div key={index} className="col-lg-3 col-md-6 mb-3">
                      <div className={`card border-0 bg-${getTaskStatusColor(stat._id)} bg-opacity-10`}>
                        <div className="card-body text-center py-3">
                          <h4 className={`text-${getTaskStatusColor(stat._id)} mb-1`}>
                            {stat.count}
                          </h4>
                          <p className="card-text text-capitalize mb-0">
                            {stat._id.replace('_', ' ')} Tasks
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Visual Progress Bar */}
                <div className="mt-4">
                  <h6 className="mb-3">Company-wide Task Progress</h6>
                  <div className="progress mb-2" style={{ height: '12px' }}>
                    {taskStats.statusStats && taskStats.statusStats.map((stat, index) => {
                      const percentage = totalTasks > 0 ? (stat.count / totalTasks) * 100 : 0;
                      return (
                        <div 
                          key={index}
                          className={`progress-bar bg-${getTaskStatusColor(stat._id)}`}
                          role="progressbar" 
                          style={{ width: `${percentage}%` }}
                          title={`${stat._id}: ${stat.count} tasks (${percentage.toFixed(1)}%)`}
                        ></div>
                      );
                    })}
                  </div>
                  <div className="d-flex justify-content-between small text-muted">
                    <span>Task Distribution</span>
                    <span>{totalTasks} Total Tasks</span>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="row mt-4">
                  <div className="col-md-4">
                    <div className="text-center">
                      <div className="h5 text-success mb-1">{overallCompletion}%</div>
                      <small className="text-muted">Completion Rate</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <div className="h5 text-info mb-1">{activeProjects}</div>
                      <small className="text-muted">Active Projects</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <div className="h5 text-warning mb-1">
                        {tasks.filter(t => t.status === 'in_progress').length}
                      </div>
                      <small className="text-muted">In Progress</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Projects and Teams */}
      <div className="row mb-4">
        <div className="col-lg-8 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="fas fa-project-diagram me-2 text-primary"></i>
                  Recent Projects
                </h5>
                <a href="/projects" className="btn btn-sm btn-outline-primary">
                  View All
                </a>
              </div>
            </div>
            <div className="card-body">
              {projects.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-folder-open fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No projects found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Project Name</th>
                        <th>Team</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.slice(0, 5).map((project) => (
                        <tr key={project._id}>
                          <td>
                            <div className="fw-medium">{project.name}</div>
                            <small className="text-muted">{project.description}</small>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark">
                              {project.teamId?.name || 'Unassigned'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-${getProjectStatusColor(project.status)}`}>
                              {project.status}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="progress me-2" style={{ width: '60px', height: '6px' }}>
                                <div 
                                  className="progress-bar bg-success" 
                                  style={{ width: `${project.completionPercentage || 0}%` }}
                                ></div>
                              </div>
                              <small className="text-muted">
                                {project.completionPercentage || 0}%
                              </small>
                            </div>
                          </td>
                          <td>
                            <small className="text-muted">
                              {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No deadline'}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  <i className="fas fa-users me-2 text-info"></i>
                  Teams Overview
                </h5>
                <a href="/teams" className="btn btn-sm btn-outline-info">
                  View All
                </a>
              </div>
            </div>
            <div className="card-body">
              {teams.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-users fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No teams found</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {teams.slice(0, 6).map((team) => (
                    <div key={team._id} className="list-group-item border-0 px-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-medium">{team.name}</div>
                          <small className="text-muted">{team.department}</small>
                        </div>
                        <div className="text-end">
                          <div className="badge bg-primary rounded-pill">
                            {team.members?.length || 0} members
                          </div>
                          <div>
                            <small className="text-muted">
                              Lead: {team.teamLead?.firstName} {team.teamLead?.lastName}
                            </small>
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
      </div>

      {/* Calendar Integration */}
      <div className="row">
        <div className="col-12">
          <TaskCalendar 
            showDeadlineNotifications={true}
            height="500px"
          />
        </div>
      </div>
    </div>
  );
};

export default MDDashboard;