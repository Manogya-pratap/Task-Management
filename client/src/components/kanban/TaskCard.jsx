import React from 'react';
import { useDrag } from 'react-dnd';
import './TaskCard.css';

const TaskCard = ({ task, currentStage, onClick }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'TASK_CARD',
    item: { 
      taskId: task._id, 
      currentStage 
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const getPriorityClass = (priority) => {
    const classes = {
      'Low': 'priority-low',
      'Medium': 'priority-medium',
      'High': 'priority-high',
      'Urgent': 'priority-urgent'
    };
    return classes[priority] || 'priority-medium';
  };

  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining(task.due_date);
  const isOverdue = daysRemaining !== null && daysRemaining < 0;
  const isDueSoon = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3;

  return (
    <div
      ref={drag}
      className={`task-card ${isDragging ? 'task-card-dragging' : ''}`}
      onClick={onClick}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {/* Task Header */}
      <div className="task-card-header">
        <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
          {task.priority}
        </span>
        {task.isCrossDepartment && (
          <span className="badge bg-info ms-2" title="Cross-department task">
            <i className="bi bi-arrow-left-right"></i>
          </span>
        )}
      </div>

      {/* Task Title */}
      <h6 className="task-card-title">{task.title}</h6>

      {/* Task Description */}
      {task.description && (
        <p className="task-card-description">
          {task.description.length > 80 
            ? `${task.description.substring(0, 80)}...` 
            : task.description}
        </p>
      )}

      {/* Progress Bar */}
      {task.progress > 0 && (
        <div className="task-progress">
          <div className="progress" style={{ height: '6px' }}>
            <div
              className="progress-bar"
              role="progressbar"
              style={{ width: `${task.progress}%` }}
              aria-valuenow={task.progress}
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
          <small className="text-muted">{task.progress}%</small>
        </div>
      )}

      {/* Task Footer */}
      <div className="task-card-footer">
        {/* Assigned User */}
        <div className="task-assignee">
          <i className="bi bi-person-circle"></i>
          <span>{task.assigned_to?.name || 'Unassigned'}</span>
        </div>

        {/* Due Date */}
        {task.due_date && (
          <div className={`task-due-date ${isOverdue ? 'text-danger' : isDueSoon ? 'text-warning' : ''}`}>
            <i className="bi bi-calendar"></i>
            <span>
              {isOverdue 
                ? `${Math.abs(daysRemaining)}d overdue`
                : isDueSoon
                ? `${daysRemaining}d left`
                : new Date(task.due_date).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Department Info (for cross-department tasks) */}
      {task.req_dept_id && task.exec_dept_id && (
        <div className="task-departments">
          <small className="text-muted">
            {task.req_dept_id.dept_name} → {task.exec_dept_id.dept_name}
          </small>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
