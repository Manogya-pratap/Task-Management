import api from './api';

const kanbanService = {
  // Get Progress board for current user (all their tasks)
  getMyKanbanBoard: async () => {
    const response = await api.get('/progressboard/my-board');
    return response.data;
  },

  // Get Progress board for a project
  getKanbanBoard: async (projectId) => {
    const response = await api.get(`/progressboard/project/${projectId}`);
    return response.data;
  },

  // Move task to different stage
  moveTaskStage: async (taskId, newStage) => {
    const response = await api.patch(`/progressboard/task/${taskId}/move`, { newStage });
    return response.data;
  },

  // Approve task completion
  approveTask: async (taskId) => {
    const response = await api.post(`/progressboard/task/${taskId}/approve`);
    return response.data;
  },

  // Reject task
  rejectTask: async (taskId, reason) => {
    const response = await api.post(`/progressboard/task/${taskId}/reject`, { reason });
    return response.data;
  },

  // Get tasks by stage
  getTasksByStage: async (stage, filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/progressboard/stage/${stage}?${params}`);
    return response.data;
  },

  // Get pending approvals
  getPendingApprovals: async () => {
    const response = await api.get('/progressboard/pending-approvals');
    return response.data;
  }
};

export default kanbanService;
