import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import taskLogService from '../../services/taskLogService';
import './DailyUpdateForm.css';

const DailyUpdateForm = ({ show, onHide, task, onSuccess }) => {
  const [formData, setFormData] = useState({
    progress: task?.progress || 0,
    remark: '',
    hours_worked: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'progress' || name === 'hours_worked' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.remark.trim()) {
      setError('Please provide a remark');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await taskLogService.createDailyUpdate(task._id, formData);
      
      // Success
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form
      setFormData({
        progress: 0,
        remark: '',
        hours_worked: 0
      });
      
      onHide();
    } catch (err) {
      console.error('Error creating daily update:', err);
      setError(err.response?.data?.message || 'Failed to create daily update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Daily Update</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Task Info */}
          <div className="task-info mb-4">
            <h6>{task?.title}</h6>
            <small className="text-muted">
              Current Progress: {task?.progress || 0}%
            </small>
          </div>

          {/* Progress Slider */}
          <Form.Group className="mb-4">
            <Form.Label>
              Progress: <strong>{formData.progress}%</strong>
            </Form.Label>
            <Form.Range
              name="progress"
              value={formData.progress}
              onChange={handleChange}
              min="0"
              max="100"
              step="5"
              className="progress-slider"
            />
            <div className="d-flex justify-content-between">
              <small className="text-muted">0%</small>
              <small className="text-muted">50%</small>
              <small className="text-muted">100%</small>
            </div>
          </Form.Group>

          {/* Remark */}
          <Form.Group className="mb-3">
            <Form.Label>
              Remark <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              rows={4}
              placeholder="Describe what you accomplished today..."
              required
              maxLength={500}
            />
            <Form.Text className="text-muted">
              {formData.remark.length}/500 characters
            </Form.Text>
          </Form.Group>

          {/* Hours Worked */}
          <Form.Group className="mb-3">
            <Form.Label>Hours Worked (Optional)</Form.Label>
            <Form.Control
              type="number"
              name="hours_worked"
              value={formData.hours_worked}
              onChange={handleChange}
              min="0"
              max="24"
              step="0.5"
              placeholder="0"
            />
          </Form.Group>

          {/* Guidelines */}
          <Alert variant="info" className="mb-0">
            <small>
              <strong>Guidelines:</strong>
              <ul className="mb-0 mt-2">
                <li>You can only submit one update per task per day</li>
                <li>Progress should reflect actual completion</li>
                <li>Be specific in your remarks</li>
                <li>Update will be visible to your team lead and MD</li>
              </ul>
            </small>
          </Alert>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Submitting...
              </>
            ) : (
              'Submit Update'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default DailyUpdateForm;
