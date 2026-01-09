const express = require("express");
const userController = require("../controllers/userController");
const { protect, requirePermission } = require("../middleware/auth");
const {
  validateUserCreation,
  validateUserUpdate,
} = require("../middleware/validation");

const router = express.Router();

/**
 * User Management Routes
 * All routes require authentication
 */
router.use(protect);

/**
 * User CRUD Operations
 */

// Get all users (role-based filtering applied in controller)
router.get("/", userController.getAllUsers);

// Get specific user
router.get("/:id", userController.getUser);

// Create new user (Team Lead and above only)
router.post(
  "/",
  requirePermission("create_user"),
  validateUserCreation,
  userController.createUser
);

// Update user
router.patch("/:id", validateUserUpdate, userController.updateUser);

// Delete user (MD only)
router.delete(
  "/:id",
  requirePermission("delete_user"),
  userController.deleteUser
);

// Export user data
router.get("/export/data", userController.exportUserData);

module.exports = router;
