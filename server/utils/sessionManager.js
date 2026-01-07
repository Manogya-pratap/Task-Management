const crypto = require('crypto');
const { generateSecureToken } = require('./encryption');

/**
 * Session management utility for enhanced security
 */

// In-memory session store (in production, use Redis or similar)
const activeSessions = new Map();
const sessionBlacklist = new Set();

/**
 * Session configuration
 */
const SESSION_CONFIG = {
  maxAge: parseInt(process.env.SESSION_MAX_AGE) || 7 * 24 * 60 * 60 * 1000, // 7 days
  maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 5,
  inactivityTimeout: parseInt(process.env.SESSION_INACTIVITY_TIMEOUT) || 30 * 60 * 1000, // 30 minutes
  renewalThreshold: parseInt(process.env.SESSION_RENEWAL_THRESHOLD) || 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Create a new session
 * @param {string} userId - User ID
 * @param {object} userAgent - User agent information
 * @param {string} ipAddress - Client IP address
 * @returns {object} - Session data
 */
const createSession = (userId, userAgent = {}, ipAddress = '') => {
  const sessionId = generateSecureToken(32);
  const now = Date.now();
  
  const session = {
    sessionId,
    userId,
    createdAt: now,
    lastActivity: now,
    expiresAt: now + SESSION_CONFIG.maxAge,
    ipAddress,
    userAgent: {
      browser: userAgent.browser || 'unknown',
      os: userAgent.os || 'unknown',
      device: userAgent.device || 'unknown'
    },
    isActive: true,
    renewalCount: 0
  };
  
  // Clean up old sessions for this user
  cleanupUserSessions(userId);
  
  // Store the session
  activeSessions.set(sessionId, session);
  
  return session;
};

/**
 * Validate and retrieve session
 * @param {string} sessionId - Session ID
 * @returns {object|null} - Session data or null if invalid
 */
const getSession = (sessionId) => {
  if (!sessionId || sessionBlacklist.has(sessionId)) {
    return null;
  }
  
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return null;
  }
  
  const now = Date.now();
  
  // Check if session has expired
  if (now > session.expiresAt) {
    activeSessions.delete(sessionId);
    return null;
  }
  
  // Check for inactivity timeout
  if (now - session.lastActivity > SESSION_CONFIG.inactivityTimeout) {
    activeSessions.delete(sessionId);
    return null;
  }
  
  // Update last activity
  session.lastActivity = now;
  activeSessions.set(sessionId, session);
  
  return session;
};

/**
 * Renew session if needed
 * @param {string} sessionId - Session ID
 * @returns {object|null} - Updated session or null if renewal failed
 */
const renewSession = (sessionId) => {
  const session = getSession(sessionId);
  
  if (!session) {
    return null;
  }
  
  const now = Date.now();
  
  // Check if renewal is needed (within renewal threshold of expiration)
  if (session.expiresAt - now < SESSION_CONFIG.renewalThreshold) {
    session.expiresAt = now + SESSION_CONFIG.maxAge;
    session.renewalCount += 1;
    activeSessions.set(sessionId, session);
  }
  
  return session;
};

/**
 * Invalidate a specific session
 * @param {string} sessionId - Session ID to invalidate
 * @returns {boolean} - True if session was invalidated
 */
const invalidateSession = (sessionId) => {
  if (!sessionId) return false;
  
  const session = activeSessions.get(sessionId);
  
  if (session) {
    activeSessions.delete(sessionId);
    sessionBlacklist.add(sessionId);
    
    // Clean up blacklist after some time
    setTimeout(() => {
      sessionBlacklist.delete(sessionId);
    }, SESSION_CONFIG.maxAge);
    
    return true;
  }
  
  return false;
};

/**
 * Invalidate all sessions for a user
 * @param {string} userId - User ID
 * @returns {number} - Number of sessions invalidated
 */
const invalidateUserSessions = (userId) => {
  let count = 0;
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      invalidateSession(sessionId);
      count++;
    }
  }
  
  return count;
};

/**
 * Clean up old sessions for a user (keep only the most recent ones)
 * @param {string} userId - User ID
 */
const cleanupUserSessions = (userId) => {
  const userSessions = [];
  
  // Collect all sessions for this user
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      userSessions.push({ sessionId, session });
    }
  }
  
  // Sort by creation time (newest first)
  userSessions.sort((a, b) => b.session.createdAt - a.session.createdAt);
  
  // Remove excess sessions
  if (userSessions.length >= SESSION_CONFIG.maxConcurrentSessions) {
    const sessionsToRemove = userSessions.slice(SESSION_CONFIG.maxConcurrentSessions - 1);
    sessionsToRemove.forEach(({ sessionId }) => {
      invalidateSession(sessionId);
    });
  }
};

/**
 * Clean up expired sessions (should be called periodically)
 */
const cleanupExpiredSessions = () => {
  const now = Date.now();
  const expiredSessions = [];
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now > session.expiresAt || 
        now - session.lastActivity > SESSION_CONFIG.inactivityTimeout) {
      expiredSessions.push(sessionId);
    }
  }
  
  expiredSessions.forEach(sessionId => {
    activeSessions.delete(sessionId);
  });
  
  return expiredSessions.length;
};

/**
 * Get session statistics
 * @returns {object} - Session statistics
 */
const getSessionStats = () => {
  const now = Date.now();
  let activeCount = 0;
  let expiredCount = 0;
  
  for (const session of activeSessions.values()) {
    if (now > session.expiresAt || 
        now - session.lastActivity > SESSION_CONFIG.inactivityTimeout) {
      expiredCount++;
    } else {
      activeCount++;
    }
  }
  
  return {
    totalSessions: activeSessions.size,
    activeSessions: activeCount,
    expiredSessions: expiredCount,
    blacklistedSessions: sessionBlacklist.size
  };
};

/**
 * Validate session security (check for suspicious activity)
 * @param {string} sessionId - Session ID
 * @param {string} currentIp - Current IP address
 * @param {object} currentUserAgent - Current user agent
 * @returns {object} - Validation result
 */
const validateSessionSecurity = (sessionId, currentIp, currentUserAgent = {}) => {
  const session = getSession(sessionId);
  
  if (!session) {
    return { valid: false, reason: 'Session not found or expired' };
  }
  
  // Check for IP address changes (optional, can be disabled for mobile users)
  const ipChanged = session.ipAddress && session.ipAddress !== currentIp;
  
  // Check for significant user agent changes
  const userAgentChanged = (
    session.userAgent.browser !== (currentUserAgent.browser || 'unknown') ||
    session.userAgent.os !== (currentUserAgent.os || 'unknown')
  );
  
  // Determine if session should be considered suspicious
  const suspicious = ipChanged && userAgentChanged;
  
  return {
    valid: true,
    suspicious,
    warnings: {
      ipChanged,
      userAgentChanged
    },
    session
  };
};

// Periodic cleanup (run every 15 minutes)
setInterval(() => {
  const cleaned = cleanupExpiredSessions();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired sessions`);
  }
}, 15 * 60 * 1000);

module.exports = {
  createSession,
  getSession,
  renewSession,
  invalidateSession,
  invalidateUserSessions,
  cleanupUserSessions,
  cleanupExpiredSessions,
  getSessionStats,
  validateSessionSecurity,
  SESSION_CONFIG
};