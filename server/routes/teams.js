const express = require('express');
const teamController = require('../controllers/teamController');
const { protect, restrictTo, requirePermission } = require('../middleware/auth');
const { 
  validateTeamCreation, 
  validateTeamUpdate, 
  validateAddTeamMember, 
  validateRemoveTeamMember,
  validateUserCreation,
  validateDepartmentParam
} = require('../middleware/validation');

const router = express.Router();

/**
 * Team Management Routes
 * All routes require authentication
 */
router.use(protect);

/**
 * Team CRUD Operations
 */

// Get all teams (role-based filtering applied in controller)
router.get('/', teamController.getAllTeams);

// Get specific team
router.get('/:teamId', teamController.getTeam);

// Create new team (Team Lead and above only)
router.post('/', 
  requirePermission('create_project'), // Team leads and above can create teams
  validateTeamCreation, 
  teamController.createTeam
);

// Update team (Team Lead of the team and above only)
router.patch('/:teamId', 
  validateTeamUpdate, 
  teamController.updateTeam
);

/**
 * Team Member Management
 */

// Get team members
router.get('/:teamId/members', teamController.getTeamMembers);

// Add member to team
router.post('/:teamId/members', 
  requirePermission('manage_team_members'),
  validateAddTeamMember, 
  teamController.addTeamMember
);

// Remove member from team
router.delete('/:teamId/members/:userId', 
  requirePermission('manage_team_members'),
  validateRemoveTeamMember, 
  teamController.removeTeamMember
);

/**
 * User Management with Department Assignment
 */

// Create user with department assignment (Team Lead and above only)
router.post('/users', 
  requirePermission('manage_team_members'),
  validateUserCreation, 
  teamController.createUserWithDepartment
);

// Get users by department (with role-based filtering)
router.get('/departments/:department/users', 
  validateDepartmentParam,
  teamController.getUsersByDepartment
);

module.exports = router;