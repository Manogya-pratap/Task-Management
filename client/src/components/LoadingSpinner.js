import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  text = 'Loading...', 
  variant = 'primary',
  fullScreen = false,
  overlay = false,
  className = '',
  showText = true,
  inline = false
}) => {
  const sizeClasses = {
    sm: 'spinner-border-sm',
    md: '',
    lg: 'spinner-border-lg'
  };

  const sizeStyles = {
    sm: { width: '1.5rem', height: '1.5rem' },
    md: { width: '2rem', height: '2rem' },
    lg: { width: '3rem', height: '3rem' }
  };

  const spinnerElement = (
    <div 
      className={`spinner-border text-${variant} ${sizeClasses[size]} ${className}`}
      role="status"
      style={sizeStyles[size]}
    >
      <span className="visually-hidden">{text}</span>
    </div>
  );

  // Inline spinner (no wrapper)
  if (inline) {
    return spinnerElement;
  }

  // Full screen loading
  if (fullScreen) {
    return (
      <div 
        className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
        style={{ 
          backgroundColor: overlay ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
          zIndex: overlay ? 9999 : 'auto'
        }}
      >
        <div className="text-center">
          {spinnerElement}
          {showText && (
            <div className="mt-3">
              <p className="text-muted mb-0">{text}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular loading container
  return (
    <div className="d-flex justify-content-center align-items-center py-4">
      <div className="text-center">
        {spinnerElement}
        {showText && (
          <div className="mt-2">
            <p className="text-muted mb-0">{text}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Specialized loading components
export const PageLoader = ({ text = 'Loading page...' }) => (
  <LoadingSpinner 
    size="lg" 
    text={text} 
    fullScreen={true} 
    overlay={true}
    variant="primary"
  />
);

export const ComponentLoader = ({ text = 'Loading...', size = 'md' }) => (
  <LoadingSpinner 
    size={size} 
    text={text} 
    variant="primary"
    className="my-4"
  />
);

export const ButtonLoader = ({ text = 'Processing...', size = 'sm' }) => (
  <LoadingSpinner 
    size={size} 
    text={text} 
    variant="light"
    inline={true}
    showText={false}
  />
);

export const TableLoader = ({ rows = 3, columns = 4 }) => (
  <div className="table-responsive">
    <table className="table">
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <td key={colIndex}>
                <div className="placeholder-glow">
                  <span className="placeholder col-8"></span>
                </div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const CardLoader = ({ height = '200px' }) => (
  <div className="card" style={{ height }}>
    <div className="card-body">
      <div className="placeholder-glow">
        <span className="placeholder col-6 mb-3"></span>
        <span className="placeholder col-4 mb-2"></span>
        <span className="placeholder col-8 mb-2"></span>
        <span className="placeholder col-5"></span>
      </div>
    </div>
  </div>
);

export const DashboardLoader = () => (
  <div className="container-fluid">
    <div className="row mb-4">
      <div className="col-12">
        <CardLoader height="120px" />
      </div>
    </div>
    <div className="row mb-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="col-lg-3 col-md-6 mb-3">
          <CardLoader height="150px" />
        </div>
      ))}
    </div>
    <div className="row">
      <div className="col-lg-8">
        <CardLoader height="300px" />
      </div>
      <div className="col-lg-4">
        <CardLoader height="300px" />
      </div>
    </div>
  </div>
);

export default LoadingSpinner;