import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useApp } from "../../contexts/AppContext";
import TaskCalendar from "../calendar/TaskCalendar";
import AnimatedProgressBar from "../shared/AnimatedProgressBar";
import { ComponentLoader } from "../LoadingSpinner";
import "../../styles/dashboard-responsive.css";

const EmployeeDashboard = () => {
  const { user, getUserFullName } = useAuth();
  const { projects, tasks, errors } = useApp();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Set initial load to false after a short delay
    // This prevents infinite loading even if API is slow
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 2000); // 2 seconds max wait

    return () => clearTimeout(timer);
  }, []);

  // Show loader only during initial load
  if (isInitialLoad && tasks.length === 0 && projects.length === 0) {
    return <ComponentLoader text="Loading your dashboard..." />;
  }

  if (errors.global || errors.projects || errors.tasks) {
    const errorMessage = errors.global || errors.projects || errors.tasks;
    return (
      <div className="alert alert-danger m-4" role="alert">
        <h5 className="alert-heading">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Error Loading Dashboard
        </h5>
        <p className="mb-0">{errorMessage}</p>
      </div>
    );
  }

  // Check if user is available
  if (!user) {
    return (
      <div className="alert alert-warning m-4" role="alert">
        <h5 className="alert-heading">
          <i className="fas fa-exclamation-triangle me-2"></i>
          User Not Found
        </h5>
        <p className="mb-0">Please log in again to access your dashboard.</p>
      </div>
    );
  }

  // Filter data for employee's tasks and projects
  const userTasks = tasks.filter((task) => task.assignedTo?._id === user._id);

  // Calculate personal metrics
  const totalTasks = userTasks.length;
  const completedTasks = userTasks.filter(
    (t) => t.status === "completed"
  ).length;
  const inProgressTasks = userTasks.filter(
    (t) => t.status === "in_progress"
  ).length;
  const scheduledTasks = userTasks.filter(
    (t) => t.status === "scheduled"
  ).length;

  // Calculate personal completion percentage
  const personalCompletion =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="dashboard-container employee-dashboard">
      {/* Welcome Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div
            className="card dashboard-card border-0 shadow-sm"
            style={{
              background: "linear-gradient(135deg, #800020 0%, #A0002A 100%)",
            }}
          >
            <div className="card-body text-white">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h2 className="card-title mb-2 text-white">
                    <i className="fas fa-user me-2 text-white"></i>
                    Welcome, {getUserFullName()}
                  </h2>
                  <p className="mb-0 text-white opacity-75">
                    <i className="fas fa-briefcase me-2 text-white"></i>
                    Employee - {user.department} Department
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="d-flex flex-column align-items-md-end">
                    <small className="opacity-75 mb-1 text-white">
                      <i className="fas fa-calendar me-1 text-white"></i>
                      {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </small>
                    <small className="opacity-75 text-white">
                      <i className="fas fa-tasks me-1 text-white"></i>
                      {totalTasks} total tasks assigned
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Metrics Cards */}
      <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card dashboard-card border-0 shadow-sm h-100 metrics-card">
            <div className="card-body text-center">
              <div className="metrics-icon">
                <div className="rounded-circle bg-secondary bg-opacity-10 p-3">
                  <i className="fas fa-inbox fa-2x text-secondary"></i>
                </div>
              </div>
              <div className="metrics-value">{totalTasks}</div>
              <div className="metrics-label">Total Tasks</div>
              <small className="text-secondary">
                <i className="fas fa-list me-1"></i>
                All assigned tasks
              </small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card dashboard-card border-0 shadow-sm h-100 metrics-card">
            <div className="card-body text-center">
              <div className="metrics-icon">
                <div className="rounded-circle bg-warning bg-opacity-10 p-3">
                  <i className="fas fa-spinner fa-2x text-warning"></i>
                </div>
              </div>
              <div className="metrics-value">{inProgressTasks}</div>
              <div className="metrics-label">In Progress</div>
              <small className="text-warning">
                <i className="fas fa-clock me-1"></i>
                Currently working
              </small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card dashboard-card border-0 shadow-sm h-100 metrics-card">
            <div className="card-body text-center">
              <div className="metrics-icon">
                <div className="rounded-circle bg-info bg-opacity-10 p-3">
                  <i className="fas fa-calendar-check fa-2x text-info"></i>
                </div>
              </div>
              <div className="metrics-value">{scheduledTasks}</div>
              <div className="metrics-label">Scheduled</div>
              <small className="text-info">
                <i className="fas fa-calendar me-1"></i>
                Planned ahead
              </small>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card dashboard-card border-0 shadow-sm h-100 metrics-card">
            <div className="card-body text-center">
              <div className="metrics-icon">
                <div className="rounded-circle bg-success bg-opacity-10 p-3">
                  <i className="fas fa-check-circle fa-2x text-success"></i>
                </div>
              </div>
              <div className="metrics-value">{completedTasks}</div>
              <div className="metrics-label">Completed</div>
              <AnimatedProgressBar
                value={personalCompletion}
                variant="success"
                height="8px"
                showLabel={false}
                showSyncStatus={false}
                dataType="tasks"
                className="mt-2"
                autoSync={false}
              />
              <div className="live-indicator">
                <i className="fas fa-circle me-1"></i>
                Live
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Progress Overview */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card dashboard-card border-0 shadow-sm">
            <div className="card-header bg-white border-0 pb-0">
              <h5 className="card-title mb-0">
                <i className="fas fa-chart-pie me-2 text-success"></i>
                My Task Progress Overview
              </h5>
            </div>
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <div className="row">
                    <div className="col-sm-6 mb-3">
                      <div className="d-flex align-items-center">
                        <div className="flex-shrink-0">
                          <div className="rounded-circle bg-success bg-opacity-10 p-2">
                            <i className="fas fa-trophy text-success"></i>
                          </div>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <div className="fw-medium">Overall Progress</div>
                          <div
                            className="progress mt-1"
                            style={{ height: "10px" }}
                          >
                            <div
                              className="progress-bar bg-success"
                              role="progressbar"
                              style={{ width: `${personalCompletion}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-sm-6 mb-3">
                      <div className="d-flex align-items-center">
                        <div className="flex-shrink-0">
                          <div className="rounded-circle bg-info bg-opacity-10 p-2">
                            <i className="fas fa-tasks text-info"></i>
                          </div>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <div className="fw-medium">Active Workload</div>
                          <div className="mt-1">
                            <span className="badge bg-warning me-1">
                              {inProgressTasks}
                            </span>
                            <span>{totalTasks} Total Tasks</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="bg-success bg-opacity-10 rounded-3 p-3">
                        <i className="fas fa-check-circle text-success fs-4"></i>
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-0">Completed</h6>
                      <h3 className="mb-0">{completedTasks}</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Calendar */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card dashboard-card border-0 shadow-sm">
            <div className="card-header bg-white border-0 pb-0">
              <h5 className="card-title mb-0">Task Calendar</h5>
            </div>
            <div className="card-body">
              <TaskCalendar showDeadlineNotifications={true} height="400px" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
