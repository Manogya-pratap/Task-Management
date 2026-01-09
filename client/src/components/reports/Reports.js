import React, { useState, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Table,
  Badge,
  Spinner,
} from "react-bootstrap";
import { useApp } from "../../contexts/AppContext";
import api from "../../services/api";
import moment from "moment";

const Reports = () => {
  const { teams, users } = useApp(); // eslint-disable-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    reportType: "project_summary",
    dateRange: "last_30_days",
    startDate: "",
    endDate: "",
    teamId: "",
    userId: "",
    status: "",
  });

  const reportTypes = [
    { value: "project_summary", label: "Project Summary" },
    { value: "task_completion", label: "Task Completion Report" },
    { value: "team_performance", label: "Team Performance" },
    { value: "user_productivity", label: "User Productivity" },
    { value: "deadline_analysis", label: "Deadline Analysis" },
  ];

  const dateRanges = [
    { value: "last_7_days", label: "Last 7 Days" },
    { value: "last_30_days", label: "Last 30 Days" },
    { value: "last_90_days", label: "Last 90 Days" },
    { value: "this_month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "custom", label: "Custom Range" },
  ];

  // Helper function to convert frontend report type to backend format
  const getBackendReportType = (frontendType) => {
    const typeMapping = {
      project_summary: "project_progress",
      task_completion: "task_summary",
      team_performance: "team_performance",
      user_productivity: "user_activity",
      deadline_analysis: "task_summary", // Use task_summary for deadline analysis
    };
    return typeMapping[frontendType] || "task_summary";
  };

  // Helper function to convert date range to actual dates
  const getDateRange = (range, startDate, endDate) => {
    const now = new Date();
    let start, end;

    switch (range) {
      case "last_7_days":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case "last_30_days":
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case "last_90_days":
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case "this_month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        break;
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "custom":
        start = startDate
          ? new Date(startDate)
          : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = endDate ? new Date(endDate) : now;
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = now;
    }

    return { start: start.toISOString(), end: end.toISOString() };
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      // Convert filters to the format expected by the backend
      const backendType = getBackendReportType(filters.reportType);
      console.log("Generating report:", {
        frontendType: filters.reportType,
        backendType: backendType,
        filters: filters,
      });

      const reportRequest = {
        reportType: backendType,
        dateRange: getDateRange(
          filters.dateRange,
          filters.startDate,
          filters.endDate
        ),
        teamId: filters.teamId || undefined,
        userId: filters.userId || undefined,
        format: "json",
      };

      console.log("Sending report request:", reportRequest);

      const response = await api.post("/reports/generate", reportRequest);

      console.log("Report response:", response.data);

      if (response.data.status === "success") {
        setReportData(response.data.data.report);
      } else {
        throw new Error(response.data.message || "Failed to generate report");
      }
    } catch (error) {
      console.error("Error generating report:", error);

      // Show user-friendly error message
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to generate report";
      alert(`Report Generation Failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format) => {
    if (!reportData) {
      alert("Please generate a report first before exporting.");
      return;
    }

    try {
      setLoading(true);

      // Create export request with current filters and report data
      const exportRequest = {
        reportType: getBackendReportType(filters.reportType),
        dateRange: getDateRange(
          filters.dateRange,
          filters.startDate,
          filters.endDate
        ),
        teamId: filters.teamId || undefined,
        userId: filters.userId || undefined,
        format: format,
        data: reportData, // Include the current report data
      };

      const response = await api.post("/reports/generate", exportRequest, {
        responseType: "blob",
        headers: {
          Accept:
            format === "xlsx"
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "application/pdf",
        },
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Set filename with current date
      const filename = `${filters.reportType}_report_${moment().format("YYYY-MM-DD")}.${format}`;
      link.setAttribute("download", filename);

      // Trigger download
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Clean up
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting report:", error);

      // Fallback: Create a simple export using current data
      if (format === "xlsx") {
        exportToExcel();
      } else {
        alert("PDF export is not available. Please try Excel export.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fallback Excel export function
  const exportToExcel = () => {
    if (!reportData) return;

    try {
      // Create CSV content
      let csvContent = "";

      if (reportData.type === "project_progress" && reportData.projects) {
        csvContent =
          "Project Name,Status,Progress,Total Tasks,Completed Tasks,Start Date,End Date\n";
        reportData.projects.forEach((project) => {
          csvContent += `"${project.projectName}","${project.status}","${project.progress.completionPercentage}%","${project.progress.totalTasks}","${project.progress.completedTasks}","${project.startDate || "Not set"}","${project.endDate || "No deadline"}"\n`;
        });
      } else if (reportData.type === "task_summary" && reportData.tasks) {
        csvContent =
          "Task Title,Status,Priority,Assigned To,Project,Due Date\n";
        reportData.tasks.forEach((task) => {
          csvContent += `"${task.title}","${task.status}","${task.priority}","${task.assignedTo}","${task.project}","${task.dueDate || "No deadline"}"\n`;
        });
      } else if (reportData.type === "team_performance" && reportData.teams) {
        csvContent = "Team,Department,Members,Total Tasks,Completed Tasks\n";
        reportData.teams.forEach((team) => {
          csvContent += `"${team.teamName}","${team.department}","${team.totalMembers}","${team.totalTasks}","${team.completedTasks}"\n`;
        });
      }

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${filters.reportType}_report_${moment().format("YYYY-MM-DD")}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error creating CSV export:", error);
      alert("Export failed. Please try again.");
    }
  };

  const renderProjectSummary = () => {
    if (!reportData?.projects) return null;

    return (
      <Card className="mb-4">
        <Card.Header>
          <h5>Project Progress Report</h5>
        </Card.Header>
        <Card.Body>
          <Row className="mb-4">
            <Col md={12}>
              <div className="text-center">
                <h3 className="text-primary">{reportData.projects.length}</h3>
                <p className="text-muted">Total Projects</p>
              </div>
            </Col>
          </Row>

          <Table responsive>
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Total Tasks</th>
                <th>Completed Tasks</th>
                <th>Start Date</th>
                <th>End Date</th>
              </tr>
            </thead>
            <tbody>
              {reportData.projects.map((project) => (
                <tr key={project.projectId}>
                  <td>{project.projectName}</td>
                  <td>
                    <Badge
                      bg={
                        project.status === "completed"
                          ? "success"
                          : project.status === "active"
                            ? "primary"
                            : "secondary"
                      }
                    >
                      {project.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <div
                        className="progress flex-grow-1 me-2"
                        style={{ height: "20px" }}
                      >
                        <div
                          className="progress-bar"
                          role="progressbar"
                          style={{
                            width: `${project.progress.completionPercentage}%`,
                          }}
                        >
                          {project.progress.completionPercentage}%
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{project.progress.totalTasks}</td>
                  <td>{project.progress.completedTasks}</td>
                  <td>
                    {project.startDate
                      ? moment(project.startDate).format("MMM DD, YYYY")
                      : "Not set"}
                  </td>
                  <td>
                    {project.endDate
                      ? moment(project.endDate).format("MMM DD, YYYY")
                      : "No deadline"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    );
  };

  const renderTaskCompletion = () => {
    if (!reportData?.summary) return null;

    return (
      <Card className="mb-4">
        <Card.Header>
          <h5>Task Summary Report</h5>
        </Card.Header>
        <Card.Body>
          <Row className="mb-4">
            <Col md={3}>
              <div className="text-center">
                <h3 className="text-primary">
                  {reportData.summary.totalTasks}
                </h3>
                <p className="text-muted">Total Tasks</p>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <h3 className="text-success">
                  {reportData.summary.statusBreakdown.completed || 0}
                </h3>
                <p className="text-muted">Completed</p>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <h3 className="text-info">
                  {reportData.summary.statusBreakdown.in_progress || 0}
                </h3>
                <p className="text-muted">In Progress</p>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <h3 className="text-warning">
                  {reportData.summary.statusBreakdown.pending || 0}
                </h3>
                <p className="text-muted">Pending</p>
              </div>
            </Col>
          </Row>

          <div className="mb-3">
            <strong>Completion Rate: </strong>
            <Badge bg="success" className="fs-6">
              {reportData.summary.completionRate}%
            </Badge>
          </div>

          <div className="mb-3">
            <strong>Average Completion Time: </strong>
            <Badge bg="info" className="fs-6">
              {reportData.summary.averageCompletionTime} days
            </Badge>
          </div>

          {reportData.tasks && reportData.tasks.length > 0 && (
            <Table responsive>
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assigned To</th>
                  <th>Project</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {reportData.tasks.slice(0, 10).map((task) => (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>
                      <Badge
                        bg={
                          task.status === "completed"
                            ? "success"
                            : task.status === "in_progress"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {task.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        bg={
                          task.priority === "high"
                            ? "danger"
                            : task.priority === "medium"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {task.priority}
                      </Badge>
                    </td>
                    <td>{task.assignedTo}</td>
                    <td>{task.project}</td>
                    <td>
                      {task.dueDate
                        ? moment(task.dueDate).format("MMM DD, YYYY")
                        : "No deadline"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderTeamPerformance = () => {
    if (!reportData?.teams) return null;

    return (
      <Card className="mb-4">
        <Card.Header>
          <h5>Team Performance Report</h5>
        </Card.Header>
        <Card.Body>
          <Table responsive>
            <thead>
              <tr>
                <th>Team</th>
                <th>Department</th>
                <th>Members</th>
                <th>Total Tasks</th>
                <th>Completed Tasks</th>
                <th>Member Performance</th>
              </tr>
            </thead>
            <tbody>
              {reportData.teams.map((team) => (
                <tr key={team.teamId}>
                  <td>{team.teamName}</td>
                  <td>{team.department}</td>
                  <td>{team.totalMembers}</td>
                  <td>{team.totalTasks}</td>
                  <td>{team.completedTasks}</td>
                  <td>
                    {team.memberPerformance.map((member) => (
                      <div key={member.userId} className="mb-1">
                        <small>
                          {member.name}:
                          <Badge
                            bg={
                              member.completionRate >= 80
                                ? "success"
                                : member.completionRate >= 60
                                  ? "warning"
                                  : "danger"
                            }
                            className="ms-1"
                          >
                            {member.completionRate}%
                          </Badge>
                        </small>
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    );
  };

  return (
    <div className="reports">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="fas fa-chart-bar me-2 text-primary"></i>
          Reports
        </h2>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <Card.Header>
          <h5>Report Filters</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Report Type</Form.Label>
                <Form.Select
                  name="reportType"
                  value={filters.reportType}
                  onChange={handleFilterChange}
                >
                  {reportTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Date Range</Form.Label>
                <Form.Select
                  name="dateRange"
                  value={filters.dateRange}
                  onChange={handleFilterChange}
                >
                  {dateRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Team</Form.Label>
                <Form.Select
                  name="teamId"
                  value={filters.teamId}
                  onChange={handleFilterChange}
                >
                  <option value="">All Teams</option>
                  {teams.map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>User</Form.Label>
                <Form.Select
                  name="userId"
                  value={filters.userId}
                  onChange={handleFilterChange}
                >
                  <option value="">All Users</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {filters.dateRange === "custom" && (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          )}

          <div className="d-flex gap-2">
            <Button
              variant="primary"
              onClick={generateReport}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-chart-line me-2"></i>
                  Generate Report
                </>
              )}
            </Button>

            {reportData && (
              <>
                <Button
                  variant="outline-success"
                  onClick={() => exportReport("xlsx")}
                >
                  <i className="fas fa-file-excel me-2"></i>
                  Export Excel
                </Button>
                <Button
                  variant="outline-danger"
                  onClick={() => exportReport("pdf")}
                >
                  <i className="fas fa-file-pdf me-2"></i>
                  Export PDF
                </Button>
              </>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Report Results */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-2">Generating report...</p>
        </div>
      )}

      {reportData && !loading && (
        <div>
          {filters.reportType === "project_summary" &&
            reportData.type === "project_progress" &&
            renderProjectSummary()}
          {filters.reportType === "task_completion" &&
            reportData.type === "task_summary" &&
            renderTaskCompletion()}
          {filters.reportType === "team_performance" &&
            reportData.type === "team_performance" &&
            renderTeamPerformance()}
          {filters.reportType === "user_productivity" &&
            reportData.type === "user_activity" && (
              <Card className="mb-4">
                <Card.Header>
                  <h5>User Activity Report</h5>
                </Card.Header>
                <Card.Body>
                  <Row className="mb-4">
                    <Col md={12}>
                      <h6>User: {reportData.user?.name}</h6>
                      <p className="text-muted">
                        Role: {reportData.user?.role} | Department:{" "}
                        {reportData.user?.department}
                      </p>
                    </Col>
                  </Row>
                  <Row className="mb-4">
                    <Col md={3}>
                      <div className="text-center">
                        <h3 className="text-primary">
                          {reportData.summary?.totalTasks}
                        </h3>
                        <p className="text-muted">Total Tasks</p>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="text-center">
                        <h3 className="text-success">
                          {reportData.summary?.completedTasks}
                        </h3>
                        <p className="text-muted">Completed</p>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="text-center">
                        <h3 className="text-info">
                          {reportData.summary?.inProgressTasks}
                        </h3>
                        <p className="text-muted">In Progress</p>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="text-center">
                        <h3 className="text-warning">
                          {reportData.summary?.overdueTasks}
                        </h3>
                        <p className="text-muted">Overdue</p>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}
        </div>
      )}

      {!reportData && !loading && (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="fas fa-chart-bar fa-3x text-muted mb-3"></i>
            <h5 className="text-muted">No Report Generated</h5>
            <p className="text-muted">
              Select your filters and click "Generate Report" to view data
            </p>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default Reports;
