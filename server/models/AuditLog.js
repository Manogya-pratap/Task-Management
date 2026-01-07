const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Action details
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS_DENIED', 'ERROR',
      'USER_LIST_ACCESS', 'USER_ACCESS', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED'
    ]
  },
  
  // Resource information
  resourceType: {
    type: String,
    required: [true, 'Resource type is required'],
    enum: ['User', 'Team', 'Project', 'Task', 'Auth', 'System']
  },
  
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function() {
      return this.resourceType !== 'Auth' && this.resourceType !== 'System';
    }
  },
  
  // User who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.action !== 'ERROR';
    }
  },
  
  // Request details
  ipAddress: {
    type: String,
    required: true
  },
  
  userAgent: {
    type: String,
    required: true
  },
  
  // Change details
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  
  // Additional context
  description: {
    type: String,
    required: true
  },
  
  // Error details (for error logs)
  errorDetails: {
    message: String,
    stack: String,
    code: String
  },
  
  // Request metadata
  requestMethod: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  },
  
  requestUrl: String,
  
  // Data integrity hash
  integrityHash: {
    type: String,
    required: true
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // We use our own timestamp field
});

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });

// Static method to create audit log entry
auditLogSchema.statics.createLog = async function(logData) {
  try {
    // Generate integrity hash
    const crypto = require('crypto');
    const hashData = JSON.stringify({
      action: logData.action,
      resourceType: logData.resourceType,
      resourceId: logData.resourceId,
      userId: logData.userId,
      timestamp: logData.timestamp || new Date(),
      changes: logData.changes
    });
    
    const integrityHash = crypto
      .createHash('sha256')
      .update(hashData)
      .digest('hex');
    
    const auditLog = new this({
      ...logData,
      integrityHash,
      timestamp: logData.timestamp || new Date()
    });
    
    await auditLog.save();
    return auditLog;
  } catch (error) {
    // Log to console if database logging fails
    console.error('Failed to create audit log:', error);
    throw error;
  }
};

// Static method to verify integrity
auditLogSchema.statics.verifyIntegrity = function(auditLog) {
  const crypto = require('crypto');
  const hashData = JSON.stringify({
    action: auditLog.action,
    resourceType: auditLog.resourceType,
    resourceId: auditLog.resourceId,
    userId: auditLog.userId,
    timestamp: auditLog.timestamp,
    changes: auditLog.changes
  });
  
  const calculatedHash = crypto
    .createHash('sha256')
    .update(hashData)
    .digest('hex');
  
  return calculatedHash === auditLog.integrityHash;
};

// Static method to get audit trail for a resource
auditLogSchema.statics.getResourceAuditTrail = async function(resourceType, resourceId, options = {}) {
  const query = { resourceType, resourceId };
  
  if (options.startDate) {
    query.timestamp = { $gte: options.startDate };
  }
  
  if (options.endDate) {
    query.timestamp = { ...query.timestamp, $lte: options.endDate };
  }
  
  if (options.action) {
    query.action = options.action;
  }
  
  return this.find(query)
    .populate('userId', 'firstName lastName email role')
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = async function(userId, options = {}) {
  const query = { userId };
  
  if (options.startDate) {
    query.timestamp = { $gte: options.startDate };
  }
  
  if (options.endDate) {
    query.timestamp = { ...query.timestamp, $lte: options.endDate };
  }
  
  if (options.action) {
    query.action = options.action;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

// Static method to get system activity summary
auditLogSchema.statics.getActivitySummary = async function(options = {}) {
  const startDate = options.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
  const endDate = options.endDate || new Date();
  
  const pipeline = [
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          resourceType: '$resourceType'
        },
        count: { $sum: 1 },
        lastActivity: { $max: '$timestamp' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Instance method to verify this log's integrity
auditLogSchema.methods.verifyIntegrity = function() {
  return this.constructor.verifyIntegrity(this);
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;