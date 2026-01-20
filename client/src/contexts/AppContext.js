import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

// Initial state
const initialState = {
  // Global data
  projects: [],
  tasks: [],
  teams: [],
  users: [],

  // Loading states
  loading: {
    projects: false,
    tasks: false,
    teams: false,
    users: false,
    global: false,
  },

  // Error states
  errors: {
    projects: null,
    tasks: null,
    teams: null,
    users: null,
    global: null,
  },

  // UI state
  ui: {
    sidebarCollapsed: false,
    theme: "light",
    notifications: [],
    activeProject: null,
    filters: {
      tasks: {
        status: "all",
        assignee: "all",
        project: "all",
      },
      projects: {
        status: "all",
        team: "all",
      },
    },
  },

  // Cache timestamps
  lastFetch: {
    projects: null,
    tasks: null,
    teams: null,
    users: null,
  },
};

// Action types
const APP_ACTIONS = {
  // Data actions
  SET_PROJECTS: "SET_PROJECTS",
  SET_TASKS: "SET_TASKS",
  SET_TEAMS: "SET_TEAMS",
  SET_USERS: "SET_USERS",

  // Individual item actions
  ADD_PROJECT: "ADD_PROJECT",
  UPDATE_PROJECT: "UPDATE_PROJECT",
  DELETE_PROJECT: "DELETE_PROJECT",

  ADD_TASK: "ADD_TASK",
  UPDATE_TASK: "UPDATE_TASK",
  DELETE_TASK: "DELETE_TASK",

  ADD_TEAM: "ADD_TEAM",
  UPDATE_TEAM: "UPDATE_TEAM",
  DELETE_TEAM: "DELETE_TEAM",

  // Loading actions
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",

  // UI actions
  TOGGLE_SIDEBAR: "TOGGLE_SIDEBAR",
  SET_THEME: "SET_THEME",
  ADD_NOTIFICATION: "ADD_NOTIFICATION",
  REMOVE_NOTIFICATION: "REMOVE_NOTIFICATION",
  SET_ACTIVE_PROJECT: "SET_ACTIVE_PROJECT",
  SET_FILTER: "SET_FILTER",

  // Cache actions
  SET_LAST_FETCH: "SET_LAST_FETCH",
  INVALIDATE_CACHE: "INVALIDATE_CACHE",
};

// Reducer function
const appReducer = (state, action) => {
  switch (action.type) {
    case APP_ACTIONS.SET_PROJECTS:
      return {
        ...state,
        projects: action.payload,
        loading: { ...state.loading, projects: false },
        errors: { ...state.errors, projects: null },
        lastFetch: { ...state.lastFetch, projects: new Date() },
      };

    case APP_ACTIONS.SET_TASKS:
      return {
        ...state,
        tasks: action.payload,
        loading: { ...state.loading, tasks: false },
        errors: { ...state.errors, tasks: null },
        lastFetch: { ...state.lastFetch, tasks: new Date() },
      };

    case APP_ACTIONS.SET_TEAMS:
      return {
        ...state,
        teams: action.payload,
        loading: { ...state.loading, teams: false },
        errors: { ...state.errors, teams: null },
        lastFetch: { ...state.lastFetch, teams: new Date() },
      };

    case APP_ACTIONS.SET_USERS:
      return {
        ...state,
        users: action.payload,
        loading: { ...state.loading, users: false },
        errors: { ...state.errors, users: null },
        lastFetch: { ...state.lastFetch, users: new Date() },
      };

    case APP_ACTIONS.ADD_PROJECT:
      return {
        ...state,
        projects: [...state.projects, action.payload],
      };

    case APP_ACTIONS.UPDATE_PROJECT:
      return {
        ...state,
        projects: state.projects.map((project) =>
          project._id === action.payload._id ? action.payload : project
        ),
      };

    case APP_ACTIONS.DELETE_PROJECT:
      return {
        ...state,
        projects: state.projects.filter(
          (project) => project._id !== action.payload
        ),
      };

    case APP_ACTIONS.ADD_TASK:
      return {
        ...state,
        tasks: [...state.tasks, action.payload],
      };

    case APP_ACTIONS.UPDATE_TASK:
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task._id === action.payload._id ? action.payload : task
        ),
      };

    case APP_ACTIONS.DELETE_TASK:
      return {
        ...state,
        tasks: state.tasks.filter((task) => task._id !== action.payload),
      };

    case APP_ACTIONS.ADD_TEAM:
      return {
        ...state,
        teams: [...state.teams, action.payload],
      };

    case APP_ACTIONS.UPDATE_TEAM:
      return {
        ...state,
        teams: state.teams.map((team) =>
          team._id === action.payload._id ? action.payload : team
        ),
      };

    case APP_ACTIONS.DELETE_TEAM:
      return {
        ...state,
        teams: state.teams.filter((team) => team._id !== action.payload),
      };

    case APP_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value,
        },
      };

    case APP_ACTIONS.SET_ERROR:
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.value },
        loading: { ...state.loading, [action.payload.key]: false },
      };

    case APP_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        errors: { ...state.errors, [action.payload]: null },
      };

    case APP_ACTIONS.TOGGLE_SIDEBAR:
      return {
        ...state,
        ui: { ...state.ui, sidebarCollapsed: !state.ui.sidebarCollapsed },
      };

    case APP_ACTIONS.SET_THEME:
      return {
        ...state,
        ui: { ...state.ui, theme: action.payload },
      };

    case APP_ACTIONS.ADD_NOTIFICATION:
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [
            ...state.ui.notifications,
            {
              id: Date.now(),
              ...action.payload,
            },
          ],
        },
      };

    case APP_ACTIONS.REMOVE_NOTIFICATION:
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(
            (n) => n.id !== action.payload
          ),
        },
      };

    case APP_ACTIONS.SET_ACTIVE_PROJECT:
      return {
        ...state,
        ui: { ...state.ui, activeProject: action.payload },
      };

    case APP_ACTIONS.SET_FILTER:
      return {
        ...state,
        ui: {
          ...state.ui,
          filters: {
            ...state.ui.filters,
            [action.payload.type]: {
              ...state.ui.filters[action.payload.type],
              [action.payload.key]: action.payload.value,
            },
          },
        },
      };

    case APP_ACTIONS.SET_LAST_FETCH:
      return {
        ...state,
        lastFetch: {
          ...state.lastFetch,
          [action.payload.key]: action.payload.value,
        },
      };

    case APP_ACTIONS.INVALIDATE_CACHE:
      return {
        ...state,
        lastFetch: { ...state.lastFetch, [action.payload]: null },
      };

    default:
      return state;
  }
};

// Create context
const AppContext = createContext();

// Custom hook to use app context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

// App provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { isAuthenticated, user } = useAuth();

  // Cache duration (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;

  // Debounce ref to prevent rapid API calls
  const fetchDebounceRef = useRef(null);

  // Use refs to track last fetch times without causing re-renders
  const lastFetchRef = useRef({});
  const tasksLastFetchRef = useRef(null);

  // Check if data needs refresh
  const needsRefresh = useCallback(
    (key) => {
      const lastFetch = lastFetchRef.current[key];
      return !lastFetch || Date.now() - lastFetch > CACHE_DURATION;
    },
    [CACHE_DURATION]
  );

  // Fetch projects
  const fetchProjects = useCallback(
    async (force = false) => {
      // Clear any existing debounce
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }

      // Debounce the fetch call
      return new Promise((resolve, reject) => {
        fetchDebounceRef.current = setTimeout(async () => {
          if (!force && state.projects.length > 0) {
            // Only fetch if it's been more than 5 minutes since last fetch
            const lastFetch = state.lastFetch.projects;
            if (
              lastFetch &&
              Date.now() - lastFetch.getTime() < CACHE_DURATION
            ) {
              resolve(state.projects);
              return;
            }
          }

          try {
            dispatch({
              type: APP_ACTIONS.SET_LOADING,
              payload: { key: "projects", value: true },
            });
            dispatch({
              type: APP_ACTIONS.CLEAR_ERROR,
              payload: { key: "projects" },
            });

            let response;
            const params = {};

            // Use role-specific endpoint for employees
            if (user?.role === "employee") {
              console.log(
                "AppContext: Using /projects/my endpoint for employee"
              );
              response = await api.get("/projects/my", { params });
            } else {
              console.log(
                "AppContext: Using /projects endpoint for admin/team lead"
              );
              response = await api.get("/projects", { params });
            }

            const projects =
              response.data.data?.projects || response.data.projects || [];
            console.log(
              "AppContext: Fetched",
              projects.length,
              "projects for",
              user?.role
            );

            dispatch({
              type: APP_ACTIONS.SET_PROJECTS,
              payload: projects,
            });

            resolve(projects);
          } catch (error) {
            console.error("AppContext: Error fetching projects:", error);
            dispatch({
              type: APP_ACTIONS.SET_ERROR,
              payload: {
                key: "projects",
                value:
                  error.response?.data?.message || "Failed to fetch projects",
              },
            });
            reject(error);
          } finally {
            dispatch({
              type: APP_ACTIONS.SET_LOADING,
              payload: { key: "projects", value: false },
            });
          }
        }, 300); // 300ms debounce
      });
    },
    [user?.role] // Removed state.projects.length to prevent infinite loops
  );

  const fetchTasks = useCallback(
    async (force = false, projectId = null) => {
      // Clear any existing debounce
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }

      // Debounce the fetch call
      return new Promise((resolve, reject) => {
        fetchDebounceRef.current = setTimeout(async () => {
          if (!force && state.tasks.length > 0 && !projectId) {
            // Only fetch if it's been more than 5 minutes since last fetch
            const lastFetch = tasksLastFetchRef.current;
            if (lastFetch && Date.now() - lastFetch < CACHE_DURATION) {
              resolve(state.tasks);
              return;
            }
          }

          try {
            dispatch({
              type: APP_ACTIONS.SET_LOADING,
              payload: { key: "tasks", value: true },
            });
            dispatch({
              type: APP_ACTIONS.CLEAR_ERROR,
              payload: { key: "tasks" },
            });

            let response;
            const params = projectId ? { projectId } : {};

            // Use role-specific endpoint for employees
            if (user?.role === "employee" && !projectId) {
              console.log("AppContext: Using /tasks/my endpoint for employee");
              response = await api.get("/tasks/my", { params });
            } else {
              console.log(
                "AppContext: Using /tasks endpoint for admin/team lead"
              );
              response = await api.get("/tasks", { params });
            }

            const tasks =
              response.data.data?.tasks || response.data.tasks || [];
            console.log(
              "AppContext: Fetched",
              tasks.length,
              "tasks for",
              user?.role
            );
            
            // Debug task status distribution
            const statusCounts = tasks.reduce((acc, task) => {
              acc[task.status] = (acc[task.status] || 0) + 1;
              return acc;
            }, {});
            console.log("AppContext: Task status distribution:", statusCounts);

            // Update the ref with current timestamp
            tasksLastFetchRef.current = Date.now();

            dispatch({
              type: APP_ACTIONS.SET_TASKS,
              payload: tasks,
            });

            resolve(tasks);
          } catch (error) {
            console.error("AppContext: Error fetching tasks:", error);
            dispatch({
              type: APP_ACTIONS.SET_ERROR,
              payload: {
                key: "tasks",
                value: error.response?.data?.message || "Failed to fetch tasks",
              },
            });
            reject(error);
          } finally {
            dispatch({
              type: APP_ACTIONS.SET_LOADING,
              payload: { key: "tasks", value: false },
            });
          }
        }, 300); // 300ms debounce
      });
    },
    [user?.role, state.tasks.length]
  );

  // Fetch teams
  const fetchTeams = useCallback(
    async (force = false) => {
      if (!force && !needsRefresh("teams") && state.teams.length > 0) {
        return;
      }

      try {
        dispatch({
          type: APP_ACTIONS.SET_LOADING,
          payload: { key: "teams", value: true },
        });
        const response = await api.get("/teams");
        dispatch({
          type: APP_ACTIONS.SET_TEAMS,
          payload: response.data.data?.teams || response.data.teams || [],
        });
      } catch (error) {
        dispatch({
          type: APP_ACTIONS.SET_ERROR,
          payload: {
            key: "teams",
            value: error.response?.data?.message || "Failed to fetch teams",
          },
        });
      }
    },
    [needsRefresh]
  );

  // Fetch users (admin only)
  const fetchUsers = useCallback(
    async (force = false) => {
      if (!user || !["managing_director", "it_admin"].includes(user.role)) {
        return;
      }

      if (!force && !needsRefresh("users") && state.users.length > 0) {
        return;
      }

      try {
        dispatch({
          type: APP_ACTIONS.SET_LOADING,
          payload: { key: "users", value: true },
        });
        const response = await api.get("/users");
        dispatch({
          type: APP_ACTIONS.SET_USERS,
          payload: response.data.data?.users || response.data.users || [],
        });
      } catch (error) {
        dispatch({
          type: APP_ACTIONS.SET_ERROR,
          payload: {
            key: "users",
            value: error.response?.data?.message || "Failed to fetch users",
          },
        });
      }
    },
    [user, needsRefresh]
  );

  // Fetch all data with lazy loading
  const fetchAllData = useCallback(
    async (force = false) => {
      if (!isAuthenticated) return;

      console.log("AppContext: fetchAllData called, force:", force);

      try {
        // Lazy load data sequentially to prevent server overload
        const results = [];

        // First fetch projects (essential for dashboard)
        try {
          const projects = await fetchProjects(force);
          results.push({ type: "projects", data: projects, success: true });
        } catch (error) {
          results.push({
            type: "projects",
            error: error.message,
            success: false,
          });
        }

        // Then fetch teams (less critical)
        try {
          const teams = await fetchTeams(force);
          results.push({ type: "teams", data: teams, success: true });
        } catch (error) {
          results.push({ type: "teams", error: error.message, success: false });
        }

        // Finally fetch users (admin only, least critical)
        try {
          const users = await fetchUsers(force);
          results.push({ type: "users", data: users, success: true });
        } catch (error) {
          results.push({ type: "users", error: error.message, success: false });
        }

        // Fetch tasks last (most data-heavy)
        try {
          const tasks = await fetchTasks(force);
          results.push({ type: "tasks", data: tasks, success: true });
        } catch (error) {
          results.push({ type: "tasks", error: error.message, success: false });
        }

        console.log(
          "AppContext: fetchAllData completed with results:",
          results
        );
        return results;
      } catch (error) {
        console.error("AppContext: fetchAllData failed:", error);
        throw error;
      }
    },
    [isAuthenticated, fetchProjects, fetchTasks, fetchTeams, fetchUsers]
  );

  // Auto-fetch data when authenticated (only once)
  useEffect(() => {
    if (isAuthenticated) {
      console.log("AppContext: User authenticated, fetching initial data");
      fetchAllData();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // CRUD operations
  const createProject = async (projectData) => {
    try {
      const response = await api.post("/projects", projectData);
      dispatch({
        type: APP_ACTIONS.ADD_PROJECT,
        payload: response.data.data.project,
      });
      addNotification({
        type: "success",
        message: "Project created successfully",
      });
      return { success: true, data: response.data.data.project };
    } catch (error) {
      addNotification({
        type: "error",
        message: error.response?.data?.message || "Failed to create project",
      });
      return { success: false, error: error.response?.data?.message };
    }
  };

  const updateProject = async (projectId, projectData) => {
    try {
      const response = await api.put(`/projects/${projectId}`, projectData);
      dispatch({
        type: APP_ACTIONS.UPDATE_PROJECT,
        payload: response.data.data.project,
      });
      addNotification({
        type: "success",
        message: "Project updated successfully",
      });
      return { success: true, data: response.data.data.project };
    } catch (error) {
      addNotification({
        type: "error",
        message: error.response?.data?.message || "Failed to update project",
      });
      return { success: false, error: error.response?.data?.message };
    }
  };

  const deleteProject = async (projectId) => {
    try {
      await api.delete(`/projects/${projectId}`);
      dispatch({ type: APP_ACTIONS.DELETE_PROJECT, payload: projectId });
      addNotification({
        type: "success",
        message: "Project deleted successfully",
      });
      return { success: true };
    } catch (error) {
      addNotification({
        type: "error",
        message: error.response?.data?.message || "Failed to delete project",
      });
      return { success: false, error: error.response?.data?.message };
    }
  };

  const createTask = async (taskData) => {
    try {
      console.log("AppContext: createTask called with:", taskData);
      console.log("AppContext: User role:", user?.role);

      let response;

      // Use personal task endpoint for employees creating tasks without projects
      if (user?.role === "employee" && !taskData.projectId) {
        console.log("AppContext: Using personal task endpoint");
        response = await api.post("/tasks/personal", taskData);
      } else {
        console.log("AppContext: Using regular task endpoint");
        response = await api.post("/tasks", taskData);
      }

      dispatch({
        type: APP_ACTIONS.ADD_TASK,
        payload: response.data.data.task,
      });
      addNotification({
        type: "success",
        message: "Task created successfully",
      });
      return { success: true, data: response.data.data.task };
    } catch (error) {
      console.error("AppContext: createTask error:", error);
      addNotification({
        type: "error",
        message: error.response?.data?.message || "Failed to create task",
      });
      return { success: false, error: error.response?.data?.message };
    }
  };

  const updateTask = async (taskId, taskData) => {
    try {
      const response = await api.put(`/tasks/${taskId}`, taskData);
      dispatch({
        type: APP_ACTIONS.UPDATE_TASK,
        payload: response.data.data.task,
      });
      addNotification({
        type: "success",
        message: "Task updated successfully",
      });
      return { success: true, data: response.data.data.task };
    } catch (error) {
      addNotification({
        type: "error",
        message: error.response?.data?.message || "Failed to update task",
      });
      return { success: false, error: error.response?.data?.message };
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const response = await api.patch(`/tasks/${taskId}/status`, { status });
      dispatch({
        type: APP_ACTIONS.UPDATE_TASK,
        payload: response.data.data.task,
      });
      addNotification({
        type: "success",
        message: "Task status updated successfully",
      });
      return { success: true, data: response.data.data.task };
    } catch (error) {
      addNotification({
        type: "error",
        message:
          error.response?.data?.message || "Failed to update task status",
      });
      return { success: false, error: error.response?.data?.message };
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      dispatch({ type: APP_ACTIONS.DELETE_TASK, payload: taskId });
      addNotification({
        type: "success",
        message: "Task deleted successfully",
      });
      return { success: true };
    } catch (error) {
      addNotification({
        type: "error",
        message: error.response?.data?.message || "Failed to delete task",
      });
      return { success: false, error: error.response?.data?.message };
    }
  };

  // UI actions
  const toggleSidebar = () => {
    dispatch({ type: APP_ACTIONS.TOGGLE_SIDEBAR });
  };

  const setTheme = (theme) => {
    dispatch({ type: APP_ACTIONS.SET_THEME, payload: theme });
    localStorage.setItem("theme", theme);
  };

  const addNotification = (notification) => {
    const notificationId = notification.id || Date.now();
    const notificationWithId = { ...notification, id: notificationId };

    dispatch({
      type: APP_ACTIONS.ADD_NOTIFICATION,
      payload: notificationWithId,
    });

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      removeNotification(notificationId);
    }, 5000);
  };

  const removeNotification = (id) => {
    dispatch({ type: APP_ACTIONS.REMOVE_NOTIFICATION, payload: id });
  };

  const setActiveProject = (projectId) => {
    dispatch({ type: APP_ACTIONS.SET_ACTIVE_PROJECT, payload: projectId });
  };

  const setFilter = (type, key, value) => {
    dispatch({ type: APP_ACTIONS.SET_FILTER, payload: { type, key, value } });
  };

  // Filtered data getters
  const getFilteredTasks = () => {
    let filtered = state.tasks;
    const filters = state.ui.filters.tasks;

    if (filters.status !== "all") {
      filtered = filtered.filter((task) => task.status === filters.status);
    }

    if (filters.assignee !== "all") {
      filtered = filtered.filter(
        (task) => task.assignedTo?._id === filters.assignee
      );
    }

    if (filters.project !== "all") {
      filtered = filtered.filter((task) => task.projectId === filters.project);
    }

    return filtered;
  };

  const getFilteredProjects = () => {
    let filtered = state.projects;
    const filters = state.ui.filters.projects;

    if (filters.status !== "all") {
      filtered = filtered.filter(
        (project) => project.status === filters.status
      );
    }

    if (filters.team !== "all") {
      filtered = filtered.filter((project) => project.teamId === filters.team);
    }

    return filtered;
  };

  // Context value
  const value = {
    // State
    ...state,

    // Data fetching
    fetchProjects,
    fetchTasks,
    fetchTeams,
    fetchUsers,
    fetchAllData,

    // CRUD operations
    createProject,
    updateProject,
    deleteProject,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,

    // UI actions
    toggleSidebar,
    setTheme,
    addNotification,
    removeNotification,
    setActiveProject,
    setFilter,

    // Filtered data
    getFilteredTasks,
    getFilteredProjects,

    // Utility
    needsRefresh,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;
