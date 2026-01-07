import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const { login, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Clear error when component mounts
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [error, clearError]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation errors when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    const errors = {};
    if (!formData.username.trim()) {
      errors.username = 'Username or email is required';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setValidationErrors({});

    try {
      const result = await login({
        username: formData.username.trim(),
        password: formData.password
      });

      if (result.success) {
        // Determine redirect path based on user role (Requirements 1.3, 1.4, 1.5)
        const from = location.state?.from?.pathname || getDefaultRedirectPath(result.user?.role);
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDefaultRedirectPath = (userRole) => {
    // Role-based redirection based on requirements 1.3, 1.4, 1.5
    switch (userRole) {
      case 'managing_director':
      case 'it_admin':
        return '/dashboard'; // Full system access dashboard
      case 'team_lead':
        return '/dashboard'; // Team management dashboard
      case 'employee':
        return '/dashboard'; // Personal tasks dashboard
      default:
        return '/dashboard';
    }
  };

  const isFormValid = formData.username.trim() && formData.password;

  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="row w-100">
        <div className="col-12 col-md-6 col-lg-4 mx-auto">
          <div className="card shadow-lg border-0">
            <div className="card-header text-white text-center py-4" style={{ backgroundColor: 'var(--primary-maroon)' }}>
              <h3 className="mb-0">
                <i className="fas fa-user-circle me-2"></i>
                Daily Activity Tracker
              </h3>
              <p className="mb-0 mt-2 opacity-75">Yantrik Automation Pvt. Ltd.</p>
            </div>
            
            <div className="card-body p-4">
              <form onSubmit={handleSubmit} noValidate>
                {error && (
                  <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={clearError}
                      aria-label="Close"
                    ></button>
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="username" className="form-label fw-semibold">
                    <i className="fas fa-user me-2" style={{ color: 'var(--primary-maroon)' }}></i>
                    Username or Email
                  </label>
                  <input
                    type="text"
                    className={`form-control form-control-lg ${
                      error || validationErrors.username ? 'is-invalid' : ''
                    }`}
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter your username or email"
                    required
                    autoComplete="username"
                    disabled={isSubmitting}
                  />
                  {validationErrors.username && (
                    <div className="invalid-feedback">
                      {validationErrors.username}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="password" className="form-label fw-semibold">
                    <i className="fas fa-lock me-2" style={{ color: 'var(--primary-maroon)' }}></i>
                    Password
                  </label>
                  <div className="input-group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`form-control form-control-lg ${
                        error || validationErrors.password ? 'is-invalid' : ''
                      }`}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isSubmitting}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {validationErrors.password && (
                    <div className="invalid-feedback d-block">
                      {validationErrors.password}
                    </div>
                  )}
                </div>

                <div className="d-grid">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Signing In...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Sign In
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="text-center mt-4">
                <small className="text-muted">
                  <i className="fas fa-shield-alt me-1"></i>
                  Secure login with role-based access control
                </small>
              </div>
            </div>

            <div className="card-footer bg-light text-center py-3">
              <small className="text-muted">
                © 2024 Yantrik Automation Pvt. Ltd. All rights reserved.
              </small>
            </div>
          </div>

          {/* Demo credentials info */}
          <div className="card mt-3 border-info">
            <div className="card-body">
              <h6 className="card-title text-info">
                <i className="fas fa-info-circle me-2"></i>
                Role-Based Access Control
              </h6>
              <p className="card-text small mb-2">
                <strong>Access Levels by Role:</strong>
              </p>
              <ul className="small mb-2">
                <li><strong>MD/IT Admin:</strong> Full system access - all features and data</li>
                <li><strong>Team Lead:</strong> Team management, project creation, task assignment</li>
                <li><strong>Employee:</strong> Personal tasks and assigned project access only</li>
              </ul>
              <div className="alert alert-warning alert-sm py-2 mb-0">
                <small>
                  <i className="fas fa-shield-alt me-1"></i>
                  <strong>Security:</strong> Users can only access features appropriate to their role
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;