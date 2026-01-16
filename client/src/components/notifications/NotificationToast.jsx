import React, { useState, useEffect } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { useSocket } from '../../contexts/SocketContext';
import './NotificationToast.css';

const NotificationToast = () => {
  const [notifications, setNotifications] = useState([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Task events
    socket.on('task-assigned', (data) => {
      addNotification({
        id: Date.now(),
        type: 'info',
        title: 'New Task Assigned',
        message: data.message,
        icon: 'bi-clipboard-check'
      });
    });

    socket.on('approval-requested', (data) => {
      addNotification({
        id: Date.now(),
        type: 'warning',
        title: 'Approval Requested',
        message: data.message,
        icon: 'bi-clock-history'
      });
    });

    socket.on('kanban-moved', ({ task, oldStage, newStage }) => {
      addNotification({
        id: Date.now(),
        type: 'success',
        title: 'Task Moved',
        message: `"${task.title}" moved from ${oldStage} to ${newStage}`,
        icon: 'bi-arrow-right-circle'
      });
    });

    socket.on('daily-update-added', ({ task }) => {
      addNotification({
        id: Date.now(),
        type: 'info',
        title: 'Daily Update',
        message: `Progress updated for "${task.title}"`,
        icon: 'bi-graph-up'
      });
    });

    // Project events
    socket.on('project-created', (data) => {
      addNotification({
        id: Date.now(),
        type: 'success',
        title: 'New Project',
        message: data.message,
        icon: 'bi-folder-plus'
      });
    });

    socket.on('project-progress-updated', ({ project, newProgress }) => {
      addNotification({
        id: Date.now(),
        type: 'info',
        title: 'Project Progress',
        message: `${project.name} is now ${newProgress}% complete`,
        icon: 'bi-graph-up-arrow'
      });
    });

    socket.on('project-completed', (data) => {
      addNotification({
        id: Date.now(),
        type: 'success',
        title: 'Project Completed',
        message: data.message,
        icon: 'bi-check-circle'
      });
    });

    return () => {
      socket.off('task-assigned');
      socket.off('approval-requested');
      socket.off('kanban-moved');
      socket.off('daily-update-added');
      socket.off('project-created');
      socket.off('project-progress-updated');
      socket.off('project-completed');
    };
  }, [socket]);

  const addNotification = (notification) => {
    setNotifications(prev => [...prev, notification]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getVariant = (type) => {
    const variants = {
      success: 'success',
      error: 'danger',
      warning: 'warning',
      info: 'info'
    };
    return variants[type] || 'info';
  };

  return (
    <ToastContainer position="top-end" className="p-3 notification-container">
      {notifications.map(notification => (
        <Toast
          key={notification.id}
          onClose={() => removeNotification(notification.id)}
          bg={getVariant(notification.type)}
          className="notification-toast"
        >
          <Toast.Header>
            <i className={`bi ${notification.icon} me-2`}></i>
            <strong className="me-auto">{notification.title}</strong>
            <small>just now</small>
          </Toast.Header>
          <Toast.Body className={notification.type === 'error' || notification.type === 'warning' ? 'text-white' : ''}>
            {notification.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
};

export default NotificationToast;
