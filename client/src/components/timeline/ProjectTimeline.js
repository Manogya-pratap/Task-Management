import { useState, useEffect, useMemo, useCallback } from "react";
import Timeline from "react-calendar-timeline";
import moment from "moment";
import api from "../../services/api";
import "./ProjectTimeline.css";
import { useAuth } from "../../contexts/AuthContext"; // Assuming useAuth is defined in AuthContext

const ProjectTimeline = ({ projectId = null, onTaskClick }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedStatuses, setSelectedStatuses] = useState([
    "new",
    "scheduled",
    "in_progress",
    "completed",
  ]);
  const [selectedPriorities, setSelectedPriorities] = useState([
    "low",
    "medium",
    "high",
    "urgent",
  ]);
  const [timeRange, setTimeRange] = useState({
    start: moment().subtract(1, "month"),
    end: moment().add(2, "months"),
  });

  console.log(
    "ProjectTimeline: User role:",
    user?.role,
    "User teamId:",
    user?.teamId
  );

  // Status colors matching the system design
  const statusColors = useMemo(
    () => ({
      new: "#6c757d",
      scheduled: "#007bff",
      in_progress: "#ffc107",
      completed: "#28a745",
    }),
    []
  );

  // Priority colors
  const priorityColors = useMemo(
    () => ({
      low: "#17a2b8",
      medium: "#6f42c1",
      high: "#fd7e14",
      urgent: "#dc3545",
    }),
    []
  );

  const fetchTimelineData = useCallback(async () => {
    // Prevent multiple simultaneous requests and rapid retries
    const now = Date.now();
    if (loading || now - lastFetchTime < 2000) {
      console.log("ProjectTimeline: Skipping request - loading or too soon");
      return;
    }

    setLastFetchTime(now);
    setRetryCount(0);

    try {
      setLoading(true);
      setError(null);

      console.log("ProjectTimeline: Fetching timeline data for user:", user);
      console.log("ProjectTimeline: User role:", user?.role);
      console.log("ProjectTimeline: User teamId:", user?.teamId);

      // Implement lazy loading with retry mechanism
      const maxRetries = 3;
      let currentRetryCount = 0;
      let tasksData = [];
      let projectsData = [];

      const fetchWithRetry = async (retryCount) => {
        setRetryCount(retryCount + 1);

        // Use role-specific endpoints for better data filtering
        if (user?.role === "employee") {
          // Employee gets their own tasks and projects
          const [tasksResponse, projectsResponse] = await Promise.all([
            api.get("/tasks/my").catch((err) => {
              console.warn("Failed to fetch employee tasks:", err);
              return { data: { data: [] } };
            }),
            api.get("/projects/my").catch((err) => {
              console.warn("Failed to fetch employee projects:", err);
              return { data: { data: [] } };
            }),
          ]);
          return {
            tasksData: tasksResponse.data?.data || [],
            projectsData: projectsResponse.data?.data || [],
          };
        } else if (user?.role === "team_lead") {
          // Team lead gets team tasks and projects
          const [tasksResponse, projectsResponse] = await Promise.all([
            api.get("/tasks/team").catch((err) => {
              console.warn("Failed to fetch team tasks:", err);
              return { data: { data: [] } };
            }),
            api.get("/projects/team").catch((err) => {
              console.warn("Failed to fetch team projects:", err);
              return { data: { data: [] } };
            }),
          ]);
          return {
            tasksData: tasksResponse.data?.data || [],
            projectsData: projectsResponse.data?.data || [],
          };
        } else {
          // Admin/MD gets all tasks and projects
          const [tasksResponse, projectsResponse] = await Promise.all([
            api.get("/tasks").catch((err) => {
              console.warn("Failed to fetch all tasks:", err);
              return { data: { data: [] } };
            }),
            api.get("/projects").catch((err) => {
              console.warn("Failed to fetch all projects:", err);
              return { data: { data: [] } };
            }),
          ]);
          return {
            tasksData: tasksResponse.data?.data || [],
            projectsData: projectsResponse.data?.data || [],
          };
        }
      };

      while (currentRetryCount < maxRetries) {
        try {
          const result = await fetchWithRetry(currentRetryCount);
          tasksData = result.tasksData;
          projectsData = result.projectsData;

          // If we got data, break the retry loop
          if (tasksData.length > 0 || projectsData.length > 0) {
            console.log("ProjectTimeline: Successfully fetched data:", {
              tasks: tasksData.length,
              projects: projectsData.length,
            });
            break;
          }

          // If no data, try again after a delay
          currentRetryCount++;
          if (currentRetryCount < maxRetries) {
            console.log(
              `ProjectTimeline: No data found, retry ${currentRetryCount}/${maxRetries}`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * currentRetryCount)
            );
          }
        } catch (retryError) {
          console.warn(
            `ProjectTimeline: Retry ${currentRetryCount + 1} failed:`,
            retryError
          );
          currentRetryCount++;
          if (currentRetryCount < maxRetries) {
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * currentRetryCount)
            );
          }
        }
      }

      // Set the data (even if empty)
      setTasks(tasksData);
      setProjects(projectsData);
      setLoading(false);
      setRetryCount(0);

      // Show warning if no data after all retries
      if (tasksData.length === 0 && projectsData.length === 0) {
        console.warn("ProjectTimeline: No data available after all retries");
        setError(
          "No timeline data available. Please check if you have any tasks or projects assigned."
        );
      }
    } catch (error) {
      console.error("Error fetching timeline data:", error);

      // Handle timeout errors gracefully
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        setError(
          "Server is taking too long to respond. Please try again later."
        );
      } else if (error.response?.status === 404) {
        setError("Timeline data not found. Please check your permissions.");
      } else if (error.response?.status === 403) {
        setError("You don't have permission to view timeline data.");
      } else {
        setError(error.message || "Failed to fetch timeline data");
      }

      setLoading(false);
      setRetryCount(0);
      setTasks([]);
      setProjects([]);
    }
  }, [loading, user, lastFetchTime]);

  useEffect(() => {
    fetchTimelineData();
  }, [projectId, fetchTimelineData]);

  // Transform tasks into timeline groups and items
  const { groups, items } = useMemo(() => {
    console.log("Processing timeline data:", {
      tasks: tasks.length,
      projects: projects.length,
      selectedStatuses,
      selectedPriorities,
    });

    if (!tasks.length || !projects.length) {
      console.log("No data available for timeline");
      return { groups: [], items: [] };
    }

    // Create groups from projects
    const timelineGroups = projects.map((project) => ({
      id: project._id,
      title: project.name,
      rightTitle: `${project.status} | ${project.assignedMembers?.length || 0} members`,
      stackItems: true,
      height: 60,
    }));

    // Filter and transform tasks into timeline items
    const timelineItems = tasks
      .filter((task) => {
        // Only filter if filters are selected, otherwise show all
        const statusMatch =
          selectedStatuses.length === 0 ||
          selectedStatuses.includes(task.status);
        const priorityMatch =
          selectedPriorities.length === 0 ||
          selectedPriorities.includes(task.priority);
        return statusMatch && priorityMatch;
      })
      .map((task) => {
        // Determine start and end times for the task
        let startTime, endTime;

        if (task.status === "completed" && task.completedDate) {
          startTime = moment(
            task.startDate || task.scheduledDate || task.createdAt
          );
          endTime = moment(task.completedDate);
        } else if (task.status === "in_progress" && task.startDate) {
          startTime = moment(task.startDate);
          endTime = task.dueDate
            ? moment(task.dueDate)
            : moment(task.startDate).add(1, "day");
        } else if (task.scheduledDate) {
          startTime = moment(task.scheduledDate);
          endTime = task.dueDate
            ? moment(task.dueDate)
            : moment(task.scheduledDate).add(1, "day");
        } else {
          // For new tasks without dates, show them as a point in time
          startTime = moment(task.createdAt);
          endTime = moment(task.createdAt).add(1, "hour");
        }

        return {
          id: task._id,
          group: task.projectId,
          title: task.title,
          start_time: startTime,
          end_time: endTime,
          itemProps: {
            style: {
              background: statusColors[task.status],
              border: `2px solid ${priorityColors[task.priority]}`,
              borderRadius: "4px",
              color: "white",
            },
            onDoubleClick: () => onTaskClick && onTaskClick(task),
          },
          task: task, // Store full task data for tooltip and interaction
        };
      });

    console.log("Timeline created:", {
      groups: timelineGroups.length,
      items: timelineItems.length,
      sampleItem: timelineItems[0],
    });

    return { groups: timelineGroups, items: timelineItems };
  }, [
    tasks,
    projects,
    selectedStatuses,
    selectedPriorities,
    onTaskClick,
    statusColors,
    priorityColors,
  ]);

  // Custom item renderer for better task display with enhanced visuals and positioning
  const itemRenderer = ({
    item,
    itemContext,
    getItemProps,
    getResizeProps,
  }) => {
    const { left: leftResizeProps, right: rightResizeProps } = getResizeProps();
    const task = item.task;

    return (
      <div {...getItemProps(item.itemProps)}>
        {itemContext.useResizeHandle ? <div {...leftResizeProps} /> : null}

        <div
          className="timeline-item-content"
          title={`${task.title}\nStatus: ${task.status}\nPriority: ${task.priority}\nAssigned: ${task.assignedTo?.firstName || "Unassigned"}\nCreated: ${moment(task.createdAt).format("MMM DD, YYYY")}\nDue: ${task.dueDate ? moment(task.dueDate).format("MMM DD, YYYY") : "Not set"}`}
          style={{
            position: "relative",
            zIndex: 50,
            overflow: "visible",
          }}
        >
          <div
            className="timeline-item-title"
            style={{ position: "relative", zIndex: 51 }}
          >
            {task.title.length > 20
              ? `${task.title.substring(0, 20)}...`
              : task.title}
          </div>
          <div
            className="timeline-item-meta"
            style={{ position: "relative", zIndex: 52 }}
          >
            <span
              className="badge me-1"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                color: "#333",
                fontSize: "0.6rem",
                padding: "1px 4px",
                borderRadius: "8px",
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            >
              {task.status.replace("_", " ")}
            </span>
            <span
              className="badge"
              style={{
                backgroundColor: priorityColors[task.priority],
                color: "white",
                fontSize: "0.6rem",
                padding: "1px 4px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              {task.priority}
            </span>
            {task.dueDate && (
              <span
                className="badge"
                style={{
                  backgroundColor: "#007bff",
                  color: "white",
                  fontSize: "0.55rem",
                  padding: "1px 3px",
                  borderRadius: "6px",
                  marginLeft: "2px",
                }}
              >
                {moment(task.dueDate).format("MMM DD")}
              </span>
            )}
          </div>
        </div>

        {itemContext.useResizeHandle ? <div {...rightResizeProps} /> : null}
      </div>
    );
  };

  const handleStatusFilterChange = (status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const handlePriorityFilterChange = (priority) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority)
        ? prev.filter((p) => p !== priority)
        : [...prev, priority]
    );
  };

  const handleTimeRangeChange = (visibleTimeStart, visibleTimeEnd) => {
    setTimeRange({
      start: moment(visibleTimeStart),
      end: moment(visibleTimeEnd),
    });
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "400px" }}
      >
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">
            {retryCount > 0
              ? `Retrying... (${retryCount}/3)`
              : "Loading timeline data..."}
          </p>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => {
              setRetryCount(0);
              fetchTimelineData();
            }}
            disabled={loading}
          >
            <i className="fas fa-times me-2"></i>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "400px" }}
      >
        <div className="text-center">
          <i className="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
          <h6 className="text-danger">Timeline Error</h6>
          <p className="text-muted">{error}</p>
          <button
            className="btn btn-primary btn-sm"
            onClick={fetchTimelineData}
          >
            <i className="fas fa-refresh me-2"></i>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="text-center p-5">
        <i className="fas fa-calendar-alt fa-3x text-muted mb-3"></i>
        <h6 className="text-muted">No Projects Found</h6>
        <p className="text-muted">
          {user?.role === "employee"
            ? "You don't have any assigned projects yet."
            : "No projects found."}
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="row align-items-center">
          <div className="col">
            <h5 className="mb-0">
              Project Timeline
              {projectId &&
                projects.find((p) => p._id === projectId)?.name &&
                ` - ${projects.find((p) => p._id === projectId).name}`}
            </h5>
          </div>
          <div className="col-auto">
            <div className="d-flex align-items-center gap-3">
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={fetchTimelineData}
                disabled={loading}
                title="Refresh timeline data"
              >
                <i
                  className={`fas ${loading ? "fa-spinner fa-spin" : "fa-refresh"} me-1`}
                ></i>
                Refresh
              </button>
              <small className="text-muted">
                {items.length} tasks |{" "}
                {moment(timeRange.start).format("MMM DD")} -{" "}
                {moment(timeRange.end).format("MMM DD, YYYY")}
              </small>
            </div>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {/* Filters */}
        <div className="timeline-filters p-3 border-bottom">
          <div className="row">
            <div className="col-md-6">
              <label className="form-label fw-bold">Status Filter:</label>
              <div className="d-flex flex-wrap gap-2">
                {["new", "scheduled", "in_progress", "completed"].map(
                  (status) => (
                    <div key={status} className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`status-${status}`}
                        checked={selectedStatuses.includes(status)}
                        onChange={() => handleStatusFilterChange(status)}
                      />
                      <label
                        className="form-check-label"
                        htmlFor={`status-${status}`}
                      >
                        <span
                          className="status-indicator me-1"
                          data-status={status}
                          style={{
                            backgroundColor: statusColors[status],
                            width: "14px",
                            height: "14px",
                            display: "inline-block",
                            borderRadius: "50%",
                          }}
                        ></span>
                        {status.replace("_", " ").charAt(0).toUpperCase() +
                          status.replace("_", " ").slice(1)}
                      </label>
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold">Priority Filter:</label>
              <div className="d-flex flex-wrap gap-2">
                {["low", "medium", "high", "urgent"].map((priority) => (
                  <div key={priority} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`priority-${priority}`}
                      checked={selectedPriorities.includes(priority)}
                      onChange={() => handlePriorityFilterChange(priority)}
                    />
                    <label
                      className="form-check-label"
                      htmlFor={`priority-${priority}`}
                    >
                      <span
                        className="priority-indicator me-1"
                        data-priority={priority}
                        style={{
                          backgroundColor: priorityColors[priority],
                          width: "14px",
                          height: "14px",
                          display: "inline-block",
                          borderRadius: "50%",
                        }}
                      ></span>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div
          className="timeline-container"
          style={{ height: "600px", minHeight: "400px" }}
        >
          {console.log("About to render timeline:", {
            groups: groups.length,
            items: items.length,
          })}
          {groups.length > 0 ? (
            <>
              {console.log("Rendering Timeline component")}
              {console.log("Groups:", groups)}
              {console.log("Items:", items)}
              <Timeline
                groups={groups}
                items={items}
                defaultTimeStart={timeRange.start}
                defaultTimeEnd={timeRange.end}
                onTimeChange={handleTimeRangeChange}
                itemRenderer={itemRenderer}
                lineHeight={65}
                itemHeightRatio={0.8}
                canMove={false}
                canResize={false}
                canChangeGroup={false}
                stackItems={true}
                traditionalZoom={true}
                buffer={2}
                sidebarWidth={260}
                rightSidebarWidth={0}
                resizeEdgeWidth={5}
                dragSnap={15 * 60 * 1000} // 15 minutes
                minZoom={60 * 60 * 1000} // 1 hour
                maxZoom={365 * 24 * 60 * 60 * 1000} // 1 year
                visibleTimeStart={timeRange.start.valueOf()}
                visibleTimeEnd={timeRange.end.valueOf()}
                onItemSelect={(itemId, e) => {
                  const task = items.find((item) => item.id === itemId)?.task;
                  if (task && onTaskClick) {
                    onTaskClick(task);
                  }
                }}
                canvasWidth={1000}
                stickyHeader={true}
                showCursorLine={true}
              />
              {items.length === 0 && (
                <div
                  className="text-center p-3"
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "8px",
                    border: "2px solid #dee2e6",
                    zIndex: 1000,
                  }}
                >
                  <p className="text-muted mb-2">
                    <i className="fas fa-filter fa-2x mb-2"></i>
                  </p>
                  <h6 className="text-muted">No Tasks Match Current Filters</h6>
                  <small className="text-muted">
                    Try adjusting status or priority filters above.
                  </small>
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-5">
              <i className="fas fa-calendar-alt fa-3x text-muted mb-3"></i>
              <h6 className="text-muted">No Projects Found</h6>
              <p className="text-muted">
                {user?.role === "employee"
                  ? "You don't have any assigned projects yet."
                  : "No projects found."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectTimeline;
