const crypto = require('crypto');

/**
 * Encryption utility for sensitive data
 */

// Get encryption key from environment or generate a default one for development
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.scryptSync('default-key', 'salt', 32);
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive text data
 * @param {string} text - Text to encrypt
 * @returns {object} - Object containing encrypted data and metadata
 */
const encrypt = (text) => {
  if (!text) return null;
  
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    cipher.setAAD(Buffer.from('additional-data'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    throw new Error('Encryption failed: ' + error.message);
  }
};

/**
 * Decrypt sensitive text data
 * @param {object} encryptedData - Object containing encrypted data and metadata
 * @returns {string} - Decrypted text
 */
const decrypt = (encryptedData) => {
  if (!encryptedData || !encryptedData.encrypted) return null;
  
  try {
    const { encrypted, iv, authTag } = encryptedData;
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    
    decipher.setAAD(Buffer.from('additional-data'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: ' + error.message);
  }
};

/**
 * Hash sensitive data (one-way)
 * @param {string} data - Data to hash
 * @returns {string} - Hashed data
 */
const hashData = (data) => {
  if (!data) return null;
  
  try {
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch (error) {
    throw new Error('Hashing failed: ' + error.message);
  }
};

/**
 * Generate secure random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} - Random token in hex format
 */
const generateSecureToken = (length = 32) => {
  try {
    return crypto.randomBytes(length).toString('hex');
  } catch (error) {
    throw new Error('Token generation failed: ' + error.message);
  }
};

/**
 * Encrypt object fields that contain sensitive data
 * @param {object} obj - Object to encrypt
 * @param {array} sensitiveFields - Array of field names to encrypt
 * @returns {object} - Object with encrypted sensitive fields
 */
const encryptSensitiveFields = (obj, sensitiveFields = []) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  
  sensitiveFields.forEach(field => {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field]);
    }
  });
  
  return result;
};

/**
 * Decrypt object fields that contain encrypted data
 * @param {object} obj - Object to decrypt
 * @param {array} sensitiveFields - Array of field names to decrypt
 * @returns {object} - Object with decrypted sensitive fields
 */
const decryptSensitiveFields = (obj, sensitiveFields = []) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  
  sensitiveFields.forEach(field => {
    if (result[field] && typeof result[field] === 'object') {
      try {
        result[field] = decrypt(result[field]);
      } catch (error) {
        // If decryption fails, leave the field as is (might be plain text)
        console.warn(`Failed to decrypt field ${field}:`, error.message);
      }
    }
  });
  
  return result;
};

/**
 * Sanitize input to prevent injection attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that could break SQL/NoSQL queries
    .replace(/[\\]/g, '') // Remove backslashes
    .trim(); // Remove leading/trailing whitespace
};

/**
 * Validate and sanitize object recursively
 * @param {object} obj - Object to sanitize
 * @param {array} excludeFields - Fields to exclude from sanitization
 * @returns {object} - Sanitized object
 */
const sanitizeObject = (obj, excludeFields = []) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = {};
  
  Object.keys(obj).forEach(key => {
    if (excludeFields.includes(key)) {
      result[key] = obj[key];
    } else if (typeof obj[key] === 'string') {
      result[key] = sanitizeInput(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      result[key] = sanitizeObject(obj[key], excludeFields);
    } else {
      result[key] = obj[key];
    }
  });
  
  return result;
};

module.exports = {
  encrypt,
  decrypt,
  hashData,
  generateSecureToken,
  encryptSensitiveFields,
  decryptSensitiveFields,
  sanitizeInput,
  sanitizeObject
};