import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import KanbanBoard from '../components/kanban/KanbanBoard';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import './KanbanPage.css';

const KanbanPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all'); // Default to 'all'
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // TODO: Load projects from API
      // For now, using mock data
      const mockProjects = [
        { _id: '1', name: 'Project Alpha' },
        { _id: '2', name: 'Project Beta' }
      ];
      setProjects(mockProjects);
      // Default to showing all tasks
      setSelectedProject('all');
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleTaskUpdate = () => {
    // Progress board will update via WebSocket
    setShowTaskModal(false);
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="kanban-page">
      <Row className="mb-4">
        <Col>
          <div className="page-header">
            <h2>Progress Board</h2>
            <p className="text-muted">Drag and drop tasks to update their status</p>
          </div>
        </Col>
      </Row>

      {/* Project Selector */}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Select Project</Form.Label>
            <Form.Select
              value={selectedProject || 'all'}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="all">All My Tasks</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6} className="d-flex align-items-end justify-content-end">
          <div className="kanban-legend">
            <span className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#6c757d' }}></span>
              Backlog
            </span>
            <span className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#007bff' }}></span>
              Todo
            </span>
            <span className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#ffc107' }}></span>
              In Progress
            </span>
            <span className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#fd7e14' }}></span>
              Review
            </span>
            <span className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#28a745' }}></span>
              Done
            </span>
          </div>
        </Col>
      </Row>

      {/* Progress Board */}
      <Row>
        <Col>
          <KanbanBoard
            projectId={selectedProject === 'all' ? null : selectedProject}
            onTaskClick={handleTaskClick}
          />
        </Col>
      </Row>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          show={showTaskModal}
          onHide={() => setShowTaskModal(false)}
          task={selectedTask}
          onUpdate={handleTaskUpdate}
          userRole={user?.role}
        />
      )}
    </Container>
  );
};

export default KanbanPage;
