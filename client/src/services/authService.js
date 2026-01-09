import api from "./api";

class AuthService {
  // Login user
  async login(credentials) {
    try {
      const response = await api.post("/auth/login", credentials);
      const responseData = response.data;

      // Handle different response formats
      if (responseData.status === "success") {
        const token = responseData.token;
        const user = responseData.data?.user;

        if (token && user) {
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(user));
          return { success: true, user, token };
        }
      }

      return { success: false, message: "Invalid response format" };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  }

  // Register user
  async register(userData) {
    try {
      const response = await api.post("/auth/signup", userData);
      const responseData = response.data;

      // Handle different response formats
      if (responseData.status === "success") {
        const token = responseData.token;
        const user = responseData.data?.user;

        if (token && user) {
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(user));
          return { success: true, user, token };
        }
      }

      return { success: false, message: "Invalid response format" };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed",
        errors: error.response?.data?.errors || [],
      };
    }
  }

  // Logout user
  async logout() {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  // Verify token
  async verifyToken() {
    try {
      const response = await api.get("/auth/verify");
      if (response.data.isValid && response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
        return { success: true, user: response.data.user };
      }
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  // Refresh token
  async refreshToken() {
    try {
      const response = await api.post("/auth/refresh-token");
      const { token, data } = response.data;

      if (token && data.user) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(data.user));
        return { success: true, user: data.user, token };
      }

      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  // Update password
  async updatePassword(passwordData) {
    try {
      const response = await api.patch("/auth/update-password", passwordData);
      const { token, data } = response.data;

      if (token && data.user) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(data.user));
        return { success: true, user: data.user };
      }

      return { success: false, message: "Invalid response format" };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Password update failed",
        errors: error.response?.data?.errors || [],
      };
    }
  }

  // Get current user from localStorage
  getCurrentUser() {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch (error) {
      return null;
    }
  }

  // Get current token from localStorage
  getToken() {
    return localStorage.getItem("token");
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = this.getToken();
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  // Check if user has specific role
  hasRole(role) {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  // Check if user has any of the specified roles
  hasAnyRole(roles) {
    const user = this.getCurrentUser();
    return roles.includes(user?.role);
  }

  // Check if user has permission (based on role hierarchy)
  hasPermission(permission) {
    const user = this.getCurrentUser();
    if (!user) return false;

    const rolePermissions = {
      managing_director: ["*"], // All permissions
      it_admin: ["*"], // All permissions
      team_lead: [
        "view_team_data",
        "create_project",
        "assign_tasks",
        "manage_team_members",
        "view_own_tasks",
        "update_task_status",
        "view_assigned_projects",
      ],
      employee: [
        "view_own_tasks",
        "update_task_status",
        "view_assigned_projects",
      ],
    };

    const userPermissions = rolePermissions[user.role] || [];
    return (
      userPermissions.includes("*") || userPermissions.includes(permission)
    );
  }

  // Set current user in localStorage
  setCurrentUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
  }
}

const authServiceInstance = new AuthService();
export default authServiceInstance;
