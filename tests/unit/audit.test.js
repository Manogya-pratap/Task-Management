const AuditLog = require('../../server/models/AuditLog');
const { logDataChange, logAuthEvent } = require('../../server/middleware/audit');
const mongoose = require('mongoose');

// Mock request object
const mockReq = {
  user: { _id: new mongoose.Types.ObjectId() },
  ip: '127.0.0.1',
  get: () => 'test-user-agent',
  method: 'POST',
  originalUrl: '/api/test',
  auditData: {
    ipAddress: '127.0.0.1',
    userAgent: 'test-user-agent',
    requestMethod: 'POST',
    requestUrl: '/api/test',
    timestamp: new Date()
  }
};

describe('Audit Logging System', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test-audit');
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

  describe('AuditLog Model', () => {
    test('should create audit log with integrity hash', async () => {
      const logData = {
        action: 'CREATE',
        resourceType: 'Task',
        resourceId: new mongoose.Types.ObjectId(),
        userId: mockReq.user._id,
        description: 'Test audit log',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        requestMethod: 'POST',
        requestUrl: '/api/test'
      };

      const auditLog = await AuditLog.createLog(logData);

      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('CREATE');
      expect(auditLog.resourceType).toBe('Task');
      expect(auditLog.integrityHash).toBeDefined();
      expect(auditLog.integrityHash).toHaveLength(64); // SHA-256 hash length
    });

    test('should verify audit log integrity', async () => {
      const logData = {
        action: 'UPDATE',
        resourceType: 'Project',
        resourceId: new mongoose.Types.ObjectId(),
        userId: mockReq.user._id,
        description: 'Test integrity verification',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        requestMethod: 'PUT',
        requestUrl: '/api/test'
      };

      const auditLog = await AuditLog.createLog(logData);
      const isValid = auditLog.verifyIntegrity();

      expect(isValid).toBe(true);
    });

    test('should detect tampered audit log', async () => {
      const logData = {
        action: 'DELETE',
        resourceType: 'User',
        resourceId: new mongoose.Types.ObjectId(),
        userId: mockReq.user._id,
        description: 'Test tampering detection',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        requestMethod: 'DELETE',
        requestUrl: '/api/test'
      };

      const auditLog = await AuditLog.createLog(logData);
      
      // Tamper with the log
      auditLog.description = 'Tampered description';
      
      const isValid = auditLog.verifyIntegrity();
      expect(isValid).toBe(false);
    });
  });

  describe('Audit Middleware', () => {
    test('should log data change events', async () => {
      const resourceId = new mongoose.Types.ObjectId();
      const beforeData = { name: 'Old Name', status: 'active' };
      const afterData = { name: 'New Name', status: 'inactive' };

      await logDataChange(
        mockReq,
        'UPDATE',
        'Task',
        resourceId,
        beforeData,
        afterData,
        'Test data change'
      );

      const auditLogs = await AuditLog.find({ resourceId });
      expect(auditLogs).toHaveLength(1);
      
      const log = auditLogs[0];
      expect(log.action).toBe('UPDATE');
      expect(log.resourceType).toBe('Task');
      expect(log.resourceId.toString()).toBe(resourceId.toString());
      expect(log.changes.before).toEqual(beforeData);
      expect(log.changes.after).toEqual(afterData);
      expect(log.description).toBe('Test data change');
    });

    test('should log authentication events', async () => {
      await logAuthEvent(
        mockReq,
        'LOGIN',
        mockReq.user._id,
        'User logged in successfully'
      );

      const auditLogs = await AuditLog.find({ userId: mockReq.user._id });
      expect(auditLogs).toHaveLength(1);
      
      const log = auditLogs[0];
      expect(log.action).toBe('LOGIN');
      expect(log.resourceType).toBe('Auth');
      expect(log.userId.toString()).toBe(mockReq.user._id.toString());
      expect(log.description).toBe('User logged in successfully');
    });
  });

  describe('Audit Queries', () => {
    test('should get resource audit trail', async () => {
      const resourceId = new mongoose.Types.ObjectId();
      
      // Create multiple audit logs for the same resource
      await AuditLog.createLog({
        action: 'CREATE',
        resourceType: 'Task',
        resourceId,
        userId: mockReq.user._id,
        description: 'Task created',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        requestMethod: 'POST',
        requestUrl: '/api/tasks'
      });

      await AuditLog.createLog({
        action: 'UPDATE',
        resourceType: 'Task',
        resourceId,
        userId: mockReq.user._id,
        description: 'Task updated',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        requestMethod: 'PUT',
        requestUrl: '/api/tasks'
      });

      const auditTrail = await AuditLog.getResourceAuditTrail('Task', resourceId);
      expect(auditTrail).toHaveLength(2);
      expect(auditTrail[0].action).toBe('UPDATE'); // Should be sorted by timestamp desc
      expect(auditTrail[1].action).toBe('CREATE');
    });

    test('should get user activity', async () => {
      const userId = mockReq.user._id;
      
      // Create multiple audit logs for the same user
      await AuditLog.createLog({
        action: 'LOGIN',
        resourceType: 'Auth',
        userId,
        description: 'User logged in',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        requestMethod: 'POST',
        requestUrl: '/api/auth/login'
      });

      await AuditLog.createLog({
        action: 'CREATE',
        resourceType: 'Task',
        resourceId: new mongoose.Types.ObjectId(),
        userId,
        description: 'Task created',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        requestMethod: 'POST',
        requestUrl: '/api/tasks'
      });

      const userActivity = await AuditLog.getUserActivity(userId);
      expect(userActivity).toHaveLength(2);
      expect(userActivity.every(log => log.userId.toString() === userId.toString())).toBe(true);
    });
  });
});