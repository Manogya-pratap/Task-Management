import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
    
    // Capture console errors
    this.originalConsoleError = console.error;
    console.error = (...args) => {
      // Filter out common React warnings that shouldn't crash the app
      const message = args[0]?.toString() || '';
      const shouldIgnore = [
        'Warning: ReactDOM.render is deprecated',
        'Warning: componentWillReceiveProps has been renamed',
        'Warning: componentWillMount has been renamed',
        'Warning: Failed prop type',
        'Warning: Each child in a list should have a unique "key" prop'
      ].some(warning => message.includes(warning));
      
      if (!shouldIgnore && this.props.captureConsoleErrors) {
        this.handleConsoleError(args);
      }
      
      // Call original console.error
      this.originalConsoleError.apply(console, args);
    };
  }

  componentWillUnmount() {
    // Restore original console.error
    console.error = this.originalConsoleError;
  }

  handleConsoleError = (args) => {
    const errorMessage = args.join(' ');
    const syntheticError = new Error(`Console Error: ${errorMessage}`);
    
    // Only set error state if it's a critical error
    if (this.isCriticalError(errorMessage)) {
      this.setState({
        hasError: true,
        error: syntheticError,
        errorInfo: { componentStack: 'Console Error' },
        errorId: Date.now().toString(36)
      });
    }
  };

  isCriticalError = (message) => {
    const criticalPatterns = [
      'Cannot read property',
      'Cannot read properties',
      'is not a function',
      'Network Error',
      'Failed to fetch',
      'Uncaught TypeError',
      'Uncaught ReferenceError'
    ];
    
    return criticalPatterns.some(pattern => message.includes(pattern));
  };

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      errorId: Date.now().toString(36)
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorId: Date.now().toString(36)
    });

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorId: this.state.errorId
      });
    }
  }

  logErrorToService = (errorData) => {
    // TODO: Send error to logging service (e.g., Sentry, LogRocket, etc.)
    console.error('Production error logged:', errorData);
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    });
  };

  handleReportError = () => {
    const errorReport = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Copy error report to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => alert('Error report copied to clipboard'))
      .catch(() => console.log('Error report:', errorReport));
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback, showDetails = false } = this.props;
      
      // Custom fallback component
      if (Fallback) {
        return (
          <Fallback 
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            onRetry={this.handleRetry}
          />
        );
      }

      // Default error UI
      return (
        <div className="error-boundary-container enhanced-error-boundary">
          <div className="container-fluid py-5">
            <div className="row justify-content-center">
              <div className="col-md-8 col-lg-6">
                <div className="card border-0 shadow-lg error-card">
                  <div className="card-body text-center p-5">
                    <div className="mb-4 error-icon-container">
                      <div className="error-icon-wrapper">
                        <i className="fas fa-exclamation-triangle fa-4x text-warning error-icon"></i>
                        <div className="error-pulse"></div>
                      </div>
                    </div>
                    
                    <h3 className="card-title text-danger mb-3 error-title">
                      Oops! Something went wrong
                    </h3>
                    
                    <p className="text-muted mb-4 error-description">
                      We encountered an unexpected error. Don't worry - your data is safe. 
                      Please try the actions below to continue.
                    </p>

                    <div className="d-flex gap-2 justify-content-center mb-4 flex-wrap">
                      <button 
                        className="btn btn-primary error-btn-primary"
                        onClick={this.handleRetry}
                      >
                        <i className="fas fa-redo me-2"></i>
                        Try Again
                      </button>
                      
                      <button 
                        className="btn btn-outline-secondary error-btn-secondary"
                        onClick={() => window.location.reload()}
                      >
                        <i className="fas fa-sync me-2"></i>
                        Refresh Page
                      </button>

                      <button 
                        className="btn btn-outline-info error-btn-report"
                        onClick={this.handleReportError}
                      >
                        <i className="fas fa-bug me-2"></i>
                        Report Issue
                      </button>
                    </div>

                    {/* Development error details */}
                    {(process.env.NODE_ENV === 'development' || showDetails) && this.state.error && (
                      <div className="text-start error-details">
                        <div className="alert alert-danger error-details-alert">
                          <h6 className="alert-heading d-flex align-items-center">
                            <i className="fas fa-code me-2"></i>
                            Error Details (Development)
                          </h6>
                          <hr />
                          <p className="mb-2">
                            <strong>Error:</strong> {this.state.error.message}
                          </p>
                          <p className="mb-2">
                            <strong>Error ID:</strong> {this.state.errorId}
                          </p>
                          {this.state.error.stack && (
                            <details className="mt-2">
                              <summary className="btn btn-sm btn-outline-danger error-details-btn">
                                <i className="fas fa-list me-1"></i>
                                View Stack Trace
                              </summary>
                              <pre className="mt-2 p-2 bg-light border rounded small error-stack">
                                {this.state.error.stack}
                              </pre>
                            </details>
                          )}
                          {this.state.errorInfo?.componentStack && (
                            <details className="mt-2">
                              <summary className="btn btn-sm btn-outline-warning error-details-btn">
                                <i className="fas fa-sitemap me-1"></i>
                                View Component Stack
                              </summary>
                              <pre className="mt-2 p-2 bg-light border rounded small error-stack">
                                {this.state.errorInfo.componentStack}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="text-muted small error-metadata">
                      <p className="mb-1">
                        <i className="fas fa-clock me-1"></i>
                        Error occurred at: {new Date().toLocaleString()}
                      </p>
                      <p className="mb-0">
                        <i className="fas fa-fingerprint me-1"></i>
                        Error ID: {this.state.errorId || Date.now().toString(36)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Styling */}
          <style jsx>{`
            .enhanced-error-boundary {
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
            }

            .error-card {
              background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
              border-radius: 1rem !important;
              overflow: hidden;
              position: relative;
            }

            .error-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
            }

            .error-icon-container {
              position: relative;
              display: inline-block;
            }

            .error-icon-wrapper {
              position: relative;
              display: inline-block;
            }

            .error-icon {
              position: relative;
              z-index: 2;
              filter: drop-shadow(0 4px 8px rgba(255, 193, 7, 0.3));
            }

            .error-pulse {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 80px;
              height: 80px;
              background: radial-gradient(circle, rgba(255, 193, 7, 0.3) 0%, transparent 70%);
              border-radius: 50%;
              animation: pulse-error 2s infinite;
            }

            @keyframes pulse-error {
              0% {
                transform: translate(-50%, -50%) scale(0.8);
                opacity: 1;
              }
              100% {
                transform: translate(-50%, -50%) scale(1.5);
                opacity: 0;
              }
            }

            .error-title {
              color: var(--primary-maroon, #800020);
              font-weight: 700;
            }

            .error-description {
              font-size: 1.1rem;
              line-height: 1.6;
            }

            .error-btn-primary {
              background: linear-gradient(135deg, var(--primary-maroon, #800020) 0%, var(--primary-maroon-light, #a0002a) 100%);
              border: none;
              border-radius: 0.75rem;
              padding: 0.75rem 1.5rem;
              font-weight: 600;
              transition: all 0.3s ease;
              position: relative;
              overflow: hidden;
            }

            .error-btn-primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(128, 0, 32, 0.3);
            }

            .error-btn-secondary,
            .error-btn-report {
              border-radius: 0.75rem;
              padding: 0.75rem 1.5rem;
              font-weight: 600;
              transition: all 0.3s ease;
            }

            .error-btn-secondary:hover,
            .error-btn-report:hover {
              transform: translateY(-1px);
            }

            .error-details {
              margin-top: 2rem;
            }

            .error-details-alert {
              border: none;
              border-radius: 0.75rem;
              border-left: 4px solid #dc3545;
              background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
            }

            .error-details-btn {
              border-radius: 0.5rem;
              transition: all 0.3s ease;
            }

            .error-details-btn:hover {
              transform: scale(1.05);
            }

            .error-stack {
              max-height: 200px;
              overflow-y: auto;
              font-family: 'Courier New', monospace;
              font-size: 0.8rem;
              line-height: 1.4;
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
            }

            .error-metadata {
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              padding: 1rem;
              border-radius: 0.75rem;
              margin-top: 1rem;
            }

            @media (max-width: 768px) {
              .error-card .card-body {
                padding: 2rem 1rem !important;
              }

              .error-icon {
                font-size: 3rem !important;
              }

              .error-pulse {
                width: 60px;
                height: 60px;
              }

              .d-flex.gap-2 {
                flex-direction: column;
                gap: 0.5rem !important;
              }

              .error-btn-primary,
              .error-btn-secondary,
              .error-btn-report {
                width: 100%;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Specialized error boundaries for different parts of the app
export const DashboardErrorBoundary = ({ children }) => (
  <ErrorBoundary
    fallback={({ error, onRetry }) => (
      <div className="alert alert-danger m-4" role="alert">
        <h4 className="alert-heading">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Dashboard Error
        </h4>
        <p>Failed to load dashboard content. This might be due to a network issue or server problem.</p>
        <hr />
        <div className="d-flex gap-2">
          <button className="btn btn-outline-danger btn-sm" onClick={onRetry}>
            <i className="fas fa-redo me-1"></i>
            Retry
          </button>
          <button 
            className="btn btn-outline-secondary btn-sm" 
            onClick={() => window.location.href = '/dashboard'}
          >
            <i className="fas fa-home me-1"></i>
            Go to Dashboard
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-3">
            <summary>Error Details</summary>
            <pre className="mt-2 small">{error?.message}</pre>
          </details>
        )}
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export const TaskBoardErrorBoundary = ({ children }) => (
  <ErrorBoundary
    fallback={({ error, onRetry }) => (
      <div className="alert alert-warning m-4" role="alert">
        <h4 className="alert-heading">
          <i className="fas fa-tasks me-2"></i>
          Task Board Error
        </h4>
        <p>Unable to load the task board. Please check your connection and try again.</p>
        <hr />
        <button className="btn btn-outline-warning btn-sm" onClick={onRetry}>
          <i className="fas fa-redo me-1"></i>
          Reload Tasks
        </button>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-3">
            <summary>Error Details</summary>
            <pre className="mt-2 small">{error?.message}</pre>
          </details>
        )}
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;