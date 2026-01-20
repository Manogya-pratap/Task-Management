import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';

const ErrorPage = ({ 
  title = "Oops! Something went wrong", 
  message = "We're sorry, but something unexpected happened.",
  showHomeButton = true,
  showLoginButton = true,
  errorCode = null 
}) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="error-page">
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col lg={8} xl={6}>
            <Card className="border-0 shadow-lg">
              <Card.Body className="text-center p-5">
                <div className="error-icon mb-4">
                  <i className="fas fa-exclamation-triangle fa-4x text-warning"></i>
                </div>
                
                {errorCode && (
                  <div className="error-code mb-3">
                    <span className="badge bg-danger fs-6 px-3 py-2">{errorCode}</span>
                  </div>
                )}
                
                <h1 className="error-title mb-3">{title}</h1>
                <p className="error-message text-muted mb-4">{message}</p>
                
                <div className="error-actions">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    className="me-3 mb-3"
                    onClick={handleRefresh}
                  >
                    <i className="fas fa-redo me-2"></i>
                    Try Again
                  </Button>
                  
                  {showHomeButton && (
                    <Button 
                      variant="outline-primary" 
                      size="lg" 
                      className="me-3 mb-3"
                      onClick={handleGoHome}
                    >
                      <i className="fas fa-home me-2"></i>
                      Go Home
                    </Button>
                  )}
                  
                  {showLoginButton && (
                    <Button 
                      variant="outline-secondary" 
                      size="lg" 
                      className="mb-3"
                      onClick={handleGoToLogin}
                    >
                      <i className="fas fa-sign-in-alt me-2"></i>
                      Login
                    </Button>
                  )}
                </div>
                
                <div className="error-help mt-4 pt-4 border-top">
                  <h6 className="text-muted mb-3">Need help?</h6>
                  <div className="help-options">
                    <div className="help-item mb-2">
                      <i className="fas fa-refresh me-2 text-primary"></i>
                      <span>Try refreshing the page</span>
                    </div>
                    <div className="help-item mb-2">
                      <i className="fas fa-wifi me-2 text-success"></i>
                      <span>Check your internet connection</span>
                    </div>
                    <div className="help-item mb-2">
                      <i className="fas fa-user-shield me-2 text-info"></i>
                      <span>Contact your system administrator</span>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
            
            {/* Company Info */}
            <div className="text-center mt-4">
              <div className="company-info">
                <i className="fas fa-building me-2 text-muted"></i>
                <span className="text-muted">Yantrik Automation Pvt. Ltd.</span>
              </div>
              <small className="text-muted d-block mt-1">
                Daily Activity Tracker System
              </small>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Custom Styles */}
      <style jsx>{`
        .error-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          display: flex;
          align-items: center;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .error-icon {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }

        .error-title {
          font-size: 2rem;
          font-weight: 700;
          color: #495057;
        }

        .error-message {
          font-size: 1.1rem;
          line-height: 1.6;
        }

        .error-code {
          font-size: 1.2rem;
          font-weight: 600;
        }

        .help-item {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          color: #6c757d;
        }

        .company-info {
          font-size: 1rem;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .error-title {
            font-size: 1.5rem;
          }

          .error-message {
            font-size: 1rem;
          }

          .error-actions .btn {
            display: block;
            width: 100%;
            margin-bottom: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

// Specific error page components
export const NotFoundPage = () => (
  <ErrorPage
    title="Page Not Found"
    message="The page you're looking for doesn't exist or has been moved."
    errorCode="404"
  />
);

export const UnauthorizedPage = () => (
  <ErrorPage
    title="Access Denied"
    message="You don't have permission to access this page. Please login with appropriate credentials."
    errorCode="403"
    showHomeButton={false}
  />
);

export const ServerErrorPage = () => (
  <ErrorPage
    title="Server Error"
    message="We're experiencing technical difficulties. Please try again in a few moments."
    errorCode="500"
  />
);

export const NetworkErrorPage = () => (
  <ErrorPage
    title="Connection Problem"
    message="Unable to connect to the server. Please check your internet connection and try again."
    errorCode="Network Error"
  />
);

export default ErrorPage;