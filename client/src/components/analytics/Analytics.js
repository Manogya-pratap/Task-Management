import React, { useState, useEffect, useCallback } from "react";
import { Card, Row, Col, Badge, Spinner } from "react-bootstrap";
import { useApp } from "../../contexts/AppContext";

const Analytics = () => {
  const { projects, tasks, teams, users } = useApp();
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState("essential");
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState({
    essential: {}, // Quick overview data
    detailed: {}, // Detailed metrics
    trends: {}, // Growth trends
  });

  // Stage 1: Essential data (quick overview)
  const calculateEssentialData = useCallback(() => {
    console.log("Analytics: Loading essential data...");
    const totalProjects = projects.length;
    const totalTasks = tasks.length;
    const totalUsers = users.length;
    const totalTeams = teams.length;

    setAnalytics((prev) => ({
      ...prev,
      essential: {
        totalProjects,
        totalTasks,
        totalUsers,
        totalTeams,
        activeProjects: projects.filter((p) => p.status === "active").length,
        completedTasks: tasks.filter((t) => t.status === "completed").length,
        activeUsers: users.filter((u) => u.isActive).length,
      },
    }));
  }, [projects, tasks, users, teams]);

  // Stage 2: Detailed metrics (productivity data)
  const calculateDetailedData = useCallback(() => {
    console.log("Analytics: Loading detailed metrics...");
    const totalProjects = projects.length;
    const totalTasks = tasks.length;
    const totalUsers = users.length;
    const totalTeams = teams.length;

    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const inProgressTasks = tasks.filter(
      (t) => t.status === "in_progress"
    ).length;
    const completedProjects = projects.filter(
      (p) => p.status === "completed"
    ).length;
    const activeTeams = teams.filter((t) => t.isActive).length;

    setAnalytics((prev) => ({
      ...prev,
      detailed: {
        completionRate:
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        tasksPerUser: totalUsers > 0 ? Math.round(totalTasks / totalUsers) : 0,
        projectsPerTeam:
          totalTeams > 0 ? Math.round(totalProjects / totalTeams) : 0,
        avgTaskCompletion: 75, // Mock data
        inProgressTasks,
        completedProjects,
        activeTeams,
      },
    }));
  }, [projects, tasks, users, teams]);

  // Stage 3: Trends data (growth analytics)
  const calculateTrendsData = useCallback(() => {
    console.log("Analytics: Loading trends data...");
    setAnalytics((prev) => ({
      ...prev,
      trends: {
        weeklyGrowth: 12,
        monthlyGrowth: 8,
        quarterlyGrowth: 25,
        // Add more trend calculations here
      },
    }));
  }, []);

  const fetchAnalytics = useCallback(async () => {
    console.log("Analytics: Starting progressive data loading...");
    setLoading(true);
    setError(null);

    try {
      // Stage 1: Load essential data immediately
      setLoadingStage("essential");
      calculateEssentialData();
      await new Promise((resolve) => setTimeout(resolve, 200)); // Brief pause for UX

      // Stage 2: Load detailed metrics after essential data is loaded
      setLoadingStage("detailed");
      calculateDetailedData();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Stage 3: Load trends data last
      setLoadingStage("trends");
      calculateTrendsData();
      await new Promise((resolve) => setTimeout(resolve, 200));

      setLoadingStage("complete");
    } catch (error) {
      console.error("Error calculating analytics:", error);
      setError("Failed to calculate analytics data");
    } finally {
      setLoading(false);
    }
  }, [calculateEssentialData, calculateDetailedData, calculateTrendsData]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">
          {loadingStage === "essential" && "Loading essential data..."}
          {loadingStage === "detailed" && "Calculating detailed metrics..."}
          {loadingStage === "trends" && "Analyzing trends..."}
          {loadingStage === "complete" && "Finalizing analytics..."}
        </p>
        <div
          className="progress"
          style={{ maxWidth: "300px", margin: "0 auto" }}
        >
          <div
            className="progress-bar"
            style={{
              width:
                loadingStage === "essential"
                  ? "33%"
                  : loadingStage === "detailed"
                    ? "66%"
                    : loadingStage === "trends"
                      ? "90%"
                      : "100%",
            }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-5">
        <div className="alert alert-warning d-inline-block">
          <h6>Analytics Notice</h6>
          <p className="mb-2">{error}</p>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              setError(null);
              fetchAnalytics();
            }}
          >
            <i className="fas fa-refresh me-2"></i>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="fas fa-chart-line me-2 text-primary"></i>
          Analytics Dashboard
        </h2>
      </div>

      {/* Essential Overview Cards - Always Visible */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="mb-3">
                <i className="fas fa-project-diagram fa-2x text-primary"></i>
              </div>
              <h3 className="text-primary">
                {analytics.essential.totalProjects || 0}
              </h3>
              <p className="text-muted mb-2">Total Projects</p>
              <div>
                <Badge bg="info" className="me-1">
                  {analytics.essential.activeProjects || 0} Active
                </Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="mb-3">
                <i className="fas fa-tasks fa-2x text-success"></i>
              </div>
              <h3 className="text-success">
                {analytics.essential.totalTasks || 0}
              </h3>
              <p className="text-muted mb-2">Total Tasks</p>
              <div>
                <Badge bg="success" className="me-1">
                  {analytics.essential.completedTasks || 0} Done
                </Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="mb-3">
                <i className="fas fa-users fa-2x text-info"></i>
              </div>
              <h3 className="text-info">
                {analytics.essential.totalUsers || 0}
              </h3>
              <p className="text-muted mb-2">Total Users</p>
              <div>
                <Badge bg="success">
                  {analytics.essential.activeUsers || 0} Active
                </Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="mb-3">
                <i className="fas fa-percentage fa-2x text-warning"></i>
              </div>
              <h3 className="text-warning">
                {analytics.detailed.completionRate || 0}%
              </h3>
              <p className="text-muted mb-2">Completion Rate</p>
              <div>
                <Badge
                  bg={
                    (analytics.detailed.completionRate || 0) >= 80
                      ? "success"
                      : (analytics.detailed.completionRate || 0) >= 60
                        ? "warning"
                        : "danger"
                  }
                >
                  {(analytics.detailed.completionRate || 0) >= 80
                    ? "Excellent"
                    : (analytics.detailed.completionRate || 0) >= 60
                      ? "Good"
                      : "Needs Improvement"}
                </Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Detailed Productivity Metrics - Load after essential data */}
      {Object.keys(analytics.detailed).length > 0 && (
        <Row className="mb-4">
          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Header className="bg-primary text-white">
                <h6 className="mb-0">
                  <i className="fas fa-chart-bar me-2"></i>
                  Productivity Metrics
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>Tasks per User</span>
                    <strong>{analytics.detailed.tasksPerUser || 0}</strong>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>Projects per Team</span>
                    <strong>{analytics.detailed.projectsPerTeam || 0}</strong>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>Avg. Task Completion</span>
                    <strong>
                      {analytics.detailed.avgTaskCompletion || 0}%
                    </strong>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Header className="bg-success text-white">
                <h6 className="mb-0">
                  <i className="fas fa-trending-up me-2"></i>
                  Growth Trends
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>Weekly Growth</span>
                    <Badge bg="success">
                      +{analytics.trends.weeklyGrowth || 0}%
                    </Badge>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>Monthly Growth</span>
                    <Badge bg="info">
                      +{analytics.trends.monthlyGrowth || 0}%
                    </Badge>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>Quarterly Growth</span>
                    <Badge bg="warning">
                      +{analytics.trends.quarterlyGrowth || 0}%
                    </Badge>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Header className="bg-info text-white">
                <h6 className="mb-0">
                  <i className="fas fa-chart-pie me-2"></i>
                  Team Distribution
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>Active Teams</span>
                    <strong>{analytics.detailed.activeTeams || 0}</strong>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>In Progress Tasks</span>
                    <strong>{analytics.detailed.inProgressTasks || 0}</strong>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>Completed Projects</span>
                    <strong>{analytics.detailed.completedProjects || 0}</strong>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Loading placeholder for detailed metrics */}
      {loadingStage !== "complete" && (
        <Row className="mb-4">
          <Col md={12}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center py-3">
                <Spinner animation="border" size="sm" className="me-2" />
                <span className="text-muted">
                  {loadingStage === "essential" &&
                    "Preparing detailed metrics..."}
                  {loadingStage === "detailed" &&
                    "Calculating productivity data..."}
                  {loadingStage === "trends" && "Analyzing growth trends..."}
                </span>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Detailed Analytics */}
      <Row>
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header>
              <h6 className="mb-0">
                <i className="fas fa-clock me-2"></i>
                Recent Activity
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="activity-item mb-3">
                <div className="d-flex">
                  <div className="activity-icon bg-success text-white rounded-circle me-3">
                    <i className="fas fa-check"></i>
                  </div>
                  <div>
                    <strong>Task Completed</strong>
                    <p className="text-muted small mb-0">
                      Website redesign task completed by John Doe
                    </p>
                    <small className="text-muted">2 hours ago</small>
                  </div>
                </div>
              </div>

              <div className="activity-item mb-3">
                <div className="d-flex">
                  <div className="activity-icon bg-primary text-white rounded-circle me-3">
                    <i className="fas fa-plus"></i>
                  </div>
                  <div>
                    <strong>New Project Created</strong>
                    <p className="text-muted small mb-0">
                      Mobile App Development project started
                    </p>
                    <small className="text-muted">5 hours ago</small>
                  </div>
                </div>
              </div>

              <div className="activity-item">
                <div className="d-flex">
                  <div className="activity-icon bg-info text-white rounded-circle me-3">
                    <i className="fas fa-user-plus"></i>
                  </div>
                  <div>
                    <strong>New Team Member</strong>
                    <p className="text-muted small mb-0">
                      Jane Smith joined the Development Team
                    </p>
                    <small className="text-muted">1 day ago</small>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header>
              <h6 className="mb-0">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Alerts & Notifications
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="alert alert-warning d-flex align-items-center mb-3">
                <i className="fas fa-clock me-2"></i>
                <div>
                  <strong>3 tasks</strong> are approaching their deadlines
                </div>
              </div>

              <div className="alert alert-info d-flex align-items-center mb-3">
                <i className="fas fa-project-diagram me-2"></i>
                <div>
                  <strong>2 projects</strong> need status updates
                </div>
              </div>

              <div className="alert alert-success d-flex align-items-center">
                <i className="fas fa-trophy me-2"></i>
                <div>
                  <strong>Development Team</strong> achieved 95% completion rate
                  this week!
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <style>{`
        .activity-icon {
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        
        .card {
          transition: transform 0.2s ease-in-out;
        }
        
        .card:hover {
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default Analytics;
