// Export utilities for Yantrik Automation Task Management System

/**
 * Export data to CSV format
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file to download
 * @param {Array} headers - Optional custom headers
 */
export const exportToCSV = (data, filename, headers = null) => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Convert data to CSV format
  const csvContent = [
    csvHeaders.join(","), // Header row
    ...data.map((item) =>
      csvHeaders
        .map((header) => {
          const value = item[header];
          // Handle values that might contain commas or quotes
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || "";
        })
        .join(",")
    ),
  ].join("\n");

  // Create and download the file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export data to JSON format
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file to download
 */
export const exportToJSON = (data, filename) => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.json`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export data to Excel format (using CSV format as fallback)
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file to download
 * @param {Array} headers - Optional custom headers
 */
export const exportToExcel = (data, filename, headers = null) => {
  // For now, use CSV format (in a real app, you might use a library like xlsx)
  exportToCSV(data, filename, headers);
};

/**
 * Prepare tasks data for export
 * @param {Array} tasks - Array of task objects
 * @param {Array} projects - Array of project objects
 * @returns {Array} Formatted data for export
 */
export const prepareTasksForExport = (tasks, projects = []) => {
  return tasks.map((task) => ({
    "Task ID": task._id?.slice(-6) || "",
    Title: task.title || "",
    Description: task.description || "",
    Status: task.status || "",
    Priority: task.priority || "",
    Project:
      projects.find((p) => p._id === task.projectId)?.name || "No project",
    "Assigned To": task.assignedTo
      ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
      : "Unassigned",
    "Created By": task.createdBy
      ? `${task.createdBy.firstName} ${task.createdBy.lastName}`
      : "",
    "Created Date": task.createdAt
      ? new Date(task.createdAt).toLocaleDateString()
      : "",
    "Scheduled Date": task.scheduledDate
      ? new Date(task.scheduledDate).toLocaleDateString()
      : "",
    "Due Date": task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "",
    "Completed Date": task.completedDate
      ? new Date(task.completedDate).toLocaleDateString()
      : "",
    "Updated Date": task.updatedAt
      ? new Date(task.updatedAt).toLocaleDateString()
      : "",
  }));
};

/**
 * Prepare projects data for export
 * @param {Array} projects - Array of project objects
 * @returns {Array} Formatted data for export
 */
export const prepareProjectsForExport = (projects) => {
  return projects.map((project) => ({
    "Project ID": project._id?.slice(-6) || "",
    Name: project.name || "",
    Description: project.description || "",
    Status: project.status || "",
    Team: project.teamId?.name || "No team",
    "Team Lead": project.teamLead
      ? `${project.teamLead.firstName} ${project.teamLead.lastName}`
      : "",
    "Members Count": project.assignedMembers?.length || 0,
    "Start Date": project.startDate
      ? new Date(project.startDate).toLocaleDateString()
      : "",
    "End Date": project.endDate
      ? new Date(project.endDate).toLocaleDateString()
      : "",
    "Created Date": project.createdAt
      ? new Date(project.createdAt).toLocaleDateString()
      : "",
    "Completion %": project.completionPercentage || 0,
  }));
};

/**
 * Prepare users data for export
 * @param {Array} users - Array of user objects
 * @returns {Array} Formatted data for export
 */
export const prepareUsersForExport = (users) => {
  return users.map((user) => ({
    "User ID": user._id?.slice(-6) || "",
    "First Name": user.firstName || "",
    "Last Name": user.lastName || "",
    Email: user.email || "",
    Role: user.role?.replace("_", " ") || "",
    Department: user.department || "",
    Team: user.teamId?.name || "No team",
    Status: user.isActive ? "Active" : "Inactive",
    "Created Date": user.createdAt
      ? new Date(user.createdAt).toLocaleDateString()
      : "",
    "Last Login": user.lastLogin
      ? new Date(user.lastLogin).toLocaleDateString()
      : "",
  }));
};

/**
 * Prepare teams data for export
 * @param {Array} teams - Array of team objects
 * @returns {Array} Formatted data for export
 */
export const prepareTeamsForExport = (teams) => {
  return teams.map((team) => ({
    "Team ID": team._id?.slice(-6) || "",
    Name: team.name || "",
    Department: team.department || "",
    "Team Lead": team.teamLead
      ? `${team.teamLead.firstName} ${team.teamLead.lastName}`
      : "",
    "Members Count": team.members?.length || 0,
    "Projects Count": team.projects?.length || 0,
    "Created Date": team.createdAt
      ? new Date(team.createdAt).toLocaleDateString()
      : "",
  }));
};

/**
 * Generate export buttons component
 * @param {Function} onExport - Export function
 * @param {string} dataType - Type of data being exported
 * @param {Object} data - Data to export
 * @returns {Object} Export button configurations
 */
export const getExportButtons = (onExport, dataType, data) => {
  const filename = `${dataType}_${new Date().toISOString().split("T")[0]}`;

  return [
    {
      label: "Export to CSV",
      icon: "fas fa-file-csv",
      color: "success",
      action: () => onExport(data, filename, "csv"),
    },
    {
      label: "Export to JSON",
      icon: "fas fa-file-code",
      color: "info",
      action: () => onExport(data, filename, "json"),
    },
    {
      label: "Export to Excel",
      icon: "fas fa-file-excel",
      color: "primary",
      action: () => onExport(data, filename, "excel"),
    },
  ];
};
