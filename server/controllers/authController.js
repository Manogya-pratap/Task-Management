const User = require('../models/User');
const { createSendToken, verifyToken, refreshToken: refreshJWT, blacklistToken } = require('../utils/jwt');
const { invalidateSession, invalidateUserSessions, validateSessionSecurity } = require('../utils/minimal');
const { encryptSensitiveFields, decryptSensitiveFields, sanitizeInput } = require('../utils/minimal');
const { validationResult } = require('express-validator');
const { logAuthEvent } = require('../middleware/minimal');

/**
 * Enhanced authentication controller with security features
 */

/**
 * Sign up a new user
 */
const signup = async (req, res) => {
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

    const { username, email, password, firstName, lastName, role, department } = req.body;

    // Additional input sanitization for sensitive fields
    const sanitizedData = {
      username: sanitizeInput(username),
      email: sanitizeInput(email.toLowerCase()),
      password, // Don't sanitize password as it might remove valid characters
      firstName: sanitizeInput(firstName),
      lastName: sanitizeInput(lastName),
      role: role || 'employee',
      department: sanitizeInput(department)
    };

    // Create new user
    const newUser = await User.createUser(sanitizedData);

    // Update last login
    newUser.lastLogin = new Date();
    await newUser.save({ validateBeforeSave: false });

    // Log security event
    console.log(`New user registered: ${newUser.username} (${newUser.email}) from IP: ${req.ip}`);
    
    // Audit log for user creation
    await logAuthEvent(req, 'CREATE', newUser._id, `User account created: ${newUser.username}`);

    createSendToken(newUser, 201, res, req);
  } catch (error) {
    // Log security event for failed registration
    console.warn(`Failed registration attempt for ${req.body.username || 'unknown'} from IP: ${req.ip} - ${error.message}`);
    
    // Audit log for failed registration
    await logAuthEvent(req, 'ERROR', null, `Failed registration attempt: ${error.message}`, {
      message: error.message,
      username: req.body.username
    });

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
 * Login user with enhanced security
 */
const login = async (req, res) => {
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

    const { username, password } = req.body;

    // 1) Check if username and password exist
    if (!username || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide username and password!'
      });
    }

    // Sanitize username input
    const sanitizedUsername = sanitizeInput(username);

    // 2) Check if user exists and password is correct
    const user = await User.findOne({ 
      $or: [{ username: sanitizedUsername }, { email: sanitizedUsername.toLowerCase() }],
      isActive: true 
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      // Log failed login attempt
      console.warn(`Failed login attempt for ${sanitizedUsername} from IP: ${req.ip}`);
      
      // Audit log for failed login
      await logAuthEvent(req, 'ACCESS_DENIED', null, `Failed login attempt for username: ${sanitizedUsername}`);
      
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect username or password'
      });
    }

    // 3) Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Log successful login
    console.log(`User logged in: ${user.username} from IP: ${req.ip}`);
    
    // Audit log for successful login
    await logAuthEvent(req, 'LOGIN', user._id, `User logged in: ${user.username}`);

    // 4) If everything ok, send token to client
    createSendToken(user, 200, res, req);
  } catch (error) {
    console.error(`Login error for ${req.body.username || 'unknown'} from IP: ${req.ip}:`, error.message);
    
    // Audit log for login error
    await logAuthEvent(req, 'ERROR', null, `Login error: ${error.message}`, {
      message: error.message,
      username: req.body.username
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Enhanced logout with session invalidation
 */
const logout = async (req, res) => {
  try {
    let token;
    
    // Get token from header or cookie
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    // Invalidate session if token exists
    if (token) {
      try {
        const decoded = await verifyToken(token);
        if (decoded.sessionId) {
          invalidateSession(decoded.sessionId);
        }
        blacklistToken(token);
      } catch (error) {
        // Token might be invalid, but we still want to clear the cookie
        console.warn('Error invalidating session during logout:', error.message);
      }
    }

    // Clear cookie
    res.cookie('jwt', 'loggedout', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });
    
    // Log logout
    if (req.user) {
      console.log(`User logged out: ${req.user.username} from IP: ${req.ip}`);
      // Audit log for logout
      await logAuthEvent(req, 'LOGOUT', req.user._id, `User logged out: ${req.user.username}`);
    }
    
    res.status(200).json({ 
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error during logout'
    });
  }
};

/**
 * Enhanced token refresh with session validation
 */
const refreshToken = async (req, res) => {
  try {
    let token;
    
    // Get token from header or cookie
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'No token provided'
      });
    }

    // Refresh token using enhanced JWT utility
    const refreshResult = await refreshJWT(token, req);

    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      token: refreshResult.token,
      sessionId: refreshResult.sessionId,
      expiresAt: refreshResult.expiresAt
    });
  } catch (error) {
    console.warn(`Token refresh failed from IP: ${req.ip} - ${error.message}`);
    
    if (error.message.includes('Session expired')) {
      return res.status(401).json({
        status: 'fail',
        message: 'Session expired. Please log in again.'
      });
    }
    
    res.status(401).json({
      status: 'fail',
      message: 'Token refresh failed'
    });
  }
};

/**
 * Enhanced token verification with session security
 */
const verifyTokenEndpoint = async (req, res) => {
  try {
    let token;
    
    // Get token from header or cookie
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'No token provided',
        isValid: false
      });
    }

    // Verify token
    const decoded = await verifyToken(token);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'User no longer exists',
        isValid: false
      });
    }

    // Check if user is active
    if (!currentUser.isActive) {
      return res.status(401).json({
        status: 'fail',
        message: 'Account deactivated',
        isValid: false
      });
    }

    // Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'fail',
        message: 'Password changed after token issued',
        isValid: false
      });
    }

    // Validate session security if session ID is present
    let securityWarnings = {};
    if (decoded.sessionId) {
      const userAgent = {
        browser: req.get('User-Agent') || 'unknown',
        os: req.get('sec-ch-ua-platform') || 'unknown'
      };
      
      const securityCheck = validateSessionSecurity(
        decoded.sessionId, 
        req.ip || req.connection.remoteAddress, 
        userAgent
      );
      
      if (securityCheck.suspicious) {
        securityWarnings = securityCheck.warnings;
        console.warn(`Suspicious session activity for user ${currentUser.username}: ${JSON.stringify(securityWarnings)}`);
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Token is valid',
      isValid: true,
      securityWarnings,
      user: {
        id: currentUser._id,
        username: currentUser.username,
        email: currentUser.email,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        role: currentUser.role,
        department: currentUser.department
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid token',
        isValid: false
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Token expired',
        isValid: false
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Error verifying token',
      isValid: false
    });
  }
};

/**
 * Get current user profile
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user profile'
    });
  }
};

/**
 * Update current user password with enhanced security
 */
const updatePassword = async (req, res) => {
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

    const { currentPassword, newPassword } = req.body;

    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');

    // 2) Check if current password is correct
    if (!(await user.comparePassword(currentPassword))) {
      // Log failed password change attempt
      console.warn(`Failed password change attempt for user ${user.username} from IP: ${req.ip}`);
      
      return res.status(401).json({
        status: 'fail',
        message: 'Your current password is incorrect'
      });
    }

    // 3) If so, update password
    user.password = newPassword;
    await user.save();

    // 4) Invalidate all existing sessions for security
    const invalidatedSessions = invalidateUserSessions(user._id.toString());
    
    // Log password change
    console.log(`Password changed for user ${user.username} from IP: ${req.ip}. Invalidated ${invalidatedSessions} sessions.`);
    
    // Audit log for password change
    await logAuthEvent(req, 'UPDATE', user._id, `Password changed for user: ${user.username}. Invalidated ${invalidatedSessions} sessions.`);

    // 5) Log user in with new session
    createSendToken(user, 200, res, req);
  } catch (error) {
    console.error(`Password update error for user ${req.user?.username || 'unknown'}:`, error.message);
    
    res.status(500).json({
      status: 'error',
      message: 'Error updating password'
    });
  }
};

/**
 * Logout from all devices (invalidate all sessions)
 */
const logoutAllDevices = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const invalidatedSessions = invalidateUserSessions(userId);
    
    // Log security event
    console.log(`User ${req.user.username} logged out from all devices. Invalidated ${invalidatedSessions} sessions.`);
    
    // Audit log for logout from all devices
    await logAuthEvent(req, 'LOGOUT', req.user._id, `User logged out from all devices. Invalidated ${invalidatedSessions} sessions.`);
    
    res.status(200).json({
      status: 'success',
      message: `Logged out from all devices. ${invalidatedSessions} sessions invalidated.`
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error logging out from all devices'
    });
  }
};

module.exports = {
  signup,
  login,
  logout,
  refreshToken,
  verifyTokenEndpoint,
  getMe,
  updatePassword,
  logoutAllDevices
};