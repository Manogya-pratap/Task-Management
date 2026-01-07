const fc = require('fast-check');
const mongoose = require('mongoose');
const AuditLog = require('../../server/models/AuditLog');
const { logDataChange, logAuthEvent, logAccessDenied, logSystemError } = require('../../server/middleware/audit');

/**
 * Property-based tests for audit logging
 * Feature: daily-activity-tracker, Property 22: Audit logging
 * **Validates: Requirements 7.3**
 */

describe('Audit Logging Properties', () => {
  beforeAll(async () => {
    // Connect to test database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test-audit-property');
    }
  });

  afterAll(async () => {
    // Clean up and close connection
    await AuditLog.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear audit logs before each test
    await AuditLog.deleteMany({});
  });

  describe('Property 22: Audit logging', () => {
    test('For any system data modification, the change should be logged with appropriate audit information for tracking purposes', () => {
      fc.assert(
        fc.property(
          // Generate random data modification scenarios
          fc.record({
            action: fc.constantFrom('CREATE', 'UPDATE', 'DELETE'),
            resourceType: fc.constantFrom('User', 'Team', 'Project', 'Task'),
            resourceId: fc.string().map(() => new mongoose.Types.ObjectId()),
            userId: fc.string().map(() => new mongoose.Types.ObjectId()),
            beforeData: fc.option(fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constantFrom('active', 'inactive', 'pending'),
              value: fc.integer({ min: 0, max: 1000 })
            })),
            afterData: fc.option(fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              status: fc.constantFrom('active', 'inactive', 'pending'),
              value: fc.integer({ min: 0, max: 1000 })
            })),
            description: fc.string({ minLength: 1, maxLength: 200 }),
            ipAddress: fc.ipV4(),
            userAgent: fc.string({ minLength: 1, maxLength: 100 }),
            requestMethod: fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE'),
            requestUrl: fc.string({ minLength: 1, maxLength: 100 }).map(s => `/api/${s}`)
          }),
          async (testData) => {
            // Create mock request object
            const mockReq = {
              user: { _id: testData.userId },
              ip: testData.ipAddress,
              get: () => testData.userAgent,
              method: testData.requestMethod,
              originalUrl: testData.requestUrl,
              auditData: {
                ipAddress: testData.ipAddress,
                userAgent: testData.userAgent,
                requestMethod: testData.requestMethod,
                requestUrl: testData.requestUrl,
                timestamp: new Date()
              }
            };

            // Log the data change
            await logDataChange(
              mockReq,
              testData.action,
              testData.resourceType,
              testData.resourceId,
              testData.beforeData,
              testData.afterData,
              testData.description
            );

            // Verify audit log was created
            const auditLogs = await AuditLog.find({ 
              resourceId: testData.resourceId,
              action: testData.action 
            });

            expect(auditLogs).toHaveLength(1);
            
            const auditLog = auditLogs[0];
            
            // Verify all required audit information is present
            expect(auditLog.action).toBe(testData.action);
            expect(auditLog.resourceType).toBe(testData.resourceType);
            expect(auditLog.resourceId.toString()).toBe(testData.resourceId.toString());
            expect(auditLog.userId.toString()).toBe(testData.userId.toString());
            expect(auditLog.description).toBe(testData.description);
            expect(auditLog.ipAddress).toBe(testData.ipAddress);
            expect(auditLog.userAgent).toBe(testData.userAgent);
            expect(auditLog.requestMethod).toBe(testData.requestMethod);
            expect(auditLog.requestUrl).toBe(testData.requestUrl);
            
            // Verify timestamp is recent (within last minute)
            const timeDiff = Math.abs(new Date() - auditLog.timestamp);
            expect(timeDiff).toBeLessThan(60000); // 1 minute
            
            // Verify integrity hash is present and valid
            expect(auditLog.integrityHash).toBeDefined();
            expect(auditLog.integrityHash).toHaveLength(64); // SHA-256 hash
            expect(auditLog.verifyIntegrity()).toBe(true);
            
            // Verify change tracking
            if (testData.beforeData) {
              expect(auditLog.changes.before).toEqual(testData.beforeData);
            }
            if (testData.afterData) {
              expect(auditLog.changes.after).toEqual(testData.afterData);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('For any authentication event, it should be logged with appropriate security information', () => {
      fc.assert(
        fc.property(
          fc.record({
            action: fc.constantFrom('LOGIN', 'LOGOUT', 'ACCESS_DENIED'),
            userId: fc.option(fc.string().map(() => new mongoose.Types.ObjectId())),
            description: fc.string({ minLength: 1, maxLength: 200 }),
            ipAddress: fc.ipV4(),
            userAgent: fc.string({ minLength: 1, maxLength: 100 }),
            requestUrl: fc.constantFrom('/api/auth/login', '/api/auth/logout', '/api/protected')
          }),
          async (testData) => {
            // Create mock request object
            const mockReq = {
              user: testData.userId ? { _id: testData.userId } : null,
              ip: testData.ipAddress,
              get: () => testData.userAgent,
              method: 'POST',
              originalUrl: testData.requestUrl,
              auditData: {
                ipAddress: testData.ipAddress,
                userAgent: testData.userAgent,
                requestMethod: 'POST',
                requestUrl: testData.requestUrl,
                timestamp: new Date()
              }
            };

            // Log the authentication event
            await logAuthEvent(
              mockReq,
              testData.action,
              testData.userId,
              testData.description
            );

            // Verify audit log was created
            const auditLogs = await AuditLog.find({ 
              action: testData.action,
              resourceType: 'Auth'
            });

            expect(auditLogs).toHaveLength(1);
            
            const auditLog = auditLogs[0];
            
            // Verify authentication-specific audit information
            expect(auditLog.action).toBe(testData.action);
            expect(auditLog.resourceType).toBe('Auth');
            expect(auditLog.description).toBe(testData.description);
            expect(auditLog.ipAddress).toBe(testData.ipAddress);
            expect(auditLog.userAgent).toBe(testData.userAgent);
            expect(auditLog.requestUrl).toBe(testData.requestUrl);
            
            if (testData.userId) {
              expect(auditLog.userId.toString()).toBe(testData.userId.toString());
            }
            
            // Verify security tracking elements
            expect(auditLog.timestamp).toBeDefined();
            expect(auditLog.integrityHash).toBeDefined();
            expect(auditLog.verifyIntegrity()).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('For any system error, it should be logged with error details and context', () => {
      fc.assert(
        fc.property(
          fc.record({
            errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
            errorCode: fc.option(fc.integer({ min: 400, max: 599 })),
            userId: fc.option(fc.string().map(() => new mongoose.Types.ObjectId())),
            description: fc.string({ minLength: 1, maxLength: 200 }),
            ipAddress: fc.ipV4(),
            userAgent: fc.string({ minLength: 1, maxLength: 100 }),
            requestUrl: fc.string({ minLength: 1, maxLength: 100 }).map(s => `/api/${s}`)
          }),
          async (testData) => {
            // Create mock request and error objects
            const mockReq = {
              user: testData.userId ? { _id: testData.userId } : null,
              ip: testData.ipAddress,
              get: () => testData.userAgent,
              method: 'GET',
              originalUrl: testData.requestUrl,
              auditData: {
                ipAddress: testData.ipAddress,
                userAgent: testData.userAgent,
                requestMethod: 'GET',
                requestUrl: testData.requestUrl,
                timestamp: new Date()
              }
            };

            const mockError = new Error(testData.errorMessage);
            if (testData.errorCode) {
              mockError.code = testData.errorCode;
            }

            // Log the system error
            await logSystemError(mockReq, mockError, testData.description);

            // Verify audit log was created
            const auditLogs = await AuditLog.find({ 
              action: 'ERROR',
              resourceType: 'System'
            });

            expect(auditLogs).toHaveLength(1);
            
            const auditLog = auditLogs[0];
            
            // Verify error-specific audit information
            expect(auditLog.action).toBe('ERROR');
            expect(auditLog.resourceType).toBe('System');
            expect(auditLog.description).toBe(testData.description);
            expect(auditLog.errorDetails.message).toBe(testData.errorMessage);
            
            if (testData.errorCode) {
              expect(auditLog.errorDetails.code).toBe(testData.errorCode);
            }
            
            // Verify context information
            expect(auditLog.ipAddress).toBe(testData.ipAddress);
            expect(auditLog.userAgent).toBe(testData.userAgent);
            expect(auditLog.requestUrl).toBe(testData.requestUrl);
            
            if (testData.userId) {
              expect(auditLog.userId.toString()).toBe(testData.userId.toString());
            }
            
            // Verify integrity
            expect(auditLog.integrityHash).toBeDefined();
            expect(auditLog.verifyIntegrity()).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('For any audit log entry, integrity verification should work correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            action: fc.constantFrom('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'ERROR'),
            resourceType: fc.constantFrom('User', 'Team', 'Project', 'Task', 'Auth', 'System'),
            resourceId: fc.option(fc.string().map(() => new mongoose.Types.ObjectId())),
            userId: fc.option(fc.string().map(() => new mongoose.Types.ObjectId())),
            description: fc.string({ minLength: 1, maxLength: 200 }),
            ipAddress: fc.ipV4(),
            userAgent: fc.string({ minLength: 1, maxLength: 100 })
          }),
          async (testData) => {
            // Create audit log directly
            const auditLog = await AuditLog.createLog({
              action: testData.action,
              resourceType: testData.resourceType,
              resourceId: testData.resourceId,
              userId: testData.userId,
              description: testData.description,
              ipAddress: testData.ipAddress,
              userAgent: testData.userAgent,
              requestMethod: 'POST',
              requestUrl: '/api/test'
            });

            // Verify integrity is valid initially
            expect(auditLog.verifyIntegrity()).toBe(true);
            
            // Verify static method also works
            expect(AuditLog.verifyIntegrity(auditLog)).toBe(true);
            
            // Tamper with the log and verify integrity fails
            const originalDescription = auditLog.description;
            auditLog.description = 'tampered description';
            expect(auditLog.verifyIntegrity()).toBe(false);
            
            // Restore and verify integrity is valid again
            auditLog.description = originalDescription;
            expect(auditLog.verifyIntegrity()).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('For any audit log query, it should return logs with complete tracking information', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              action: fc.constantFrom('CREATE', 'UPDATE', 'DELETE'),
              resourceType: fc.constantFrom('User', 'Team', 'Project', 'Task'),
              resourceId: fc.string().map(() => new mongoose.Types.ObjectId()),
              userId: fc.string().map(() => new mongoose.Types.ObjectId()),
              description: fc.string({ minLength: 1, maxLength: 200 }),
              ipAddress: fc.ipV4(),
              userAgent: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (testDataArray) => {
            // Create multiple audit logs
            const createdLogs = [];
            for (const testData of testDataArray) {
              const auditLog = await AuditLog.createLog({
                action: testData.action,
                resourceType: testData.resourceType,
                resourceId: testData.resourceId,
                userId: testData.userId,
                description: testData.description,
                ipAddress: testData.ipAddress,
                userAgent: testData.userAgent,
                requestMethod: 'POST',
                requestUrl: '/api/test'
              });
              createdLogs.push(auditLog);
            }

            // Query all logs
            const allLogs = await AuditLog.find({}).sort({ timestamp: -1 });
            expect(allLogs.length).toBe(testDataArray.length);

            // Verify each log has complete tracking information
            for (const log of allLogs) {
              expect(log.action).toBeDefined();
              expect(log.resourceType).toBeDefined();
              expect(log.description).toBeDefined();
              expect(log.ipAddress).toBeDefined();
              expect(log.userAgent).toBeDefined();
              expect(log.timestamp).toBeDefined();
              expect(log.integrityHash).toBeDefined();
              expect(log.integrityHash).toHaveLength(64);
              expect(log.verifyIntegrity()).toBe(true);
            }

            // Test resource-specific queries
            if (testDataArray.length > 0) {
              const firstLog = testDataArray[0];
              const resourceLogs = await AuditLog.getResourceAuditTrail(
                firstLog.resourceType,
                firstLog.resourceId
              );
              
              // Should find at least one log for this resource
              expect(resourceLogs.length).toBeGreaterThanOrEqual(1);
              
              // All returned logs should be for the correct resource
              for (const log of resourceLogs) {
                expect(log.resourceType).toBe(firstLog.resourceType);
                expect(log.resourceId.toString()).toBe(firstLog.resourceId.toString());
              }
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle audit logging when database is unavailable', async () => {
      // This test verifies graceful handling of audit logging failures
      const originalCreateLog = AuditLog.createLog;
      
      // Mock database failure
      AuditLog.createLog = jest.fn().mockRejectedValue(new Error('Database unavailable'));
      
      const mockReq = {
        user: { _id: new mongoose.Types.ObjectId() },
        ip: '127.0.0.1',
        get: () => 'test-agent',
        method: 'POST',
        originalUrl: '/api/test',
        auditData: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          requestMethod: 'POST',
          requestUrl: '/api/test',
          timestamp: new Date()
        }
      };

      // Should not throw error even if audit logging fails
      await expect(logDataChange(
        mockReq,
        'CREATE',
        'Task',
        new mongoose.Types.ObjectId(),
        null,
        { name: 'test' },
        'Test description'
      )).resolves.not.toThrow();

      // Restore original function
      AuditLog.createLog = originalCreateLog;
    });

    test('should handle malformed audit data gracefully', async () => {
      // Test with minimal required data
      const minimalData = {
        action: 'CREATE',
        resourceType: 'Task',
        description: 'Minimal test',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        requestMethod: 'POST',
        requestUrl: '/api/test'
      };

      const auditLog = await AuditLog.createLog(minimalData);
      expect(auditLog).toBeDefined();
      expect(auditLog.verifyIntegrity()).toBe(true);
    });

    test('should handle very large audit data', async () => {
      const largeData = {
        action: 'UPDATE',
        resourceType: 'Project',
        resourceId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        description: 'Large data test',
        changes: {
          before: { data: 'x'.repeat(10000) },
          after: { data: 'y'.repeat(10000) }
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        requestMethod: 'PUT',
        requestUrl: '/api/test'
      };

      const auditLog = await AuditLog.createLog(largeData);
      expect(auditLog).toBeDefined();
      expect(auditLog.verifyIntegrity()).toBe(true);
      expect(auditLog.changes.before.data).toHaveLength(10000);
      expect(auditLog.changes.after.data).toHaveLength(10000);
    });
  });
});