import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import LoginForm from './LoginForm';

// Mock the auth service
jest.mock('../services/authService', () => ({
  login: jest.fn(),
  getToken: jest.fn(),
  getCurrentUser: jest.fn(),
  verifyToken: jest.fn()
}));

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null })
}));

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('LoginForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form with all required elements', () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    // Check for form elements
    expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /username or email/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    
    // Check for branding
    expect(screen.getByText('Daily Activity Tracker')).toBeInTheDocument();
    expect(screen.getByText('Yantrik Automation Pvt. Ltd.')).toBeInTheDocument();
    
    // Check for role-based access information
    expect(screen.getByText('Role-Based Access Control')).toBeInTheDocument();
  });

  test('shows validation errors for empty fields', async () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Enable the button by filling both fields first, then clearing them
    const usernameInput = screen.getByRole('textbox', { name: /username or email/i });
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    
    fireEvent.change(usernameInput, { target: { value: 'test' } });
    fireEvent.change(passwordInput, { target: { value: 'test' } });
    
    // Now clear them and submit
    fireEvent.change(usernameInput, { target: { value: '' } });
    fireEvent.change(passwordInput, { target: { value: '' } });
    
    // Submit the form
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username or email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  test('validates username field when empty', async () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Fill password but leave username empty
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username or email is required')).toBeInTheDocument();
    });
  });

  test('validates password field when empty', async () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByRole('textbox', { name: /username or email/i });
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Fill username but leave password empty
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  test('toggles password visibility', () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const toggleButton = screen.getByLabelText(/show password/i);

    // Initially password should be hidden
    expect(passwordInput.type).toBe('password');

    // Click to show password
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    // Click to hide password again
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  test('disables form during submission', async () => {
    const mockLogin = require('../services/authService').login;
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByRole('textbox', { name: /username or email/i });
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Fill form
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(submitButton);

    // Check that form is disabled during submission
    expect(usernameInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Signing In...')).toBeInTheDocument();
  });

  test('clears validation errors when user starts typing', async () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByRole('textbox', { name: /username or email/i });
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Enable button first, then clear and submit to show validation errors
    fireEvent.change(usernameInput, { target: { value: 'test' } });
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    fireEvent.change(passwordInput, { target: { value: 'test' } });
    
    // Clear username and submit
    fireEvent.change(usernameInput, { target: { value: '' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username or email is required')).toBeInTheDocument();
    });

    // Start typing in username field
    fireEvent.change(usernameInput, { target: { value: 'test' } });

    // Validation error should be cleared
    await waitFor(() => {
      expect(screen.queryByText('Username or email is required')).not.toBeInTheDocument();
    });
  });

  test('displays server error when login fails', async () => {
    const mockLogin = require('../services/authService').login;
    mockLogin.mockResolvedValue({
      success: false,
      message: 'Invalid credentials'
    });

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByRole('textbox', { name: /username or email/i });
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Fill form with valid data
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(submitButton);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    // Check that error alert is displayed with proper styling
    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveClass('alert-danger');
  });

  test('allows user to dismiss error message', async () => {
    const mockLogin = require('../services/authService').login;
    mockLogin.mockResolvedValue({
      success: false,
      message: 'Invalid credentials'
    });

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByRole('textbox', { name: /username or email/i });
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Fill form and submit to trigger error
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    // Click the close button
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    // Error should be dismissed
    await waitFor(() => {
      expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
    });
  });

  test('handles successful login and redirects', async () => {
    const mockLogin = require('../services/authService').login;
    mockLogin.mockResolvedValue({
      success: true,
      user: { role: 'employee', firstName: 'John', lastName: 'Doe' },
      token: 'fake-jwt-token'
    });

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByRole('textbox', { name: /username or email/i });
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Fill form with valid data
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(submitButton);

    // Wait for login to complete and navigation to occur
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  test('trims whitespace from username input', async () => {
    const mockLogin = require('../services/authService').login;
    mockLogin.mockResolvedValue({
      success: true,
      user: { role: 'employee' },
      token: 'fake-jwt-token'
    });

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByRole('textbox', { name: /username or email/i });
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Fill form with username that has leading/trailing spaces
    fireEvent.change(usernameInput, { target: { value: '  testuser  ' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(submitButton);

    // Verify that login was called with trimmed username
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123'
      });
    });
  });

  test('validates that username is not just whitespace', async () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByRole('textbox', { name: /username or email/i });
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Fill form with whitespace-only username
    fireEvent.change(usernameInput, { target: { value: '   ' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(submitButton);

    // Should show validation error for username
    await waitFor(() => {
      expect(screen.getByText('Username or email is required')).toBeInTheDocument();
    });
  });

  test('shows appropriate loading state during form submission', async () => {
    const mockLogin = require('../services/authService').login;
    // Create a promise that we can control
    let resolveLogin;
    const loginPromise = new Promise(resolve => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValue(loginPromise);

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByRole('textbox', { name: /username or email/i });
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Fill form
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(submitButton);

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText('Signing In...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });

    // Resolve the login promise
    resolveLogin({ success: true, user: { role: 'employee' }, token: 'token' });

    // Loading state should be cleared
    await waitFor(() => {
      expect(screen.queryByText('Signing In...')).not.toBeInTheDocument();
    });
  });
});