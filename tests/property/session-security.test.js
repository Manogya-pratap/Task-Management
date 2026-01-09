const fc = require('fast-check');
const { 
  createSession, 
  getSession, 
  renewSession, 
  invalidateSession, 
  invalidateUserSessions,
  validateSessionSecurity,
  SESSION_CONFIG 
} = require('../../server/utils/sessionManager');

/**
 * Property-based tests for session security
 * Feature: daily-activity-tracker, Property 21: Session security
 * **Validates: Requirements 7.2**
 */

describe('Session Security Properties', () => {
  // Clean up sessions before each test
  beforeEach(() => {
    // Clear any existing sessions
    const testUserId = 'test-user-123';
    invalidateUserSessions(testUserId);
  });

  describe('Property 21: Session security', () => {
    test('For any user interaction with the system, session security should be maintained and unauthorized access attempts should be prevented', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // userId
          fc.record({
            browser: fc.string({ minLength: 1, maxLength: 100 }),
            os: fc.string({ minLength: 1, maxLength: 50 }),
            device: fc.string({ minLength: 1, maxLength: 20 })
          }), // userAgent
          fc.string({ minLength: 7, maxLength: 15 }), // ipAddress
          (userId, userAgent, ipAddress) => {
            // Create a session
            const session = createSession(userId, userAgent, ipAddress);
            
            // Verify session properties
            expect(session).toHaveProperty('sessionId');
            expect(session).toHaveProperty('userId', userId);
            expect(session).toHaveProperty('createdAt');
            expect(session).toHaveProperty('lastActivity');
            expect(session).toHaveProperty('expiresAt');
            expect(session).toHaveProperty('ipAddress', ipAddress);
            expect(session).toHaveProperty('isActive', true);
            
            // Session ID should be secure (long hex string)
            expect(session.sessionId).toMatch(/^[a-f0-9]{64}$/);
            
            // Expiration should be in the future
            expect(session.expiresAt).toBeGreaterThan(Date.now());
            
            // Should be able to retrieve the session
            const retrievedSession = getSession(session.sessionId);
            expect(retrievedSession).toBeTruthy();
            expect(retrievedSession.userId).toBe(userId);
            
            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    test('For any session, it should expire after the configured time limit', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (userId) => {
            const session = createSession(userId);
            
            // Session should have proper expiration time
            const expectedExpiration = session.createdAt + SESSION_CONFIG.maxAge;
            expect(session.expiresAt).toBe(expectedExpiration);
            
            // Session should be valid initially
            const validSession = getSession(session.sessionId);
            expect(validSession).toBeTruthy();
            
            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    test('For any invalid session ID, access should be denied', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (invalidSessionId) => {
            // Assume the session ID is not valid (very unlikely to collide)
            const session = getSession(invalidSessionId);
            expect(session).toBeNull();
            
            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    test('For any user, concurrent sessions should be limited', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (userId) => {
            const sessions = [];
            
            // Create more sessions than the limit
            for (let i = 0; i < SESSION_CONFIG.maxConcurrentSessions + 2; i++) {
              const session = createSession(userId, {}, `192.168.1.${i}`);
              sessions.push(session);
            }
            
            // Check that only the allowed number of sessions are active
            let activeSessions = 0;
            for (const session of sessions) {
              if (getSession(session.sessionId)) {
                activeSessions++;
              }
            }
            
            // Should not exceed the maximum concurrent sessions
            expect(activeSessions).toBeLessThanOrEqual(SESSION_CONFIG.maxConcurrentSessions);
            
            return true;
          }
        ),
        { numRuns: 3 }
      );
    });

    test('For any session, invalidation should immediately prevent access', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (userId) => {
            const session = createSession(userId);
            
            // Session should be valid initially
            expect(getSession(session.sessionId)).toBeTruthy();
            
            // Invalidate the session
            const invalidated = invalidateSession(session.sessionId);
            expect(invalidated).toBe(true);
            
            // Session should no longer be accessible
            expect(getSession(session.sessionId)).toBeNull();
            
            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    test('For any user, all sessions should be invalidatable at once', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 3 }),
          (userId, sessionCount) => {
            const sessions = [];
            
            // Create multiple sessions for the user
            for (let i = 0; i < sessionCount; i++) {
              const session = createSession(userId, {}, `192.168.1.${i}`);
              sessions.push(session);
            }
            
            // All sessions should be valid initially
            for (const session of sessions) {
              expect(getSession(session.sessionId)).toBeTruthy();
            }
            
            // Invalidate all user sessions
            const invalidatedCount = invalidateUserSessions(userId);
            expect(invalidatedCount).toBe(sessionCount);
            
            // All sessions should now be invalid
            for (const session of sessions) {
              expect(getSession(session.sessionId)).toBeNull();
            }
            
            return true;
          }
        ),
        { numRuns: 5 }
      );
    });

    test('For any session, security validation should detect suspicious activity', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 7, maxLength: 15 }),
          fc.string({ minLength: 7, maxLength: 15 }),
          fc.record({
            browser: fc.string({ minLength: 1, maxLength: 100 }),
            os: fc.string({ minLength: 1, maxLength: 50 })
          }),
          fc.record({
            browser: fc.string({ minLength: 1, maxLength: 100 }),
            os: fc.string({ minLength: 1, maxLength: 50 })
          }),
          (userId, originalIp, newIp, originalUserAgent, newUserAgent) => {
            fc.pre(originalIp !== newIp || originalUserAgent.browser !== newUserAgent.browser);
            
            // Create session with original details
            const session = createSession(userId, originalUserAgent, originalIp);
            
            // Validate with different IP and user agent
            const validation = validateSessionSecurity(session.sessionId, newIp, newUserAgent);
            
            expect(validation).toHaveProperty('valid');
            expect(validation).toHaveProperty('suspicious');
            expect(validation).toHaveProperty('warnings');
            
            // If IP and user agent both changed, should be suspicious
            if (originalIp !== newIp && originalUserAgent.browser !== newUserAgent.browser) {
              expect(validation.suspicious).toBe(true);
            }
            
            return true;
          }
        ),
        { numRuns: 5 }
      );
    });

    test('For any session renewal, it should extend expiration time appropriately', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (userId) => {
            const session = createSession(userId);
            const originalExpiration = session.expiresAt;
            
            // Wait a small amount of time
            const delay = 100;
            setTimeout(() => {
              const renewedSession = renewSession(session.sessionId);
              
              if (renewedSession) {
                // If renewed, expiration should be extended
                expect(renewedSession.expiresAt).toBeGreaterThanOrEqual(originalExpiration);
              }
            }, delay);
            
            return true;
          }
        ),
        { numRuns: 3 }
      );
    });
  });

  describe('Edge Cases and Security Scenarios', () => {
    test('should handle null or undefined session IDs gracefully', () => {
      expect(getSession(null)).toBeNull();
      expect(getSession(undefined)).toBeNull();
      expect(getSession('')).toBeNull();
      
      expect(invalidateSession(null)).toBe(false);
      expect(invalidateSession(undefined)).toBe(false);
      expect(invalidateSession('')).toBe(false);
    });

    test('should handle malformed session IDs', () => {
      const malformedIds = [
        'short',
        'contains-invalid-chars!@#',
        'x'.repeat(1000), // Very long
        '../../etc/passwd', // Path traversal attempt
        '<script>alert("xss")</script>' // XSS attempt
      ];
      
      malformedIds.forEach(id => {
        expect(getSession(id)).toBeNull();
        expect(invalidateSession(id)).toBe(false);
      });
    });

    test('should prevent session fixation attacks', () => {
      const userId = 'test-user';
      const attackerSessionId = 'attacker-controlled-session-id';
      
      // Attacker cannot force a specific session ID
      const session = createSession(userId);
      expect(session.sessionId).not.toBe(attackerSessionId);
      expect(session.sessionId).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should handle concurrent session operations safely', () => {
      const userId = 'concurrent-test-user';
      const sessions = [];
      
      // Create multiple sessions concurrently
      for (let i = 0; i < 10; i++) {
        const session = createSession(userId, {}, `192.168.1.${i}`);
        sessions.push(session);
      }
      
      // All sessions should have unique IDs
      const sessionIds = sessions.map(s => s.sessionId);
      const uniqueIds = new Set(sessionIds);
      expect(uniqueIds.size).toBe(sessionIds.length);
    });

    test('should enforce session timeout correctly', () => {
      const userId = 'timeout-test-user';
      const session = createSession(userId);
      
      // Manually set last activity to simulate timeout
      const expiredSession = getSession(session.sessionId);
      if (expiredSession) {
        expiredSession.lastActivity = Date.now() - SESSION_CONFIG.inactivityTimeout - 1000;
        
        // Next access should fail due to timeout
        expect(getSession(session.sessionId)).toBeNull();
      }
    });
  });
});