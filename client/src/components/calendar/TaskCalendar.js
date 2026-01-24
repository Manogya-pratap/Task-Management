import { useState, useEffect, useMemo } from "react";
import moment from "moment";
import { useApp } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";
import TaskForm from "../TaskForm";
import TaskDetailModal from "../tasks/TaskDetailModal";
import "./TaskCalendar.css";

const TaskCalendar = ({
  projectId,
  showDeadlineNotifications = true,
  height = "600px",
}) => {
  const {
    tasks: allTasks,
    projects,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    addNotification,
  } = useApp();
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [currentDate, setCurrentDate] = useState(moment());
  const [error, setError] = useState(null);

  // Status colors matching the system design
  const statusColors = {
    new: "#6c757d",
    scheduled: "#007bff",
    in_progress: "#ffc107",
    completed: "#28a745",
  };

  // Priority colors
  const priorityColors = {
    low: "#17a2b8",
    medium: "#6f42c1",
    high: "#fd7e14",
    urgent: "#dc3545",
  };

  useEffect(() => {
    // Only fetch tasks if they're not already loaded
    const loadTasks = async () => {
      try {
        if (!allTasks || allTasks.length === 0) {
          await fetchTasks();
        }
      } catch (err) {
        console.error('TaskCalendar: Error fetching tasks:', err);
        setError('Unable to load tasks. Please try again later.');
      }
    };
    
    loadTasks();
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter tasks for calendar display
  const tasks = useMemo(() => {
    if (!Array.isArray(allTasks)) return [];

    const filteredTasks = allTasks.filter((task) => {
      // Filter by project if projectId is provided
      if (projectId && task.projectId?._id !== projectId) {
        return false;
      }
      // Include tasks with due dates, scheduled dates, or start dates
      return task.dueDate || task.scheduledDate || task.startDate;
    });

    return filteredTasks;
  }, [allTasks, projectId]);

  // Generate calendar days for current view
  const calendarDays = useMemo(() => {
    const startOfMonth = currentDate.clone().startOf("month");
    const endOfMonth = currentDate.clone().endOf("month");
    const startOfCalendar = startOfMonth.clone().startOf("week");
    const endOfCalendar = endOfMonth.clone().endOf("month").endOf("week");

    const days = [];
    let day = startOfCalendar.clone();

    // Generate exactly 42 days (6 weeks) for consistent calendar layout
    while (days.length < 42) {
      days.push(day.clone());
      day.add(1, "day");
    }

    return days;
  }, [currentDate]);

  // Get tasks for a specific date (memoized for performance)
  const getTasksForDate = useMemo(() => {
    return (date) => {
      if (!Array.isArray(tasks)) return [];

      const dateStr = date.format("YYYY-MM-DD");

      const filteredTasks = tasks.filter((task) => {
        const taskDate = task.scheduledDate || task.dueDate || task.startDate;
        if (!taskDate) return false;
        const taskMoment = moment(taskDate);
        return taskMoment.isSame(date, "day");
      });

      return filteredTasks;
    };
  }, [tasks]);

  // Get deadline notifications (tasks due within next 7 days) - memoized
  const deadlineNotifications = useMemo(() => {
    if (!Array.isArray(tasks) || !showDeadlineNotifications) return [];

    const today = moment();
    const nextWeek = today.clone().add(7, "days");

    return tasks
      .filter((task) => {
        if (task.status === "completed") return false;

        const dueDate = task.dueDate;
        if (!dueDate) return false;

        const taskDue = moment(dueDate);
        return taskDue.isBetween(today, nextWeek, "day", "[]");
      })
      .sort((a, b) => moment(a.dueDate) - moment(b.dueDate));
  }, [tasks, showDeadlineNotifications]);

  // Check if a date has overdue tasks - memoized
  const hasOverdueTasks = useMemo(() => {
    return (date) => {
      if (!Array.isArray(tasks)) return false;

      const today = moment();
      if (date.isAfter(today, "day")) return false;

      return tasks.some((task) => {
        if (task.status === "completed") return false;
        const dueDate = task.dueDate;
        return (
          dueDate &&
          moment(dueDate).isSame(date, "day") &&
          moment(dueDate).isBefore(today, "day")
        );
      });
    };
  }, [tasks]);

  // Check if a date has tasks due today - memoized
  const hasTasksDueToday = useMemo(() => {
    return (date) => {
      if (!Array.isArray(tasks)) return false;

      const today = moment();
      if (!date.isSame(today, "day")) return false;

      return tasks.some((task) => {
        if (task.status === "completed") return false;
        const dueDate = task.dueDate;
        return dueDate && moment(dueDate).isSame(date, "day");
      });
    };
  }, [tasks]);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleCreateTask = (date) => {
    // For employees, create a personal task without project requirement
    const newTask = {
      title: "",
      description: "",
      status: "new",
      priority: "medium",
      scheduledDate: date.format("YYYY-MM-DD"),
      dueDate: date.format("YYYY-MM-DD"),
      assignedTo: user._id, // Assign to current user
      projectId: projectId || null,
      createdBy: user._id,
    };

    setEditingTask(newTask);
    setShowTaskForm(true);
    setShowTaskModal(false);
  };

  const handleEditTask = (task) => {
    // Close any open modals first
    setShowTaskModal(false);
    setShowTaskDetail(false);
    setSelectedTask(null);

    // Then open the edit form
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
      try {
        await fetchTasks();
      } catch (fetchError) {
        console.error('Error refreshing tasks after delete:', fetchError);
        // Don't show error, task was deleted successfully
      }
      setShowTaskModal(false);
    } catch (error) {
      console.error("Error deleting task:", error);
      setError('Failed to delete task. Please try again.');
    }
  };

  const handleTaskFormSubmit = async (taskData) => {
    try {
      let result;
      if (editingTask && editingTask._id) {
        result = await updateTask(editingTask._id, taskData);
      } else {
        result = await createTask(taskData);
      }

      if (result.success) {
        try {
          await fetchTasks();
        } catch (fetchError) {
          console.error('Error refreshing tasks after save:', fetchError);
          // Don't show error, task was saved successfully
        }
        setShowTaskForm(false);
        setEditingTask(null);

        // Show success notification
        addNotification({
          type: "success",
          message: editingTask?._id
            ? "Task updated successfully"
            : "Task created successfully",
        });
      } else {
        setError(result.error || "Failed to save task");
      }
    } catch (error) {
      console.error("TaskCalendar: Error in handleTaskFormSubmit:", error);
      setError(error.response?.data?.message || "Failed to save task");
    }
  };

  const handleDateClick = (date) => {
    // Prevent event bubbling and default behavior
    const dateTasks = getTasksForDate(date);

    if (dateTasks.length === 0) {
      // Create new task for this date
      handleCreateTask(date);
    } else if (dateTasks.length === 1) {
      handleTaskClick(dateTasks[0]);
    } else {
      // Show a list of tasks for this date
      setSelectedTask({
        isMultiple: true,
        date: date.format("YYYY-MM-DD"),
        dateFormatted: date.format("MMMM DD, YYYY"),
        tasks: dateTasks,
      });
      setShowTaskModal(true);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => prev.clone().add(direction, "month"));
  };

  const goToToday = () => {
    setCurrentDate(moment());
  };

  return (
    <div className="task-calendar">
      <div
        className="card"
        style={{ height: "700px", minHeight: "700px", maxHeight: "800px" }}
      >
        <div className="card-header">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="d-flex align-items-center">
                <h5 className="mb-0 me-3">
                  <i className="fas fa-calendar-alt me-2"></i>
                  Task Calendar
                </h5>
                <div className="btn-group btn-group-sm">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigateMonth(-1)}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={goToToday}
                    style={{ color: "black !important", fontWeight: "500" }}
                  >
                    Today
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigateMonth(1)}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-6 text-md-end">
              <h6 className="mb-0 text-muted">
                {currentDate.format("MMMM YYYY")}
              </h6>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {/* Error Display */}
          {error && (
            <div className="alert alert-warning m-3 mb-0" role="alert">
              <div className="d-flex align-items-center">
                <i className="fas fa-exclamation-triangle me-2"></i>
                <div className="flex-grow-1">{error}</div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setError(null)}
                  aria-label="Close"
                ></button>
              </div>
            </div>
          )}
          
          {/* Deadline Notifications */}
          {deadlineNotifications.length > 0 && (
            <div className="deadline-notifications p-3 border-bottom bg-warning bg-opacity-10">
              <div className="d-flex align-items-center mb-2">
                <i className="fas fa-exclamation-triangle text-warning me-2"></i>
                <strong>Upcoming Deadlines</strong>
              </div>
              <div className="d-flex flex-wrap gap-2">
                {deadlineNotifications.slice(0, 3).map((task) => (
                  <span
                    key={task._id}
                    className="badge bg-warning text-dark cursor-pointer"
                    onClick={() => handleTaskClick(task)}
                    style={{ cursor: "pointer" }}
                  >
                    {task.title} - {moment(task.dueDate).format("MMM DD")}
                  </span>
                ))}
                {deadlineNotifications.length > 3 && (
                  <span
                    className="badge bg-secondary cursor-pointer"
                    onClick={() => {
                      // Show all remaining tasks in a modal or expand the view
                      const remainingTasks = deadlineNotifications.slice(3);
                      setSelectedTask({
                        isMultiple: true,
                        date: null,
                        tasks: remainingTasks,
                        title: `Additional ${remainingTasks.length} Upcoming Deadlines`,
                      });
                      setShowTaskModal(true);
                    }}
                    style={{ cursor: "pointer" }}
                    title={`Click to view ${deadlineNotifications.length - 3} more tasks`}
                  >
                    +{deadlineNotifications.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Calendar Grid */}
          <div className="calendar-grid">
            {/* Day Headers */}
            <div className="calendar-header">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="calendar-day-header">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="calendar-body">
              {calendarDays.map((day) => {
                const dayTasks = getTasksForDate(day);
                const isCurrentMonth = day.isSame(currentDate, "month");
                const isToday = day.isSame(moment(), "day");
                const isOverdue = hasOverdueTasks(day);
                const isDueToday = hasTasksDueToday(day);

                return (
                  <div
                    key={day.format("YYYY-MM-DD")}
                    className={`calendar-day ${!isCurrentMonth ? "other-month" : ""} ${isToday ? "today" : ""} ${isOverdue ? "overdue" : ""} ${isDueToday ? "due-today" : ""} ${dayTasks.length > 0 ? "has-tasks" : "clickable-empty"}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDateClick(day);
                    }}
                    style={{ cursor: "pointer", pointerEvents: "auto" }}
                    title={
                      dayTasks.length > 0
                        ? `${dayTasks.length} task(s) on this date`
                        : "Click to add a task"
                    }
                  >
                    <div className="calendar-day-number">
                      {day.format("D")}
                      {isDueToday && (
                        <i className="fas fa-exclamation-circle text-danger ms-1"></i>
                      )}
                    </div>

                    <div className="calendar-day-tasks">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task._id}
                          className="calendar-task"
                          style={{
                            backgroundColor: statusColors[task.status],
                            borderLeft: `3px solid ${priorityColors[task.priority]}`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskClick(task);
                          }}
                        >
                          <div className="calendar-task-title">
                            {task.title}
                          </div>
                          {task.dueDate &&
                            moment(task.dueDate).isSame(day, "day") && (
                              <div className="calendar-task-time">
                                <i className="fas fa-clock me-1"></i>
                                Due
                              </div>
                            )}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="calendar-task-more">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      {showTaskModal && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {selectedTask?.title ||
                    (selectedTask?.isMultiple
                      ? `Tasks for ${moment(selectedTask.date).format("MMMM DD, YYYY")}`
                      : "Task Details")}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowTaskModal(false);
                    setSelectedTask(null);
                  }}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                {selectedTask?.isEmpty ? (
                  <div className="text-center py-4">
                    <i className="fas fa-calendar-plus fa-3x text-muted mb-3"></i>
                    <h5>No Tasks for {selectedTask.dateFormatted}</h5>
                    <p className="text-muted">
                      Would you like to create a new task for this date?
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        handleCreateTask(moment(selectedTask.date))
                      }
                    >
                      <i className="fas fa-plus me-2"></i>
                      Create Task
                    </button>
                  </div>
                ) : selectedTask?.isMultiple ? (
                  <div>
                    {selectedTask.tasks.map((task) => (
                      <div key={task._id} className="border-bottom pb-3 mb-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6
                            className="mb-1"
                            style={{ cursor: "pointer", color: "#007bff" }}
                            onClick={() => {
                              handleTaskClick(task);
                            }}
                          >
                            {task.title}
                          </h6>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => {
                                handleEditTask(task);
                              }}
                              title="Edit Task"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  window.confirm(`Delete task: ${task.title}?`)
                                ) {
                                  handleDeleteTask(task._id);
                                }
                              }}
                              title="Delete Task"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                        <div className="d-flex gap-2 mb-2">
                          <span
                            className="badge me-1"
                            style={{
                              backgroundColor: statusColors[task.status],
                            }}
                          >
                            {task.status.replace("_", " ")}
                          </span>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: priorityColors[task.priority],
                            }}
                          >
                            {task.priority}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-muted mb-2">{task.description}</p>
                        )}
                        <div className="small text-muted">
                          <i className="fas fa-project-diagram me-1"></i>
                          {(projects || []).find(
                            (p) => p._id === task.projectId
                          )?.name || "No project"}
                          {task.assignedTo && (
                            <>
                              <span className="mx-2">•</span>
                              <i className="fas fa-user me-1"></i>
                              {task.assignedTo.firstName}{" "}
                              {task.assignedTo.lastName}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  selectedTask && (
                    <div>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <h5>{selectedTask.title}</h5>
                        <div>
                          <span
                            className="badge me-1"
                            style={{
                              backgroundColor:
                                statusColors[selectedTask.status],
                            }}
                          >
                            {selectedTask.status.replace("_", " ")}
                          </span>
                          <span
                            className="badge"
                            style={{
                              backgroundColor:
                                priorityColors[selectedTask.priority],
                            }}
                          >
                            {selectedTask.priority}
                          </span>
                        </div>
                      </div>

                      {selectedTask.description && (
                        <div className="mb-3">
                          <h6>Description</h6>
                          <p className="text-muted">
                            {selectedTask.description}
                          </p>
                        </div>
                      )}

                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <h6>Project</h6>
                            <p className="mb-0">
                              {(projects || []).find(
                                (p) => p._id === selectedTask.projectId
                              )?.name || "No project assigned"}
                            </p>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <h6>Assigned To</h6>
                            <p className="mb-0">
                              {selectedTask.assignedTo
                                ? `${selectedTask.assignedTo.firstName} ${selectedTask.assignedTo.lastName}`
                                : "Unassigned"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="row">
                        <div className="col-md-6">
                          {selectedTask.scheduledDate && (
                            <div className="mb-3">
                              <h6>Scheduled Date</h6>
                              <p className="mb-0">
                                <i className="fas fa-calendar me-1"></i>
                                {moment(selectedTask.scheduledDate).format(
                                  "MMMM DD, YYYY"
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="col-md-6">
                          {selectedTask.dueDate && (
                            <div className="mb-3">
                              <h6>Due Date</h6>
                              <p className="mb-0">
                                <i className="fas fa-clock me-1"></i>
                                {moment(selectedTask.dueDate).format(
                                  "MMMM DD, YYYY"
                                )}
                                {moment(selectedTask.dueDate).isBefore(
                                  moment(),
                                  "day"
                                ) &&
                                  selectedTask.status !== "completed" && (
                                    <span className="badge bg-danger ms-2">
                                      Overdue
                                    </span>
                                  )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    console.log("Close button clicked");
                    setShowTaskModal(false);
                    setSelectedTask(null);
                  }}
                >
                  Close
                </button>
                {selectedTask && !selectedTask.isMultiple && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleEditTask(selectedTask)}
                  >
                    <i className="fas fa-edit me-1"></i>
                    Edit Task
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          show={showTaskForm}
          onHide={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
          onSubmit={handleTaskFormSubmit}
          task={editingTask}
          projectId={projectId}
          mode={editingTask?._id ? "edit" : "create"}
        />
      )}

      {/* Task Detail Modal */}
      {showTaskDetail && selectedTask && (
        <TaskDetailModal
          show={showTaskDetail}
          onHide={() => {
            setShowTaskDetail(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          onEdit={() => handleEditTask(selectedTask)}
          onDelete={() => {
            if (window.confirm(`Delete task: ${selectedTask.title}?`)) {
              handleDeleteTask(selectedTask._id);
            }
          }}
        />
      )}
    </div>
  );
};

export default TaskCalendar;
