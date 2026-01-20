import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
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
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear validation errors when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    const errors = {};
    if (!formData.username.trim()) {
      errors.username = "Username or email is required";
    }
    if (!formData.password) {
      errors.password = "Password is required";
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
        password: formData.password,
      });

      if (result.success) {
        // Determine redirect path based on user role (Requirements 1.3, 1.4, 1.5)
        const from =
          location.state?.from?.pathname ||
          getDefaultRedirectPath(result.user?.role);
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error("Login error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDefaultRedirectPath = (userRole) => {
    // Role-based redirection based on requirements 1.3, 1.4, 1.5
    switch (userRole) {
      case "managing_director":
      case "it_admin":
        return "/dashboard"; // Full system access dashboard
      case "team_lead":
        return "/dashboard"; // Team management dashboard
      case "employee":
        return "/dashboard"; // Personal tasks dashboard
      default:
        return "/dashboard";
    }
  };

  const isFormValid = formData.username && formData.password; // eslint-disable-line no-unused-vars

  return (
    <>
      {/* Enhanced CSS matching landing page theme */}
      <style>{`
        /* Reset all animations and transforms */
        * {
          -webkit-transform: none !important;
          -moz-transform: none !important;
          -ms-transform: none !important;
          -o-transform: none !important;
          transform: none !important;
          -webkit-transition: none !important;
          -moz-transition: none !important;
          -ms-transition: none !important;
          -o-transition: none !important;
          transition: none !important;
          -webkit-animation: none !important;
          -moz-animation: none !important;
          -ms-animation: none !important;
          -o-animation: none !important;
          animation: none !important;
        }

        /* Maroon theme colors matching landing page */
        .login-page {
          background: linear-gradient(135deg, #800020 0%, #A0002A 50%, #B33A3A 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem 0;
        }

        .login-container {
          max-width: 800px;
          width: 100%;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .login-card {
          background: white;
          border-radius: 20px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          border: none;
        }

        .login-header {
          background: linear-gradient(135deg, #600018 0%, #800020 50%, #A0002A 100%);
          color: white;
          text-align: center;
          padding: 1.5rem 2rem 1rem;
          position: relative;
        }

        .login-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.05)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.05)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.03)"/><circle cx="20" cy="80" r="0.5" fill="rgba(255,255,255,0.03)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          opacity: 0.3;
        }

        .company-logo {
          font-size: 2.5rem;
          color: #ffd700;
          margin-bottom: 0.5rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .company-name {
          font-size: 1.3rem;
          font-weight: 800;
          margin-bottom: 0.3rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          letter-spacing: 1px;
        }

        .company-subtitle {
          font-size: 0.85rem;
          opacity: 0.9;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .app-title {
          font-size: 1rem;
          font-weight: 600;
          opacity: 0.95;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          padding-top: 0.5rem;
          margin-top: 0.5rem;
        }

        .login-body {
          padding: 1.5rem 2.5rem;
          background: #fafafa;
        }

        .form-label {
          font-weight: 600;
          color: #800020;
          margin-bottom: 0.75rem;
          font-size: 0.95rem;
        }

        .form-control {
          border: 2px solid #e9ecef;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          font-size: 1rem;
          background: white;
          transition: all 0.2s ease;
        }

        .form-control:focus {
          border-color: #800020;
          box-shadow: 0 0 0 0.2rem rgba(128, 0, 32, 0.15);
          background: white;
        }

        .form-control.is-invalid {
          border-color: #dc3545;
        }

        .input-group-text {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-left: none;
          border-radius: 0 12px 12px 0;
          color: #800020;
        }

        .btn-toggle-password {
          background: transparent;
          border: 2px solid #e9ecef;
          border-left: none;
          border-radius: 0 12px 12px 0;
          color: #800020;
          padding: 0.75rem 1rem;
        }

        .btn-toggle-password:hover {
          background: #f8f9fa;
          color: #600018;
        }

        .btn-login {
          background: linear-gradient(135deg, #800020 0%, #A0002A 100%);
          border: none;
          border-radius: 12px;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          width: 100%;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(128, 0, 32, 0.3);
        }

        .btn-login:hover:not(:disabled) {
          background: linear-gradient(135deg, #600018 0%, #800020 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(128, 0, 32, 0.4);
          color: white;
        }

        .btn-login:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-back {
          background: transparent;
          border: 2px solid #800020;
          color: #800020;
          border-radius: 25px;
          padding: 0.5rem 1.5rem;
          font-weight: 500;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .btn-back:hover {
          background: #800020;
          color: white;
          text-decoration: none;
        }

        .alert {
          border-radius: 12px;
          border: none;
          margin-bottom: 1.5rem;
        }

        .alert-danger {
          background: linear-gradient(135deg, #f8d7da 0%, #f5c2c7 100%);
          color: #721c24;
        }

        .alert-info {
          background: linear-gradient(135deg, #d1ecf1 0%, #b8daff 100%);
          color: #055160;
        }

        .alert-warning {
          background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
          color: #664d03;
        }

        .login-footer {
          background: #f8f9fa;
          text-align: center;
          padding: 1rem;
          border-top: 1px solid #e9ecef;
          color: #6c757d;
          font-size: 0.85rem;
        }

        .security-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(128, 0, 32, 0.1);
          color: #800020;
          padding: 0.4rem 0.8rem;
          border-radius: 25px;
          font-size: 0.8rem;
          font-weight: 500;
          margin-bottom: 0.75rem;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .login-container {
            padding: 0 0.5rem;
            max-width: 95%;
          }
          
          .login-header {
            padding: 1rem 1.5rem 0.75rem;
          }
          
          .company-logo {
            font-size: 2rem;
          }
          
          .company-name {
            font-size: 1.1rem;
          }
          
          .login-body {
            padding: 1.25rem 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .login-container {
            max-width: 100%;
            padding: 0 0.25rem;
          }
          
          .login-header {
            padding: 0.75rem 1rem 0.5rem;
          }
          
          .company-logo {
            font-size: 1.75rem;
          }
          
          .company-name {
            font-size: 1rem;
          }
          
          .company-subtitle {
            font-size: 0.75rem;
          }
          
          .app-title {
            font-size: 0.9rem;
          }
          
          .login-body {
            padding: 1rem;
          }
        }

        /* Loading spinner */
        .spinner-border-sm {
          width: 1rem;
          height: 1rem;
        }

        /* Form validation styles */
        .invalid-feedback {
          display: block;
          font-size: 0.875rem;
          color: #dc3545;
          margin-top: 0.25rem;
        }
      `}</style>

      <div className="login-page">
        <div className="login-container">
          <div className="login-card">
            {/* Enhanced Header with Grand Company Branding */}
            <div className="login-header">
              <div className="company-logo">
                <i className="fas fa-building"></i>
              </div>
              <h1 className="company-name">
                YANTRIK AUTOMATION PVT. LTD.
              </h1>
              <p className="company-subtitle">
                Empowering Excellence Through Innovation
              </p>
              <div className="app-title">
                <i className="fas fa-tasks me-2"></i>
                Daily Activity Tracker
              </div>
            </div>

            {/* Login Form Body */}
            <div className="login-body">
              <form onSubmit={handleSubmit} noValidate>
                {/* Error Messages */}
                {error && (
                  <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    <strong>Login Failed:</strong> {error}
                    <button
                      type="button"
                      className="btn-close"
                      onClick={clearError}
                      aria-label="Close"
                    ></button>
                  </div>
                )}

                {/* Helpful error messages */}
                {error && (error.includes('Invalid credentials') || error.includes('Incorrect username or password')) && (
                  <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    <strong>Need help?</strong>
                    <ul className="mb-0 mt-2">
                      <li>Check your username and password</li>
                      <li>Make sure Caps Lock is off</li>
                      <li>Contact your administrator if you forgot your password</li>
                    </ul>
                  </div>
                )}

                {error && error.includes('User not found') && (
                  <div className="alert alert-warning">
                    <i className="fas fa-user-slash me-2"></i>
                    <strong>Account not found.</strong> Please check your username or contact your administrator.
                  </div>
                )}

                {/* Form Fields - Single Column Layout */}
                {/* Username Field */}
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">
                    <i className="fas fa-user me-2"></i>
                    Username or Email
                  </label>
                  <input
                    type="text"
                    className={`form-control ${
                      error || validationErrors.username ? "is-invalid" : ""
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

                {/* Password Field */}
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    <i className="fas fa-lock me-2"></i>
                    Password
                  </label>
                  <div className="input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`form-control ${
                        error || validationErrors.password ? "is-invalid" : ""
                      }`}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      style={{ borderRight: 'none' }}
                    />
                    <button
                      type="button"
                      className="btn-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isSubmitting}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                    </button>
                  </div>
                  {validationErrors.password && (
                    <div className="invalid-feedback">
                      {validationErrors.password}
                    </div>
                  )}
                </div>

                {/* Security Badge */}
                <div className="text-center mb-3">
                  <div className="security-badge">
                    <i className="fas fa-shield-alt"></i>
                    Secure Login with Role-Based Access Control
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  className="btn-login"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Signing In...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt me-2"></i>
                      Sign In to Dashboard
                    </>
                  )}
                </button>

                {/* Back to Home Button */}
                <div className="text-center mt-3">
                  <button
                    type="button"
                    className="btn-back"
                    onClick={() => navigate('/')}
                  >
                    <i className="fas fa-arrow-left"></i>
                    Back to Home
                  </button>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="login-footer">
              <div className="mb-2">
                <strong>Yantrik Automation Pvt. Ltd.</strong>
              </div>
              <div>
                © 2024 All rights reserved. | Secure Enterprise Login Portal
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginForm;
