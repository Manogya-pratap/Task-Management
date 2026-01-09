import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppProvider } from "./contexts/AppContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginForm from "./components/LoginForm";
import Layout from "./components/Layout";
import MDDashboard from "./components/dashboards/MDDashboard";
import TeamLeadDashboard from "./components/dashboards/TeamLeadDashboard";
import EmployeeDashboard from "./components/dashboards/EmployeeDashboard";
import TaskBoard from "./components/TaskBoard";
import TaskCalendar from "./components/calendar/TaskCalendar";
import ProjectTimeline from "./components/timeline/ProjectTimeline";
import TeamManagement from "./components/management/TeamManagement";
import UserManagement from "./components/management/UserManagement";
import ProjectManagement from "./components/management/ProjectManagement";
import MyProjects from "./components/projects/MyProjects";
import TeamProjects from "./components/projects/TeamProjects";
import MyTasks from "./components/tasks/MyTasks";
import TeamTasks from "./components/tasks/TeamTasks";
import Reports from "./components/reports/Reports";
import Analytics from "./components/analytics/Analytics";
import Settings from "./components/settings/Settings";
import AuditLogs from "./components/audit/AuditLogs";
import ErrorBoundary, {
  DashboardErrorBoundary,
  TaskBoardErrorBoundary,
} from "./components/ErrorBoundary";
import { PageLoader } from "./components/LoadingSpinner";
import NotificationSystem from "./components/NotificationSystem";
import "./App.css";
import "./styles/responsive.css";

const Dashboard = () => {
  const { user } = useAuth();

  // Render role-specific dashboard component
  const renderDashboard = () => {
    if (!user) return null;

    switch (user.role) {
      case "managing_director":
      case "it_admin":
        return (
          <DashboardErrorBoundary>
            <MDDashboard />
          </DashboardErrorBoundary>
        );
      case "team_lead":
        return (
          <DashboardErrorBoundary>
            <TeamLeadDashboard />
          </DashboardErrorBoundary>
        );
      case "employee":
        return (
          <DashboardErrorBoundary>
            <EmployeeDashboard />
          </DashboardErrorBoundary>
        );
      default:
        return (
          <DashboardErrorBoundary>
            <EmployeeDashboard />
          </DashboardErrorBoundary>
        ); // Default to employee dashboard
    }
  };

  return <Layout>{renderDashboard()}</Layout>;
};

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader text="Loading Daily Activity Tracker..." />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginForm />
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <Layout>
              <TaskBoardErrorBoundary>
                <TaskBoard />
              </TaskBoardErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <TaskCalendar />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/timeline"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <ProjectTimeline />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <TeamManagement />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <UserManagement />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <ProjectManagement />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-projects"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <MyProjects />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-projects"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <TeamProjects />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-tasks"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <MyTasks />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-tasks"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <TeamTasks />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-timeline"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <ProjectTimeline />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-timeline"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <ProjectTimeline />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-reports"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <Reports />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <Reports />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <Analytics />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <Settings />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <AuditLogs />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit/user/:userId"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <AuditLogs />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppProvider>
            <AppContent />
            <NotificationSystem />
          </AppProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
