import api from './api';

const projectService = {
  // Get all projects
  getAllProjects: async () => {
    const response = await api.get('/projects');
    return response.data;
  },

  // Create new project
  createProject: async (projectData) => {
    const response = await api.post('/projects', projectData);
    return response.data;
  },

  // Update project
  updateProject: async (projectId, projectData) => {
    const response = await api.patch(`/projects/${projectId}`, projectData);
    return response.data;
  },

  // Delete project
  deleteProject: async (projectId) => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },

  // Get project by ID
  getProjectById: async (projectId) => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  },

  // Get projects by user
  getProjectsByUser: async (userId) => {
    const response = await api.get(`/projects/user/${userId}`);
    return response.data;
  },

  // Assign user to project
  assignUserToProject: async (projectId, userId) => {
    const response = await api.post(`/projects/${projectId}/assign`, { userId });
    return response.data;
  },

  // Remove user from project
  removeUserFromProject: async (projectId, userId) => {
    const response = await api.delete(`/projects/${projectId}/assign/${userId}`);
    return response.data;
  }
};

export default projectService;