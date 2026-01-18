import api from './api';

const userService = {
  // Get all users
  getAllUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  // Create new user
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  // Update user
  updateUser: async (userId, userData) => {
    const response = await api.patch(`/users/${userId}`, userData);
    return response.data;
  },

  // Deactivate user
  deactivateUser: async (userId) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },

  // Reactivate user
  reactivateUser: async (userId) => {
    const response = await api.patch(`/users/${userId}/reactivate`);
    return response.data;
  },

  // Delete user permanently
  deleteUserPermanently: async (userId) => {
    const response = await api.delete(`/users/${userId}/permanent`);
    return response.data;
  },

  // Get user by ID
  getUserById: async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  }
};

export default userService;