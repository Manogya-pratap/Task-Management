const jwt = require('jsonwebtoken');
const { createSession, getSession, renewSession } = require('./minimal');
const { generateSecureToken } = require('./minimal');

/**
 * Enhanced JWT Utility functions with session management
 */

const signToken = (id, sessionId) => {
  return jwt.sign({ 
    id, 
    sessionId,
    iat: Math.floor(Date.now() / 1000),
    jti: generateSecureToken(16) // JWT ID for additional security
  }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const createSendToken = (user, statusCode, res, req) => {
  // Extract user agent and IP information
  const userAgent = {
    browser: req.get('User-Agent') || 'unknown',
    os: req.get('sec-ch-ua-platform') || 'unknown',
    device: req.get('sec-ch-ua-mobile') === '?1' ? 'mobile' : 'desktop'
  };
  
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Create session
  const session = createSession(user._id.toString(), userAgent, ipAddress);
  
  // Generate JWT with session ID
  const token = signToken(user._id, session.sessionId);
  
  const cookieOptions = {
    expires: new Date(session.expiresAt),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    sessionId: session.sessionId,
    expiresAt: session.expiresAt,
    data: {
      user
    }
  });
};

const verifyToken = async (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        // Verify session if sessionId is present
        if (decoded.sessionId) {
          const session = getSession(decoded.sessionId);
          if (!session) {
            reject(new Error('Session expired or invalid'));
            return;
          }
          
          // Renew session if needed
          renewSession(decoded.sessionId);
        }

        resolve(decoded);
      } catch (sessionError) {
        reject(sessionError);
      }
    });
  });
};

const refreshToken = async (oldToken, req) => {
  try {
    // Verify the old token (even if expired)
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, { ignoreExpiration: true });
    
    // Check if session is still valid
    if (decoded.sessionId) {
      const session = getSession(decoded.sessionId);
      if (!session) {
        throw new Error('Session expired');
      }
      
      // Generate new token with same session
      const newToken = signToken(decoded.id, decoded.sessionId);
      
      return {
        token: newToken,
        sessionId: decoded.sessionId,
        expiresAt: session.expiresAt
      };
    }
    
    throw new Error('Invalid token format');
  } catch (error) {
    throw new Error('Token refresh failed: ' + error.message);
  }
};

const blacklistToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.sessionId) {
      // Session will be invalidated by session manager
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const validateTokenSecurity = (token, req) => {
  try {
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.sessionId) {
      return { valid: false, reason: 'Invalid token format' };
    }
    
    // Additional security checks can be added here
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if token is too old (beyond normal expiration)
    if (decoded.iat && (currentTime - decoded.iat) > 30 * 24 * 60 * 60) { // 30 days
      return { valid: false, reason: 'Token too old' };
    }
    
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, reason: 'Token validation failed' };
  }
};

module.exports = {
  signToken,
  createSendToken,
  verifyToken,
  refreshToken,
  blacklistToken,
  validateTokenSecurity
};