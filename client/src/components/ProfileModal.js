import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import api from "../services/api";

const ProfileModal = ({
  show,
  onHide,
  user: targetUser,
  isEditMode = false,
  onEditModeChange,
}) => {
  const { user: currentUser, updateUser } = useAuth();
  const { fetchUsers } = useApp(); // eslint-disable-line no-unused-vars
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    role: "",
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isOwnProfile = !targetUser || targetUser._id === currentUser._id;
  const canEdit =
    currentUser.role === "managing_director" ||
    currentUser.role === "it_admin" ||
    (currentUser.role === "team_lead" && isOwnProfile);

  useEffect(() => {
    if (targetUser) {
      setFormData({
        firstName: targetUser.firstName || "",
        lastName: targetUser.lastName || "",
        email: targetUser.email || "",
        department: targetUser.department || "",
        role: targetUser.role || "",
        isActive: targetUser.isActive !== false,
      });
    } else if (currentUser) {
      setFormData({
        firstName: currentUser.firstName || "",
        lastName: currentUser.lastName || "",
        email: currentUser.email || "",
        department: currentUser.department || "",
        role: currentUser.role || "",
        isActive: currentUser.isActive !== false,
      });
    }
  }, [targetUser, currentUser]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const userId = targetUser?._id || currentUser._id;
      const response = await api.put(`/users/${userId}`, formData);

      if (response.data.success) {
        setSuccess("Profile updated successfully!");

        // Update current user if editing own profile
        if (isOwnProfile) {
          await updateUser(response.data.data);
        }

        // Refresh users list if admin
        if (
          currentUser.role === "managing_director" ||
          currentUser.role === "it_admin"
        ) {
          await fetchUsers();
        }

        setTimeout(() => {
          onHide();
        }, 1500);
      } else {
        setError(response.data.message || "Failed to update profile");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${targetUser?.firstName} ${targetUser?.lastName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.delete(`/users/${targetUser._id}`);

      if (response.data.success) {
        setSuccess("User deleted successfully!");
        await fetchUsers();
        setTimeout(() => {
          onHide();
        }, 1500);
      } else {
        setError(response.data.message || "Failed to delete user");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  const displayUser = targetUser || currentUser;

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
      <div
        className="modal fade show"
        style={{ display: "block", zIndex: 1055 }}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="fas fa-user-circle me-2"></i>
                {isEditMode ? "Edit Profile" : "Profile Details"}
                {!isOwnProfile &&
                  ` - ${displayUser.firstName} ${displayUser.lastName}`}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onHide}
              ></button>
            </div>

            <div className="modal-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success" role="alert">
                  <i className="fas fa-check-circle me-2"></i>
                  {success}
                </div>
              )}

              {isEditMode && canEdit ? (
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={
                        !isOwnProfile &&
                        currentUser.role !== "managing_director" &&
                        currentUser.role !== "it_admin"
                      }
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Department</label>
                      <input
                        type="text"
                        className="form-control"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Role</label>
                      <select
                        className="form-select"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        disabled={
                          currentUser.role !== "managing_director" &&
                          currentUser.role !== "it_admin"
                        }
                      >
                        <option value="employee">Employee</option>
                        <option value="team_lead">Team Lead</option>
                        {(currentUser.role === "managing_director" ||
                          currentUser.role === "it_admin") && (
                          <>
                            <option value="it_admin">IT Admin</option>
                            <option value="managing_director">
                              Managing Director
                            </option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {!isOwnProfile &&
                    (currentUser.role === "managing_director" ||
                      currentUser.role === "it_admin") && (
                      <div className="mb-3">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            name="isActive"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={handleChange}
                          />
                          <label
                            className="form-check-label"
                            htmlFor="isActive"
                          >
                            Active User
                          </label>
                        </div>
                      </div>
                    )}

                  <div className="d-flex justify-content-between">
                    <div>
                      {!isOwnProfile &&
                        (currentUser.role === "managing_director" ||
                          currentUser.role === "it_admin") && (
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={handleDelete}
                            disabled={loading}
                          >
                            <i className="fas fa-trash me-2"></i>
                            Delete User
                          </button>
                        )}
                    </div>
                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary me-2"
                        onClick={onHide}
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save me-2"></i>
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="profile-view">
                  <div className="text-center mb-4">
                    <div
                      className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                      style={{
                        width: "100px",
                        height: "100px",
                        background:
                          "linear-gradient(135deg, #800020 0%, #A0002A 100%)",
                        color: "white",
                        fontSize: "2.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {displayUser.firstName?.[0]}
                      {displayUser.lastName?.[0]}
                    </div>
                    <h4 className="mb-1">
                      {displayUser.firstName} {displayUser.lastName}
                    </h4>
                    <p className="text-capitalize text-muted">
                      {displayUser.role?.replace("_", " ")}
                    </p>
                    <span
                      className={`badge ${displayUser.isActive ? "bg-success" : "bg-secondary"}`}
                    >
                      {displayUser.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <h6 className="text-muted mb-3">Personal Information</h6>
                      <table className="table table-borderless">
                        <tbody>
                          <tr>
                            <td
                              className="text-muted"
                              style={{ width: "120px" }}
                            >
                              Email:
                            </td>
                            <td>{displayUser.email}</td>
                          </tr>
                          <tr>
                            <td className="text-muted">Department:</td>
                            <td>{displayUser.department || "Not specified"}</td>
                          </tr>
                          <tr>
                            <td className="text-muted">Role:</td>
                            <td className="text-capitalize">
                              {displayUser.role?.replace("_", " ") ||
                                "Not assigned"}
                            </td>
                          </tr>
                          <tr>
                            <td className="text-muted">Team:</td>
                            <td>
                              {displayUser.teamId?.name || "No team assigned"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="col-md-6">
                      <h6 className="text-muted mb-3">Account Information</h6>
                      <table className="table table-borderless">
                        <tbody>
                          <tr>
                            <td
                              className="text-muted"
                              style={{ width: "120px" }}
                            >
                              User ID:
                            </td>
                            <td>
                              <code>{displayUser._id?.slice(-6) || "N/A"}</code>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-muted">Joined:</td>
                            <td>
                              {displayUser.createdAt
                                ? new Date(
                                    displayUser.createdAt
                                  ).toLocaleDateString()
                                : "N/A"}
                            </td>
                          </tr>
                          <tr>
                            <td className="text-muted">Last Login:</td>
                            <td>
                              {displayUser.lastLogin
                                ? new Date(
                                    displayUser.lastLogin
                                  ).toLocaleDateString()
                                : "Never"}
                            </td>
                          </tr>
                          <tr>
                            <td className="text-muted">Status:</td>
                            <td>
                              <span
                                className={`badge ${displayUser.isActive ? "bg-success" : "bg-secondary"}`}
                              >
                                {displayUser.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="text-end mt-4">
                    {canEdit && (
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          // Switch to edit mode
                          if (onEditModeChange) {
                            onEditModeChange(true);
                          }
                        }}
                      >
                        <i className="fas fa-edit me-2"></i>
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileModal;
