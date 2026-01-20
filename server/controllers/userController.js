const User = require("../models/User");
const Team = require("../models/Team");
const AppError = require("../utils/appError");
const { logAuthEvent } = require("../middleware/audit");
const { validationResult } = require("express-validator");

/**
 * Get all users with role-based filtering
 */
const getAllUsers = async (req, res, next) => {
  try {
    let filter = {};

    // Role-based filtering
    if (req.user.role === "employee") {
      // Employees can only see themselves
      filter._id = req.user._id;
      filter.isActive = true; // Only show active
    } else if (req.user.role === "team_lead") {
      // Team leads can see their team members
      const userTeam = await Team.findOne({ teamLead: req.user._id });
      if (userTeam) {
        filter.$or = [{ _id: req.user._id }, { teamId: userTeam._id }];
      } else {
        filter._id = req.user._id;
      }
      filter.isActive = true; // Only show active
    }
    // MDs and IT Admins can see all users including inactive ones (no filter)

    const users = await User.find(filter)
      .select("-password -refreshTokens")
      .populate("teamId", "name department")
      .sort({ isActive: -1, createdAt: -1 }); // Show active users first

    // Log user access
    await logAuthEvent(
      req,
      "USER_LIST_ACCESS",
      req.user._id,
      `Retrieved ${users.length} users`
    );

    res.status(200).json({
      status: "success",
      results: users.length,
      data: {
        users,
      },
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
    if (req.user.role === "employee" && req.user._id.toString() !== id) {
      return next(new AppError("You can only access your own profile", 403));
    }

    if (req.user.role === "team_lead") {
      // Team leads can access their team members
      const userTeam = await Team.findOne({ teamLead: req.user._id });
      const targetUser = await User.findById(id);

      if (!targetUser) {
        return next(new AppError("User not found", 404));
      }

      if (
        req.user._id.toString() !== id &&
        (!userTeam || targetUser.teamId?.toString() !== userTeam._id.toString())
      ) {
        return next(new AppError("You can only access your team members", 403));
      }
    }

    const user = await User.findById(id)
      .select("-password -refreshTokens")
      .populate("teamId", "name department");

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Log user access
    await logAuthEvent(
      req,
      "USER_ACCESS",
      req.user._id,
      `Accessed user profile: ${user.username}`
    );

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
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
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      role,
      department,
      teamId,
    } = req.body;

    // Role-based restrictions
    if (req.user.role === "team_lead") {
      // Team leads can only create employees for their team
      if (role && role !== "employee") {
        return next(
          new AppError("Team leads can only create employee accounts", 403)
        );
      }

      const userTeam = await Team.findOne({ teamLead: req.user._id });
      if (!userTeam) {
        return next(
          new AppError("You must be assigned to a team to create users", 403)
        );
      }

      if (teamId && teamId !== userTeam._id.toString()) {
        return next(
          new AppError("You can only create users for your own team", 403)
        );
      }

      // Set team to user's team if not specified
      req.body.teamId = teamId || userTeam._id;
      req.body.role = "employee"; // Force employee role
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return next(new AppError("Username or email already exists", 400));
    }

    // Handle department - convert department name to dept_id if needed
    let dept_id = null;
    if (department) {
      // If department is provided as a string name, find the department ID
      if (typeof department === 'string') {
        const Department = require('../models/Department');
        const dept = await Department.findOne({ 
          $or: [
            { dept_name: department },
            { name: department }
          ],
          is_active: true 
        });
        
        if (dept) {
          dept_id = dept._id;
        } else {
          return next(new AppError(`Department "${department}" not found`, 400));
        }
      } else {
        // If department is already an ObjectId
        dept_id = department;
      }
    }

    // Prepare user data with proper field mapping
    const userData = {
      username,
      email,
      password,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      unique_id: username.toUpperCase(),
      role: role || "employee",
      department, // Keep the original department string for legacy compatibility
      dept_id, // Add the proper dept_id ObjectId
      teamId: teamId && teamId !== '' ? teamId : null, // Convert empty string to null
      isActive: true,
      is_active: true
    };

    // Create user
    const newUser = await User.create(userData);

    // Update team member count if assigned to team
    if (newUser.teamId) {
      await Team.findByIdAndUpdate(newUser.teamId, {
        $addToSet: { members: newUser._id },
      });
    }

    // Remove password from response
    newUser.password = undefined;

    // Log user creation
    await logAuthEvent(
      req,
      "USER_CREATED",
      req.user._id,
      `Created user: ${newUser.username}`
    );

    res.status(201).json({
      status: "success",
      data: {
        user: newUser,
      },
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

    // Handle password separately if provided
    let passwordUpdate = null;
    if (updates.password && updates.password.trim() !== '') {
      passwordUpdate = updates.password;
      delete updates.password; // Remove from updates object
    }
    
    // Remove other sensitive fields
    delete updates.refreshTokens;

    // Check permissions
    if (req.user.role === "employee" && req.user._id.toString() !== id) {
      return next(new AppError("You can only update your own profile", 403));
    }

    if (req.user.role === "team_lead") {
      // Team leads can update their team members (limited fields)
      const userTeam = await Team.findOne({ teamLead: req.user._id });
      const targetUser = await User.findById(id);

      if (!targetUser) {
        return next(new AppError("User not found", 404));
      }

      if (
        req.user._id.toString() !== id &&
        (!userTeam || targetUser.teamId?.toString() !== userTeam._id.toString())
      ) {
        return next(new AppError("You can only update your team members", 403));
      }

      // Restrict what team leads can update for others
      if (req.user._id.toString() !== id) {
        const allowedFields = ["firstName", "lastName", "department"];
        Object.keys(updates).forEach((key) => {
          if (!allowedFields.includes(key)) {
            delete updates[key];
          }
        });
      }
    }

    // Find user first
    const user = await User.findById(id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      user[key] = updates[key];
    });

    // Update password if provided (will be hashed by pre-save middleware)
    if (passwordUpdate) {
      user.password = passwordUpdate;
    }

    // Save user (triggers pre-save middleware for password hashing)
    await user.save();

    // Remove password from response
    user.password = undefined;

    // Populate related fields
    await user.populate('teamId', 'name department');

    // Log user update
    await logAuthEvent(
      req,
      "USER_UPDATED",
      req.user._id,
      `Updated user: ${user.username}${passwordUpdate ? ' (password changed)' : ''}`
    );

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (ADMIN and MD only)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Normalize role and map to standard format
    let userRole = (req.user.role || '').toUpperCase().replace(/-/g, '_');
    
    // Map 'managing_director' and 'it_admin' to their permission equivalents
    if (userRole === 'MANAGING_DIRECTOR') {
      userRole = 'MD';
    } else if (userRole === 'IT_ADMIN') {
      userRole = 'ADMIN';
    }

    console.log('Delete user permission check:', {
      originalRole: req.user.role,
      normalizedRole: userRole,
      userId: req.user._id,
      targetUserId: id
    });

    // Check if user has permission to delete users
    if (userRole !== 'ADMIN' && userRole !== 'MD') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only ADMIN or MD can delete users'
      });
    }

    // Admin can delete any user, including themselves
    // (Self-deletion restriction removed for admin flexibility)

    const user = await User.findById(id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Remove user from team
    if (user.teamId) {
      await Team.findByIdAndUpdate(user.teamId, {
        $pull: { members: user._id },
      });
    }

    // Soft delete - deactivate user instead of hard delete
    const userToUpdate = await User.findById(id);
    userToUpdate.is_active = false;
    userToUpdate.isActive = false; // Explicitly set both fields
    userToUpdate.deactivatedAt = new Date();
    userToUpdate.deactivatedBy = req.user._id;
    await userToUpdate.save();

    // Log user deletion
    await logAuthEvent(
      req,
      "USER_DELETED",
      req.user._id,
      `Deactivated user: ${user.username}`
    );

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user permanently (ADMIN and MD only)
 */
const permanentDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Normalize role and map to standard format
    let userRole = (req.user.role || '').toUpperCase().replace(/-/g, '_');
    
    // Map 'managing_director' and 'it_admin' to their permission equivalents
    if (userRole === 'MANAGING_DIRECTOR') {
      userRole = 'MD';
    } else if (userRole === 'IT_ADMIN') {
      userRole = 'ADMIN';
    }

    console.log('Permanent delete user permission check:', {
      originalRole: req.user.role,
      normalizedRole: userRole,
      userId: req.user._id,
      targetUserId: id
    });

    // Check if user has permission to delete users
    if (userRole !== 'ADMIN' && userRole !== 'MD') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only ADMIN or MD can permanently delete users'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Remove user from team
    if (user.teamId) {
      await Team.findByIdAndUpdate(user.teamId, {
        $pull: { members: user._id },
      });
    }

    // Hard delete - permanently remove from database
    await User.findByIdAndDelete(id);

    // Log user deletion
    await logAuthEvent(
      req,
      "USER_PERMANENTLY_DELETED",
      req.user._id,
      `Permanently deleted user: ${user.username}`
    );

    res.status(200).json({
      status: "success",
      message: "User permanently deleted",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reactivate user (ADMIN and MD only)
 */
const reactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Normalize role and map to standard format
    let userRole = (req.user.role || '').toUpperCase().replace(/-/g, '_');
    
    // Map 'managing_director' and 'it_admin' to their permission equivalents
    if (userRole === 'MANAGING_DIRECTOR') {
      userRole = 'MD';
    } else if (userRole === 'IT_ADMIN') {
      userRole = 'ADMIN';
    }

    // Check if user has permission to reactivate users
    if (userRole !== 'ADMIN' && userRole !== 'MD') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only ADMIN or MD can reactivate users'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Reactivate user
    const userToUpdate = await User.findById(id);
    userToUpdate.is_active = true;
    userToUpdate.isActive = true; // Explicitly set both fields
    userToUpdate.reactivatedAt = new Date();
    userToUpdate.reactivatedBy = req.user._id;
    userToUpdate.deactivatedAt = undefined;
    userToUpdate.deactivatedBy = undefined;
    await userToUpdate.save();

    // Log user reactivation
    await logAuthEvent(
      req,
      "USER_REACTIVATED",
      req.user._id,
      `Reactivated user: ${user.username}`
    );

    res.status(200).json({
      status: "success",
      message: "User reactivated successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export user data as JSON
 */
const exportUserData = async (req, res) => {
  try {
    const user = req.user;

    // Get user's data including related information
    const userData = {
      profile: {
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        department: user.department,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      preferences: user.preferences || {},
      notifications: user.notifications || {},
      exportDate: new Date().toISOString(),
      exportedBy: user.username,
    };

    // Log data export
    await logAuthEvent(
      req,
      "DATA_EXPORTED",
      user._id,
      `User exported their data`
    );

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="user-data-${user.username}-${new Date().toISOString().split("T")[0]}.json"`
    );
    res.status(200).json(userData);
  } catch (error) {
    console.error("Error exporting user data:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to export data",
    });
  }
};

module.exports = {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  permanentDeleteUser,
  reactivateUser,
  exportUserData,
};
