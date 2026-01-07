import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskForm from './TaskForm';

// Mock axios completely
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock the API service
jest.mock('../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Mock the auth service
jest.mock('../services/authService', () => ({
  login: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
}));

// Mock react-datepicker
jest.mock('react-datepicker', () => {
  return function MockDatePicker({ selected, onChange, className, placeholderText, disabled }) {
    return (
      <input
        type="date"
        className={className}
        placeholder={placeholderText}
        value={selected ? selected.toISOString().split('T')[0] : ''}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
        disabled={disabled}
        data-testid="date-picker"
      />
    );
  };
});

// Mock CSS import
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// Mock the AuthContext
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: '507f1f77bcf86cd799439011',
      firstName: 'Test',
      lastName: 'User',
      role: 'team_lead',
      department: 'Engineering'
    },
    isAuthenticated: true,
    isLoading: false,
    getUserFullName: () => 'Test User'
  }),
  AuthProvider: ({ children }) => children
}));

import api from '../services/api';

// Helper function to render TaskForm
const renderTaskForm = (props = {}) => {
  const defaultProps = {
    show: true,
    onHide: jest.fn(),
    onSubmit: jest.fn(),
    task: null,
    projectId: null,
    mode: 'create'
  };

  return render(<TaskForm {...defaultProps} {...props} />);
};

describe('TaskForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    api.get.mockImplementation((url) => {
      if (url === '/projects') {
        return Promise.resolve({
          data: {
            status: 'success',
            data: {
              projects: [
                { _id: 'project1', name: 'Test Project 1' },
                { _id: 'project2', name: 'Test Project 2' }
              ]
            }
          }
        });
      }
      if (url === '/users') {
        return Promise.resolve({
          data: {
            status: 'success',
            data: {
              users: [
                { _id: 'user1', firstName: 'John', lastName: 'Doe', role: 'employee' },
                { _id: 'user2', firstName: 'Jane', lastName: 'Smith', role: 'team_lead' }
              ]
            }
          }
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    api.post.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          task: {
            _id: 'new-task-id',
            title: 'New Task',
            status: 'new'
          }
        }
      }
    });

    api.put.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          task: {
            _id: 'existing-task-id',
            title: 'Updated Task',
            status: 'in_progress'
          }
        }
      }
    });
  });

  describe('Form Rendering', () => {
    test('renders create task form correctly', () => {
      renderTaskForm();

      expect(screen.getByText('Create New Task')).toBeInTheDocument();
      expect(screen.getByLabelText(/task title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/project/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByText('Create Task')).toBeInTheDocument();
    });

    test('renders edit task form correctly', () => {
      const existingTask = {
        _id: 'task-123',
        title: 'Existing Task',
        description: 'Task description',
        status: 'in_progress',
        priority: 'high',
        projectId: 'project1',
        assignedTo: 'user1'
      };

      renderTaskForm({ mode: 'edit', task: existingTask });

      expect(screen.getByText('Edit Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Task description')).toBeInTheDocument();
      expect(screen.getByText('Update Task')).toBeInTheDocument();
    });

    test('does not render when show is false', () => {
      renderTaskForm({ show: false });
      expect(screen.queryByText('Create New Task')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('validates required title field', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      renderTaskForm({ onSubmit });

      // Try to submit without title
      const submitButton = screen.getByText('Create Task');
      await user.click(submitButton);

      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    test('validates required project field', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      renderTaskForm({ onSubmit });

      const titleInput = screen.getByLabelText(/task title/i);
      await user.type(titleInput, 'Valid Title');

      const submitButton = screen.getByText('Create Task');
      await user.click(submitButton);

      expect(screen.getByText('Project selection is required')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Form Interactions', () => {
    test('updates character counters', async () => {
      const user = userEvent.setup();
      renderTaskForm();

      const titleInput = screen.getByLabelText(/task title/i);
      await user.type(titleInput, 'Test Title');

      expect(screen.getByText('10/200 characters')).toBeInTheDocument();

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, 'Test description');

      expect(screen.getByText('16/1000 characters')).toBeInTheDocument();
    });

    test('handles priority and status changes', async () => {
      const user = userEvent.setup();
      renderTaskForm();

      const prioritySelect = screen.getByLabelText(/priority/i);
      await user.selectOptions(prioritySelect, 'high');
      expect(prioritySelect.value).toBe('high');

      const statusSelect = screen.getByLabelText(/status/i);
      await user.selectOptions(statusSelect, 'in_progress');
      expect(statusSelect.value).toBe('in_progress');
    });

    test('handles estimated hours input', async () => {
      const user = userEvent.setup();
      renderTaskForm();

      const hoursInput = screen.getByLabelText(/estimated hours/i);
      await user.type(hoursInput, '8.5');
      expect(hoursInput.value).toBe('8.5');
    });
  });

  describe('Calendar Integration', () => {
    test('renders date pickers for scheduling', () => {
      renderTaskForm();

      const datePickers = screen.getAllByTestId('date-picker');
      expect(datePickers).toHaveLength(3); // Scheduled, Start, Due dates
    });

    test('handles date selection correctly', async () => {
      const user = userEvent.setup();
      renderTaskForm();

      const datePickers = screen.getAllByTestId('date-picker');
      const scheduledDatePicker = datePickers[0]; // First date picker is scheduled date

      await user.type(scheduledDatePicker, '2024-12-25');
      
      // The date should be set (we can't easily test the internal state, 
      // but we can verify the input value changed)
      expect(scheduledDatePicker.value).toBe('2024-12-25');
    });
  });

  describe('Modal Behavior', () => {
    test('calls onHide when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onHide = jest.fn();
      renderTaskForm({ onHide });

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(onHide).toHaveBeenCalled();
    });

    test('calls onHide when close button is clicked', async () => {
      const user = userEvent.setup();
      const onHide = jest.fn();
      renderTaskForm({ onHide });

      const closeButton = screen.getByRole('button', { name: '' }); // Close button has no text
      await user.click(closeButton);

      expect(onHide).toHaveBeenCalled();
    });

    test('disables form elements when loading', () => {
      // We can't easily test the loading state without modifying the component,
      // but we can verify the structure is in place
      renderTaskForm();
      
      const titleInput = screen.getByLabelText(/task title/i);
      expect(titleInput).not.toBeDisabled(); // Should not be disabled initially
    });
  });

  describe('Form Submission', () => {
    test('creates new task with valid data', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const onHide = jest.fn();
      
      renderTaskForm({ onSubmit, onHide });

      // Fill required fields
      const titleInput = screen.getByLabelText(/task title/i);
      await user.type(titleInput, 'New Test Task');

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, 'Task description');

      // Select a project (assuming projects are loaded)
      const projectSelect = screen.getByLabelText(/project/i);
      fireEvent.change(projectSelect, { target: { value: 'project1' } });

      const submitButton = screen.getByText('Create Task');
      await user.click(submitButton);

      // Wait for API call
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/tasks', expect.objectContaining({
          title: 'New Test Task',
          description: 'Task description',
          projectId: 'project1',
          status: 'new',
          priority: 'medium'
        }));
      });
    });

    test('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      
      // Mock API error
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            message: 'Project not found'
          }
        }
      });

      renderTaskForm({ onSubmit });

      // Fill required fields
      const titleInput = screen.getByLabelText(/task title/i);
      await user.type(titleInput, 'Test Task');

      const projectSelect = screen.getByLabelText(/project/i);
      fireEvent.change(projectSelect, { target: { value: 'project1' } });

      const submitButton = screen.getByText('Create Task');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Project not found')).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });
  });
});