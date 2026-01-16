import React from 'react';
import { useDrop } from 'react-dnd';
import TaskCard from './TaskCard';
import './KanbanColumn.css';

const KanbanColumn = ({ stage, tasks, color, count, onTaskDrop, onTaskClick }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'TASK_CARD',
    drop: (item) => {
      if (item.currentStage !== stage) {
        onTaskDrop(item.taskId, stage);
      }
    },
    canDrop: (item) => {
      // Prevent dropping in the same column
      return item.currentStage !== stage;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  const getColumnClass = () => {
    let className = 'kanban-column';
    if (isOver && canDrop) {
      className += ' kanban-column-hover';
    }
    if (isOver && !canDrop) {
      className += ' kanban-column-invalid';
    }
    return className;
  };

  return (
    <div ref={drop} className={getColumnClass()}>
      {/* Column Header */}
      <div className="kanban-column-header" style={{ borderTopColor: color }}>
        <div className="d-flex align-items-center">
          <div 
            className="stage-indicator" 
            style={{ backgroundColor: color }}
          ></div>
          <h5 className="mb-0">{stage}</h5>
        </div>
        <span className="badge bg-secondary">{count}</span>
      </div>

      {/* Column Body */}
      <div className="kanban-column-body">
        {tasks.length === 0 ? (
          <div className="kanban-empty">
            <i className="bi bi-inbox text-muted"></i>
            <p className="text-muted mb-0">No tasks</p>
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task._id}
              task={task}
              currentStage={stage}
              onClick={() => onTaskClick && onTaskClick(task)}
            />
          ))
        )}
      </div>

      {/* Drop Indicator */}
      {isOver && canDrop && (
        <div className="kanban-drop-indicator">
          Drop here
        </div>
      )}
    </div>
  );
};

export default KanbanColumn;
