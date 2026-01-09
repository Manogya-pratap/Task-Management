import React, { createContext, useContext, useEffect, useState } from "react";
import authService from "../services/authService";

// Create context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      console.log("🔄 Verifying token...");

      try {
        const token = authService.getToken();
        const storedUser = authService.getCurrentUser();

        if (token && storedUser) {
          // Verify token with server
          const result = await authService.verifyToken();

          if (result.success) {
            console.log("✅ Auth success:", result.user);
            setUser(result.user);
            setError(null);
          } else {
            console.log("❌ Auth failed: Token invalid");
            setUser(null);
            setError(null);
            // Clear invalid token
            authService.logout();
          }
        } else {
          console.log("❌ Auth failed: No token found");
          setUser(null);
          setError(null);
        }
      } catch (error) {
        console.error("❌ Auth failed:", error.response?.data || error.message);
        setUser(null);
        setError(null);
        // Clear invalid token on error
        authService.logout();
      } finally {
        console.log("🟢 Auth check finished");
        setIsLoading(false); // 🔥 THIS FIXES LOADING ISSUE
      }
    };

    // Emergency timeout fallback
    const emergencyTimeout = setTimeout(() => {
      console.warn("⚠️ Auth timeout fallback - forcing loading to false");
      setIsLoading(false);
    }, 8000);

    initializeAuth();

    return () => {
      clearTimeout(emergencyTimeout);
    };
  }, []);

  // Login function
  const login = async (credentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.login(credentials);

      if (result.success) {
        setUser(result.user);
        return { success: true, user: result.user };
      } else {
        setError(result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.register(userData);

      if (result.success) {
        setUser(result.user);
        return { success: true };
      } else {
        setError(result.message);
        return {
          success: false,
          message: result.message,
          errors: result.errors,
        };
      }
    } catch (error) {
      const message = error.response?.data?.message || "Registration failed";
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setError(null);
    }
  };

  // Update password function
  const updatePassword = async (passwordData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.updatePassword(passwordData);

      if (result.success) {
        setUser(result.user);
        return { success: true };
      } else {
        setError(result.message);
        return {
          success: false,
          message: result.message,
          errors: result.errors,
        };
      }
    } catch (error) {
      const message = error.response?.data?.message || "Password update failed";
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error function
  const clearError = () => {
    setError(null);
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  // Check if user has permission
  const hasPermission = (permission) => {
    return authService.hasPermission(permission);
  };

  // Get user's full name
  const getUserFullName = () => {
    if (!user) return "";
    return `${user.firstName} ${user.lastName}`;
  };

  // Update user profile
  const updateUser = (updatedUserData) => {
    console.log("AuthContext: Updating user:", updatedUserData);
    setUser(updatedUserData);
    // Also update stored user data
    authService.setCurrentUser(updatedUserData);
  };

  // Context value
  const value = {
    // State
    user,
    token: authService.getToken(),
    isAuthenticated: !!user,
    isLoading,
    error,

    // Actions
    login,
    register,
    logout,
    updatePassword,
    updateUser,
    clearError,

    // Utility functions
    hasRole,
    hasAnyRole,
    hasPermission,
    getUserFullName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
