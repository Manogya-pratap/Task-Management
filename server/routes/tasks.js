const express = require("express");
const taskController = require("../controllers/taskController");
const { protect, requirePermission } = require("../middleware/auth");
const {
  validateTaskCreation,
  validateTaskUpdate,
  validateTaskStatusUpdate,
  validateTaskComment,
} = require("../middleware/validation");

const router = express.Router();

/**
 * Task Management Routes
 * All routes require authentication
 */
router.use(protect);

/**
 * Role-based Task Views (MUST come before parameterized routes)
 */

// Get my tasks (for employees)
router.get("/my", (req, res, next) => {
  console.log("Route /my hit in tasks.js");
  return taskController.getMyTasks(req, res, next);
});

// Get team tasks (for team leads)
router.get("/team", taskController.getTeamTasks);

/**
 * Task CRUD Operations
 */

// Get all tasks (role-based filtering applied in controller)
router.get("/", taskController.getAllTasks);

// Get task statistics
router.get("/stats", taskController.getTaskStats);

// Get tasks by status (for Kanban board organization)
router.get("/status/:status", taskController.getTasksByStatus);

// Get specific task
router.get("/:id", (req, res, next) => {
  console.log("Route /:id hit in tasks.js with id:", req.params.id);
  return taskController.getTask(req, res, next);
});

// Create new task (Team Lead and above only)
router.post(
  "/",
  requirePermission("create_project"), // Same permission as project creation
  validateTaskCreation,
  taskController.createTask
);

// Create personal task (for employees)
router.post(
  "/personal",
  validateTaskCreation,
  taskController.createPersonalTask
);

// Update task
router.patch("/:id", validateTaskUpdate, taskController.updateTask);

// Update task status specifically (allows assigned users to update their task status)
router.patch(
  "/:id/status",
  validateTaskStatusUpdate,
  taskController.updateTaskStatus
);

// Delete task
router.delete("/:id", taskController.deleteTask);

/**
 * Task Comments
 */

// Add comment to task
router.post(
  "/:id/comments",
  validateTaskComment,
  taskController.addTaskComment
);

module.exports = router;
