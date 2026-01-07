const fc = require('fast-check');
const request = require('supertest');
const app = require('../../server/app');
const User = require('../../server/models/User');
const jwt = require('jsonwebtoken');

/**
 * Feature: daily-activity-tracker, Property 3: Unauthorized action prevention
 * For any user attempting actions beyond their role permissions, the system should deny access and maintain the current system state
 * Validates: Requirements 1.6
 */

describe('Property-Based Tests: Unauthorized Action Prevention', () => {
  
  // Generator for user roles
  const roleArbitrary = fc.constantFrom('managing_director', 'it_admin', 'team_lead', 'employee');
  
  // Generator for protected endpoints that require authentication
  const protectedEndpointArbitrary = fc.constantFrom(
    { method: 'GET', path: '/api/auth/me' },
    { method: 'PATCH', path: '/api/auth/update-password' }
  );

  // Generator for invalid tokens
  const invalidTokenArbitrary = fc.oneof(
    fc.constant('invalid-token'),
    fc.constant(''),
    fc.constant('Bearer invalid'),
    fc.constant('malformed.jwt.token'),
    fc.string({ minLength: 10, maxLength: 50 }).map(s => `invalid.${s}.token`)
  );

  // Generator for minimal user data
  const minimalUserArbitrary = fc.record({
    username: fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
    email: fc.emailAddress(),
    password: fc.string({ minLength: 6, maxLength: 50 }),
    firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    role: roleArbitrary,
    department: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
  });

  test('Property 3: Unauthorized action prevention - No token should deny access', async () => {
    await fc.assert(fc.asyncProperty(protectedEndpointArbitrary, async (endpoint) => {
      // Make request without authentication token
      const response = await request(app)
        [endpoint.method.toLowerCase()](endpoint.path)
        .send({});

      // Property: All protected endpoints should deny access without token
      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('not logged in');
    }), { numRuns: 10 });
  });

  test('Property 3: Unauthorized action prevention - Invalid token should deny access', async () => {
    await fc.assert(fc.asyncProperty(
      protectedEndpointArbitrary,
      invalidTokenArbitrary,
      async (endpoint, invalidToken) => {
        // Make request with invalid token
        const response = await request(app)
          [endpoint.method.toLowerCase()](endpoint.path)
          .set('Authorization', `Bearer ${invalidToken}`)
          .send({});

        // Property: All protected endpoints should deny access with invalid token
        expect(response.status).toBe(401);
        expect(response.body.status).toBe('fail');
      }
    ), { numRuns: 15 });
  });

  test('Property 3: Unauthorized action prevention - Expired token should deny access', async () => {
    // Create an expired token
    const expiredToken = jwt.sign(
      { id: '507f1f77bcf86cd799439011' }, // Mock user ID
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '-1h' } // Expired 1 hour ago
    );

    await fc.assert(fc.asyncProperty(protectedEndpointArbitrary, async (endpoint) => {
      // Make request with expired token
      const response = await request(app)
        [endpoint.method.toLowerCase()](endpoint.path)
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({});

      // Property: All protected endpoints should deny access with expired token
      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('expired');
    }), { numRuns: 5 });
  });

  test('Property 3: Unauthorized action prevention - Deactivated user should deny access', async () => {
    // Create a test user and deactivate them
    const testUser = await User.createUser({
      username: 'deactivateduser' + Date.now(),
      email: `deactivated${Date.now()}@example.com`,
      password: 'Password123',
      firstName: 'Deactivated',
      lastName: 'User',
      role: 'employee',
      department: 'IT'
    });

    // Deactivate the user
    testUser.isActive = false;
    await testUser.save();

    // Create a valid token for the deactivated user
    const token = jwt.sign(
      { id: testUser._id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    try {
      await fc.assert(fc.asyncProperty(protectedEndpointArbitrary, async (endpoint) => {
        // Make request with token for deactivated user
        const response = await request(app)
          [endpoint.method.toLowerCase()](endpoint.path)
          .set('Authorization', `Bearer ${token}`)
          .send({});

        // Property: All protected endpoints should deny access for deactivated users
        expect(response.status).toBe(401);
        expect(response.body.status).toBe('fail');
        expect(response.body.message).toContain('deactivated');
      }), { numRuns: 5 });
    } finally {
      // Cleanup
      await User.findByIdAndDelete(testUser._id);
    }
  });

  test('Property 3: Unauthorized action prevention - Non-existent user token should deny access', async () => {
    // Create a token for a non-existent user
    const nonExistentUserId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but doesn't exist
    const token = jwt.sign(
      { id: nonExistentUserId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    await fc.assert(fc.asyncProperty(protectedEndpointArbitrary, async (endpoint) => {
      // Make request with token for non-existent user
      const response = await request(app)
        [endpoint.method.toLowerCase()](endpoint.path)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      // Property: All protected endpoints should deny access for non-existent users
      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('no longer exist');
    }), { numRuns: 5 });
  });

  test('Property 3: Unauthorized action prevention - System state remains unchanged after denied access', async () => {
    await fc.assert(fc.asyncProperty(
      protectedEndpointArbitrary,
      invalidTokenArbitrary,
      async (endpoint, invalidToken) => {
        // Get initial user count
        const initialUserCount = await User.countDocuments();

        // Make unauthorized request
        const response = await request(app)
          [endpoint.method.toLowerCase()](endpoint.path)
          .set('Authorization', `Bearer ${invalidToken}`)
          .send({ 
            // Send some data that could potentially modify state
            newPassword: 'NewPassword123',
            currentPassword: 'OldPassword123'
          });

        // Get user count after unauthorized request
        const finalUserCount = await User.countDocuments();

        // Property: System state should remain unchanged after unauthorized access
        expect(response.status).toBe(401);
        expect(finalUserCount).toBe(initialUserCount);
      }
    ), { numRuns: 10 });
  });

  test('Property 3: Unauthorized action prevention - Valid user with valid token should have access', async () => {
    // Create a test user
    const testUser = await User.createUser({
      username: 'validuser' + Date.now(),
      email: `valid${Date.now()}@example.com`,
      password: 'Password123',
      firstName: 'Valid',
      lastName: 'User',
      role: 'employee',
      department: 'IT'
    });

    // Create a valid token
    const token = jwt.sign(
      { id: testUser._id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    try {
      // Test with GET /api/auth/me endpoint (should succeed)
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      // Property: Valid authenticated users should have access to appropriate endpoints
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.username).toBe(testUser.username);
    } finally {
      // Cleanup
      await User.findByIdAndDelete(testUser._id);
    }
  });

  test('Property 3: Unauthorized action prevention - Authentication consistency across requests', async () => {
    await fc.assert(fc.asyncProperty(
      invalidTokenArbitrary,
      fc.integer({ min: 2, max: 5 }),
      async (invalidToken, requestCount) => {
        const responses = [];
        
        // Make multiple requests with the same invalid token
        for (let i = 0; i < requestCount; i++) {
          const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${invalidToken}`);
          responses.push(response);
        }

        // Property: All requests with the same invalid token should consistently fail
        responses.forEach(response => {
          expect(response.status).toBe(401);
          expect(response.body.status).toBe('fail');
        });

        // Property: All responses should have the same status
        const statuses = responses.map(r => r.status);
        const uniqueStatuses = [...new Set(statuses)];
        expect(uniqueStatuses).toHaveLength(1);
        expect(uniqueStatuses[0]).toBe(401);
      }
    ), { numRuns: 8 });
  });
});