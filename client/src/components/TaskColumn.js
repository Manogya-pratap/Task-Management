import React from "react";
import { useDrop } from "react-dnd";
import TaskCard from "./TaskCard";
// eslint-disable-next-line no-unused-vars
import { StatusIndicator, COLORS } from "./shared/StatusIndicator";

const TaskColumn = ({
  status,
  title,
  color,
  icon = "fas fa-tasks",
  tasks,
  onTaskMove,
  onDragStart,
  onDragEnd,
  draggedTask,
  canAcceptDrop = true,
  onTaskClick = null,
}) => {
  // Set up drop zone for drag and drop
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: "task",
    drop: (item) => {
      if (item.status !== status) {
        onTaskMove(item.id, status);
      }
    },
    canDrop: (item) => canAcceptDrop && item.status !== status,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Determine column styling based on drop state
  const getColumnClasses = () => {
    let classes = "task-column h-100";

    if (isOver && canDrop) {
      classes += " drop-zone-active";
    } else if (canDrop && draggedTask) {
      classes += " drop-zone-available";
    }

    return classes;
  };

  // Get header color based on status
  const getHeaderColor = () => {
    return COLORS.taskStatus[status] || COLORS.taskStatus.new;
  };

  return (
    <div ref={drop} className={getColumnClasses()}>
      <div className="card h-100 border-0 shadow-sm">
        {/* Column Header */}
        <div
          className="card-header border-0 text-white d-flex justify-content-between align-items-center py-2 px-3"
          style={{ backgroundColor: getHeaderColor() }}
        >
          <div className="d-flex align-items-center">
            <i className={`${icon} me-2`}></i>
            <h6 className="mb-0 fw-bold d-none d-md-block">{title}</h6>
            <h6 className="mb-0 fw-bold d-md-none">{title.substring(0, 8)}</h6>
          </div>
          <span className="badge bg-light text-dark rounded-pill">
            {tasks.length}
          </span>
        </div>

        {/* Column Body */}
        <div className="card-body p-2 p-md-3">
          {tasks.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-muted">
                <i className="fas fa-inbox fa-2x mb-2 d-block"></i>
                <small>No {title.toLowerCase()}</small>
              </div>
              {canDrop && draggedTask && (
                <div className="mt-2">
                  <small className="text-primary">
                    <i className="fas fa-arrow-down me-1"></i>
                    Drop task here
                  </small>
                </div>
              )}
            </div>
          ) : (
            <div className="task-list">
              {tasks.map((task, index) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  isDragging={draggedTask && draggedTask._id === task._id}
                  onClick={onTaskClick ? () => onTaskClick(task) : null}
                  className="task-card-item"
                />
              ))}
            </div>
          )}
        </div>

        {/* Drop Zone Indicator */}
        {isOver && canDrop && (
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 border border-primary border-2 rounded">
            <div className="text-center text-primary">
              <i className="fas fa-arrow-down fa-2x mb-2"></i>
              <div className="fw-bold">Drop task here</div>
            </div>
          </div>
        )}
      </div>

      {/* Custom CSS for drag and drop states */}
      <style>{`
        .task-column {
          transition: all 0.2s ease;
        }
        
        .drop-zone-available {
          opacity: 0.8;
        }
        
        .drop-zone-active {
          transform: scale(1.02);
          box-shadow: 0 0 20px rgba(0, 123, 255, 0.3) !important;
        }
        
        .task-list {
          min-height: 100px;
        }
        
        .card-body::-webkit-scrollbar {
          width: 6px;
        }
        
        .card-body::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .card-body::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        
        .card-body::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
};

export default TaskColumn;
