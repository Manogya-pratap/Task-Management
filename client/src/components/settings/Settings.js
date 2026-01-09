import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";

const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    notifications: {
      email: true,
      push: true,
      taskDeadlines: true,
      projectUpdates: true,
      teamMessages: true,
    },
    preferences: {
      theme: "light",
      language: "en",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
      dashboardLayout: "default",
    },
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const departments = [
    "IT Development",
    "Human Resources",
    "Finance",
    "Marketing",
    "Operations",
    "Sales",
  ];

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        department: user.department || "",
        notifications: user.notifications || {
          email: true,
          push: true,
          taskDeadlines: true,
          projectUpdates: true,
          teamMessages: true,
        },
        preferences: user.preferences || {
          theme: "light",
          language: "en",
          timezone: "UTC",
          dateFormat: "MM/DD/YYYY",
          dashboardLayout: "default",
        },
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.includes(".")) {
      const [section, field] = name.split(".");
      setProfileData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: type === "checkbox" ? checked : value,
        },
      }));
    } else {
      setProfileData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log("Settings: Attempting to update profile");
    console.log("Settings: User ID:", user._id);
    console.log("Settings: Profile data:", profileData);

    try {
      const response = await api.patch(`/users/${user._id}`, profileData);
      console.log("Settings: Update response:", response.data);

      // Update user in context
      if (response.data.data) {
        updateUser(response.data.data);
        setSuccess("Profile updated successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error("No user data returned from server");
      }
    } catch (err) {
      console.error("Settings: Update error:", err);
      console.error("Settings: Error response:", err.response?.data);
      setError(err.response?.data?.message || "Failed to update profile");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password) => {
    const errors = [];

    if (password.length < 6) {
      errors.push("Password must be at least 6 characters long");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    return errors;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (!passwordData.currentPassword) {
      setError("Current password is required");
      return;
    }

    if (!passwordData.newPassword) {
      setError("New password is required");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    const passwordErrors = validatePassword(passwordData.newPassword);
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join(", "));
      return;
    }

    setLoading(true);
    setError(null);

    console.log("Settings: Attempting to update password");
    console.log("Settings: Password validation passed");

    try {
      const response = await api.patch("/auth/update-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      console.log("Settings: Password update response:", response.data);

      setSuccess("Password updated successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Settings: Password update error:", err);
      console.error("Settings: Password error response:", err.response?.data);

      // Handle validation errors from server
      if (err.response?.data?.errors) {
        const serverErrors = err.response.data.errors
          .map((error) => error.msg || error.message)
          .join(", ");
        setError(serverErrors);
      } else {
        setError(err.response?.data?.message || "Failed to update password");
      }

      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users/export/data");

      console.log("Export response:", response);

      // Create download link
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `user-data-${response.data?.profile?.username || "user"}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess("Data exported successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Export error:", error);
      setError(error.response?.data?.message || "Failed to export data");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleViewActivityLog = () => {
    // Navigate to user-specific activity log
    console.log(
      "Settings: Navigating to user activity log for user:",
      user._id
    );
    window.location.href = `/audit/user/${user._id}`;
  };

  const handleSecuritySettings = () => {
    // Navigate to security settings or show modal
    setSuccess("Security settings coming soon!");
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSignOutAllDevices = async () => {
    try {
      setLoading(true);
      await api.post("/auth/logout-all");
      setSuccess("Signed out from all devices!");

      // Clear local auth state and redirect to login
      setTimeout(async () => {
        await logout(); // Clear local auth state
        setSuccess(null);
        window.location.href = "/login";
      }, 2000);
    } catch (error) {
      setError("Failed to sign out from all devices");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="fas fa-cog me-2" style={{ color: "#800020" }}></i>
          Settings
        </h2>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle me-2"></i>
          {success}
        </div>
      )}

      <div className="row">
        <div className="col-lg-8">
          {/* Profile Settings */}
          <div className="card mb-4">
            <div
              className="card-header"
              style={{ backgroundColor: "#800020", color: "white" }}
            >
              <h5 className="mb-0 text-white">
                <i className="fas fa-user me-2 text-white"></i>
                Profile Settings
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleProfileSubmit}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleProfileChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="lastName"
                        value={profileData.lastName}
                        onChange={handleProfileChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={profileData.email}
                        onChange={handleProfileChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleProfileChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Department</label>
                  <select
                    className="form-select"
                    name="department"
                    value={profileData.department}
                    onChange={handleProfileChange}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn text-white"
                    style={{ backgroundColor: "#800020" }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        >
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        Updating...
                      </>
                    ) : (
                      "Update Profile"
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    <i className="fas fa-key me-2"></i>
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="card">
            <div
              className="card-header"
              style={{ backgroundColor: "#800020", color: "white" }}
            >
              <h6 className="mb-0 text-white">Quick Actions</h6>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={handleExportData}
                >
                  <i className="fas fa-download me-2"></i>
                  Export My Data
                </button>
                <button
                  className="btn btn-outline-info btn-sm"
                  onClick={handleViewActivityLog}
                >
                  <i className="fas fa-history me-2"></i>
                  View Activity Log
                </button>
                <button
                  className="btn btn-outline-warning btn-sm"
                  onClick={handleSecuritySettings}
                >
                  <i className="fas fa-shield-alt me-2"></i>
                  Security Settings
                </button>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleSignOutAllDevices}
                >
                  <i className="fas fa-sign-out-alt me-2"></i>
                  Sign Out All Devices
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          {/* Account Info */}
          <div className="card mb-4">
            <div
              className="card-header"
              style={{ backgroundColor: "#800020", color: "white" }}
            >
              <h6 className="mb-0 text-white">Account Information</h6>
            </div>
            <div className="card-body">
              <div className="text-center mb-3">
                <div
                  className="avatar-circle mx-auto mb-2"
                  style={{
                    width: "80px",
                    height: "80px",
                    fontSize: "24px",
                    background:
                      "linear-gradient(135deg, #800020 0%, #A0002A 100%)",
                    color: "white",
                  }}
                >
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </div>
                <h6>
                  {user?.firstName} {user?.lastName}
                </h6>
                <span
                  className="badge text-white"
                  style={{ backgroundColor: "#800020" }}
                >
                  {user?.role?.replace("_", " ").toUpperCase()}
                </span>
              </div>

              <div className="small">
                <div className="d-flex justify-content-between mb-2">
                  <span>Username:</span>
                  <strong>{user?.username}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Member Since:</span>
                  <strong>
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "N/A"}
                  </strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Status:</span>
                  <span
                    className={`badge ${user?.isActive ? "bg-success" : "bg-danger"}`}
                  >
                    {user?.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <div
        className={`modal fade ${showPasswordModal ? "show" : ""}`}
        style={{ display: showPasswordModal ? "block" : "none" }}
        tabIndex="-1"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Change Password</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowPasswordModal(false)}
              ></button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="form-control"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength="6"
                  />
                  <div className="mt-2">
                    <small className="text-muted">Password must contain:</small>
                    <ul className="small text-muted mb-0 ps-3 mt-1">
                      <li
                        className={
                          passwordData.newPassword &&
                          passwordData.newPassword.length >= 6
                            ? "text-success"
                            : ""
                        }
                      >
                        At least 6 characters
                      </li>
                      <li
                        className={
                          passwordData.newPassword &&
                          /[a-z]/.test(passwordData.newPassword)
                            ? "text-success"
                            : ""
                        }
                      >
                        At least one lowercase letter
                      </li>
                      <li
                        className={
                          passwordData.newPassword &&
                          /[A-Z]/.test(passwordData.newPassword)
                            ? "text-success"
                            : ""
                        }
                      >
                        At least one uppercase letter
                      </li>
                      <li
                        className={
                          passwordData.newPassword &&
                          /\d/.test(passwordData.newPassword)
                            ? "text-success"
                            : ""
                        }
                      >
                        At least one number
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength="6"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn text-white"
                  style={{ backgroundColor: "#800020" }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      >
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {showPasswordModal && <div className="modal-backdrop fade show"></div>}

      <style>{`
        .avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default Settings;
