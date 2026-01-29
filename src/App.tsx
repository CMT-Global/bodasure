import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
// Import role assignment utility (makes it available in browser console)
import "@/utils/assignRole";

// Placeholder pages for dashboard sections
import RidersPage from "./pages/dashboard/RidersPage";
import RegistrationManagementPage from "./pages/dashboard/RegistrationManagementPage";
import MotorbikesPage from "./pages/dashboard/MotorbikesPage";
import OwnersPage from "./pages/dashboard/OwnersPage";
import SaccosPage from "./pages/dashboard/SaccosPage";
import StagesPage from "./pages/dashboard/StagesPage";
import PermitsPage from "./pages/dashboard/PermitsPage";
import PaymentsPage from "./pages/dashboard/PaymentsPage";
import PenaltiesPage from "./pages/dashboard/PenaltiesPage";
import VerificationPage from "./pages/dashboard/VerificationPage";
import ReportsPage from "./pages/dashboard/ReportsPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import UsersPage from "./pages/dashboard/UsersPage";
import SaccoPortal from "./pages/sacco/SaccoPortal";
import MemberManagementPage from "./pages/sacco/MemberManagementPage";
import RegistrationSupportPage from "./pages/sacco/RegistrationSupportPage";
import StageManagementPage from "./pages/sacco/StageManagementPage";
import CompliancePenaltiesPage from "./pages/sacco/CompliancePenaltiesPage";
import DisciplineIncidentPage from "./pages/sacco/DisciplineIncidentPage";
import SaccoProfileSettingsPage from "./pages/sacco/SaccoProfileSettingsPage";
import SaccoAuditLogsPage from "./pages/sacco/SaccoAuditLogsPage";
import CommunicationToolsPage from "./pages/sacco/CommunicationToolsPage";
import SaccoReportsPage from "./pages/sacco/SaccoReportsPage";
import RiderOwnerPortal from "./pages/rider-owner/RiderOwnerPortal";
import ProfileRegistrationPage from "./pages/rider-owner/ProfileRegistrationPage";
import PermitPaymentsPage from "./pages/rider-owner/PermitPaymentsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected dashboard routes — platform_super_admin and county_super_admin only */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/riders"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <RidersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/registration-management"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <RegistrationManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/motorbikes"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <MotorbikesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/owners"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <OwnersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/saccos"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <SaccosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/stages"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <StagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/permits"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <PermitsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/payments"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <PaymentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/penalties"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <PenaltiesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/verification"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <VerificationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/reports"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/users"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />

            {/* Sacco Portal routes */}
            <Route
              path="/sacco"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <SaccoPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/registration-support"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <RegistrationSupportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/members"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <MemberManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/stages"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <StageManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/compliance"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <CompliancePenaltiesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/discipline"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <DisciplineIncidentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/communication"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <CommunicationToolsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/reports"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <SaccoReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/settings"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <SaccoProfileSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/audit-logs"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin']}>
                  <SaccoAuditLogsPage />
                </ProtectedRoute>
              }
            />

            {/* Rider & Owner Portal - platform super admin and county admin */}
            <Route
              path="/rider-owner"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin', 'county_admin']}>
                  <RiderOwnerPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider-owner/profile"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin', 'county_admin']}>
                  <ProfileRegistrationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider-owner/permit-payments"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin', 'county_admin']}>
                  <PermitPaymentsPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
