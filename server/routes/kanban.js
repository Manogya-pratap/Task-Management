const express = require('express');
const router = express.Router();
const kanbanController = require('../controllers/kanbanController');
const { protect } = require('../middleware/auth');
const { checkRole, checkApprovalPermission } = require('../middleware/roleCheck');

// Protect all routes
router.use(protect);

// Get Kanban board for current user (all their tasks)
router.get('/my-board', kanbanController.getMyKanbanBoard);

// Get Kanban board for a project
router.get('/project/:projectId', kanbanController.getKanbanBoard);

// Get tasks by stage
router.get('/stage/:stage', kanbanController.getTasksByStage);

// Get tasks pending approval
router.get('/pending-approvals', 
  checkRole('TEAM_LEAD', 'MD', 'ADMIN'),
  kanbanController.getPendingApprovals
);

// Move task to different stage
router.patch('/task/:taskId/move', kanbanController.moveTaskStage);

// Approve task completion (Review → Done)
router.post('/task/:taskId/approve', 
  checkApprovalPermission,
  kanbanController.approveTaskCompletion
);

// Reject task (move back from Review)
router.post('/task/:taskId/reject',
  checkApprovalPermission,
  kanbanController.rejectTask
);

module.exports = router;
