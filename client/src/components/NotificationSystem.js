import React from 'react';
import { useApp } from '../contexts/AppContext';

const NotificationSystem = () => {
  const { ui, removeNotification } = useApp();

  if (!ui.notifications || ui.notifications.length === 0) {
    return null;
  }

  const getNotificationClass = (type) => {
    const baseClasses = 'alert alert-dismissible fade show';
    switch (type) {
      case 'success':
        return `${baseClasses} alert-success`;
      case 'error':
        return `${baseClasses} alert-danger`;
      case 'warning':
        return `${baseClasses} alert-warning`;
      case 'info':
        return `${baseClasses} alert-info`;
      default:
        return `${baseClasses} alert-primary`;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return 'fas fa-check-circle';
      case 'error':
        return 'fas fa-exclamation-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'info':
        return 'fas fa-info-circle';
      default:
        return 'fas fa-bell';
    }
  };

  return (
    <div 
      className="notification-system position-fixed top-0 end-0 p-3"
      style={{ zIndex: 1055, maxWidth: '400px' }}
    >
      {ui.notifications.map((notification) => (
        <div
          key={notification.id}
          className={getNotificationClass(notification.type)}
          role="alert"
          style={{ 
            marginBottom: '10px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="d-flex align-items-start">
            <div className="me-2 mt-1">
              <i className={`${getNotificationIcon(notification.type)} text-${notification.type === 'error' ? 'danger' : notification.type}`}></i>
            </div>
            <div className="flex-grow-1">
              {notification.title && (
                <h6 className="alert-heading mb-1">{notification.title}</h6>
              )}
              <div className="mb-0">{notification.message}</div>
              {notification.details && (
                <small className="text-muted d-block mt-1">
                  {notification.details}
                </small>
              )}
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => removeNotification(notification.id)}
            ></button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;