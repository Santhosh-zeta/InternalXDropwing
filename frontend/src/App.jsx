import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './routes/RouteGuards';
import { Toaster } from 'react-hot-toast';

// Pages — Original
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import UsersPage from './pages/users/UsersPage';
import CompaniesPage from './pages/companies/CompaniesPage';
import TeamsPage from './pages/teams/TeamsPage';
import AnnouncementsPage from './pages/announcements/AnnouncementsPage';
import TasksPage from './pages/tasks/TasksPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Pages — New Features
import ProfilePage from './pages/profile/ProfilePage';
import AttendancePage from './pages/attendance/AttendancePage';
import LeavePage from './pages/leave/LeavePage';
import MessagesPage from './pages/messages/MessagesPage';
import ReviewsPage from './pages/reviews/ReviewsPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import WebforgeCeoDashboard from './pages/dashboard/WebforgeCeoDashboard';
import OnboardInvitePage from './pages/onboarding/OnboardInvitePage';

const ALL_ROLES = ['managing_director', 'ceo', 'manager', 'intern', 'client', 'admin'];
const STAFF_ROLES = ['managing_director', 'ceo', 'manager', 'intern', 'admin'];
const ADMIN_ROLES = ['managing_director', 'ceo', 'admin'];
const MD_ONLY = ['managing_director', 'admin'];

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* Public invite onboarding (no auth) */}
          <Route path="/onboard/:token" element={<OnboardInvitePage />} />

          {/* Public Routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* All authenticated users */}
          <Route element={<ProtectedRoute allowedRoles={ALL_ROLES} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
          </Route>

          {/* Staff only (not clients) */}
          <Route element={<ProtectedRoute allowedRoles={STAFF_ROLES} />}>
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/leave" element={<LeavePage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Route>

          {/* Admin / CEO */}
          <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/webforge" element={<WebforgeCeoDashboard />} />
          </Route>

          {/* Utility */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
