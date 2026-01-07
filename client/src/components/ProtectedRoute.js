import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ 
  children, 
  requiredRole = null, 
  requiredRoles = [], 
  requiredPermission = null,
  fallbackPath = '/login' 
}) => {
  const { isAuthenticated, isLoading, user, hasRole, hasAnyRole, hasPermission } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check specific role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Access Denied</h4>
          <p>You do not have the required role ({requiredRole}) to access this page.</p>
          <hr />
          <p className="mb-0">Your current role: {user?.role}</p>
        </div>
      </div>
    );
  }

  // Check multiple roles requirement
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Access Denied</h4>
          <p>You do not have any of the required roles to access this page.</p>
          <p>Required roles: {requiredRoles.join(', ')}</p>
          <hr />
          <p className="mb-0">Your current role: {user?.role}</p>
        </div>
      </div>
    );
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Access Denied</h4>
          <p>You do not have the required permission ({requiredPermission}) to access this page.</p>
          <hr />
          <p className="mb-0">Your current role: {user?.role}</p>
        </div>
      </div>
    );
  }

  // All checks passed, render the protected component
  return children;
};

// Higher-order component for role-based protection
export const withRoleProtection = (Component, requiredRole) => {
  return (props) => (
    <ProtectedRoute requiredRole={requiredRole}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

// Higher-order component for permission-based protection
export const withPermissionProtection = (Component, requiredPermission) => {
  return (props) => (
    <ProtectedRoute requiredPermission={requiredPermission}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

// Specific role-based route components
export const AdminRoute = ({ children }) => (
  <ProtectedRoute requiredRoles={['managing_director', 'it_admin']}>
    {children}
  </ProtectedRoute>
);

export const TeamLeadRoute = ({ children }) => (
  <ProtectedRoute requiredRoles={['managing_director', 'it_admin', 'team_lead']}>
    {children}
  </ProtectedRoute>
);

export const EmployeeRoute = ({ children }) => (
  <ProtectedRoute requiredRoles={['managing_director', 'it_admin', 'team_lead', 'employee']}>
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;