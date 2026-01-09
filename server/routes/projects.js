const express = require("express");
const projectController = require("../controllers/projectController");
const { protect, requirePermission } = require("../middleware/auth");
const {
  validateProjectCreation,
  validateProjectUpdate,
  validateAddProjectMember,
  validateRemoveProjectMember,
} = require("../middleware/validation");

const router = express.Router();

/**
 * Project Management Routes
 * All routes require authentication
 */
router.use(protect);

/**
 * Role-based Project Views (MUST come before parameterized routes)
 */

// Get user's assigned projects (My Projects)
router.get("/my", projectController.getMyProjects);

// Get team projects (Team Projects)
router.get("/team", projectController.getTeamProjects);

// Get user's assigned tasks (My Tasks)
router.get("/my/tasks", projectController.getMyTasks);

// Get team tasks (Team Tasks - Team Lead and above only)
router.get("/team/tasks", projectController.getTeamTasks);

/**
 * Project CRUD Operations
 */

// Get all projects (role-based filtering applied in controller)
router.get("/", projectController.getAllProjects);

// Get specific project
router.get("/:id", projectController.getProject);

// Create new project (Team Lead and above only)
router.post(
  "/",
  requirePermission("create_project"),
  validateProjectCreation,
  projectController.createProject
);

// Update project
router.patch("/:id", validateProjectUpdate, projectController.updateProject);

// Delete project (MD and IT_Admin only)
router.delete("/:id", projectController.deleteProject);

/**
 * Project Member Management
 */

// Add member to project
router.post(
  "/:id/members",
  validateAddProjectMember,
  projectController.addProjectMember
);

// Remove member from project
router.delete(
  "/:id/members/:userId",
  validateRemoveProjectMember,
  projectController.removeProjectMember
);

/**
 * Project Tasks
 */

// Get all tasks for a specific project
router.get("/:id/tasks", projectController.getProjectTasks);

/**
 * Project Statistics
 */

// Get project statistics
router.get("/:id/stats", projectController.getProjectStats);

module.exports = router;
