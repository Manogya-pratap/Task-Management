import api from './api';

const departmentService = {
  // Get all departments
  getAllDepartments: async () => {
    const response = await api.get('/departments');
    return response.data;
  },

  // Create new department
  createDepartment: async (departmentData) => {
    const response = await api.post('/departments', departmentData);
    return response.data;
  },

  // Update department
  updateDepartment: async (departmentId, departmentData) => {
    const response = await api.patch(`/departments/${departmentId}`, departmentData);
    return response.data;
  },

  // Delete department
  deleteDepartment: async (departmentId) => {
    const response = await api.delete(`/departments/${departmentId}`);
    return response.data;
  },

  // Get department by ID
  getDepartmentById: async (departmentId) => {
    const response = await api.get(`/departments/${departmentId}`);
    return response.data;
  }
};

export default departmentService;