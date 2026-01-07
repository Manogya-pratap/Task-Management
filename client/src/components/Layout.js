import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const getSidebarItems = () => {
    if (!user) return [];

    const { role } = user;
    const items = [];

    // Role-based sidebar items
    if (role === 'managing_director' || role === 'it_admin') {
      // MD and IT Admin get full access
      items.push(
        {
          section: 'Management',
          items: [
            {
              label: 'Dashboard',
              icon: 'fas fa-tachometer-alt',
              href: '/dashboard',
              description: 'System overview and metrics'
            },
            {
              label: 'Team Management',
              icon: 'fas fa-users',
              href: '/teams',
              description: 'Manage teams and departments'
            },
            {
              label: 'User Management',
              icon: 'fas fa-user-cog',
              href: '/users',
              description: 'Create and manage user accounts'
            }
          ]
        },
        {
          section: 'Projects & Tasks',
          items: [
            {
              label: 'All Projects',
              icon: 'fas fa-project-diagram',
              href: '/projects',
              description: 'View and manage all projects'
            },
            {
              label: 'Task Assignment',
              icon: 'fas fa-tasks',
              href: '/tasks',
              description: 'Assign and track tasks'
            },
            {
              label: 'Timeline View',
              icon: 'fas fa-calendar-alt',
              href: '/timeline',
              description: 'Project timelines and schedules'
            }
          ]
        },
        {
          section: 'Analytics',
          items: [
            {
              label: 'Reports',
              icon: 'fas fa-chart-bar',
              href: '/reports',
              description: 'Performance and progress reports'
            },
            {
              label: 'Analytics',
              icon: 'fas fa-chart-line',
              href: '/analytics',
              description: 'Data insights and trends'
            }
          ]
        },
        {
          section: 'System',
          items: [
            {
              label: 'Settings',
              icon: 'fas fa-cog',
              href: '/settings',
              description: 'System configuration'
            },
            {
              label: 'Audit Logs',
              icon: 'fas fa-clipboard-list',
              href: '/audit',
              description: 'System activity logs'
            }
          ]
        }
      );
    } else if (role === 'team_lead') {
      // Team Lead gets team-specific access
      items.push(
        {
          section: 'Team Dashboard',
          items: [
            {
              label: 'Dashboard',
              icon: 'fas fa-tachometer-alt',
              href: '/dashboard',
              description: 'Team overview and metrics'
            },
            {
              label: 'My Team',
              icon: 'fas fa-users',
              href: '/my-team',
              description: 'Manage team members'
            }
          ]
        },
        {
          section: 'Project Management',
          items: [
            {
              label: 'Team Projects',
              icon: 'fas fa-project-diagram',
              href: '/team-projects',
              description: 'Manage team projects'
            },
            {
              label: 'Task Assignment',
              icon: 'fas fa-tasks',
              href: '/team-tasks',
              description: 'Assign tasks to team members'
            },
            {
              label: 'Timeline',
              icon: 'fas fa-calendar-alt',
              href: '/team-timeline',
              description: 'Team project timelines'
            }
          ]
        },
        {
          section: 'Reports',
          items: [
            {
              label: 'Team Reports',
              icon: 'fas fa-chart-line',
              href: '/team-reports',
              description: 'Team performance reports'
            }
          ]
        }
      );
    } else if (role === 'employee') {
      // Employee gets personal access only
      items.push(
        {
          section: 'My Work',
          items: [
            {
              label: 'Dashboard',
              icon: 'fas fa-tachometer-alt',
              href: '/dashboard',
              description: 'Personal dashboard'
            },
            {
              label: 'My Tasks',
              icon: 'fas fa-clipboard-list',
              href: '/my-tasks',
              description: 'View and update my tasks'
            },
            {
              label: 'My Projects',
              icon: 'fas fa-folder-open',
              href: '/my-projects',
              description: 'Projects I\'m involved in'
            }
          ]
        },
        {
          section: 'Schedule',
          items: [
            {
              label: 'Calendar',
              icon: 'fas fa-calendar',
              href: '/calendar',
              description: 'My schedule and deadlines'
            },
            {
              label: 'Timeline',
              icon: 'fas fa-clock',
              href: '/my-timeline',
              description: 'My task timeline'
            }
          ]
        }
      );
    }

    return items;
  };

  return (
    <div className="layout-container">
      {/* Navbar */}
      <Navbar />
      
      <div className="layout-content d-flex">
        {/* Sidebar */}
        <aside className={`sidebar bg-light border-end ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header p-3 border-bottom">
            <div className="d-flex align-items-center justify-content-between">
              <h6 className={`mb-0 text-primary fw-bold ${sidebarCollapsed ? 'd-none' : ''}`}>
                Navigation
              </h6>
              <button 
                className="btn btn-sm btn-outline-primary"
                onClick={toggleSidebar}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <i className={`fas ${sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
              </button>
            </div>
          </div>
          
          <div className="sidebar-content">
            {getSidebarItems().map((section, sectionIndex) => (
              <div key={sectionIndex} className="sidebar-section">
                <div className={`sidebar-section-header p-3 ${sidebarCollapsed ? 'd-none' : ''}`}>
                  <small className="text-muted fw-semibold text-uppercase">
                    {section.section}
                  </small>
                </div>
                <ul className="list-unstyled">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex}>
                      <a 
                        href={item.href}
                        className="sidebar-link d-flex align-items-center p-3 text-decoration-none"
                        title={sidebarCollapsed ? item.label : item.description}
                      >
                        <i className={`${item.icon} me-3 text-primary`}></i>
                        <div className={`${sidebarCollapsed ? 'd-none' : ''}`}>
                          <div className="fw-medium text-dark">{item.label}</div>
                          <small className="text-muted">{item.description}</small>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content flex-grow-1">
          <div className="content-wrapper p-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;