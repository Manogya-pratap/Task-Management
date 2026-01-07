import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, getUserFullName, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getNavigationItems = () => {
    if (!user) return [];

    const { role } = user;
    const items = [];

    // Common items for all authenticated users
    items.push({
      label: 'Dashboard',
      icon: 'fas fa-tachometer-alt',
      path: '/dashboard'
    });

    // Role-based navigation items
    if (role === 'managing_director' || role === 'it_admin') {
      // MD and IT Admin get full access
      items.push(
        {
          label: 'Team Management',
          icon: 'fas fa-users',
          path: '/teams'
        },
        {
          label: 'Project Management',
          icon: 'fas fa-project-diagram',
          path: '/projects'
        },
        {
          label: 'Task Board',
          icon: 'fas fa-tasks',
          path: '/tasks'
        },
        {
          label: 'Calendar',
          icon: 'fas fa-calendar',
          path: '/calendar'
        },
        {
          label: 'Timeline',
          icon: 'fas fa-timeline',
          path: '/timeline'
        },
        {
          label: 'Reports',
          icon: 'fas fa-chart-bar',
          path: '/reports'
        },
        {
          label: 'System Settings',
          icon: 'fas fa-cog',
          path: '/settings'
        }
      );
    } else if (role === 'team_lead') {
      // Team Lead gets team-specific access
      items.push(
        {
          label: 'My Team',
          icon: 'fas fa-users',
          path: '/teams'
        },
        {
          label: 'Team Projects',
          icon: 'fas fa-project-diagram',
          path: '/team-projects'
        },
        {
          label: 'Team Tasks',
          icon: 'fas fa-tasks',
          path: '/team-tasks'
        },
        {
          label: 'My Projects',
          icon: 'fas fa-folder-open',
          path: '/my-projects'
        },
        {
          label: 'Task Board',
          icon: 'fas fa-clipboard-list',
          path: '/tasks'
        },
        {
          label: 'Calendar',
          icon: 'fas fa-calendar',
          path: '/calendar'
        },
        {
          label: 'Timeline',
          icon: 'fas fa-timeline',
          path: '/team-timeline'
        },
        {
          label: 'Team Reports',
          icon: 'fas fa-chart-line',
          path: '/team-reports'
        }
      );
    } else if (role === 'employee') {
      // Employee gets personal access only
      items.push(
        {
          label: 'My Tasks',
          icon: 'fas fa-clipboard-list',
          path: '/my-tasks'
        },
        {
          label: 'My Projects',
          icon: 'fas fa-folder-open',
          path: '/my-projects'
        },
        {
          label: 'Task Board',
          icon: 'fas fa-tasks',
          path: '/tasks'
        },
        {
          label: 'Calendar',
          icon: 'fas fa-calendar',
          path: '/calendar'
        },
        {
          label: 'Timeline',
          icon: 'fas fa-timeline',
          path: '/my-timeline'
        }
      );
    }

    return items;
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top">
      <div className="container-fluid">
        {/* Brand */}
        <button 
          className="navbar-brand d-flex align-items-center btn btn-link text-decoration-none p-0 border-0"
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none' }}
        >
          <i className="fas fa-tasks me-2 text-white"></i>
          <span className="d-none d-md-inline text-white">Daily Activity Tracker</span>
          <span className="d-md-none text-white">DAT</span>
          <small className="ms-2 d-none d-lg-inline text-light opacity-75">
            - Yantrik Automation
          </small>
        </button>

        {/* Mobile toggle button */}
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
          aria-controls="navbarNav" 
          aria-expanded="false" 
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Collapsible content */}
        <div className="collapse navbar-collapse" id="navbarNav">
          {/* Navigation items */}
          <ul className="navbar-nav me-auto">
            {getNavigationItems().map((item, index) => (
              <li key={index} className="nav-item">
                <button 
                  className={`nav-link btn btn-link text-decoration-none border-0 ${
                    location.pathname === item.path ? 'active' : ''
                  }`}
                  onClick={() => navigate(item.path)}
                  style={{ background: 'none', color: 'inherit' }}
                >
                  <i className={`${item.icon} me-1`}></i>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Right side - Date, User info, Logout */}
          <div className="navbar-nav ms-auto d-flex flex-column flex-lg-row align-items-start align-items-lg-center">
            {/* Current Date */}
            <span className="navbar-text text-light me-lg-3 mb-2 mb-lg-0">
              <i className="fas fa-calendar-day me-1"></i>
              <span className="d-none d-sm-inline">{getCurrentDate()}</span>
              <span className="d-sm-none">{new Date().toLocaleDateString()}</span>
            </span>

            {/* User Name */}
            <span className="navbar-text text-light me-lg-3 mb-2 mb-lg-0">
              <i className="fas fa-user me-1"></i>
              <span className="fw-semibold">{getUserFullName()}</span>
            </span>

            {/* Logout Button */}
            <button 
              className="btn btn-outline-light btn-sm"
              onClick={logout}
              title="Logout"
            >
              <i className="fas fa-sign-out-alt me-1"></i>
              <span className="d-none d-md-inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;