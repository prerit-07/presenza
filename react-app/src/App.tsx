import { Navigate, Route, Routes } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import IndexPage from './pages/IndexPage';
import PricingPage from './pages/PricingPage';
import LoginPage from './pages/LoginPage';
import OrganizationPage from './pages/OrganizationPage';
import EmployeePage from './pages/EmployeePage';
import ShiftsPage from './pages/ShiftsPage';
import GeofencingPage from './pages/GeofencingPage';
import WifiPage from './pages/WifiPage';
import MembersPage from './pages/MembersPage';
import TeamPage from './pages/TeamPage';
import AttendancePage from './pages/AttendancePage';
import ManagerLeavePage from './pages/ManagerLeavePage';
import TicketsPage from './pages/TicketsPage';
import AppTicketsPage from './pages/AppTicketsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<IndexPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Organization-only */}
      <Route element={<AuthGuard allowedRoles={['organization']} />}>
        <Route path="/organization" element={<OrganizationPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/geofencing" element={<GeofencingPage />} />
        <Route path="/wifi" element={<WifiPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/shifts" element={<ShiftsPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/manager-leave" element={<ManagerLeavePage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/app-tickets" element={<AppTicketsPage />} />
      </Route>

      {/* Employee-only */}
      <Route element={<AuthGuard allowedRoles={['employee']} />}>
        <Route path="/employee" element={<EmployeePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
