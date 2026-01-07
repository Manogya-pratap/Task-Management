const AuditLog = require('../models/AuditLog');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * Get audit logs with filtering and pagination
 * Only accessible by MD and IT_Admin
 */
const getAuditLogs = catchAsync(async (req, res, next) => {
  // Only MD and IT_Admin can access audit logs
  if (req.user.role !== 'managing_director' && req.user.role !== 'it_admin') {
    return next(new AppError('You do not have permission to access audit logs', 403));
  }

  // Build query filters
  const filter = {};
  
  if (req.query.userId) {
    filter.userId = req.query.userId;
  }
  
  if (req.query.action) {
    filter.action = req.query.action;
  }
  
  if (req.query.resourceType) {
    filter.resourceType = req.query.resourceType;
  }
  
  if (req.query.resourceId) {
    filter.resourceId = req.query.resourceId;
  }
  
  if (req.query.startDate || req.query.endDate) {
    filter.timestamp = {};
    if (req.query.startDate) {
      filter.timestamp.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filter.timestamp.$lte = new Date(req.query.endDate);
    }
  }
  
  if (req.query.ipAddress) {
    filter.ipAddress = req.query.ipAddress;
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  // Get audit logs
  const auditLogs = await AuditLog.find(filter)
    .populate('userId', 'firstName lastName email role')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

  // Get total count for pagination
  const totalCount = await AuditLog.countDocuments(filter);
  const totalPages = Math.ceil(totalCount / limit);

  res.status(200).json({
    status: 'success',
    results: auditLogs.length,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    },
    data: {
      auditLogs
    }
  });
});

/**
 * Get audit trail for a specific resource
 */
const getResourceAuditTrail = catchAsync(async (req, res, next) => {
  const { resourceType, resourceId } = req.params;
  
  // Check permissions based on resource type and user role
  if (!canUserAccessAuditTrail(req.user, resourceType, resourceId)) {
    return next(new AppError('You do not have permission to access this audit trail', 403));
  }

  const options = {
    startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
    action: req.query.action,
    limit: parseInt(req.query.limit) || 100
  };

  const auditTrail = await AuditLog.getResourceAuditTrail(resourceType, resourceId, options);

  res.status(200).json({
    status: 'success',
    results: auditTrail.length,
    data: {
      resourceType,
      resourceId,
      auditTrail
    }
  });
});

/**
 * Get user activity logs
 */
const getUserActivity = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  
  // Users can only see their own activity, unless they're MD/IT_Admin
  if (req.user._id.toString() !== userId && 
      req.user.role !== 'managing_director' && 
      req.user.role !== 'it_admin') {
    return next(new AppError('You can only view your own activity logs', 403));
  }

  const options = {
    startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
    action: req.query.action,
    limit: parseInt(req.query.limit) || 100
  };

  const userActivity = await AuditLog.getUserActivity(userId, options);

  res.status(200).json({
    status: 'success',
    results: userActivity.length,
    data: {
      userId,
      userActivity
    }
  });
});

/**
 * Get system activity summary
 */
const getActivitySummary = catchAsync(async (req, res, next) => {
  // Only MD and IT_Admin can access system activity summary
  if (req.user.role !== 'managing_director' && req.user.role !== 'it_admin') {
    return next(new AppError('You do not have permission to access system activity summary', 403));
  }

  const options = {
    startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate) : undefined
  };

  const activitySummary = await AuditLog.getActivitySummary(options);

  // Get additional statistics
  const totalLogs = await AuditLog.countDocuments({
    timestamp: {
      $gte: options.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
      $lte: options.endDate || new Date()
    }
  });

  const errorCount = await AuditLog.countDocuments({
    action: 'ERROR',
    timestamp: {
      $gte: options.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
      $lte: options.endDate || new Date()
    }
  });

  const accessDeniedCount = await AuditLog.countDocuments({
    action: 'ACCESS_DENIED',
    timestamp: {
      $gte: options.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
      $lte: options.endDate || new Date()
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      summary: activitySummary,
      statistics: {
        totalLogs,
        errorCount,
        accessDeniedCount,
        period: {
          startDate: options.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
          endDate: options.endDate || new Date()
        }
      }
    }
  });
});

/**
 * Verify audit log integrity
 */
const verifyAuditIntegrity = catchAsync(async (req, res, next) => {
  // Only MD and IT_Admin can verify audit integrity
  if (req.user.role !== 'managing_director' && req.user.role !== 'it_admin') {
    return next(new AppError('You do not have permission to verify audit integrity', 403));
  }

  const { logId } = req.params;
  
  const auditLog = await AuditLog.findById(logId);
  if (!auditLog) {
    return next(new AppError('Audit log not found', 404));
  }

  const isValid = auditLog.verifyIntegrity();

  res.status(200).json({
    status: 'success',
    data: {
      logId,
      isValid,
      timestamp: auditLog.timestamp,
      integrityHash: auditLog.integrityHash
    }
  });
});

/**
 * Bulk verify audit log integrity
 */
const bulkVerifyIntegrity = catchAsync(async (req, res, next) => {
  // Only MD and IT_Admin can verify audit integrity
  if (req.user.role !== 'managing_director' && req.user.role !== 'it_admin') {
    return next(new AppError('You do not have permission to verify audit integrity', 403));
  }

  const { startDate, endDate, limit = 1000 } = req.query;
  
  const filter = {};
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  const auditLogs = await AuditLog.find(filter)
    .sort({ timestamp: -1 })
    .limit(parseInt(limit));

  const results = auditLogs.map(log => ({
    logId: log._id,
    timestamp: log.timestamp,
    isValid: log.verifyIntegrity(),
    action: log.action,
    resourceType: log.resourceType
  }));

  const validCount = results.filter(r => r.isValid).length;
  const invalidCount = results.length - validCount;

  res.status(200).json({
    status: 'success',
    data: {
      totalChecked: results.length,
      validCount,
      invalidCount,
      integrityPercentage: results.length > 0 ? (validCount / results.length * 100).toFixed(2) : 100,
      results: results.filter(r => !r.isValid) // Only return invalid logs for investigation
    }
  });
});

/**
 * Export audit logs (for compliance/backup)
 */
const exportAuditLogs = catchAsync(async (req, res, next) => {
  // Only MD and IT_Admin can export audit logs
  if (req.user.role !== 'managing_director' && req.user.role !== 'it_admin') {
    return next(new AppError('You do not have permission to export audit logs', 403));
  }

  const { startDate, endDate, format = 'json' } = req.query;
  
  const filter = {};
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  const auditLogs = await AuditLog.find(filter)
    .populate('userId', 'firstName lastName email role')
    .sort({ timestamp: -1 });

  if (format === 'csv') {
    // Convert to CSV format
    const csvHeader = 'Timestamp,Action,Resource Type,Resource ID,User,IP Address,Description\n';
    const csvData = auditLogs.map(log => {
      const user = log.userId ? `${log.userId.firstName} ${log.userId.lastName} (${log.userId.email})` : 'System';
      return `${log.timestamp.toISOString()},${log.action},${log.resourceType},${log.resourceId || ''},${user},${log.ipAddress},"${log.description}"`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvHeader + csvData);
  } else {
    // JSON format
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`);
    res.json({
      exportDate: new Date().toISOString(),
      totalRecords: auditLogs.length,
      filter,
      data: auditLogs
    });
  }
});

/**
 * Helper function to check if user can access audit trail for a resource
 */
function canUserAccessAuditTrail(user, resourceType, resourceId) {
  // MD and IT_Admin can access all audit trails
  if (user.role === 'managing_director' || user.role === 'it_admin') {
    return true;
  }

  // Team leads can access audit trails for their team's resources
  if (user.role === 'team_lead') {
    // This would need additional logic to check if the resource belongs to their team
    // For now, allow team leads to access audit trails for resources they can modify
    return true;
  }

  // Employees can only access audit trails for their own user record
  if (user.role === 'employee' && resourceType === 'User' && resourceId === user._id.toString()) {
    return true;
  }

  return false;
}

module.exports = {
  getAuditLogs,
  getResourceAuditTrail,
  getUserActivity,
  getActivitySummary,
  verifyAuditIntegrity,
  bulkVerifyIntegrity,
  exportAuditLogs
};