import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
// eslint-disable-next-line no-unused-vars
import { useApp } from "../contexts/AppContext";
// eslint-disable-next-line no-unused-vars
import ProfileModal from "./ProfileModal";
import "../styles/sidebar.css";

const Layout = ({ children }) => {
  const { user, getUserFullName, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Persist sidebar state in localStorage
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });
  // eslint-disable-next-line no-unused-vars
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isProfileEditMode, setIsProfileEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    console.log("Sidebar toggle clicked:", {
      currentState: sidebarCollapsed,
      newState,
    });
    setSidebarCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleProfileEditModeChange = (editMode) => {
    setIsProfileEditMode(editMode);
  };

  const handleProfileModalClose = () => {
    setShowProfileModal(false);
    setSelectedUser(null);
    setIsProfileEditMode(false);
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getSidebarItems = () => {
    if (!user) return [];

    const { role } = user;
    const items = [];

    // Role-based sidebar items
    if (role === "managing_director" || role === "it_admin") {
      // MD and IT Admin get full access
      items.push(
        {
          section: "Management",
          items: [
            {
              label: "Dashboard",
              icon: "fas fa-tachometer-alt",
              href: "/dashboard",
              description: "System overview and metrics",
            },
            {
              label: "Team Management",
              icon: "fas fa-users",
              href: "/teams",
              description: "Manage teams and departments",
            },
            {
              label: "User Management",
              icon: "fas fa-user-cog",
              href: "/users",
              description: "Create and manage user accounts",
            },
          ],
        },
        {
          section: "Projects & Tasks",
          items: [
            {
              label: "All Projects",
              icon: "fas fa-project-diagram",
              href: "/projects",
              description: "View and manage all projects",
            },
            {
              label: "Task Board",
              icon: "fas fa-tasks",
              href: "/tasks",
              description: "Assign and track tasks",
            },
            {
              label: "Timeline View",
              icon: "fas fa-calendar-alt",
              href: "/timeline",
              description: "Project timelines and schedules",
            },
            {
              label: "Calendar",
              icon: "fas fa-calendar",
              href: "/calendar",
              description: "View calendar and schedule",
            },
          ],
        },
        {
          section: "Analytics",
          items: [
            {
              label: "Reports",
              icon: "fas fa-chart-bar",
              href: "/reports",
              description: "Performance and progress reports",
            },
            {
              label: "Analytics",
              icon: "fas fa-chart-line",
              href: "/analytics",
              description: "Data insights and trends",
            },
          ],
        },
        {
          section: "System",
          items: [
            {
              label: "Settings",
              icon: "fas fa-cog",
              href: "/settings",
              description: "System configuration",
            },
            {
              label: "Audit Logs",
              icon: "fas fa-clipboard-list",
              href: "/audit",
              description: "System activity logs",
            },
          ],
        }
      );
    } else if (role === "team_lead") {
      // Team Lead gets team-specific access
      items.push(
        {
          section: "Team Dashboard",
          items: [
            {
              label: "Dashboard",
              icon: "fas fa-tachometer-alt",
              href: "/dashboard",
              description: "Team overview and metrics",
            },
            {
              label: "My Team",
              icon: "fas fa-users",
              href: "/my-team",
              description: "Manage team members",
            },
            {
              label: "Create Employee",
              icon: "fas fa-user-plus",
              href: "/dashboard#create-employee",
              description: "Create new employee ID",
              special: true,
            },
          ],
        },
        {
          section: "Project Management",
          items: [
            {
              label: "Team Projects",
              icon: "fas fa-project-diagram",
              href: "/team-projects",
              description: "Manage team projects",
            },
            {
              label: "Task Board",
              icon: "fas fa-tasks",
              href: "/team-tasks",
              description: "Assign tasks to team members",
            },
            {
              label: "Timeline",
              icon: "fas fa-calendar-alt",
              href: "/team-timeline",
              description: "Team project timelines",
            },
            {
              label: "Calendar",
              icon: "fas fa-calendar",
              href: "/team-calendar",
              description: "Team calendar view",
            },
          ],
        },
        {
          section: "Reports",
          items: [
            {
              label: "Team Reports",
              icon: "fas fa-chart-line",
              href: "/team-reports",
              description: "Team performance reports",
            },
          ],
        }
      );
    } else if (role === "employee") {
      // Employee gets personal access only
      items.push(
        {
          section: "My Work",
          items: [
            {
              label: "Dashboard",
              icon: "fas fa-tachometer-alt",
              href: "/dashboard",
              description: "Personal dashboard",
            },
            {
              label: "My Tasks",
              icon: "fas fa-clipboard-list",
              href: "/my-tasks",
              description: "View and update my tasks",
            },
            {
              label: "My Projects",
              icon: "fas fa-folder-open",
              href: "/my-projects",
              description: "Projects I'm involved in",
            },
          ],
        },
        {
          section: "Schedule",
          items: [
            {
              label: "Calendar",
              icon: "fas fa-calendar",
              href: "/calendar",
              description: "My schedule and deadlines",
            },
            {
              label: "Timeline",
              icon: "fas fa-clock",
              href: "/my-timeline",
              description: "My task timeline",
            },
          ],
        }
      );
    }

    return items;
  };

  const formatDateTime = () => {
    return currentTime.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div
      className="layout-container d-flex"
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <aside
        className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}
        style={{
          width: sidebarCollapsed ? "80px" : "280px",
          height: "100vh",
          background: "linear-gradient(180deg, #800020 0%, #A0002A 100%)",
          color: "white",
          transition: "width 0.3s ease",
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 1000,
          overflowY: "auto",
          overflowX: "hidden",
          margin: 0,
          padding: 0,
          border: "none",
          boxShadow: "2px 0 4px rgba(0,0,0,0.1)",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.3) transparent",
        }}
      >
        {/* Sidebar Header */}
        <div className="sidebar-header p-3 border-bottom border-light border-opacity-25">
          <div className="d-flex align-items-center justify-content-between">
            {!sidebarCollapsed && (
              <div className="d-flex align-items-center">
                <i className="fas fa-tasks me-2 text-white fs-4"></i>
                <div>
                  <h6 className="mb-0 text-white fw-bold">
                    Daily Activity Tracker
                  </h6>
                  <small className="text-white opacity-75">
                    Yantrik Automation
                  </small>
                </div>
              </div>
            )}
            <button
              className="btn btn-sm text-white"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <i
                className={`fas ${sidebarCollapsed ? "fa-bars" : "fa-chevron-left"}`}
              ></i>
            </button>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="user-profile p-3 border-bottom border-light border-opacity-25">
          <div className="d-flex align-items-center">
            <div
              className="avatar-circle me-3"
              style={{
                width: sidebarCollapsed ? "40px" : "50px",
                height: sidebarCollapsed ? "40px" : "50px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
                fontSize: sidebarCollapsed ? "14px" : "18px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={() => {
                console.log(
                  "Profile Settings clicked, navigating to /settings"
                );
                navigate("/settings");
              }}
              title="Profile Settings"
            >
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-grow-1">
                <div
                  className="fw-bold text-white"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    console.log("User name clicked, navigating to /settings");
                    navigate("/settings");
                  }}
                >
                  {getUserFullName()}
                </div>
                <small className="text-white opacity-75 text-capitalize">
                  {user?.role?.replace("_", " ")}
                </small>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="sidebar-content">
          {getSidebarItems().map((section, sectionIndex) => (
            <div key={sectionIndex} className="sidebar-section">
              {!sidebarCollapsed && (
                <div className="sidebar-section-header p-3 pb-2">
                  <small className="text-white opacity-75 fw-semibold text-uppercase">
                    {section.section}
                  </small>
                </div>
              )}
              <ul className="list-unstyled">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <button
                      onClick={() => {
                        if (
                          item.special &&
                          item.href.includes("#create-employee")
                        ) {
                          // Special handling for Create Employee button
                          navigate("/dashboard");
                          // Trigger the create employee modal after navigation
                          setTimeout(() => {
                            const event = new CustomEvent(
                              "openCreateEmployeeModal"
                            );
                            window.dispatchEvent(event);
                          }, 100);
                        } else {
                          console.log(
                            "Sidebar item clicked, navigating to:",
                            item.href
                          );
                          console.log("Current path:", location.pathname);
                          console.log(
                            "Will be active:",
                            location.pathname === item.href
                          );
                          navigate(item.href);
                        }
                      }}
                      className={`sidebar-link d-flex align-items-center p-3 text-decoration-none w-100 border-0 text-start ${
                        location.pathname === item.href ? "active" : ""
                      } ${item.special ? "create-employee-btn" : ""}`}
                      style={{
                        background:
                          location.pathname === item.href
                            ? "rgba(255,255,255,0.1)"
                            : item.special
                              ? "linear-gradient(135deg, #007bff 0%, #0056b3 100%)"
                              : "transparent",
                        color: "white",
                        transition: "all 0.3s ease",
                        fontSize: "14px",
                        fontWeight:
                          location.pathname === item.href
                            ? "600"
                            : item.special
                              ? "600"
                              : "500",
                        textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                        borderLeft:
                          location.pathname === item.href
                            ? "2px solid rgba(255,255,255,0.6)"
                            : item.special
                              ? "2px solid #007bff"
                              : "none",
                        borderRadius:
                          location.pathname === item.href
                            ? "0 4px 4px 0"
                            : item.special
                              ? "4px"
                              : "0",
                        boxShadow: item.special
                          ? "0 2px 8px rgba(0,123,255,0.3)"
                          : "none",
                      }}
                      title={sidebarCollapsed ? item.label : item.description}
                      onMouseEnter={(e) => {
                        if (location.pathname !== item.href) {
                          if (item.special) {
                            e.target.style.background =
                              "linear-gradient(135deg, #0056b3 0%, #004085 100%)";
                            e.target.style.transform = "translateX(4px)";
                            e.target.style.boxShadow =
                              "0 4px 12px rgba(0,123,255,0.4)";
                          } else {
                            e.target.style.background = "rgba(255,255,255,0.1)";
                            e.target.style.transform = "translateX(4px)";
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (location.pathname !== item.href) {
                          if (item.special) {
                            e.target.style.background =
                              "linear-gradient(135deg, #007bff 0%, #0056b3 100%)";
                            e.target.style.transform = "translateX(0)";
                            e.target.style.boxShadow =
                              "0 2px 8px rgba(0,123,255,0.3)";
                          } else {
                            e.target.style.background = "transparent";
                            e.target.style.transform = "translateX(0)";
                          }
                        }
                      }}
                    >
                      <i
                        className={`${item.icon} me-3 text-white`}
                        style={{ width: "20px" }}
                      ></i>
                      {!sidebarCollapsed && (
                        <div>
                          <div className="fw-medium text-white">
                            {item.label}
                          </div>
                          <small className="text-white opacity-75">
                            {item.description}
                          </small>
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Logout Section */}
        <div className="sidebar-footer mt-auto p-3 border-top border-light border-opacity-25">
          <button
            onClick={logout}
            className="btn w-100 text-white d-flex align-items-center justify-content-center"
            style={{ background: "rgba(255,255,255,0.1)" }}
            onMouseEnter={(e) =>
              (e.target.style.background = "rgba(255,255,255,0.2)")
            }
            onMouseLeave={(e) =>
              (e.target.style.background = "rgba(255,255,255,0.1)")
            }
          >
            <i className="fas fa-sign-out-alt me-2"></i>
            {!sidebarCollapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* Top Navbar */}
      <nav
        className="top-navbar"
        style={{
          position: "fixed",
          top: 0,
          left: sidebarCollapsed ? "80px" : "280px",
          right: "0",
          height: "60px",
          background: "linear-gradient(90deg, #ffffff 0%, #f8fafc 100%)",
          borderBottom: "1px solid #e2e8f0",
          zIndex: 999,
          transition: "left 0.3s ease",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          margin: 0,
          padding: 0,
        }}
      >
        <div className="d-flex justify-content-between align-items-center h-100 px-4">
          {/* Left side - Company Info */}
          <div className="d-flex align-items-center">
            <button
              className="btn btn-link text-dark me-3 p-0"
              onClick={toggleSidebar}
              style={{ textDecoration: "none" }}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <i
                className={`fas ${sidebarCollapsed ? "fa-bars" : "fa-chevron-left"} fs-5`}
              ></i>
            </button>
            <div className="d-flex align-items-center">
              <div>
                <h6 className="mb-0 fw-bold text-dark">
                  Yantrik Automation Pvt. Ltd.
                </h6>
                <small className="text-muted">Daily Activity Tracker</small>
              </div>
            </div>
          </div>

          {/* Right side - User Info and Time */}
          <div className="d-flex align-items-center gap-4">
            {/* Current Date/Time */}
            <div className="text-end">
              <div className="fw-bold text-dark small">{formatDateTime()}</div>
              <small className="text-muted">{getCurrentDate()}</small>
            </div>

            {/* User Info */}
            <div className="d-flex align-items-center">
              <div
                className="avatar-circle me-2 cursor-pointer"
                style={{
                  width: "35px",
                  height: "35px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #800020 0%, #A0002A 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "14px",
                  transition: "transform 0.2s ease",
                }}
                onClick={() => {
                  setSelectedUser(user);
                  setShowProfileModal(true);
                }}
                title="Click to view profile"
              >
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <div
                className="d-none d-md-block cursor-pointer"
                onClick={() => {
                  setSelectedUser(user);
                  setShowProfileModal(true);
                }}
                title="Click to view profile"
              >
                <div className="fw-bold text-dark small">
                  {getUserFullName()}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                title="Notifications"
                onClick={() => {
                  console.log("Notification icon clicked");
                  setShowNotifications(true);
                }}
              >
                <i className="fas fa-bell"></i>
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                title="Settings"
                onClick={() => {
                  console.log("Cog icon clicked, navigating to /settings");
                  navigate("/settings");
                }}
              >
                <i className="fas fa-cog"></i>
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                title="Logout"
                onClick={logout}
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main
        className="main-content flex-grow-1"
        style={{
          marginLeft: sidebarCollapsed ? "80px" : "280px",
          transition: "margin-left 0.3s ease",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          paddingTop: "60px", // Match navbar height exactly
          marginTop: 0, // Remove any extra margin
          paddingLeft: "20px", // Add some padding from sidebar
          paddingRight: "20px", // Add some padding from right edge
        }}
      >
        <div className="content-wrapper" style={{ padding: "20px" }}>
          {children}
        </div>
      </main>

      {/* Profile Modal */}
      <ProfileModal
        show={showProfileModal}
        onHide={handleProfileModalClose}
        user={selectedUser}
        isEditMode={isProfileEditMode}
        onEditModeChange={handleProfileEditModeChange}
      />

      {/* Notifications Modal */}
      {showNotifications && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-bell me-2"></i>
                  Notifications
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowNotifications(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="text-center py-4">
                  <i className="fas fa-bell fa-3x text-muted mb-3"></i>
                  <h6>No new notifications</h6>
                  <p className="text-muted">You're all caught up!</p>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNotifications(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
