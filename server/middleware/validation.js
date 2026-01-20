const { body, param } = require("express-validator");

/**
 * Validation middleware for authentication endpoints
 */

const validateSignup = [
  body("username")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),

  body("firstName")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("First name must be between 1 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name can only contain letters and spaces"),

  body("lastName")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name must be between 1 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),

  body("role")
    .optional()
    .isIn(["managing_director", "it_admin", "team_lead", "employee"])
    .withMessage(
      "Role must be one of: managing_director, it_admin, team_lead, employee"
    ),

  body("department")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Department must be between 1 and 100 characters"),
];

const validateLogin = [
  body("username")
    .notEmpty()
    .withMessage("Username or email is required")
    .trim(),

  body("password").notEmpty().withMessage("Password is required"),
];

const validatePasswordUpdate = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Password confirmation does not match new password");
    }
    return true;
  }),
];

/**
 * Validation middleware for team management endpoints
 */

const validateTeamCreation = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Team name must be between 1 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage(
      "Team name can only contain letters, numbers, spaces, hyphens, and underscores"
    ),

  body("department")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Department must be between 1 and 100 characters"),

  body("teamLeadId")
    .isMongoId()
    .withMessage("Team lead ID must be a valid MongoDB ObjectId"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
];

const validateTeamUpdate = [
  param("teamId")
    .isMongoId()
    .withMessage("Team ID must be a valid MongoDB ObjectId"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Team name must be between 1 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage(
      "Team name can only contain letters, numbers, spaces, hyphens, and underscores"
    ),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
];

const validateAddTeamMember = [
  param("teamId")
    .isMongoId()
    .withMessage("Team ID must be a valid MongoDB ObjectId"),

  body("userId")
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),
];

const validateRemoveTeamMember = [
  param("teamId")
    .isMongoId()
    .withMessage("Team ID must be a valid MongoDB ObjectId"),

  param("userId")
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),
];

const validateUserCreation = [
  body("username")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),

  body("firstName")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("First name must be between 1 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name can only contain letters and spaces"),

  body("lastName")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name must be between 1 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),

  body("role")
    .optional()
    .isIn(["managing_director", "it_admin", "team_lead", "employee"])
    .withMessage(
      "Role must be one of: managing_director, it_admin, team_lead, employee"
    ),

  body("department")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Department must be between 1 and 100 characters"),

  body("teamId")
    .optional()
    .isMongoId()
    .withMessage("Team ID must be a valid MongoDB ObjectId"),
];

const validateUserUpdate = [
  param("id")
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),

  body("username")
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("firstName")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("First name must be between 1 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name can only contain letters and spaces"),

  body("lastName")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name must be between 1 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),

  body("role")
    .optional()
    .isIn(["managing_director", "it_admin", "team_lead", "employee"])
    .withMessage(
      "Role must be one of: managing_director, it_admin, team_lead, employee"
    ),

  body("department")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Department must be between 1 and 100 characters"),

  body("teamId")
    .optional()
    .isMongoId()
    .withMessage("Team ID must be a valid MongoDB ObjectId"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),
];

const validateDepartmentParam = [
  param("department")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Department must be between 1 and 100 characters"),
];

/**
 * Validation middleware for project management endpoints
 */

const validateProjectCreation = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Project name must be between 1 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Project description cannot exceed 1000 characters"),

  body("status")
    .optional()
    .isIn(["draft", "planning", "active", "completed", "in_progress", "not_started"])
    .withMessage("Status must be one of: draft, planning, active, completed"),

  body("startDate")
    .if(body("status").not().equals("draft"))
    .isISO8601()
    .withMessage("Start date must be a valid date")
    .toDate(),

  body("endDate")
    .if(body("status").not().equals("draft"))
    .isISO8601()
    .withMessage("End date must be a valid date")
    .toDate()
    .custom((value, { req }) => {
      if (value <= req.body.startDate) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),

  body("departmentId")
    .optional()
    .isMongoId()
    .withMessage("Department ID must be a valid MongoDB ObjectId"),

  body("teamId")
    .optional()
    .isMongoId()
    .withMessage("Team ID must be a valid MongoDB ObjectId"),

  body("assignedMembers")
    .optional()
    .isArray()
    .withMessage("Assigned members must be an array")
    .custom((value) => {
      if (value && value.length > 0) {
        const isValidIds = value.every((id) => /^[0-9a-fA-F]{24}$/.test(id));
        if (!isValidIds) {
          throw new Error(
            "All assigned member IDs must be valid MongoDB ObjectIds"
          );
        }
      }
      return true;
    }),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be one of: low, medium, high, urgent"),

  body("budget")
    .optional()
    .isNumeric({ min: 0 })
    .withMessage("Budget must be a positive number"),

  body("tags").optional().isArray().withMessage("Tags must be an array"),
];

const validateProjectUpdate = [
  param("id")
    .isMongoId()
    .withMessage("Project ID must be a valid MongoDB ObjectId"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Project name must be between 1 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Project description must be between 1 and 1000 characters"),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date")
    .toDate(),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date")
    .toDate()
    .custom((value, { req }) => {
      if (value && req.body.startDate && value <= req.body.startDate) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),

  body("status")
    .optional()
    .isIn(["planning", "active", "completed", "on_hold"])
    .withMessage("Status must be one of: planning, active, completed, on_hold"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be one of: low, medium, high, urgent"),

  body("assignedMembers")
    .optional()
    .isArray()
    .withMessage("Assigned members must be an array")
    .custom((value) => {
      if (value && value.length > 0) {
        const isValidIds = value.every((id) => /^[0-9a-fA-F]{24}$/.test(id));
        if (!isValidIds) {
          throw new Error(
            "All assigned member IDs must be valid MongoDB ObjectIds"
          );
        }
      }
      return true;
    }),

  body("budget")
    .optional()
    .isNumeric({ min: 0 })
    .withMessage("Budget must be a positive number"),

  body("actualCost")
    .optional()
    .isNumeric({ min: 0 })
    .withMessage("Actual cost must be a positive number"),

  body("completionPercentage")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Completion percentage must be between 0 and 100"),
];

const validateAddProjectMember = [
  param("id")
    .isMongoId()
    .withMessage("Project ID must be a valid MongoDB ObjectId"),

  body("userId")
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),
];

const validateRemoveProjectMember = [
  param("id")
    .isMongoId()
    .withMessage("Project ID must be a valid MongoDB ObjectId"),

  param("userId")
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),
];

/**
 * Validation middleware for task management endpoints
 */

const validateTaskCreation = [
  body("title")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Task title must be between 1 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Task description cannot exceed 1000 characters"),

  body("status")
    .optional()
    .isIn(["new", "scheduled", "in_progress", "completed"])
    .withMessage(
      "Status must be one of: new, scheduled, in_progress, completed"
    ),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be one of: low, medium, high, urgent"),

  body("projectId")
    .isMongoId()
    .withMessage("Project ID must be a valid MongoDB ObjectId"),

  body("assignedTo")
    .optional()
    .isMongoId()
    .withMessage("Assigned user ID must be a valid MongoDB ObjectId"),

  body("scheduledDate")
    .optional()
    .isISO8601()
    .withMessage("Scheduled date must be a valid date")
    .toDate(),

  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Due date must be a valid date")
    .toDate(),

  body("estimatedHours")
    .optional()
    .isNumeric({ min: 0 })
    .withMessage("Estimated hours must be a positive number"),

  body("tags").optional().isArray().withMessage("Tags must be an array"),
];

const validateTaskUpdate = [
  param("id")
    .isMongoId()
    .withMessage("Task ID must be a valid MongoDB ObjectId"),

  body("title")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Task title must be between 1 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Task description cannot exceed 1000 characters"),

  body("status")
    .optional()
    .isIn(["new", "scheduled", "in_progress", "completed"])
    .withMessage(
      "Status must be one of: new, scheduled, in_progress, completed"
    ),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be one of: low, medium, high, urgent"),

  body("assignedTo")
    .optional()
    .isMongoId()
    .withMessage("Assigned user ID must be a valid MongoDB ObjectId"),

  body("scheduledDate")
    .optional()
    .isISO8601()
    .withMessage("Scheduled date must be a valid date")
    .toDate(),

  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Due date must be a valid date")
    .toDate(),

  body("estimatedHours")
    .optional()
    .isNumeric({ min: 0 })
    .withMessage("Estimated hours must be a positive number"),

  body("actualHours")
    .optional()
    .isNumeric({ min: 0 })
    .withMessage("Actual hours must be a positive number"),

  body("tags").optional().isArray().withMessage("Tags must be an array"),
];

const validateTaskStatusUpdate = [
  param("id")
    .isMongoId()
    .withMessage("Task ID must be a valid MongoDB ObjectId"),

  body("status")
    .isIn(["new", "scheduled", "in_progress", "completed"])
    .withMessage(
      "Status must be one of: new, scheduled, in_progress, completed"
    ),
];

const validateTaskComment = [
  param("id")
    .isMongoId()
    .withMessage("Task ID must be a valid MongoDB ObjectId"),

  body("content")
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Comment content must be between 1 and 500 characters"),
];

module.exports = {
  validateSignup,
  validateLogin,
  validatePasswordUpdate,
  validateTeamCreation,
  validateTeamUpdate,
  validateAddTeamMember,
  validateRemoveTeamMember,
  validateUserCreation,
  validateUserUpdate,
  validateDepartmentParam,
  validateProjectCreation,
  validateProjectUpdate,
  validateAddProjectMember,
  validateRemoveProjectMember,
  validateTaskCreation,
  validateTaskUpdate,
  validateTaskStatusUpdate,
  validateTaskComment,
};
