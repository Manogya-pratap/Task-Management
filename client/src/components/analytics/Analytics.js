import React, { useState, useEffect, useCallback } from "react";
import { Card, Row, Col, Badge, Spinner } from "react-bootstrap";
import { useApp } from "../../contexts/AppContext";
import api from "../../services/api";

const Analytics = () => {
  const { projects, tasks, teams, users } = useApp();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    overview: {},
    productivity: {},
    trends: {},
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/analytics/dashboard");
      setAnalytics(response.data.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      // Fallback to calculated analytics from existing data
      calculateAnalytics();
    } finally {
      setLoading(false);
    }
  }, [setLoading, setAnalytics, calculateAnalytics]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const calculateAnalytics = () => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const completedProjects = projects.filter(
      (p) => p.status === "completed"
    ).length;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const inProgressTasks = tasks.filter(
      (t) => t.status === "in_progress"
    ).length;

    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.isActive).length;

    const totalTeams = teams.length;
    const activeTeams = teams.filter((t) => t.isActive).length;

    setAnalytics({
      overview: {
        totalProjects,
        activeProjects,
        completedProjects,
        totalTasks,
        completedTasks,
        inProgressTasks,
        totalUsers,
        activeUsers,
        totalTeams,
        activeTeams,
        completionRate:
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      productivity: {
        tasksPerUser: totalUsers > 0 ? Math.round(totalTasks / totalUsers) : 0,
        projectsPerTeam:
          totalTeams > 0 ? Math.round(totalProjects / totalTeams) : 0,
        avgTaskCompletion: 75, // Mock data
      },
      trends: {
        weeklyGrowth: 12,
        monthlyGrowth: 8,
        quarterlyGrowth: 25,
      },
    });
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading analytics...</p>
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

      {/* Overview Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="mb-3">
                <i className="fas fa-project-diagram fa-2x text-primary"></i>
              </div>
              <h3 className="text-primary">
                {analytics.overview.totalProjects}
              </h3>
              <p className="text-muted mb-2">Total Projects</p>
              <div>
                <Badge bg="success" className="me-1">
                  {analytics.overview.completedProjects} Completed
                </Badge>
                <Badge bg="info">
                  {analytics.overview.activeProjects} Active
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
              <h3 className="text-success">{analytics.overview.totalTasks}</h3>
              <p className="text-muted mb-2">Total Tasks</p>
              <div>
                <Badge bg="success" className="me-1">
                  {analytics.overview.completedTasks} Done
                </Badge>
                <Badge bg="warning">
                  {analytics.overview.inProgressTasks} In Progress
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
              <h3 className="text-info">{analytics.overview.totalUsers}</h3>
              <p className="text-muted mb-2">Total Users</p>
              <div>
                <Badge bg="success">
                  {analytics.overview.activeUsers} Active
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
                {analytics.overview.completionRate}%
              </h3>
              <p className="text-muted mb-2">Completion Rate</p>
              <div>
                <Badge
                  bg={
                    analytics.overview.completionRate >= 80
                      ? "success"
                      : analytics.overview.completionRate >= 60
                        ? "warning"
                        : "danger"
                  }
                >
                  {analytics.overview.completionRate >= 80
                    ? "Excellent"
                    : analytics.overview.completionRate >= 60
                      ? "Good"
                      : "Needs Improvement"}
                </Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Productivity Metrics */}
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
                  <strong>{analytics.productivity.tasksPerUser}</strong>
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Projects per Team</span>
                  <strong>{analytics.productivity.projectsPerTeam}</strong>
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Avg. Task Completion</span>
                  <strong>{analytics.productivity.avgTaskCompletion}%</strong>
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
                  <Badge bg="success">+{analytics.trends.weeklyGrowth}%</Badge>
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Monthly Growth</span>
                  <Badge bg="info">+{analytics.trends.monthlyGrowth}%</Badge>
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Quarterly Growth</span>
                  <Badge bg="warning">
                    +{analytics.trends.quarterlyGrowth}%
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
                  <strong>{analytics.overview.activeTeams}</strong>
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Total Teams</span>
                  <strong>{analytics.overview.totalTeams}</strong>
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Team Utilization</span>
                  <Badge bg="primary">
                    {analytics.overview.totalTeams > 0
                      ? Math.round(
                          (analytics.overview.activeTeams /
                            analytics.overview.totalTeams) *
                            100
                        )
                      : 0}
                    %
                  </Badge>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
