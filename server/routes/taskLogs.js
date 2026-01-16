const express = require('express');
const router = express.Router();
const taskLogController = require('../controllers/taskLogController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// Protect all routes
router.use(protect);

// Get my daily logs
router.get('/my-daily-logs', taskLogController.getMyDailyLogs);

// Get team's daily logs (Team Lead, MD, ADMIN only)
router.get('/team-daily-logs', 
  checkRole('TEAM_LEAD', 'MD', 'ADMIN'),
  taskLogController.getTeamDailyLogs
);

// Task-specific routes
router.post('/task/:taskId', taskLogController.createDailyUpdate);
router.get('/task/:taskId', taskLogController.getTaskLogs);
router.get('/task/:taskId/date-range', taskLogController.getLogsByDateRange);
router.get('/task/:taskId/progress-history', taskLogController.getTaskProgressHistory);

// Update/Delete specific log
router.patch('/:id', taskLogController.updateTaskLog);
router.delete('/:id', checkRole('ADMIN', 'MD'), taskLogController.deleteTaskLog);

module.exports = router;
