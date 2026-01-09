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
    tasks: allTasks,
    projects,
    loading,
    errors,
    fetchTasks,
    updateTaskStatus,
    createTask,
    updateTask,
    deleteTask,
  } = useApp();

  const [tasks, setTasks] = useState({});
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

  // Organize tasks by status from AppContext
  useEffect(() => {
    const tasksByStatus = initializeTasks();

    // Filter tasks by project if projectId is provided
    const filteredTasks = projectId
      ? allTasks.filter((task) => task.projectId?._id === projectId)
      : allTasks;

    filteredTasks.forEach((task) => {
      if (tasksByStatus[task.status]) {
        tasksByStatus[task.status].push(task);
      }
    });

    setTasks(tasksByStatus);
  }, [allTasks, projectId, initializeTasks]);

  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handle task status update via drag and drop
  const handleTaskMove = async (taskId, newStatus) => {
    try {
      // Find the task in current tasks
      let taskToMove = null;
      let oldStatus = null;

      for (const status in tasks) {
        const taskIndex = tasks[status].findIndex(
          (task) => task._id === taskId
        );
        if (taskIndex !== -1) {
          taskToMove = tasks[status][taskIndex];
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
    const tasksForExport = Object.values(tasks).flat();
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
      counts[status.key] = tasks[status.key]?.length || 0;
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
  const totalTasks = Object.values(taskCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  // Check if user can create tasks
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
        <div className="row g-3 g-lg-4" style={{ minHeight: "650px" }}>
          {TASK_STATUSES.map((status) => (
            <div
              key={status.key}
              className="col-xl-4 col-lg-6 col-md-12 col-sm-12 d-flex"
              style={{ marginBottom: "1.5rem" }}
            >
              <TaskColumn
                status={status.key}
                title={status.label}
                color={status.color}
                icon={status.icon}
                tasks={tasks[status.key] || []}
                onTaskMove={handleTaskMove}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                draggedTask={draggedTask}
                canAcceptDrop={true}
                onTaskClick={handleTaskCardClick}
                style={{ minHeight: "550px", flex: 1 }}
              />
            </div>
          ))}
        </div>

        {/* Empty State */}
        {totalTasks === 0 && (
          <div className="text-center py-5">
            <div className="mb-4">
              <i className="fas fa-clipboard-list fa-5x text-muted mb-3"></i>
            </div>
            <h4 className="text-muted mb-3">No Tasks Found</h4>
            <p className="text-muted mb-4">
              {projectId
                ? "This project doesn't have any tasks yet. Start by creating your first task!"
                : "You don't have any tasks assigned yet. Check back later or create a new task."}
            </p>
            {user &&
              (user.role === "managing_director" ||
                user.role === "it_admin" ||
                user.role === "team_lead") && (
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleCreateTask}
                >
                  <i className="fas fa-plus me-2"></i>
                  Create Your First Task
                </button>
              )}
          </div>
        )}
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
