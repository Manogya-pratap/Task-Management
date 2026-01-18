import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppProvider } from "./contexts/AppContext";
import { SocketProvider } from "./contexts/SocketContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginForm from "./components/LoginForm";
import Layout from "./components/Layout";
import ITAdminDashboard from "./components/dashboards/ITAdminDashboard";
import MDDashboard from "./components/dashboards/MDDashboard";
import TeamLeadDashboard from "./components/dashboards/TeamLeadDashboard";
import EmployeeDashboard from "./components/dashboards/EmployeeDashboard";
import KanbanPage from "./pages/KanbanPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import DailyLogsPage from "./pages/DailyLogsPage";
import TaskCalendar from "./components/calendar/TaskCalendar";
import TeamManagement from "./components/management/TeamManagement";
import UserManagement from "./components/management/UserManagement";
import ProjectManagement from "./components/management/ProjectManagement";
import MyProjects from "./components/projects/MyProjects";
import TeamProjects from "./components/projects/TeamProjects";
import MyTasks from "./components/tasks/MyTasks";
import TeamTasks from "./components/tasks/TeamTasks";
import MyTeam from "./components/teams/MyTeam.js";
import Reports from "./components/reports/Reports";
import Analytics from "./components/analytics/Analytics";
import Settings from "./components/settings/Settings";
import AuditLogs from "./components/audit/AuditLogs";
import ErrorBoundary, {
  DashboardErrorBoundary,
} from "./components/ErrorBoundary";
import { PageLoader } from "./components/LoadingSpinner";
import NotificationSystem from "./components/NotificationSystem";
import NotificationToast from "./components/notifications/NotificationToast";
import "./App.css";
import "./styles/responsive.css";

const Dashboard = () => {
  const { user } = useAuth();

  // Render role-specific dashboard component
  const renderDashboard = () => {
    if (!user) return null;

    switch (user.role) {
      case "it_admin":
        return (
          <DashboardErrorBoundary>
            <ITAdminDashboard />
          </DashboardErrorBoundary>
        );
      case "managing_director":
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
        path="/progressboard"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <KanbanPage />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/approvals"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <ApprovalsPage />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-logs"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <DailyLogsPage />
              </ErrorBoundary>
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
        path="/team-calendar"
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
        path="/my-team"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <MyTeam />
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
          <SocketProvider>
            <AppProvider>
              <AppContent />
              <NotificationSystem />
              <NotificationToast />
            </AppProvider>
          </SocketProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
