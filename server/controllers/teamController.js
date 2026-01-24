const { User, Team, Project } = require('../models');
const { validationResult } = require('express-validator');

/**
 * Get all teams (with role-based filtering)
 */
const getAllTeams = async (req, res) => {
  try {
    let teams;
    
    // MD and IT_Admin can see all teams
    if (req.user.role === 'managing_director' || req.user.role === 'it_admin') {
      teams = await Team.find({ isActive: true })
        .populate('teamLead', 'firstName lastName email')
        .populate('members', 'firstName lastName email role')
        .sort({ department: 1, name: 1 });
    } 
    // Team leads can only see teams in their department
    else if (req.user.role === 'team_lead') {
      teams = await Team.findByDepartment(req.user.department)
        .populate('teamLead', 'firstName lastName email')
        .populate('members', 'firstName lastName email role');
    }
    // Employees can only see their own team
    else {
      teams = await Team.find({ 
        members: req.user._id,
        isActive: true 
      })
        .populate('teamLead', 'firstName lastName email')
        .populate('members', 'firstName lastName email role');
    }

    res.status(200).json({
      status: 'success',
      results: teams.length,
      data: {
        teams
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching teams',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get team by ID (with access control)
 */
const getTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const team = await Team.findById(teamId)
      .populate('teamLead', 'firstName lastName email role department')
      .populate('members', 'firstName lastName email role department')
      .populate('projects', 'name status startDate endDate');

    if (!team) {
      return res.status(404).json({
        status: 'fail',
        message: 'Team not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'employee' && !team.isMember(req.user._id)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only access teams you belong to'
      });
    }

    if (req.user.role === 'team_lead' && 
        req.user.department !== team.department && 
        !team.isTeamLead(req.user._id)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only access teams in your department'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        team
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create new team (Team Lead and above only)
 */
const createTeam = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, department, teamLeadId, description } = req.body;

    // Verify team lead exists and has appropriate role
    const teamLead = await User.findById(teamLeadId);
    if (!teamLead) {
      return res.status(404).json({
        status: 'fail',
        message: 'Team lead not found'
      });
    }

    if (teamLead.role !== 'team_lead') {
      return res.status(400).json({
        status: 'fail',
        message: 'Assigned user must have team_lead role'
      });
    }

    // Team leads can only create teams in their own department
    if (req.user.role === 'team_lead' && req.user.department !== department) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only create teams in your own department'
      });
    }

    // Ensure team lead belongs to the same department
    if (teamLead.department !== department) {
      return res.status(400).json({
        status: 'fail',
        message: 'Team lead must belong to the same department as the team'
      });
    }

    const team = await Team.createTeam({
      name,
      department,
      teamLead: teamLeadId,
      description
    });

    // Update team lead's teamId
    teamLead.teamId = team._id;
    await teamLead.save();

    // Populate the response
    await team.populate('teamLead', 'firstName lastName email');

    res.status(201).json({
      status: 'success',
      data: {
        team
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error creating team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update team (Team Lead of the team and above only)
 */
const updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const updates = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        status: 'fail',
        message: 'Team not found'
      });
    }

    // Check permissions
    if (req.user.role === 'team_lead' && !team.isTeamLead(req.user._id)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only update teams you lead'
      });
    }

    // Prevent changing critical fields by team leads
    if (req.user.role === 'team_lead') {
      delete updates.teamLead;
      delete updates.department;
    }

    // Update team
    Object.assign(team, updates);
    await team.save();

    await team.populate('teamLead', 'firstName lastName email');
    await team.populate('members', 'firstName lastName email role');

    res.status(200).json({
      status: 'success',
      data: {
        team
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add member to team
 */
const addTeamMember = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { userId } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        status: 'fail',
        message: 'Team not found'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Check permissions
    if (req.user.role === 'team_lead' && !team.isTeamLead(req.user._id)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only manage members of teams you lead'
      });
    }

    // Ensure user belongs to same department
    if (user.department !== team.department) {
      return res.status(400).json({
        status: 'fail',
        message: 'User must belong to the same department as the team'
      });
    }

    // Add member to team
    await team.addMember(userId);

    // Update user's teamId
    user.teamId = team._id;
    await user.save();

    await team.populate('members', 'firstName lastName email role');

    res.status(200).json({
      status: 'success',
      message: 'Member added to team successfully',
      data: {
        team
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error adding team member',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Remove member from team
 */
const removeTeamMember = async (req, res) => {
  try {
    const { teamId, userId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        status: 'fail',
        message: 'Team not found'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Check permissions
    if (req.user.role === 'team_lead' && !team.isTeamLead(req.user._id)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only manage members of teams you lead'
      });
    }

    // Cannot remove team lead
    if (team.isTeamLead(user._id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot remove team lead from team'
      });
    }

    // Remove member from team
    await team.removeMember(userId);

    // Clear user's teamId
    user.teamId = null;
    await user.save();

    await team.populate('members', 'firstName lastName email role');

    res.status(200).json({
      status: 'success',
      message: 'Member removed from team successfully',
      data: {
        team
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error removing team member',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get team members (with department filtering)
 */
const getTeamMembers = async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId).populate('members', 'firstName lastName email role department');
    
    if (!team) {
      return res.status(404).json({
        status: 'fail',
        message: 'Team not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'employee' && !team.isMember(req.user._id)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only access teams you belong to'
      });
    }

    if (req.user.role === 'team_lead' && 
        req.user.department !== team.department && 
        !team.isTeamLead(req.user._id)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only access teams in your department'
      });
    }

    res.status(200).json({
      status: 'success',
      results: team.members.length,
      data: {
        members: team.members
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching team members',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create user with department assignment (Team Lead and above only)
 */
const createUserWithDepartment = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email, password, firstName, lastName, role, department, teamId } = req.body;

    // Team leads can only create users in their own department
    if (req.user.role === 'team_lead' && req.user.department !== department) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only create users in your own department'
      });
    }

    // Validate team assignment if provided
    if (teamId) {
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({
          status: 'fail',
          message: 'Team not found'
        });
      }

      if (team.department !== department) {
        return res.status(400).json({
          status: 'fail',
          message: 'Team must belong to the same department as the user'
        });
      }

      // Team leads can only assign users to teams they lead
      if (req.user.role === 'team_lead' && !team.isTeamLead(req.user._id)) {
        return res.status(403).json({
          status: 'fail',
          message: 'You can only assign users to teams you lead'
        });
      }
    }

    // Create new user
    const newUser = await User.createUser({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || 'employee',
      department,
      teamId: teamId || null
    });

    // Add user to team if teamId provided
    if (teamId) {
      const team = await Team.findById(teamId);
      await team.addMember(newUser._id);
    }

    res.status(201).json({
      status: 'success',
      message: 'User created and assigned to department successfully',
      data: {
        user: newUser
      }
    });
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(400).json({
        status: 'fail',
        message: error.message
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Error creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get users by department (with role-based filtering)
 */
const getUsersByDepartment = async (req, res) => {
  try {
    const { department } = req.params;

    // Team leads can only access their own department
    if (req.user.role === 'team_lead' && req.user.department !== department) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only access users in your own department'
      });
    }

    // Find users by department name (string field)
    const users = await User.find({ 
      department: department, 
      is_active: true 
    }).select('firstName lastName email role department teamId unique_id');

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users by department',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllTeams,
  getTeam,
  createTeam,
  updateTeam,
  addTeamMember,
  removeTeamMember,
  getTeamMembers,
  createUserWithDepartment,
  getUsersByDepartment
};