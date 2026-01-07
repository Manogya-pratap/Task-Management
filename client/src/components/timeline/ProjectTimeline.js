import { useState, useEffect, useMemo } from 'react';
import Timeline from 'react-calendar-timeline';
import moment from 'moment';
import api from '../../services/api';
import './ProjectTimeline.css';

const ProjectTimeline = ({ projectId, onTaskClick }) => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatuses, setSelectedStatuses] = useState(['new', 'scheduled', 'in_progress', 'completed']);
  const [selectedPriorities, setSelectedPriorities] = useState(['low', 'medium', 'high', 'urgent']);
  const [timeRange, setTimeRange] = useState({
    start: moment().subtract(1, 'month'),
    end: moment().add(2, 'months')
  });

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
    fetchTimelineData();
  }, [projectId]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the role-based endpoints we created
      const tasksResponse = await api.get('/projects/my/tasks');
      const projectsResponse = await api.get('/projects/my/projects');

      setTasks(tasksResponse.data.data?.tasks || []);
      setProjects(projectsResponse.data.data?.projects || []);
    } catch (err) {
      console.error('Error fetching timeline data:', err);
      setError('Failed to load timeline data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Transform tasks into timeline groups and items
  const { groups, items } = useMemo(() => {
    if (!tasks.length || !projects.length) {
      return { groups: [], items: [] };
    }

    // Create groups from projects
    const timelineGroups = projects.map(project => ({
      id: project._id,
      title: project.name,
      rightTitle: `${project.status} | ${project.assignedMembers?.length || 0} members`,
      stackItems: true,
      height: 60
    }));

    // Filter and transform tasks into timeline items
    const timelineItems = tasks
      .filter(task => {
        // Filter by selected statuses and priorities
        return selectedStatuses.includes(task.status) && 
               selectedPriorities.includes(task.priority);
      })
      .map(task => {
        // Determine start and end times for the task
        let startTime, endTime;
        
        if (task.status === 'completed' && task.completedDate) {
          startTime = moment(task.startDate || task.scheduledDate || task.createdAt);
          endTime = moment(task.completedDate);
        } else if (task.status === 'in_progress' && task.startDate) {
          startTime = moment(task.startDate);
          endTime = task.dueDate ? moment(task.dueDate) : moment(task.startDate).add(1, 'day');
        } else if (task.scheduledDate) {
          startTime = moment(task.scheduledDate);
          endTime = task.dueDate ? moment(task.dueDate) : moment(task.scheduledDate).add(1, 'day');
        } else {
          // For new tasks without dates, show them as a point in time
          startTime = moment(task.createdAt);
          endTime = moment(task.createdAt).add(1, 'hour');
        }

        return {
          id: task._id,
          group: task.projectId,
          title: task.title,
          start_time: startTime,
          end_time: endTime,
          itemProps: {
            style: {
              background: statusColors[task.status],
              border: `2px solid ${priorityColors[task.priority]}`,
              borderRadius: '4px',
              color: 'white'
            },
            onDoubleClick: () => onTaskClick && onTaskClick(task)
          },
          task: task // Store full task data for tooltip and interaction
        };
      });

    return { groups: timelineGroups, items: timelineItems };
  }, [tasks, projects, selectedStatuses, selectedPriorities, onTaskClick]);

  // Custom item renderer for better task display
  const itemRenderer = ({ item, itemContext, getItemProps, getResizeProps }) => {
    const { left: leftResizeProps, right: rightResizeProps } = getResizeProps();
    const task = item.task;
    
    return (
      <div {...getItemProps(item.itemProps)}>
        {itemContext.useResizeHandle ? <div {...leftResizeProps} /> : null}
        
        <div 
          className="timeline-item-content"
          title={`${task.title}\nStatus: ${task.status}\nPriority: ${task.priority}\nAssigned: ${task.assignedTo?.firstName || 'Unassigned'}`}
        >
          <div className="timeline-item-title">{task.title}</div>
          <div className="timeline-item-meta">
            <span className="badge bg-light text-dark me-1">{task.status}</span>
            <span className="badge bg-secondary">{task.priority}</span>
          </div>
        </div>
        
        {itemContext.useResizeHandle ? <div {...rightResizeProps} /> : null}
      </div>
    );
  };

  const handleStatusFilterChange = (status) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handlePriorityFilterChange = (priority) => {
    setSelectedPriorities(prev => 
      prev.includes(priority) 
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const handleTimeRangeChange = (visibleTimeStart, visibleTimeEnd) => {
    setTimeRange({
      start: moment(visibleTimeStart),
      end: moment(visibleTimeEnd)
    });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading timeline...</span>
          </div>
          <p className="mt-2">Loading project timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="alert alert-danger">
            {error}
            <button 
              className="btn btn-link p-0 ms-2" 
              onClick={fetchTimelineData}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="row align-items-center">
          <div className="col">
            <h5 className="mb-0">
              Project Timeline
              {projectId && projects.find(p => p._id === projectId)?.name && 
                ` - ${projects.find(p => p._id === projectId).name}`
              }
            </h5>
          </div>
          <div className="col-auto">
            <small className="text-muted">
              {items.length} tasks | {moment(timeRange.start).format('MMM DD')} - {moment(timeRange.end).format('MMM DD, YYYY')}
            </small>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {/* Filters */}
        <div className="timeline-filters p-3 border-bottom">
          <div className="row">
            <div className="col-md-6">
              <label className="form-label fw-bold">Status Filter:</label>
              <div className="d-flex flex-wrap gap-2">
                {['new', 'scheduled', 'in_progress', 'completed'].map(status => (
                  <div key={status} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`status-${status}`}
                      checked={selectedStatuses.includes(status)}
                      onChange={() => handleStatusFilterChange(status)}
                    />
                    <label className="form-check-label" htmlFor={`status-${status}`}>
                      <span 
                        className="status-indicator me-1"
                        style={{ 
                          backgroundColor: statusColors[status],
                          width: '12px',
                          height: '12px',
                          display: 'inline-block',
                          borderRadius: '2px'
                        }}
                      ></span>
                      {status.replace('_', ' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold">Priority Filter:</label>
              <div className="d-flex flex-wrap gap-2">
                {['low', 'medium', 'high', 'urgent'].map(priority => (
                  <div key={priority} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`priority-${priority}`}
                      checked={selectedPriorities.includes(priority)}
                      onChange={() => handlePriorityFilterChange(priority)}
                    />
                    <label className="form-check-label" htmlFor={`priority-${priority}`}>
                      <span 
                        className="priority-indicator me-1"
                        style={{ 
                          backgroundColor: priorityColors[priority],
                          width: '12px',
                          height: '12px',
                          display: 'inline-block',
                          borderRadius: '2px'
                        }}
                      ></span>
                      {priority}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="timeline-container" style={{ height: '500px' }}>
          {groups.length > 0 && items.length > 0 ? (
            <Timeline
              groups={groups}
              items={items}
              defaultTimeStart={timeRange.start}
              defaultTimeEnd={timeRange.end}
              onTimeChange={handleTimeRangeChange}
              itemRenderer={itemRenderer}
              lineHeight={60}
              itemHeightRatio={0.75}
              canMove={false}
              canResize={false}
              canChangeGroup={false}
              stackItems={true}
              traditionalZoom={true}
              buffer={1}
              sidebarWidth={200}
              rightSidebarWidth={150}
            />
          ) : (
            <div className="text-center p-5">
              <p className="text-muted">No tasks found matching the current filters.</p>
              <small>Try adjusting the status or priority filters above.</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectTimeline;