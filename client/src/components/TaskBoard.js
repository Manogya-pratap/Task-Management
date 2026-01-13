import React, { useState, useEffect, useCallback } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import TaskColumn from "./TaskColumn";
import TaskForm from "./TaskForm";
import TaskDetailModal from "./TaskDetailModal";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import { StatusIndicator } from "./shared/StatusIndicator";
import {
  exportToCSV,
  exportToJSON,
  exportToExcel,
  prepareTasksForExport,
} from "../utils/exportUtils";
import "../styles/taskboard.css";

const TASK_STATUSES = [
  { key: "new", label: "New Tasks", color: "secondary", icon: "fas fa-inbox" },
  {
    key: "in_progress",
    label: "Under Process",
    color: "warning",
    icon: "fas fa-spinner",
  },
  {
    key: "completed",
    label: "Complete",
    color: "success",
    icon: "fas fa-check-circle",
  },
];

const TaskBoard = ({ projectId = null, className = "" }) => {
  const { user } = useAuth();
  const {
    projects,
    loading,
    errors,
    fetchTasks,
    updateTaskStatus,
    createTask,
    updateTask,
    deleteTask,
    tasks: globalTasks, // Rename to avoid conflict
  } = useApp();

  const [localTasks, setLocalTasks] = useState({}); // Rename to avoid conflict
  const [draggedTask, setDraggedTask] = useState(null);

  // Task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskFormMode, setTaskFormMode] = useState("create");

  // Task detail modal state
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Initialize tasks object with empty arrays for each status
  const initializeTasks = useCallback(() => {
    const initialTasks = {};
    TASK_STATUSES.forEach((status) => {
      initialTasks[status.key] = [];
    });
    return initialTasks;
  }, []);

  // Generate sample tasks with proper ObjectId-like format
  const generateObjectId = () => {
    // Generate a 24-character hex string to mimic MongoDB ObjectId
    return (
      Math.random().toString(16).substr(2, 8) +
      Math.random().toString(16).substr(2, 8) +
      Math.random().toString(16).substr(2, 8)
    );
  };

  // Organize tasks by status from AppContext
  useEffect(() => {
    const tasksByStatus = initializeTasks();

    // ALWAYS use sample tasks for testing to ensure cards display
    const sampleTasks = [
      {
        _id: "sample-1",
        title: "Design new dashboard layout",
        description:
          "Create a modern, responsive dashboard with advanced card styling and 3D effects",
        status: "new",
        priority: "high",
        assignedTo: { firstName: "John", lastName: "Doe" },
        projectId: { name: "UI Redesign" },
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        comments: [{ text: "Add glass-morphism effects" }],
        attachments: [{ name: "dashboard-mockup.png" }],
      },
      {
        _id: generateObjectId(),
        title: "Implement authentication system",
        description:
          "Add secure login and registration functionality with JWT tokens",
        status: "in_progress",
        priority: "medium",
        assignedTo: { firstName: "Jane", lastName: "Smith" },
        projectId: { name: "Backend Development" },
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        comments: [{ text: "Use bcrypt for password hashing" }],
        attachments: [],
      },
      {
        _id: generateObjectId(),
        title: "Database optimization",
        description:
          "Improve query performance and add proper indexing for better speed",
        status: "completed",
        priority: "low",
        assignedTo: { firstName: "Mike", lastName: "Johnson" },
        projectId: { name: "Performance Tuning" },
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        comments: [],
        attachments: [{ name: "performance-report.pdf" }],
      },
      {
        _id: generateObjectId(),
        title: "Create API documentation",
        description:
          "Write comprehensive API docs with examples and testing guides",
        status: "new",
        priority: "medium",
        assignedTo: { firstName: "Sarah", lastName: "Williams" },
        projectId: { name: "Documentation" },
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        comments: [],
        attachments: [],
      },
      {
        _id: generateObjectId(),
        title: "Setup testing framework",
        description:
          "Configure Jest and React Testing Library for unit and integration tests",
        status: "in_progress",
        priority: "high",
        assignedTo: { firstName: "Tom", lastName: "Brown" },
        projectId: { name: "Quality Assurance" },
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        comments: [{ text: "Add CI/CD pipeline" }],
        attachments: [{ name: "test-plan.xlsx" }],
      },
    ];

    // Add sample tasks to appropriate columns
    sampleTasks.forEach((task) => {
      if (tasksByStatus[task.status]) {
        tasksByStatus[task.status].push(task);
      }
    });

    console.log("TaskBoard - FORCED sample tasks for testing:", sampleTasks);
    console.log("TaskBoard - Tasks by status:", tasksByStatus);

    setLocalTasks(tasksByStatus);
  }, [projectId, initializeTasks]); // Remove allTasks dependency to force sample data

  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local tasks state with global AppContext tasks
  useEffect(() => {
    if (globalTasks && globalTasks.length > 0) {
      // Update local tasks state when global tasks change
      const organizedTasks = {};
      TASK_STATUSES.forEach((status) => {
        organizedTasks[status.key] = [];
      });

      // Organize global tasks by status
      globalTasks.forEach((task) => {
        if (organizedTasks[task.status]) {
          organizedTasks[task.status].push(task);
        }
      });

      setLocalTasks(organizedTasks);
    }
  }, [globalTasks]); // Sync with global tasks state

  // Handle task status update via drag and drop
  const handleTaskMove = async (taskId, newStatus) => {
    try {
      // Find the task in current local tasks
      let taskToMove = null;
      let oldStatus = null;

      for (const status in localTasks) {
        const taskIndex = localTasks[status].findIndex(
          (task) => task._id === taskId
        );
        if (taskIndex !== -1) {
          taskToMove = localTasks[status][taskIndex];
          oldStatus = status;
          break;
        }
      }

      if (!taskToMove || oldStatus === newStatus) {
        return;
      }

      // Update task status using AppContext
      const result = await updateTaskStatus(taskId, newStatus);

      if (!result.success) {
        console.error("Failed to update task status:", result.error);
      }
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };
  // Handle task drag start
  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  // Handle task drag end
  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  // Handle task form submission
  const handleTaskFormSubmit = async (taskData) => {
    try {
      let result;
      if (taskFormMode === "create") {
        result = await createTask(taskData);
      } else {
        result = await updateTask(editingTask._id, taskData);
      }

      if (result.success) {
        setShowTaskForm(false);
        setEditingTask(null);
      }
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  // Handle create new task
  const handleCreateTask = () => {
    setEditingTask(null);
    setTaskFormMode("create");
    setShowTaskForm(true);
  };

  // Handle edit task
  // eslint-disable-next-line no-unused-vars
  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskFormMode("edit");
    setShowTaskForm(true);
  };

  // Export functionality
  const handleExport = (format) => {
    const tasksForExport = Object.values(localTasks).flat();
    const exportData = prepareTasksForExport(tasksForExport, projects);
    const filename = `tasks_${new Date().toISOString().split("T")[0]}`;

    switch (format) {
      case "csv":
        exportToCSV(exportData, filename);
        break;
      case "json":
        exportToJSON(exportData, filename);
        break;
      case "excel":
        exportToExcel(exportData, filename);
        break;
      default:
        exportToCSV(exportData, filename);
    }
  };
  const handleTaskCardClick = (task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  // Handle edit task from detail modal
  const handleEditFromDetail = (task) => {
    setShowTaskDetail(false);
    setEditingTask(task);
    setTaskFormMode("edit");
    setShowTaskForm(true);
  };

  // Handle delete task from detail modal
  const handleDeleteFromDetail = async (task) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      setShowTaskDetail(false);
      try {
        const result = await deleteTask(task._id);
        if (!result.success) {
          console.error("Failed to delete task:", result.error);
        }
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    }
  };

  // Calculate task counts for each status
  const getTaskCounts = () => {
    const counts = {};
    TASK_STATUSES.forEach((status) => {
      counts[status.key] = localTasks[status.key]?.length || 0;
    });
    return counts;
  };

  if (loading.tasks) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading tasks...</span>
          </div>
          <p className="text-muted">Loading task board...</p>
        </div>
      </div>
    );
  }

  if (errors.tasks) {
    return (
      <div className="alert alert-danger" role="alert">
        <h4 className="alert-heading">Error Loading Tasks</h4>
        <p>{errors.tasks}</p>
        <hr />
        <button
          className="btn btn-outline-danger"
          onClick={() => fetchTasks(true)}
        >
          <i className="fas fa-redo me-2"></i>
          Try Again
        </button>
      </div>
    );
  }

  const taskCounts = getTaskCounts();
  // eslint-disable-next-line no-unused-vars
  const canCreateTasks =
    user &&
    (user.role === "managing_director" ||
      user.role === "it_admin" ||
      user.role === "team_lead");

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`task-board ${className}`}>
        {/* Board Header */}
        <div className="board-header d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div className="flex-grow-1">
            <h4 className="mb-1 d-flex align-items-center flex-wrap">
              <i className="fas fa-tasks me-2 text-primary"></i>
              <span>Task Board</span>
              {projectId && projects.find((p) => p._id === projectId)?.name && (
                <span className="ms-2 text-primary">
                  - {projects.find((p) => p._id === projectId).name}
                </span>
              )}
            </h4>
            <p className="text-muted mb-0 small">
              Drag and drop tasks to change status
            </p>
          </div>
          <div className="d-flex gap-2 flex-wrap align-items-center">
            {/* Export Buttons */}
            <div className="btn-group" role="group">
              <button
                type="button"
                className="btn btn-outline-success btn-sm dropdown-toggle"
                data-bs-toggle="dropdown"
                title="Export tasks"
              >
                <i className="fas fa-download me-1"></i>
                Export
              </button>
              <ul className="dropdown-menu">
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => handleExport("csv")}
                  >
                    <i className="fas fa-file-csv me-2 text-success"></i>
                    Export to CSV
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => handleExport("json")}
                  >
                    <i className="fas fa-file-code me-2 text-info"></i>
                    Export to JSON
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => handleExport("excel")}
                  >
                    <i className="fas fa-file-excel me-2 text-primary"></i>
                    Export to Excel
                  </button>
                </li>
              </ul>
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreateTask}
              disabled={
                !(
                  user &&
                  (user.role === "managing_director" ||
                    user.role === "it_admin" ||
                    user.role === "team_lead")
                )
              }
              title={
                !(
                  user &&
                  (user.role === "managing_director" ||
                    user.role === "it_admin" ||
                    user.role === "team_lead")
                )
                  ? "You don't have permission to create tasks"
                  : "Create new task"
              }
            >
              <i className="fas fa-plus me-1"></i>
              Create Task
            </button>

            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={fetchTasks}
              title="Refresh tasks"
            >
              <i className="fas fa-sync-alt me-1"></i>
              Refresh
            </button>
          </div>
        </div>

        {/* Task Status Summary */}
        <div className="row mb-4">
          {TASK_STATUSES.map((status) => (
            <div key={status.key} className="col-md-4 col-12 mb-2">
              <div
                className="card border-0 shadow-sm h-100"
                style={{
                  borderLeft: `4px solid var(--bs-${status.color})`,
                  transition: "transform 0.2s ease-in-out",
                }}
              >
                <div className="card-body text-center py-3">
                  <div className="d-flex align-items-center justify-content-center mb-2">
                    <i
                      className={`${status.icon} fa-2x text-${status.color} me-2`}
                    ></i>
                    <div>
                      <h4 className="card-title mb-0 text-primary">
                        {taskCounts[status.key]}
                      </h4>
                      <small className="text-muted">{status.label}</small>
                    </div>
                  </div>
                  <StatusIndicator
                    status={status.key}
                    type="task"
                    size="sm"
                    showText={false}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Kanban Columns */}
        <div className="kanban-board">
          {TASK_STATUSES.map((status) => (
            <TaskColumn
              key={status.key}
              status={status.key}
              title={status.label}
              color={status.color}
              icon={status.icon}
              tasks={localTasks[status.key] || []}
              onTaskMove={handleTaskMove}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              draggedTask={draggedTask}
              canAcceptDrop={true}
              onTaskClick={handleTaskCardClick}
            />
          ))}
        </div>
      </div>

      {/* Task Form Modal */}
      <TaskForm
        show={showTaskForm}
        onHide={() => setShowTaskForm(false)}
        onSubmit={handleTaskFormSubmit}
        task={editingTask}
        projectId={projectId}
        mode={taskFormMode}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        show={showTaskDetail}
        onHide={() => setShowTaskDetail(false)}
        task={selectedTask}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
      />
    </DndProvider>
  );
};

export default TaskBoard;
