const express = require('express');
const {
  getAuditLogs,
  getResourceAuditTrail,
  getUserActivity,
  getActivitySummary,
  verifyAuditIntegrity,
  bulkVerifyIntegrity,
  exportAuditLogs
} = require('../controllers/auditController');
const { protect } = require('../middleware/auth');
const { captureAuditData } = require('../middleware/audit');

const router = express.Router();

// Apply authentication and audit data capture to all routes
router.use(protect);
router.use(captureAuditData);

// Audit log management routes (MD/IT_Admin only)
router.get('/logs', getAuditLogs);
router.get('/summary', getActivitySummary);
router.get('/export', exportAuditLogs);

// Integrity verification routes (MD/IT_Admin only)
router.get('/verify/:logId', verifyAuditIntegrity);
router.get('/verify-bulk', bulkVerifyIntegrity);

// Resource-specific audit trails
router.get('/resource/:resourceType/:resourceId', getResourceAuditTrail);

// User activity logs
router.get('/user/:userId', getUserActivity);

module.exports = router;