import { useState, useEffect, useMemo } from 'react';
import moment from 'moment';
import api from '../../services/api';
import './TaskCalendar.css';

const TaskCalendar = ({ projectId, showDeadlineNotifications = true, height = '600px' }) => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(moment());
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Status colors matching the system design
  const statusColors = {
    'new': '#6c757d',
    'scheduled': '#007bff', 
    'in_progress': '#ffc107',
    'completed': '#28a745'
  };

  // Priority colors
  const priorityColors = {
    'low': '#17a2b8',
    'medium': '#6f42c1',
    'high': '#fd7e14',
    'urgent': '#dc3545'
  };

  useEffect(() => {
    fetchCalendarData();
  }, [projectId]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the role-based endpoints we created
      const tasksResponse = await api.get('/projects/my/tasks');
      const projectsResponse = await api.get('/projects/my/projects');

      setTasks(tasksResponse.data.data?.tasks || []);
      setProjects(projectsResponse.data.data?.projects || []);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      setError('Failed to load calendar data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate calendar days for current view
  const calendarDays = useMemo(() => {
    const startOfMonth = currentDate.clone().startOf('month');
    const endOfMonth = currentDate.clone().endOf('month');
    const startOfCalendar = startOfMonth.clone().startOf('week');
    const endOfCalendar = endOfMonth.clone().endOf('week');

    const days = [];
    let day = startOfCalendar.clone();

    while (day.isSameOrBefore(endOfCalendar)) {
      days.push(day.clone());
      day.add(1, 'day');
    }

    return days;
  }, [currentDate]);

  // Get tasks for a specific date
  const getTasksForDate = (date) => {
    if (!Array.isArray(tasks)) return [];
    
    return tasks.filter(task => {
      const taskDate = task.scheduledDate || task.dueDate || task.startDate;
      return taskDate && moment(taskDate).isSame(date, 'day');
    });
  };

  // Get deadline notifications (tasks due within next 7 days)
  const getDeadlineNotifications = () => {
    if (!Array.isArray(tasks)) return [];
    
    const today = moment();
    const nextWeek = today.clone().add(7, 'days');
    
    return tasks.filter(task => {
      if (task.status === 'completed') return false;
      
      const dueDate = task.dueDate;
      if (!dueDate) return false;
      
      const taskDue = moment(dueDate);
      return taskDue.isBetween(today, nextWeek, 'day', '[]');
    }).sort((a, b) => moment(a.dueDate) - moment(b.dueDate));
  };

  // Check if a date has overdue tasks
  const hasOverdueTasks = (date) => {
    if (!Array.isArray(tasks)) return false;
    
    const today = moment();
    if (date.isAfter(today, 'day')) return false;
    
    return tasks.some(task => {
      if (task.status === 'completed') return false;
      const dueDate = task.dueDate;
      return dueDate && moment(dueDate).isSame(date, 'day') && moment(dueDate).isBefore(today, 'day');
    });
  };

  // Check if a date has tasks due today
  const hasTasksDueToday = (date) => {
    if (!Array.isArray(tasks)) return false;
    
    const today = moment();
    if (!date.isSame(today, 'day')) return false;
    
    return tasks.some(task => {
      if (task.status === 'completed') return false;
      const dueDate = task.dueDate;
      return dueDate && moment(dueDate).isSame(date, 'day');
    });
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleDateClick = (date) => {
    const dateTasks = getTasksForDate(date);
    if (dateTasks.length === 1) {
      handleTaskClick(dateTasks[0]);
    } else if (dateTasks.length > 1) {
      // Show a list of tasks for this date
      setSelectedTask({ 
        isMultiple: true, 
        date: date.format('YYYY-MM-DD'),
        tasks: dateTasks 
      });
      setShowTaskModal(true);
    } else {
      // No tasks for this date - could open a "create task" modal
      // For now, just show a message
      setSelectedTask({
        isEmpty: true,
        date: date.format('YYYY-MM-DD'),
        dateFormatted: date.format('MMMM DD, YYYY')
      });
      setShowTaskModal(true);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => prev.clone().add(direction, 'month'));
  };

  const goToToday = () => {
    setCurrentDate(moment());
  };

  if (loading) {
    return (
      <div className="card" style={{ height }}>
        <div className="card-body d-flex justify-content-center align-items-center">
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ height }}>
        <div className="card-body">
          <div className="alert alert-danger">
            {error}
            <button 
              className="btn btn-link p-0 ms-2" 
              onClick={fetchCalendarData}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const deadlineNotifications = showDeadlineNotifications ? getDeadlineNotifications() : [];

  return (
    <div className="task-calendar">
      <div className="card" style={{ height }}>
        <div className="card-header">
          <div className="row align-items-center">
            <div className="col">
              <div className="d-flex align-items-center">
                <h5 className="mb-0 me-3">
                  <i className="fas fa-calendar-alt me-2"></i>
                  Task Calendar
                </h5>
                <div className="btn-group btn-group-sm">
                  <button 
                    className="btn btn-outline-secondary" 
                    onClick={() => navigateMonth(-1)}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <button 
                    className="btn btn-outline-secondary" 
                    onClick={goToToday}
                  >
                    Today
                  </button>
                  <button 
                    className="btn btn-outline-secondary" 
                    onClick={() => navigateMonth(1)}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <h6 className="mb-0 text-muted">
                {currentDate.format('MMMM YYYY')}
              </h6>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {/* Deadline Notifications */}
          {deadlineNotifications.length > 0 && (
            <div className="deadline-notifications p-3 border-bottom bg-warning bg-opacity-10">
              <div className="d-flex align-items-center mb-2">
                <i className="fas fa-exclamation-triangle text-warning me-2"></i>
                <strong>Upcoming Deadlines</strong>
              </div>
              <div className="d-flex flex-wrap gap-2">
                {deadlineNotifications.slice(0, 3).map(task => (
                  <span 
                    key={task._id}
                    className="badge bg-warning text-dark cursor-pointer"
                    onClick={() => handleTaskClick(task)}
                    style={{ cursor: 'pointer' }}
                  >
                    {task.title} - {moment(task.dueDate).format('MMM DD')}
                  </span>
                ))}
                {deadlineNotifications.length > 3 && (
                  <span className="badge bg-secondary">
                    +{deadlineNotifications.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Calendar Grid */}
          <div className="calendar-grid">
            {/* Day Headers */}
            <div className="calendar-header">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="calendar-day-header">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="calendar-body">
              {calendarDays.map(day => {
                const dayTasks = getTasksForDate(day);
                const isCurrentMonth = day.isSame(currentDate, 'month');
                const isToday = day.isSame(moment(), 'day');
                const isOverdue = hasOverdueTasks(day);
                const isDueToday = hasTasksDueToday(day);

                return (
                  <div 
                    key={day.format('YYYY-MM-DD')}
                    className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isOverdue ? 'overdue' : ''} ${isDueToday ? 'due-today' : ''} ${dayTasks.length > 0 ? 'has-tasks' : 'clickable-empty'}`}
                    onClick={() => handleDateClick(day)}
                    style={{ cursor: 'pointer' }}
                    title={dayTasks.length > 0 ? `${dayTasks.length} task(s) on this date` : 'Click to add a task'}
                  >
                    <div className="calendar-day-number">
                      {day.format('D')}
                      {isDueToday && <i className="fas fa-exclamation-circle text-danger ms-1"></i>}
                    </div>
                    
                    <div className="calendar-day-tasks">
                      {dayTasks.slice(0, 3).map(task => (
                        <div 
                          key={task._id}
                          className="calendar-task"
                          style={{ 
                            backgroundColor: statusColors[task.status],
                            borderLeft: `3px solid ${priorityColors[task.priority]}`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskClick(task);
                          }}
                        >
                          <div className="calendar-task-title">
                            {task.title}
                          </div>
                          {task.dueDate && moment(task.dueDate).isSame(day, 'day') && (
                            <div className="calendar-task-time">
                              <i className="fas fa-clock me-1"></i>
                              Due
                            </div>
                          )}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="calendar-task-more">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      <div className={`modal fade ${showTaskModal ? 'show' : ''}`} style={{ display: showTaskModal ? 'block' : 'none' }} tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {selectedTask?.isMultiple ? 
                  `Tasks for ${moment(selectedTask.date).format('MMMM DD, YYYY')}` :
                  'Task Details'
                }
              </h5>
              <button type="button" className="btn-close" onClick={() => setShowTaskModal(false)}></button>
            </div>
            <div className="modal-body">
              {selectedTask?.isEmpty ? (
                <div className="text-center py-4">
                  <i className="fas fa-calendar-plus fa-3x text-muted mb-3"></i>
                  <h5>No Tasks for {selectedTask.dateFormatted}</h5>
                  <p className="text-muted">Would you like to create a new task for this date?</p>
                  <button className="btn btn-primary">
                    <i className="fas fa-plus me-2"></i>
                    Create Task
                  </button>
                </div>
              ) : selectedTask?.isMultiple ? (
                <div>
                  {selectedTask.tasks.map(task => (
                    <div key={task._id} className="border-bottom pb-3 mb-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="mb-1">{task.title}</h6>
                        <div>
                          <span className="badge me-1" style={{ backgroundColor: statusColors[task.status] }}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <span className="badge" style={{ backgroundColor: priorityColors[task.priority] }}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-muted mb-2">{task.description}</p>
                      )}
                      <div className="small text-muted">
                        <i className="fas fa-project-diagram me-1"></i>
                        {projects.find(p => p._id === task.projectId)?.name || 'No project'}
                        {task.assignedTo && (
                          <>
                            <span className="mx-2">•</span>
                            <i className="fas fa-user me-1"></i>
                            {task.assignedTo.firstName} {task.assignedTo.lastName}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedTask && (
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5>{selectedTask.title}</h5>
                    <div>
                      <span 
                        className="badge me-1"
                        style={{ backgroundColor: statusColors[selectedTask.status] }}
                      >
                        {selectedTask.status.replace('_', ' ')}
                      </span>
                      <span 
                        className="badge"
                        style={{ backgroundColor: priorityColors[selectedTask.priority] }}
                      >
                        {selectedTask.priority}
                      </span>
                    </div>
                  </div>
                  
                  {selectedTask.description && (
                    <div className="mb-3">
                      <h6>Description</h6>
                      <p className="text-muted">{selectedTask.description}</p>
                    </div>
                  )}

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <h6>Project</h6>
                        <p className="mb-0">
                          {projects.find(p => p._id === selectedTask.projectId)?.name || 'No project assigned'}
                        </p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <h6>Assigned To</h6>
                        <p className="mb-0">
                          {selectedTask.assignedTo ? 
                            `${selectedTask.assignedTo.firstName} ${selectedTask.assignedTo.lastName}` : 
                            'Unassigned'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      {selectedTask.scheduledDate && (
                        <div className="mb-3">
                          <h6>Scheduled Date</h6>
                          <p className="mb-0">
                            <i className="fas fa-calendar me-1"></i>
                            {moment(selectedTask.scheduledDate).format('MMMM DD, YYYY')}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      {selectedTask.dueDate && (
                        <div className="mb-3">
                          <h6>Due Date</h6>
                          <p className="mb-0">
                            <i className="fas fa-clock me-1"></i>
                            {moment(selectedTask.dueDate).format('MMMM DD, YYYY')}
                            {moment(selectedTask.dueDate).isBefore(moment(), 'day') && 
                              selectedTask.status !== 'completed' && (
                              <span className="badge bg-danger ms-2">Overdue</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>
                Close
              </button>
              {selectedTask && !selectedTask.isMultiple && (
                <button type="button" className="btn btn-primary">
                  <i className="fas fa-edit me-1"></i>
                  Edit Task
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {showTaskModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default TaskCalendar;