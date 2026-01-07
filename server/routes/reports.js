const express = require('express');
const reportsController = require('../controllers/reportsController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Generate report - accessible to team leads and above
router.post('/generate', restrictTo('team_lead', 'it_admin', 'managing_director'), reportsController.generateReport);

// Get report by ID
router.get('/:id', reportsController.getReport);

// Get all reports for user
router.get('/', reportsController.getUserReports);

// Delete report
router.delete('/:id', restrictTo('team_lead', 'it_admin', 'managing_director'), reportsController.deleteReport);

module.exports = router;