import api from './api';

const taskLogService = {
  // Create daily update
  createDailyUpdate: async (taskId, data) => {
    const response = await api.post(`/task-logs/task/${taskId}`, data);
    return response.data;
  },

  // Get task logs
  getTaskLogs: async (taskId, limit = 30) => {
    const response = await api.get(`/task-logs/task/${taskId}?limit=${limit}`);
    return response.data;
  },

  // Get task logs by date range
  getLogsByDateRange: async (taskId, startDate, endDate) => {
    const response = await api.get(
      `/task-logs/task/${taskId}/date-range?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  },

  // Get task progress history
  getProgressHistory: async (taskId) => {
    const response = await api.get(`/task-logs/task/${taskId}/progress-history`);
    return response.data;
  },

  // Get my daily logs
  getMyDailyLogs: async (date) => {
    const params = date ? `?date=${date}` : '';
    const response = await api.get(`/task-logs/my-daily-logs${params}`);
    return response.data;
  },

  // Get team daily logs
  getTeamDailyLogs: async (date) => {
    const params = date ? `?date=${date}` : '';
    const response = await api.get(`/task-logs/team-daily-logs${params}`);
    return response.data;
  },

  // Update task log
  updateTaskLog: async (logId, data) => {
    const response = await api.patch(`/task-logs/${logId}`, data);
    return response.data;
  },

  // Delete task log
  deleteTaskLog: async (logId) => {
    const response = await api.delete(`/task-logs/${logId}`);
    return response.data;
  }
};

export default taskLogService;
