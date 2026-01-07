const User = require('../models/User');
const Team = require('../models/Team');
const AppError = require('../utils/appError');
const { logAuthEvent } = require('../middleware/audit');

/**
 * Get all users with role-based filtering
 */
const getAllUsers = async (req, res, next) => {
  try {
    let filter = {};
    
    // Role-based filtering
    if (req.user.role === 'employee') {
      // Employees can only see themselves
      filter._id = req.user._id;
    } else if (req.user.role === 'team_lead') {
      // Team leads can see their team members
      const userTeam = await Team.findOne({ teamLead: req.user._id });
      if (userTeam) {
        filter.$or = [
          { _id: req.user._id },
          { teamId: userTeam._id }
        ];
      } else {
        filter._id = req.user._id;
      }
    }
    // MDs can see all users (no filter)

    const users = await User.find(filter)
      .select('-password -refreshTokens')
      .populate('teamId', 'name department')
      .sort({ createdAt: -1 });

    // Log user access
    await logAuthEvent(req, 'USER_LIST_ACCESS', req.user._id, `Retrieved ${users.length} users`);

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get specific user
 */
const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if user can access this user data
    if (req.user.role === 'employee' && req.user._id.toString() !== id) {
      return next(new AppError('You can only access your own profile', 403));
    }
    
    if (req.user.role === 'team_lead') {
      // Team leads can access their team members
      const userTeam = await Team.findOne({ teamLead: req.user._id });
      const targetUser = await User.findById(id);
      
      if (!targetUser) {
        return next(new AppError('User not found', 404));
      }
      
      if (req.user._id.toString() !== id && 
          (!userTeam || targetUser.teamId?.toString() !== userTeam._id.toString())) {
        return next(new AppError('You can only access your team members', 403));
      }
    }

    const user = await User.findById(id)
      .select('-password -refreshTokens')
      .populate('teamId', 'name department');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Log user access
    await logAuthEvent(req, 'USER_ACCESS', req.user._id, `Accessed user profile: ${user.username}`);

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new user (Team Lead and above only)
 */
const createUser = async (req, res, next) => {
  try {
    const { username, email, password, firstName, lastName, role, department, teamId } = req.body;

    // Role-based restrictions
    if (req.user.role === 'team_lead') {
      // Team leads can only create employees for their team
      if (role && role !== 'employee') {
        return next(new AppError('Team leads can only create employee accounts', 403));
      }
      
      const userTeam = await Team.findOne({ teamLead: req.user._id });
      if (!userTeam) {
        return next(new AppError('You must be assigned to a team to create users', 403));
      }
      
      if (teamId && teamId !== userTeam._id.toString()) {
        return next(new AppError('You can only create users for your own team', 403));
      }
      
      // Set team to user's team if not specified
      req.body.teamId = teamId || userTeam._id;
      req.body.role = 'employee'; // Force employee role
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return next(new AppError('Username or email already exists', 400));
    }

    // Create user
    const newUser = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || 'employee',
      department,
      teamId: req.body.teamId,
      isActive: true
    });

    // Update team member count if assigned to team
    if (newUser.teamId) {
      await Team.findByIdAndUpdate(
        newUser.teamId,
        { $addToSet: { members: newUser._id } }
      );
    }

    // Remove password from response
    newUser.password = undefined;

    // Log user creation
    await logAuthEvent(req, 'USER_CREATED', req.user._id, `Created user: ${newUser.username}`);

    res.status(201).json({
      status: 'success',
      data: {
        user: newUser
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.password;
    delete updates.refreshTokens;

    // Check permissions
    if (req.user.role === 'employee' && req.user._id.toString() !== id) {
      return next(new AppError('You can only update your own profile', 403));
    }

    if (req.user.role === 'team_lead') {
      // Team leads can update their team members (limited fields)
      const userTeam = await Team.findOne({ teamLead: req.user._id });
      const targetUser = await User.findById(id);
      
      if (!targetUser) {
        return next(new AppError('User not found', 404));
      }
      
      if (req.user._id.toString() !== id && 
          (!userTeam || targetUser.teamId?.toString() !== userTeam._id.toString())) {
        return next(new AppError('You can only update your team members', 403));
      }

      // Restrict what team leads can update for others
      if (req.user._id.toString() !== id) {
        const allowedFields = ['firstName', 'lastName', 'department'];
        Object.keys(updates).forEach(key => {
          if (!allowedFields.includes(key)) {
            delete updates[key];
          }
        });
      }
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    }).select('-password -refreshTokens').populate('teamId', 'name department');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Log user update
    await logAuthEvent(req, 'USER_UPDATED', req.user._id, `Updated user: ${user.username}`);

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (MD only)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user._id.toString() === id) {
      return next(new AppError('You cannot delete your own account', 400));
    }

    const user = await User.findById(id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Remove user from team
    if (user.teamId) {
      await Team.findByIdAndUpdate(
        user.teamId,
        { $pull: { members: user._id } }
      );
    }

    // Soft delete - deactivate user instead of hard delete
    await User.findByIdAndUpdate(id, { 
      isActive: false,
      deactivatedAt: new Date(),
      deactivatedBy: req.user._id
    });

    // Log user deletion
    await logAuthEvent(req, 'USER_DELETED', req.user._id, `Deactivated user: ${user.username}`);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
};