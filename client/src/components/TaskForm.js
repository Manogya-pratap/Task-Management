import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { StatusIndicator } from './shared/StatusIndicator';
import 'react-datepicker/dist/react-datepicker.css';

const TaskForm = ({ 
  show, 
  onHide, 
  onSubmit, 
  task = null, 
  projectId = null,
  mode = 'create' // 'create' or 'edit'
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'new',
    priority: 'medium',
    projectId: projectId || '',
    assignedTo: '',
    scheduledDate: null,
    startDate: null,
    dueDate: null,
    estimatedHours: 0,
    tags: []
  });

  // Validation state
  const [validation, setValidation] = useState({
    title: { isValid: true, message: '' },
    projectId: { isValid: true, message: '' },
    scheduledDate: { isValid: true, message: '' },
    dueDate: { isValid: true, message: '' }
  });

  // Initialize form data when task prop changes
  useEffect(() => {
    if (task && mode === 'edit') {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'new',
        priority: task.priority || 'medium',
        projectId: task.projectId?._id || task.projectId || '',
        assignedTo: task.assignedTo?._id || task.assignedTo || '',
        scheduledDate: task.scheduledDate ? new Date(task.scheduledDate) : null,
        startDate: task.startDate ? new Date(task.startDate) : null,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        estimatedHours: task.estimatedHours || 0,
        tags: task.tags || []
      });
    } else if (mode === 'create') {
      setFormData({
        title: '',
        description: '',
        status: 'new',
        priority: 'medium',
        projectId: projectId || '',
        assignedTo: '',
        scheduledDate: null,
        startDate: null,
        dueDate: null,
        estimatedHours: 0,
        tags: []
      });
    }
  }, [task, mode, projectId]);

  // Fetch projects and team members when modal opens
  useEffect(() => {
    if (show) {
      fetchProjects();
      fetchTeamMembers();
    }
  }, [show]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      if (response.data.status === 'success') {
        setProjects(response.data.data.projects || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get('/users');
      if (response.data.status === 'success') {
        const members = response.data.data.users || [];
        setTeamMembers(members);
        setFilteredMembers(members);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  };

  // Filter team members based on search term
  useEffect(() => {
    if (memberSearchTerm.trim() === '') {
      setFilteredMembers(teamMembers);
    } else {
      const filtered = teamMembers.filter(member => 
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        member.role.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(memberSearchTerm.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  }, [memberSearchTerm, teamMembers]);

  // Handle form field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error when user starts typing
    if (validation[name] && !validation[name].isValid) {
      setValidation(prev => ({
        ...prev,
        [name]: { isValid: true, message: '' }
      }));
    }
  };

  // Handle date changes
  const handleDateChange = (date, field) => {
    setFormData(prev => ({
      ...prev,
      [field]: date
    }));
    
    // Clear validation error
    if (validation[field] && !validation[field].isValid) {
      setValidation(prev => ({
        ...prev,
        [field]: { isValid: true, message: '' }
      }));
    }
  };

  // Handle tags input
  const handleTagsChange = (e) => {
    const tagsString = e.target.value;
    const tagsArray = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setFormData(prev => ({
      ...prev,
      tags: tagsArray
    }));
  };

  // Validate form
  const validateForm = () => {
    const newValidation = { ...validation };
    let isValid = true;

    // Title validation
    if (!formData.title.trim()) {
      newValidation.title = { isValid: false, message: 'Title is required' };
      isValid = false;
    } else if (formData.title.length > 200) {
      newValidation.title = { isValid: false, message: 'Title cannot exceed 200 characters' };
      isValid = false;
    } else {
      newValidation.title = { isValid: true, message: '' };
    }

    // Project validation
    if (!formData.projectId) {
      newValidation.projectId = { isValid: false, message: 'Project selection is required' };
      isValid = false;
    } else {
      newValidation.projectId = { isValid: true, message: '' };
    }

    // Scheduled date validation
    if (formData.status === 'scheduled' && !formData.scheduledDate) {
      newValidation.scheduledDate = { isValid: false, message: 'Scheduled date is required for scheduled tasks' };
      isValid = false;
    } else {
      newValidation.scheduledDate = { isValid: true, message: '' };
    }

    // Due date validation
    if (formData.dueDate && formData.startDate && formData.dueDate < formData.startDate) {
      newValidation.dueDate = { isValid: false, message: 'Due date must be after start date' };
      isValid = false;
    } else {
      newValidation.dueDate = { isValid: true, message: '' };
    }

    setValidation(newValidation);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        scheduledDate: formData.scheduledDate ? formData.scheduledDate.toISOString() : null,
        startDate: formData.startDate ? formData.startDate.toISOString() : null,
        dueDate: formData.dueDate ? formData.dueDate.toISOString() : null,
        assignedTo: formData.assignedTo || null
      };

      let response;
      if (mode === 'edit' && task) {
        response = await api.put(`/tasks/${task._id}`, submitData);
      } else {
        response = await api.post('/tasks', submitData);
      }

      if (response.data.status === 'success') {
        onSubmit && onSubmit(response.data.data.task);
        onHide();
      }
    } catch (err) {
      console.error('Error submitting task:', err);
      setError(err.response?.data?.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    setError(null);
    setValidation({
      title: { isValid: true, message: '' },
      projectId: { isValid: true, message: '' },
      scheduledDate: { isValid: true, message: '' },
      dueDate: { isValid: true, message: '' }
    });
    onHide();
  };

  if (!show) return null;

  return (
    <div className="modal show d-block task-form-modal" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content task-form-content">
          {/* Modal Header */}
          <div className="modal-header task-form-header">
            <h5 className="modal-title text-white fw-bold">
              <i className={`fas ${mode === 'edit' ? 'fa-edit' : 'fa-plus'} me-2`}></i>
              {mode === 'edit' ? 'Edit Task' : 'Create New Task'}
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={handleClose}
              disabled={loading}
            ></button>
          </div>

          {/* Modal Body */}
          <div className="modal-body task-form-body">
            {error && (
              <div className="alert alert-danger task-form-alert" role="alert">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="row">
                {/* Title */}
                <div className="col-12 mb-3">
                  <label htmlFor="title" className="form-label task-form-label">
                    Task Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control task-form-input ${!validation.title.isValid ? 'is-invalid' : ''}`}
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter task title"
                    maxLength={200}
                    disabled={loading}
                  />
                  {!validation.title.isValid && (
                    <div className="invalid-feedback">{validation.title.message}</div>
                  )}
                  <div className="form-text task-form-text">
                    {formData.title.length}/200 characters
                  </div>
                </div>

                {/* Description */}
                <div className="col-12 mb-3">
                  <label htmlFor="description" className="form-label task-form-label">Description</label>
                  <textarea
                    className="form-control task-form-textarea"
                    id="description"
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter task description (optional)"
                    maxLength={1000}
                    disabled={loading}
                  />
                  <div className="form-text task-form-text">
                    {formData.description.length}/1000 characters
                  </div>
                </div>

                {/* Project and Status */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="projectId" className="form-label task-form-label">
                    Project <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select task-form-select ${!validation.projectId.isValid ? 'is-invalid' : ''}`}
                    id="projectId"
                    name="projectId"
                    value={formData.projectId}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="">Select a project</option>
                    {projects.map(project => (
                      <option key={project._id} value={project._id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  {!validation.projectId.isValid && (
                    <div className="invalid-feedback">{validation.projectId.message}</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="status" className="form-label task-form-label">Status</label>
                  <select
                    className="form-select task-form-select"
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="new">New</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <div className="mt-2">
                    <StatusIndicator status={formData.status} type="task" size="sm" />
                  </div>
                </div>

                {/* Priority and Assigned To */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="priority" className="form-label task-form-label">Priority</label>
                  <select
                    className="form-select task-form-select"
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="assignedTo" className="form-label task-form-label">Assigned To</label>
                  <div className="task-assignment-container">
                    <input
                      type="text"
                      className="form-control task-form-input mb-2"
                      placeholder="Search team members..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                      disabled={loading}
                    />
                    <select
                      className="form-select task-form-select"
                      id="assignedTo"
                      name="assignedTo"
                      value={formData.assignedTo}
                      onChange={handleInputChange}
                      disabled={loading}
                    >
                      <option value="">Unassigned</option>
                      {filteredMembers.map(member => (
                        <option key={member._id} value={member._id}>
                          {member.firstName} {member.lastName} ({member.role})
                        </option>
                      ))}
                    </select>
                    {filteredMembers.length === 0 && memberSearchTerm && (
                      <small className="text-muted">No members found matching "{memberSearchTerm}"</small>
                    )}
                  </div>
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label task-form-label">
                    Scheduled Date
                    {formData.status === 'scheduled' && <span className="text-danger"> *</span>}
                  </label>
                  <DatePicker
                    selected={formData.scheduledDate}
                    onChange={(date) => handleDateChange(date, 'scheduledDate')}
                    className={`form-control task-form-datepicker ${!validation.scheduledDate.isValid ? 'is-invalid' : ''}`}
                    placeholderText="Select scheduled date"
                    dateFormat="MM/dd/yyyy"
                    minDate={new Date()}
                    disabled={loading}
                  />
                  {!validation.scheduledDate.isValid && (
                    <div className="invalid-feedback d-block">{validation.scheduledDate.message}</div>
                  )}
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label task-form-label">Start Date</label>
                  <DatePicker
                    selected={formData.startDate}
                    onChange={(date) => handleDateChange(date, 'startDate')}
                    className="form-control task-form-datepicker"
                    placeholderText="Select start date"
                    dateFormat="MM/dd/yyyy"
                    disabled={loading}
                  />
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label task-form-label">Due Date</label>
                  <DatePicker
                    selected={formData.dueDate}
                    onChange={(date) => handleDateChange(date, 'dueDate')}
                    className={`form-control task-form-datepicker ${!validation.dueDate.isValid ? 'is-invalid' : ''}`}
                    placeholderText="Select due date"
                    dateFormat="MM/dd/yyyy"
                    minDate={formData.startDate || new Date()}
                    disabled={loading}
                  />
                  {!validation.dueDate.isValid && (
                    <div className="invalid-feedback d-block">{validation.dueDate.message}</div>
                  )}
                </div>

                {/* Estimated Hours and Tags */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="estimatedHours" className="form-label task-form-label">Estimated Hours</label>
                  <input
                    type="number"
                    className="form-control task-form-input"
                    id="estimatedHours"
                    name="estimatedHours"
                    value={formData.estimatedHours}
                    onChange={handleInputChange}
                    min="0"
                    step="0.5"
                    placeholder="0"
                    disabled={loading}
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="tags" className="form-label task-form-label">Tags</label>
                  <input
                    type="text"
                    className="form-control task-form-input"
                    id="tags"
                    value={formData.tags.join(', ')}
                    onChange={handleTagsChange}
                    placeholder="Enter tags separated by commas"
                    disabled={loading}
                  />
                  <div className="form-text task-form-text">
                    Separate multiple tags with commas
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="mt-2 task-tags-preview">
                      {formData.tags.map((tag, index) => (
                        <span key={index} className="badge bg-gradient task-tag-badge me-1">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer task-form-footer">
            <button 
              type="button" 
              className="btn btn-secondary task-form-btn-secondary" 
              onClick={handleClose}
              disabled={loading}
            >
              <i className="fas fa-times me-2"></i>
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary task-form-btn-primary" 
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading && (
                <span className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </span>
              )}
              <i className={`fas ${mode === 'edit' ? 'fa-save' : 'fa-plus'} me-1`}></i>
              {mode === 'edit' ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Styling */}
      <style jsx>{`
        .task-form-modal .modal-content {
          border: none;
          border-radius: 1rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        }

        .task-form-header {
          background: linear-gradient(135deg, var(--primary-maroon, #800020) 0%, var(--primary-maroon-light, #a0002a) 100%);
          border: none;
          padding: 1.5rem;
        }

        .task-form-body {
          padding: 2rem;
          background: rgba(255, 255, 255, 0.95);
        }

        .task-form-footer {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border: none;
          padding: 1.5rem;
        }

        .task-form-label {
          font-weight: 600;
          color: var(--primary-maroon, #800020);
          margin-bottom: 0.5rem;
        }

        .task-form-input,
        .task-form-select,
        .task-form-textarea,
        .task-form-datepicker {
          border: 2px solid #e9ecef;
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(5px);
        }

        .task-form-input:focus,
        .task-form-select:focus,
        .task-form-textarea:focus,
        .task-form-datepicker:focus {
          border-color: var(--primary-maroon, #800020);
          box-shadow: 0 0 0 0.2rem rgba(128, 0, 32, 0.25);
          background: rgba(255, 255, 255, 1);
          transform: translateY(-1px);
        }

        .task-form-text {
          color: #6c757d;
          font-size: 0.875rem;
        }

        .task-assignment-container {
          position: relative;
        }

        .task-tags-preview {
          max-height: 100px;
          overflow-y: auto;
        }

        .task-tag-badge {
          background: linear-gradient(135deg, var(--primary-maroon, #800020) 0%, var(--primary-maroon-light, #a0002a) 100%) !important;
          color: white;
          border-radius: 1rem;
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .task-form-btn-primary {
          background: linear-gradient(135deg, var(--primary-maroon, #800020) 0%, var(--primary-maroon-light, #a0002a) 100%);
          border: none;
          border-radius: 0.75rem;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .task-form-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(128, 0, 32, 0.3);
        }

        .task-form-btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .task-form-btn-primary:hover::before {
          left: 100%;
        }

        .task-form-btn-secondary {
          border: 2px solid #6c757d;
          border-radius: 0.75rem;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          transition: all 0.3s ease;
          background: transparent;
        }

        .task-form-btn-secondary:hover {
          background: #6c757d;
          transform: translateY(-1px);
        }

        .task-form-alert {
          border: none;
          border-radius: 0.75rem;
          border-left: 4px solid #dc3545;
          background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
        }

        @media (max-width: 768px) {
          .task-form-body {
            padding: 1rem;
          }
          
          .task-form-header,
          .task-form-footer {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default TaskForm;