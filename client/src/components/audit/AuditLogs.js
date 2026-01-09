import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Form,
  Row,
  Col,
  Badge,
  Button,
  Modal,
  Alert,
  Spinner,
} from "react-bootstrap";
import { useAuth } from "../../contexts/AuthContext";
import { useParams, useLocation } from "react-router-dom";
import api from "../../services/api";
import moment from "moment";

const AuditLogs = () => {
  const { user } = useAuth();
  const { userId } = useParams();
  const location = useLocation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Determine if this is a user-specific activity view
  const isUserActivity = location.pathname.includes("/audit/user/");
  const targetUserId = userId || user._id;

  console.log("AuditLogs: Component loaded", {
    isUserActivity,
    targetUserId,
    userRole: user?.role,
    currentPath: location.pathname,
  });

  const [filters, setFilters] = useState({
    action: "",
    userId: "",
    dateFrom: "",
    dateTo: "",
    resource: "",
    page: 1,
    limit: 50,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    currentPage: 1,
  });

  const actionTypes = [
    { value: "", label: "All Actions" },
    { value: "CREATE", label: "Create" },
    { value: "UPDATE", label: "Update" },
    { value: "DELETE", label: "Delete" },
    { value: "LOGIN", label: "Login" },
    { value: "LOGOUT", label: "Logout" },
    { value: "VIEW", label: "View" },
    { value: "EXPORT", label: "Export" },
  ];

  const resourceTypes = [
    { value: "", label: "All Resources" },
    { value: "USER", label: "Users" },
    { value: "TASK", label: "Tasks" },
    { value: "PROJECT", label: "Projects" },
    { value: "TEAM", label: "Teams" },
    { value: "SETTINGS", label: "Settings" },
    { value: "REPORT", label: "Reports" },
  ];

  useEffect(() => {
    fetchAuditLogs();
  }, [filters]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      let response;

      if (isUserActivity) {
        // Use user-specific endpoint
        console.log("AuditLogs: Fetching user activity for:", targetUserId);
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value && key !== "userId") queryParams.append(key, value);
        });

        response = await api.get(
          `/audit/user/${targetUserId}?${queryParams.toString()}`
        );
        console.log("AuditLogs: User activity response:", response.data);
        setLogs(response.data.data.userActivity || []);
      } else {
        // Use general audit logs endpoint (admin only)
        console.log("AuditLogs: Fetching general audit logs");
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, value);
        });

        response = await api.get(`/audit/logs?${queryParams.toString()}`);
        setLogs(response.data.data.logs || []);
        setPagination({
          total: response.data.data.total || 0,
          pages: response.data.data.pages || 0,
          currentPage: response.data.data.currentPage || 1,
        });
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      const errorMessage =
        err.response?.data?.message || "Failed to load audit logs";
      setError(errorMessage);

      // Only show mock data for admin view, not for user activity
      if (!isUserActivity) {
        setLogs(generateMockLogs());
      }
    } finally {
      setLoading(false);
    }
  };

  const generateMockLogs = () => {
    return [
      {
        _id: "1",
        action: "LOGIN",
        resource: "USER",
        resourceId: user?._id,
        userId: {
          _id: user?._id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          username: user?.username,
        },
        details: {
          ipAddress: "192.168.1.100",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          success: true,
        },
        timestamp: new Date(),
        severity: "INFO",
      },
      {
        _id: "2",
        action: "CREATE",
        resource: "TASK",
        resourceId: "task123",
        userId: {
          _id: user?._id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          username: user?.username,
        },
        details: {
          taskName: "Website Redesign",
          projectId: "proj456",
          assignedTo: "john.doe",
        },
        timestamp: new Date(Date.now() - 3600000),
        severity: "INFO",
      },
      {
        _id: "3",
        action: "UPDATE",
        resource: "PROJECT",
        resourceId: "proj456",
        userId: {
          _id: user?._id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          username: user?.username,
        },
        details: {
          changes: {
            status: { from: "planning", to: "active" },
            priority: { from: "medium", to: "high" },
          },
        },
        timestamp: new Date(Date.now() - 7200000),
        severity: "INFO",
      },
      {
        _id: "4",
        action: "DELETE",
        resource: "USER",
        resourceId: "user789",
        userId: {
          _id: user?._id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          username: user?.username,
        },
        details: {
          deletedUser: "inactive.user@company.com",
          reason: "Account deactivation",
        },
        timestamp: new Date(Date.now() - 86400000),
        severity: "WARNING",
      },
      {
        _id: "5",
        action: "EXPORT",
        resource: "REPORT",
        resourceId: "report001",
        userId: {
          _id: user?._id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          username: user?.username,
        },
        details: {
          reportType: "project_summary",
          format: "xlsx",
          dateRange: "last_30_days",
        },
        timestamp: new Date(Date.now() - 172800000),
        severity: "INFO",
      },
    ];
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1, // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const getActionBadge = (action) => {
    const colors = {
      CREATE: "success",
      UPDATE: "info",
      DELETE: "danger",
      LOGIN: "primary",
      LOGOUT: "secondary",
      VIEW: "light",
      EXPORT: "warning",
    };
    return colors[action] || "secondary";
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      INFO: "info",
      WARNING: "warning",
      ERROR: "danger",
      CRITICAL: "dark",
    };
    return colors[severity] || "secondary";
  };

  const canViewAuditLogs =
    user?.role === "managing_director" || user?.role === "it_admin";

  if (!canViewAuditLogs) {
    return (
      <div className="audit-logs">
        <Card>
          <Card.Body className="text-center py-5">
            <i className="fas fa-shield-alt fa-3x text-muted mb-3"></i>
            <h5 className="text-muted">Access Denied</h5>
            <p className="text-muted">
              You don't have permission to view audit logs.
            </p>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="audit-logs">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="fas fa-shield-alt me-2 text-primary"></i>
          {isUserActivity ? "My Activity Log" : "Audit Logs"}
        </h2>
        <Badge bg={isUserActivity ? "info" : "warning"} className="fs-6">
          {isUserActivity ? "Personal Activity" : "Admin Only"}
        </Badge>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Filters */}
      <Card className="mb-4">
        <Card.Header>
          <h6 className="mb-0">
            <i className="fas fa-filter me-2"></i>
            Filters
          </h6>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Action Type</Form.Label>
                <Form.Select
                  name="action"
                  value={filters.action}
                  onChange={handleFilterChange}
                >
                  {actionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Resource Type</Form.Label>
                <Form.Select
                  name="resource"
                  value={filters.resource}
                  onChange={handleFilterChange}
                >
                  {resourceTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Date From</Form.Label>
                <Form.Control
                  type="date"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Date To</Form.Label>
                <Form.Control
                  type="date"
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex gap-2">
            <Button
              variant="outline-primary"
              onClick={fetchAuditLogs}
              disabled={loading}
            >
              <i className="fas fa-search me-2"></i>
              Apply Filters
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() =>
                setFilters({
                  action: "",
                  userId: "",
                  dateFrom: "",
                  dateTo: "",
                  resource: "",
                  page: 1,
                  limit: 50,
                })
              }
            >
              <i className="fas fa-times me-2"></i>
              Clear Filters
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">
              <i className="fas fa-list me-2"></i>
              Audit Trail ({pagination.total} records)
            </h6>
            <Button variant="outline-success" size="sm">
              <i className="fas fa-download me-2"></i>
              Export Logs
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2">Loading audit logs...</p>
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Severity</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <div className="small">
                        <div>
                          {moment(log.timestamp).format("MMM DD, YYYY")}
                        </div>
                        <div className="text-muted">
                          {moment(log.timestamp).format("HH:mm:ss")}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>
                          {log.userId?.firstName} {log.userId?.lastName}
                        </strong>
                        <div className="text-muted small">
                          @{log.userId?.username}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge bg={getActionBadge(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td>
                      <div>
                        <span className="fw-bold">{log.resource}</span>
                        {log.resourceId && (
                          <div className="text-muted small">
                            ID: {log.resourceId}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <Badge bg={getSeverityBadge(log.severity)}>
                        {log.severity}
                      </Badge>
                    </td>
                    <td>
                      <div className="small">
                        {log.details?.ipAddress && (
                          <div>IP: {log.details.ipAddress}</div>
                        )}
                        {log.details?.taskName && (
                          <div>Task: {log.details.taskName}</div>
                        )}
                        {log.details?.changes && (
                          <div>
                            Changes: {Object.keys(log.details.changes).length}{" "}
                            fields
                          </div>
                        )}
                        {log.details?.reportType && (
                          <div>Report: {log.details.reportType}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleViewDetails(log)}
                      >
                        <i className="fas fa-eye"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      <i className="fas fa-search fa-3x text-muted mb-3"></i>
                      <p className="text-muted">No audit logs found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <Card.Footer>
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted small">
                Showing page {pagination.currentPage} of {pagination.pages}
              </div>
              <div className="btn-group">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={pagination.currentPage === 1}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                >
                  <i className="fas fa-chevron-left"></i>
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={pagination.currentPage === pagination.pages}
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                >
                  <i className="fas fa-chevron-right"></i>
                </Button>
              </div>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Log Detail Modal */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Audit Log Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLog && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Timestamp:</strong>
                  <p>
                    {moment(selectedLog.timestamp).format(
                      "MMMM DD, YYYY HH:mm:ss"
                    )}
                  </p>
                </Col>
                <Col md={6}>
                  <strong>User:</strong>
                  <p>
                    {selectedLog.userId?.firstName}{" "}
                    {selectedLog.userId?.lastName} (@
                    {selectedLog.userId?.username})
                  </p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Action:</strong>
                  <p>
                    <Badge bg={getActionBadge(selectedLog.action)}>
                      {selectedLog.action}
                    </Badge>
                  </p>
                </Col>
                <Col md={6}>
                  <strong>Resource:</strong>
                  <p>
                    {selectedLog.resource}{" "}
                    {selectedLog.resourceId &&
                      `(ID: ${selectedLog.resourceId})`}
                  </p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Severity:</strong>
                  <p>
                    <Badge bg={getSeverityBadge(selectedLog.severity)}>
                      {selectedLog.severity}
                    </Badge>
                  </p>
                </Col>
              </Row>

              <div className="mb-3">
                <strong>Details:</strong>
                <pre
                  className="bg-light p-3 rounded mt-2"
                  style={{
                    fontSize: "12px",
                    maxHeight: "300px",
                    overflow: "auto",
                  }}
                >
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AuditLogs;
