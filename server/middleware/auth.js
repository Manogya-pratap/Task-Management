const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');

/**
 * Authentication middleware to protect routes
 */
const protect = async (req, res, next) => {
  try {
    // 1) Getting token and check if it's there
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // 2) Verification token
    const decoded = await verifyToken(token);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id).select('+password');
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token does no longer exist.'
      });
    }

    // 4) Check if user is active
    if (!currentUser.isActive) {
      return res.status(401).json({
        status: 'fail',
        message: 'Your account has been deactivated. Please contact administrator.'
      });
    }

    // 5) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'fail',
        message: 'User recently changed password! Please log in again.'
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid token. Please log in again!'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Your token has expired! Please log in again.'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Authentication error occurred'
    });
  }
};

/**
 * Authorization middleware to restrict access based on roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication required'
      });
    }

    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({
        status: 'fail',
        message: `You do not have the required permission: ${permission}`
      });
    }

    next();
  };
};

/**
 * Team-based authorization middleware
 * Ensures team leads can only access their own team data
 */
const restrictToOwnTeam = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication required'
      });
    }

    // MD and IT_Admin have access to all teams
    if (req.user.role === 'managing_director' || req.user.role === 'it_admin') {
      return next();
    }

    // Team leads can only access their own team
    if (req.user.role === 'team_lead') {
      const requestedTeamId = req.params.teamId || req.body.teamId || req.query.teamId;
      
      if (requestedTeamId && requestedTeamId !== req.user.teamId?.toString()) {
        return res.status(403).json({
          status: 'fail',
          message: 'You can only access your own team data'
        });
      }
    }

    // Employees can only access their own data
    if (req.user.role === 'employee') {
      const requestedUserId = req.params.userId || req.body.userId || req.query.userId;
      
      if (requestedUserId && requestedUserId !== req.user._id.toString()) {
        return res.status(403).json({
          status: 'fail',
          message: 'You can only access your own data'
        });
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Authorization error occurred'
    });
  }
};

/**
 * Optional authentication middleware
 * Sets req.user if token is valid, but doesn't require authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (token) {
      try {
        const decoded = await verifyToken(token);
        const currentUser = await User.findById(decoded.id);
        
        if (currentUser && currentUser.isActive && !currentUser.changedPasswordAfter(decoded.iat)) {
          req.user = currentUser;
        }
      } catch (error) {
        // Token is invalid, but we don't fail the request
        req.user = null;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  protect,
  restrictTo,
  requirePermission,
  restrictToOwnTeam,
  optionalAuth
};