import React from 'react';

// Consistent color scheme for the application
export const COLORS = {
  // Yantrik Automation maroon branding
  primary: '#8B0000',
  primaryLight: '#A52A2A',
  
  // Task status colors
  taskStatus: {
    new: '#6c757d',        // Gray
    scheduled: '#007bff',   // Blue
    in_progress: '#ffc107', // Yellow/Amber
    completed: '#28a745'    // Green
  },
  
  // Project status colors
  projectStatus: {
    planning: '#6c757d',    // Gray
    active: '#007bff',      // Blue
    completed: '#28a745',   // Green
    on_hold: '#ffc107'      // Yellow
  },
  
  // Priority colors
  priority: {
    low: '#28a745',         // Green
    medium: '#ffc107',      // Yellow
    high: '#fd7e14',        // Orange
    urgent: '#dc3545'       // Red
  },
  
  // Role colors
  role: {
    managing_director: '#dc3545',  // Red
    it_admin: '#ffc107',           // Yellow
    team_lead: '#17a2b8',          // Cyan
    employee: '#28a745'            // Green
  }
};

// Status indicator component
export const StatusIndicator = ({ status, type = 'task', size = 'sm', showText = true, className = '' }) => {
  const getStatusColor = (status, type) => {
    switch (type) {
      case 'task':
        return COLORS.taskStatus[status] || COLORS.taskStatus.new;
      case 'project':
        return COLORS.projectStatus[status] || COLORS.projectStatus.planning;
      case 'priority':
        return COLORS.priority[status] || COLORS.priority.low;
      case 'role':
        return COLORS.role[status] || COLORS.role.employee;
      default:
        return COLORS.taskStatus[status] || COLORS.taskStatus.new;
    }
  };

  const getBootstrapColor = (status, type) => {
    switch (type) {
      case 'task':
        const taskColors = {
          new: 'secondary',
          scheduled: 'info',
          in_progress: 'warning',
          completed: 'success'
        };
        return taskColors[status] || 'secondary';
      case 'project':
        const projectColors = {
          planning: 'secondary',
          active: 'primary',
          completed: 'success',
          on_hold: 'warning'
        };
        return projectColors[status] || 'secondary';
      case 'priority':
        const priorityColors = {
          low: 'success',
          medium: 'warning',
          high: 'danger',
          urgent: 'danger'
        };
        return priorityColors[status] || 'success';
      case 'role':
        const roleColors = {
          managing_director: 'danger',
          it_admin: 'warning',
          team_lead: 'info',
          employee: 'success'
        };
        return roleColors[status] || 'success';
      default:
        return 'secondary';
    }
  };

  const formatStatusText = (status) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const badgeSize = size === 'lg' ? 'fs-6 px-3 py-2' : size === 'md' ? 'px-2 py-1' : '';
  const bootstrapColor = getBootstrapColor(status, type);

  return (
    <span className={`badge bg-${bootstrapColor} ${badgeSize} ${className}`}>
      {showText && formatStatusText(status)}
    </span>
  );
};

// Progress bar component with consistent styling
export const ProgressBar = ({ 
  value, 
  max = 100, 
  color = 'success', 
  height = '6px', 
  showPercentage = false,
  animated = false,
  striped = false,
  className = ''
}) => {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  
  return (
    <div className={`progress ${className}`} style={{ height }}>
      <div 
        className={`progress-bar bg-${color} ${animated ? 'progress-bar-animated' : ''} ${striped ? 'progress-bar-striped' : ''}`}
        role="progressbar" 
        style={{ width: `${percentage}%` }}
        aria-valuenow={value}
        aria-valuemin="0"
        aria-valuemax={max}
      >
        {showPercentage && `${percentage}%`}
      </div>
    </div>
  );
};

// Circular progress indicator
export const CircularProgress = ({ 
  value, 
  max = 100, 
  size = 120, 
  strokeWidth = 8, 
  color = '#28a745',
  backgroundColor = '#e9ecef',
  showPercentage = true,
  className = ''
}) => {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
  const strokeDashoffset = circumference / 4; // Start from top

  return (
    <div className={`position-relative d-inline-block ${className}`}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.3s ease' }}
        />
      </svg>
      {showPercentage && (
        <div className="position-absolute top-50 start-50 translate-middle text-center">
          <div className="h4 mb-0" style={{ color }}>{percentage}%</div>
          <small className="text-muted">Complete</small>
        </div>
      )}
    </div>
  );
};

// Multi-segment progress bar for status distribution
export const MultiProgressBar = ({ 
  segments, 
  height = '10px', 
  showLabels = false,
  className = ''
}) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  
  return (
    <div className={className}>
      <div className="progress" style={{ height }}>
        {segments.map((segment, index) => {
          const percentage = total > 0 ? (segment.value / total) * 100 : 0;
          return (
            <div 
              key={index}
              className={`progress-bar bg-${segment.color || 'primary'}`}
              role="progressbar" 
              style={{ width: `${percentage}%` }}
              title={`${segment.label}: ${segment.value} (${percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      {showLabels && (
        <div className="d-flex justify-content-between align-items-center mt-2">
          <div className="d-flex gap-3 small">
            {segments.map((segment, index) => (
              <span key={index}>
                <i className={`fas fa-square text-${segment.color || 'primary'} me-1`}></i>
                {segment.label} ({segment.value})
              </span>
            ))}
          </div>
          <small className="text-muted">{total} total</small>
        </div>
      )}
    </div>
  );
};

// Metric card component
export const MetricCard = ({ 
  title, 
  value, 
  icon, 
  color = 'primary', 
  subtitle, 
  trend,
  className = ''
}) => {
  return (
    <div className={`card border-0 shadow-sm h-100 ${className}`}>
      <div className="card-body text-center">
        <div className="d-flex align-items-center justify-content-center mb-3">
          <div className={`rounded-circle bg-${color} bg-opacity-10 p-3`}>
            <i className={`${icon} fa-2x text-${color}`}></i>
          </div>
        </div>
        <h3 className={`card-title text-${color} mb-1`}>{value}</h3>
        <p className="card-text text-muted mb-2">{title}</p>
        {subtitle && (
          <small className={`text-${color}`}>
            {trend && <i className={`fas ${trend.direction === 'up' ? 'fa-arrow-up' : 'fa-arrow-down'} me-1`}></i>}
            {subtitle}
          </small>
        )}
      </div>
    </div>
  );
};

export default {
  StatusIndicator,
  ProgressBar,
  CircularProgress,
  MultiProgressBar,
  MetricCard,
  COLORS
};