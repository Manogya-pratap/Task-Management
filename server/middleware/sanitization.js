const { sanitizeObject, sanitizeInput } = require('../utils/encryption');
const validator = require('validator');

/**
 * Input sanitization middleware for enhanced security
 */

/**
 * Comprehensive input sanitization middleware
 */
const sanitizeInputs = (options = {}) => {
  const {
    excludeFields = ['password', 'token'], // Fields to exclude from sanitization
    maxStringLength = 10000, // Maximum string length
    allowHtml = false, // Whether to allow HTML content
    strictMode = true // Enable strict sanitization
  } = options;

  return (req, res, next) => {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeRequestData(req.body, {
          excludeFields,
          maxStringLength,
          allowHtml,
          strictMode
        });
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeRequestData(req.query, {
          excludeFields,
          maxStringLength,
          allowHtml,
          strictMode
        });
      }

      // Sanitize URL parameters
      if (req.params && typeof req.params === 'object') {
        req.params = sanitizeRequestData(req.params, {
          excludeFields,
          maxStringLength,
          allowHtml,
          strictMode
        });
      }

      next();
    } catch (error) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid input data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
};

/**
 * Sanitize request data recursively
 */
const sanitizeRequestData = (data, options) => {
  const { excludeFields, maxStringLength, allowHtml, strictMode } = options;

  if (!data || typeof data !== 'object') {
    return sanitizeValue(data, options);
  }

  const sanitized = {};

  Object.keys(data).forEach(key => {
    if (excludeFields.includes(key)) {
      // Don't sanitize excluded fields, but still validate length
      if (typeof data[key] === 'string' && data[key].length > maxStringLength) {
        throw new Error(`Field ${key} exceeds maximum length`);
      }
      sanitized[key] = data[key];
    } else if (Array.isArray(data[key])) {
      sanitized[key] = data[key].map(item => 
        sanitizeRequestData(item, options)
      );
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      sanitized[key] = sanitizeRequestData(data[key], options);
    } else {
      sanitized[key] = sanitizeValue(data[key], options);
    }
  });

  return sanitized;
};

/**
 * Sanitize individual values
 */
const sanitizeValue = (value, options) => {
  const { maxStringLength, allowHtml, strictMode } = options;

  if (typeof value !== 'string') {
    return value;
  }

  // Check string length
  if (value.length > maxStringLength) {
    throw new Error('Input exceeds maximum length');
  }

  let sanitized = value;

  // Basic sanitization
  sanitized = sanitized.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Handle HTML content
  if (!allowHtml) {
    // Escape HTML entities
    sanitized = validator.escape(sanitized);
  } else {
    // If HTML is allowed, at least remove script tags and dangerous attributes
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }

  // Strict mode additional sanitization
  if (strictMode) {
    // Remove potential SQL injection patterns
    sanitized = sanitized.replace(/['";\\]/g, '');
    
    // Remove potential NoSQL injection patterns
    sanitized = sanitized.replace(/[${}]/g, '');
    
    // Remove potential command injection patterns
    sanitized = sanitized.replace(/[|&;`]/g, '');
  }

  return sanitized;
};

/**
 * Validate file uploads
 */
const validateFileUpload = (options = {}) => {
  const {
    maxFileSize = 5 * 1024 * 1024, // 5MB default
    allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
    maxFiles = 5
  } = options;

  return (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return next();
    }

    try {
      const files = Array.isArray(req.files) ? req.files : Object.values(req.files);

      // Check number of files
      if (files.length > maxFiles) {
        return res.status(400).json({
          status: 'fail',
          message: `Too many files. Maximum allowed: ${maxFiles}`
        });
      }

      // Validate each file
      for (const file of files) {
        // Check file size
        if (file.size > maxFileSize) {
          return res.status(400).json({
            status: 'fail',
            message: `File ${file.name} is too large. Maximum size: ${maxFileSize / 1024 / 1024}MB`
          });
        }

        // Check MIME type
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return res.status(400).json({
            status: 'fail',
            message: `File type ${file.mimetype} is not allowed`
          });
        }

        // Check file extension
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!allowedExtensions.includes(fileExtension)) {
          return res.status(400).json({
            status: 'fail',
            message: `File extension ${fileExtension} is not allowed`
          });
        }

        // Sanitize filename
        file.name = sanitizeFilename(file.name);
      }

      next();
    } catch (error) {
      return res.status(400).json({
        status: 'fail',
        message: 'File validation failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
};

/**
 * Sanitize filename
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special characters with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 255); // Limit filename length
};

/**
 * Rate limiting per user
 */
const userRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  const userRequests = new Map();

  return (req, res, next) => {
    const userId = req.user ? req.user._id.toString() : req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create user request history
    let requests = userRequests.get(userId) || [];

    // Remove old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart);

    // Check if user has exceeded the limit
    if (requests.length >= maxRequests) {
      return res.status(429).json({
        status: 'fail',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current request
    requests.push(now);
    userRequests.set(userId, requests);

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      cleanupOldEntries(userRequests, windowStart);
    }

    next();
  };
};

/**
 * Clean up old rate limit entries
 */
const cleanupOldEntries = (userRequests, windowStart) => {
  for (const [userId, requests] of userRequests.entries()) {
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    if (validRequests.length === 0) {
      userRequests.delete(userId);
    } else {
      userRequests.set(userId, validRequests);
    }
  }
};

/**
 * Content Security Policy headers
 */
const setSecurityHeaders = (req, res, next) => {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';"
  );

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

module.exports = {
  sanitizeInputs,
  validateFileUpload,
  userRateLimit,
  setSecurityHeaders,
  sanitizeFilename,
  sanitizeValue
};