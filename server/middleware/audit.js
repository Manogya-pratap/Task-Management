const AuditLog = require('../models/AuditLog');

/**
 * Middleware to capture request data for audit logging
 */
const captureAuditData = (req, res, next) => {
  // Store original request data
  req.auditData = {
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    requestMethod: req.method,
    requestUrl: req.originalUrl,
    timestamp: new Date()
  };
  
  // Store original res.json to capture response data
  const originalJson = res.json;
  res.json = function(data) {
    req.auditData.responseData = data;
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Create audit log entry
 */
const createAuditLog = async (logData) => {
  try {
    await AuditLog.createLog(logData);
  } catch (error) {
    // Don't fail the request if audit logging fails, but log the error
    console.error('Audit logging failed:', error);
  }
};

/**
 * Log authentication events
 */
const logAuthEvent = async (req, action, userId = null, description = '', errorDetails = null) => {
  const logData = {
    action,
    resourceType: 'Auth',
    userId,
    description,
    ipAddress: req.auditData?.ipAddress || req.ip || 'unknown',
    userAgent: req.auditData?.userAgent || req.get('User-Agent') || 'unknown',
    requestMethod: req.method,
    requestUrl: req.originalUrl,
    timestamp: new Date()
  };
  
  if (errorDetails) {
    logData.errorDetails = errorDetails;
  }
  
  await createAuditLog(logData);
};

/**
 * Log data modification events
 */
const logDataChange = async (req, action, resourceType, resourceId, beforeData = null, afterData = null, description = '') => {
  const changes = {};
  
  if (beforeData) {
    changes.before = beforeData;
  }
  
  if (afterData) {
    changes.after = afterData;
  }
  
  const logData = {
    action,
    resourceType,
    resourceId,
    userId: req.user?._id,
    description,
    changes: Object.keys(changes).length > 0 ? changes : undefined,
    ipAddress: req.auditData?.ipAddress || req.ip || 'unknown',
    userAgent: req.auditData?.userAgent || req.get('User-Agent') || 'unknown',
    requestMethod: req.method,
    requestUrl: req.originalUrl,
    timestamp: new Date()
  };
  
  await createAuditLog(logData);
};

/**
 * Log access denied events
 */
const logAccessDenied = async (req, resourceType, resourceId = null, description = '') => {
  const logData = {
    action: 'ACCESS_DENIED',
    resourceType,
    resourceId,
    userId: req.user?._id,
    description,
    ipAddress: req.auditData?.ipAddress || req.ip || 'unknown',
    userAgent: req.auditData?.userAgent || req.get('User-Agent') || 'unknown',
    requestMethod: req.method,
    requestUrl: req.originalUrl,
    timestamp: new Date()
  };
  
  await createAuditLog(logData);
};

/**
 * Log system errors
 */
const logSystemError = async (req, error, description = '') => {
  const logData = {
    action: 'ERROR',
    resourceType: 'System',
    userId: req.user?._id,
    description: description || 'System error occurred',
    errorDetails: {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: error.code || error.statusCode
    },
    ipAddress: req.auditData?.ipAddress || req.ip || 'unknown',
    userAgent: req.auditData?.userAgent || req.get('User-Agent') || 'unknown',
    requestMethod: req.method,
    requestUrl: req.originalUrl,
    timestamp: new Date()
  };
  
  await createAuditLog(logData);
};

/**
 * Middleware to automatically log data changes based on HTTP method and response
 */
const autoAuditMiddleware = (resourceType) => {
  return async (req, res, next) => {
    // Store original response methods
    const originalJson = res.json;
    const originalStatus = res.status;
    let statusCode = 200;
    
    // Capture status code
    res.status = function(code) {
      statusCode = code;
      return originalStatus.call(this, code);
    };
    
    // Override res.json to capture successful operations
    res.json = function(data) {
      // Only log successful operations (2xx status codes)
      if (statusCode >= 200 && statusCode < 300) {
        setImmediate(async () => {
          try {
            let action, resourceId, description;
            
            // Determine action based on HTTP method and status
            switch (req.method) {
              case 'POST':
                action = 'CREATE';
                resourceId = data.data?.[resourceType.toLowerCase()]?._id || 
                           data.data?._id ||
                           data[resourceType.toLowerCase()]?._id;
                description = `Created new ${resourceType.toLowerCase()}`;
                break;
                
              case 'PUT':
              case 'PATCH':
                action = 'UPDATE';
                resourceId = req.params.id || 
                           data.data?.[resourceType.toLowerCase()]?._id || 
                           data.data?._id;
                description = `Updated ${resourceType.toLowerCase()}`;
                break;
                
              case 'DELETE':
                action = 'DELETE';
                resourceId = req.params.id;
                description = `Deleted ${resourceType.toLowerCase()}`;
                break;
                
              default:
                // Don't log GET requests automatically
                return;
            }
            
            if (action && resourceId) {
              await logDataChange(
                req, 
                action, 
                resourceType, 
                resourceId, 
                req.originalData, // Will be set by controllers if needed
                data.data, 
                description
              );
            }
          } catch (error) {
            console.error('Auto-audit logging failed:', error);
          }
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Enhanced error handling middleware with audit logging
 */
const auditErrorHandler = async (err, req, res, next) => {
  // Log the error
  await logSystemError(req, err, `Error in ${req.method} ${req.originalUrl}`);
  
  // Continue with normal error handling
  next(err);
};

/**
 * Middleware to check data integrity
 */
const checkDataIntegrity = async (req, res, next) => {
  // Add integrity check for critical operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    try {
      // Verify request data integrity
      if (req.body && typeof req.body === 'object') {
        // Check for suspicious patterns
        const suspiciousPatterns = [
          /\$where/i,
          /\$ne/i,
          /javascript:/i,
          /<script/i,
          /eval\(/i
        ];
        
        const bodyString = JSON.stringify(req.body);
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(bodyString)) {
            await logSystemError(req, new Error('Suspicious data pattern detected'), 'Data integrity check failed');
            return res.status(400).json({
              status: 'error',
              message: 'Invalid data format detected'
            });
          }
        }
      }
    } catch (error) {
      await logSystemError(req, error, 'Data integrity check error');
    }
  }
  
  next();
};

module.exports = {
  captureAuditData,
  createAuditLog,
  logAuthEvent,
  logDataChange,
  logAccessDenied,
  logSystemError,
  autoAuditMiddleware,
  auditErrorHandler,
  checkDataIntegrity
};