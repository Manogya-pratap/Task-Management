import { useDrag } from "react-dnd";
import { StatusIndicator } from "./shared/StatusIndicator";

const TaskCard = ({
  task,
  onDragStart,
  onDragEnd,
  isDragging = false,
  className = "",
  onClick = null,
}) => {
  // Set up drag functionality
  const [{ isDragging: dragMonitorIsDragging }, drag] = useDrag({
    type: "task",
    item: () => {
      onDragStart && onDragStart(task);
      return {
        id: task._id,
        status: task.status,
        task: task,
      };
    },
    end: () => {
      onDragEnd && onDragEnd();
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  // Get priority gradient
  const getPriorityGradient = (priority) => {
    const gradients = {
      low: "linear-gradient(135deg, #28a745 0%, #34ce57 100%)",
      medium: "linear-gradient(135deg, #ffc107 0%, #ffed4e 100%)",
      high: "linear-gradient(135deg, #fd7e14 0%, #fb923c 100%)",
      urgent: "linear-gradient(135deg, #dc3545 0%, #ef4444 100%)",
    };
    return gradients[priority] || gradients.medium;
  };

  // Get status gradient
  const getStatusGradient = (status) => {
    const gradients = {
      new: "linear-gradient(135deg, #6c757d 0%, #868e96 100%)",
      scheduled: "linear-gradient(135deg, #007bff 0%, #0ea5e9 100%)",
      in_progress: "linear-gradient(135deg, #ffc107 0%, #ffed4e 100%)",
      completed: "linear-gradient(135deg, #28a745 0%, #34ce57 100%)",
    };
    return gradients[status] || gradients.new;
  };

  // Get task age in days
  const getTaskAge = () => {
    const created = new Date(task.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Check if task is overdue
  const isOverdue = () => {
    if (!task.dueDate || task.status === "completed") return false;
    return new Date(task.dueDate) < new Date();
  };

  // Get card styling based on state
  const getCardClasses = () => {
    let classes = `card task-card enhanced-task-card border-0 shadow-sm ${className}`;

    if (isDragging || dragMonitorIsDragging) {
      classes += " dragging";
    }

    if (isOverdue()) {
      classes += " overdue-card";
    }

    if (onClick) {
      classes += " clickable-card";
    }

    return classes;
  };

  // Get status-specific information to display
  const getStatusInfo = () => {
    switch (task.status) {
      case "scheduled":
        return {
          icon: "fas fa-calendar-alt",
          text: task.scheduledDate
            ? formatDate(task.scheduledDate)
            : "Scheduled",
          color: "info",
        };
      case "in_progress":
        return {
          icon: "fas fa-play-circle",
          text: task.startDate
            ? `Started ${formatDate(task.startDate)}`
            : "In Progress",
          color: "warning",
        };
      case "completed":
        return {
          icon: "fas fa-check-circle",
          text: task.completedDate
            ? `Done ${formatDate(task.completedDate)}`
            : "Completed",
          color: "success",
        };
      default:
        return {
          icon: "fas fa-circle",
          text: `Created ${getTaskAge()} day${getTaskAge() !== 1 ? "s" : ""} ago`,
          color: "secondary",
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div
      ref={drag}
      className={getCardClasses()}
      onClick={onClick}
      style={{
        cursor: isDragging ? "grabbing" : onClick ? "pointer" : "grab",
        opacity: isDragging ? 0.8 : 1,
        transform: isDragging ? "rotate(3deg) scale(1.02)" : "none",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Priority Accent Bar */}
      <div
        className="priority-accent-bar"
        style={{
          background: getPriorityGradient(task.priority),
          height: "4px",
          width: "100%",
          borderRadius: "0.5rem 0.5rem 0 0",
        }}
      />

      <div
        className="card-body p-2 p-md-3 position-relative"
        style={{ minHeight: "160px" }}
      >
        {/* Task Header */}
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="flex-grow-1">
            <h6
              className="card-title mb-2 fw-bold task-title"
              style={{ fontSize: "0.9rem", lineHeight: "1.3" }}
            >
              {task.title}
            </h6>
            {task.description && (
              <p
                className="card-text text-muted small mb-1 task-description d-none d-md-block"
                style={{ fontSize: "0.75rem", lineHeight: "1.4" }}
              >
                {task.description.length > 80
                  ? `${task.description.substring(0, 80)}...`
                  : task.description}
              </p>
            )}
            {/* Mobile: Show shorter description */}
            {task.description && (
              <p
                className="card-text text-muted small mb-1 task-description d-md-none"
                style={{ fontSize: "0.7rem", lineHeight: "1.3" }}
              >
                {task.description.length > 50
                  ? `${task.description.substring(0, 50)}...`
                  : task.description}
              </p>
            )}
          </div>

          {/* Priority Badge */}
          {task.priority && task.priority !== "medium" && (
            <span
              className="priority-badge ms-2"
              style={{
                background: getPriorityGradient(task.priority),
                color: "white",
                fontSize: "0.7rem",
                padding: "0.25rem 0.5rem",
                borderRadius: "1rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {task.priority}
            </span>
          )}
        </div>

        {/* Task Metadata */}
        <div className="task-metadata mt-2">
          {/* Status Information */}
          <div className="d-flex align-items-center mb-1">
            <div
              className="status-indicator-dot me-2"
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: getStatusGradient(task.status),
              }}
            />
            <small className="text-muted status-text">{statusInfo.text}</small>
          </div>

          {/* Assigned User */}
          {task.assignedTo && (
            <div className="d-flex align-items-center mb-1 user-info">
              <div className="user-avatar me-2">
                <i
                  className="fas fa-user-circle text-primary"
                  style={{ fontSize: "1.1rem" }}
                ></i>
              </div>
              <small className="text-muted">
                {task.assignedTo.firstName} {task.assignedTo.lastName}
              </small>
            </div>
          )}

          {/* Project Information */}
          {task.projectId && (
            <div className="d-flex align-items-center mb-1 project-info">
              <i
                className="fas fa-folder text-muted me-2"
                style={{ fontSize: "0.7rem" }}
              ></i>
              <small className="text-muted">{task.projectId.name}</small>
            </div>
          )}

          {/* Due Date Warning */}
          {isOverdue() && (
            <div className="d-flex align-items-center overdue-warning">
              <i
                className="fas fa-exclamation-triangle text-danger me-2 pulse-animation"
                style={{ fontSize: "0.7rem" }}
              ></i>
              <small className="text-danger fw-bold">
                Overdue: {formatDate(task.dueDate)}
              </small>
            </div>
          )}

          {/* Due Date (if not overdue) */}
          {task.dueDate && !isOverdue() && task.status !== "completed" && (
            <div className="d-flex align-items-center due-date-info">
              <i
                className="fas fa-clock text-muted me-2"
                style={{ fontSize: "0.7rem" }}
              ></i>
              <small className="text-muted">
                Due: {formatDate(task.dueDate)}
              </small>
            </div>
          )}
        </div>

        {/* Task Footer */}
        <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top task-footer">
          {/* Status Badge */}
          <StatusIndicator
            status={task.status}
            type="task"
            size="sm"
            showText={false}
          />

          {/* Task Actions */}
          <div className="task-actions d-flex align-items-center">
            {task.comments && task.comments.length > 0 && (
              <span className="action-badge me-1">
                <i className="fas fa-comment me-1"></i>
                {task.comments.length}
              </span>
            )}

            {task.attachments && task.attachments.length > 0 && (
              <span className="action-badge">
                <i className="fas fa-paperclip me-1"></i>
                {task.attachments.length}
              </span>
            )}
          </div>
        </div>

        {/* Hover Overlay */}
        <div className="hover-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
          <div className="hover-actions">
            <i className="fas fa-eye text-white me-2"></i>
            <span className="text-white fw-bold">View Details</span>
          </div>
        </div>
      </div>

      {/* Drag Handle */}
      <div className="drag-handle position-absolute top-0 end-0 p-2">
        <i className="fas fa-grip-vertical text-muted drag-icon"></i>
      </div>

      {/* Enhanced CSS */}
      <style jsx>{`
        .enhanced-task-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 0.75rem !important;
          backdrop-filter: blur(10px);
        }

        .enhanced-task-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          transition: left 0.6s ease;
          z-index: 1;
        }

        .enhanced-task-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 30px rgba(128, 0, 32, 0.15) !important;
        }

        .enhanced-task-card:hover::before {
          left: 100%;
        }

        .enhanced-task-card.dragging {
          transform: rotate(3deg) scale(1.05);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3) !important;
          z-index: 1000;
        }

        .overdue-card {
          border: 2px solid #dc3545 !important;
          background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
        }

        .overdue-card .priority-accent-bar {
          background: linear-gradient(
            135deg,
            #dc3545 0%,
            #ef4444 100%
          ) !important;
          height: 6px !important;
        }

        .clickable-card {
          cursor: pointer !important;
        }

        .drag-handle {
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .enhanced-task-card:hover .drag-handle {
          opacity: 1;
        }

        .drag-icon {
          font-size: 0.8rem;
          transition: color 0.3s ease;
        }

        .enhanced-task-card:hover .drag-icon {
          color: var(--primary-maroon, #800020) !important;
        }

        .task-title {
          color: var(--primary-maroon, #800020);
          transition: color 0.3s ease;
        }

        .task-description {
          line-height: 1.4;
        }

        .priority-badge {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
        }

        .enhanced-task-card:hover .priority-badge {
          transform: scale(1.05);
        }

        .status-indicator-dot {
          box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }

        .enhanced-task-card:hover .status-indicator-dot {
          transform: scale(1.2);
          box-shadow: 0 0 12px rgba(0, 0, 0, 0.3);
        }

        .user-avatar {
          transition: transform 0.3s ease;
        }

        .enhanced-task-card:hover .user-avatar {
          transform: scale(1.1);
        }

        .action-badge {
          background: linear-gradient(135deg, #e9ecef 0%, #f8f9fa 100%);
          color: #6c757d;
          font-size: 0.7rem;
          padding: 0.2rem 0.4rem;
          border-radius: 0.5rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .enhanced-task-card:hover .action-badge {
          background: linear-gradient(
            135deg,
            var(--primary-maroon, #800020) 0%,
            var(--primary-maroon-light, #a0002a) 100%
          );
          color: white;
          transform: scale(1.05);
        }

        .task-footer {
          border-top: 1px solid rgba(128, 0, 32, 0.1) !important;
        }

        .hover-overlay {
          background: linear-gradient(
            135deg,
            rgba(128, 0, 32, 0.8) 0%,
            rgba(160, 0, 42, 0.9) 100%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
          border-radius: 0.75rem;
          z-index: 2;
        }

        .clickable-card:hover .hover-overlay {
          opacity: 1;
        }

        .hover-actions {
          text-align: center;
          transform: translateY(10px);
          transition: transform 0.3s ease;
        }

        .clickable-card:hover .hover-actions {
          transform: translateY(0);
        }

        .pulse-animation {
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }

        .overdue-warning {
          background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
          margin: 0.25rem 0;
        }

        .due-date-info,
        .project-info,
        .user-info {
          transition: all 0.3s ease;
        }

        .enhanced-task-card:hover .due-date-info,
        .enhanced-task-card:hover .project-info,
        .enhanced-task-card:hover .user-info {
          transform: translateX(2px);
        }

        .status-text {
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .enhanced-task-card:hover {
            transform: translateY(-2px) scale(1.01);
          }

          .hover-overlay {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default TaskCard;
