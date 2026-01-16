import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import KanbanColumn from './KanbanColumn';
import { useSocket } from '../../contexts/SocketContext';
import kanbanService from '../../services/kanbanService';
import './KanbanBoard.css';

const KANBAN_STAGES = ['Backlog', 'Todo', 'In Progress', 'Review', 'Done'];

const STAGE_COLORS = {
  'Backlog': '#6c757d',
  'Todo': '#007bff',
  'In Progress': '#ffc107',
  'Review': '#fd7e14',
  'Done': '#28a745'
};

const KanbanBoard = ({ projectId, onTaskClick }) => {
  const [board, setBoard] = useState({});
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket, connected, joinRoom } = useSocket();

  // Load Kanban board
  const loadBoard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use different endpoint based on whether projectId is provided
      const response = projectId 
        ? await kanbanService.getKanbanBoard(projectId)
        : await kanbanService.getMyKanbanBoard();
      
      setBoard(response.data.board);
      setStats(response.data.stats);
    } catch (err) {
      console.error('Error loading Progress board:', err);
      setError(err.response?.data?.message || 'Failed to load Progress board');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Join project room for real-time updates
  useEffect(() => {
    if (connected && projectId) {
      joinRoom({ projectId });
    }
  }, [connected, projectId, joinRoom]);

  // Listen for WebSocket events
  useEffect(() => {
    if (!socket) return;

    const handleTaskUpdated = (task) => {
      console.log('Task updated:', task);
      loadBoard(); // Reload board
    };

    const handleKanbanMoved = ({ task, oldStage, newStage }) => {
      console.log(`Task moved: ${oldStage} → ${newStage}`);
      loadBoard(); // Reload board
    };

    socket.on('task-updated', handleTaskUpdated);
    socket.on('kanban-moved', handleKanbanMoved);

    return () => {
      socket.off('task-updated', handleTaskUpdated);
      socket.off('kanban-moved', handleKanbanMoved);
    };
  }, [socket, loadBoard]);

  // Handle task drop
  const handleTaskDrop = async (taskId, newStage) => {
    try {
      await kanbanService.moveTaskStage(taskId, newStage);
      // Immediately reload board to show the change
      loadBoard();
    } catch (err) {
      console.error('Error moving task:', err);
      alert(err.response?.data?.message || 'Failed to move task');
      loadBoard(); // Reload to revert UI
    }
  };

  if (loading) {
    return (
      <div className="kanban-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading Progress board...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <h5>Error Loading Board</h5>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={loadBoard}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="kanban-board">
        {/* Board Header */}
        <div className="kanban-header">
          <h4>Progress Board</h4>
          <div className="kanban-stats">
            <span className="badge bg-secondary">
              Total: {stats.total || 0}
            </span>
            {connected && (
              <span className="badge bg-success ms-2">
                <i className="bi bi-circle-fill me-1"></i>
                Live
              </span>
            )}
          </div>
        </div>

        {/* Kanban Columns */}
        <div className="kanban-columns">
          {KANBAN_STAGES.map(stage => (
            <KanbanColumn
              key={stage}
              stage={stage}
              tasks={board[stage] || []}
              color={STAGE_COLORS[stage]}
              count={stats.byStage?.[stage] || 0}
              onTaskDrop={handleTaskDrop}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </div>
    </DndProvider>
  );
};

export default KanbanBoard;
