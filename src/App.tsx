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
import SupportTicketsPage from "./pages/dashboard/SupportTicketsPage";
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
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import CountyManagementPage from "./pages/super-admin/CountyManagementPage";
import CountyConfigurationPage from "./pages/super-admin/CountyConfigurationPage";
import RevenueCommercialConfigPage from "./pages/super-admin/RevenueCommercialConfigPage";
import RolePermissionGovernancePage from "./pages/super-admin/RolePermissionGovernancePage";
import UserAccessGovernancePage from "./pages/super-admin/UserAccessGovernancePage";
import SaccoWelfareOversightPage from "./pages/super-admin/SaccoWelfareOversightPage";
import IncidentEscalationSupportPage from "./pages/super-admin/IncidentEscalationSupportPage";
import SecurityAuditCompliancePage from "./pages/super-admin/SecurityAuditCompliancePage";
import SystemSettingsPage from "./pages/super-admin/SystemSettingsPage";
import EnvironmentDeploymentControlsPage from "./pages/super-admin/EnvironmentDeploymentControlsPage";
import ProfileRegistrationPage from "./pages/rider-owner/ProfileRegistrationPage";
import PermitPaymentsPage from "./pages/rider-owner/PermitPaymentsPage";
import PenaltiesPaymentsPage from "./pages/rider-owner/PenaltiesPaymentsPage";
import ComplianceStatusPage from "./pages/rider-owner/ComplianceStatusPage";
import QRIdVerificationPage from "./pages/rider-owner/QRIdVerificationPage";
import SaccoStageInfoPage from "./pages/rider-owner/SaccoStageInfoPage";
import NotificationsPage from "./pages/rider-owner/NotificationsPage";
import SupportHelpPage from "./pages/rider-owner/SupportHelpPage";
import PublicVerificationPage from "./pages/PublicVerificationPage";
import {
  SUPER_ADMIN_PORTAL,
  COUNTY_PORTAL_ACCESS_ROLES,
  SACCO_PORTAL_ACCESS_ROLES,
} from "@/config/portalRoles";

const queryClient = new QueryClient();

/** Roles that can access the Super Admin portal (from single source of truth). */
const superAdminRequiredRoles = [...SUPER_ADMIN_PORTAL.roleKeys];

/** County Portal route access — see src/config/portalRoles.ts for role definitions. */
const countyPortalAll = [...COUNTY_PORTAL_ACCESS_ROLES] as string[];
const countySettingsAndUsersOnly = ["platform_super_admin", "county_super_admin"];
const countyVerificationOnly = ["platform_super_admin", "county_super_admin", "county_enforcement_officer"];
const countyRegistrationOnly = ["platform_super_admin", "county_super_admin", "county_registration_agent"];
const countyFinanceAndAnalyst = ["platform_super_admin", "county_super_admin", "county_finance_officer", "county_analyst"];
const countyRiders = ["platform_super_admin", "county_super_admin", "county_enforcement_officer", "county_registration_agent", "county_analyst"];
const countyPaymentsPermitsReports = ["platform_super_admin", "county_super_admin", "county_finance_officer", "county_analyst"];
const countyPenalties = ["platform_super_admin", "county_super_admin", "county_finance_officer", "county_enforcement_officer", "county_analyst"];
const countySaccos = ["platform_super_admin", "county_super_admin", "county_finance_officer", "county_analyst"];
const countyStages = ["platform_super_admin", "county_super_admin", "county_enforcement_officer", "county_registration_agent", "county_analyst"];
const countyMotorbikesOwners = ["platform_super_admin", "county_super_admin", "county_registration_agent", "county_analyst"];
const countySupportTickets = ["platform_super_admin", "county_super_admin"];

/** Sacco Portal: sacco_admin, sacco_officer, stage_chairman, stage_secretary, stage_treasurer; platform_super_admin for oversight. */
const saccoPortalAccess = ["platform_super_admin", ...SACCO_PORTAL_ACCESS_ROLES] as string[];
/** Sacco Profile & Settings and Audit Logs: Sacco/Welfare Admin only (and platform super admin). */
const saccoAdminOnly = ["platform_super_admin", "sacco_admin", "welfare_admin"];

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
            <Route path="/verify/:qrCode" element={<PublicVerificationPage />} />

            {/* Super Admin Portal — see src/config/portalRoles.ts */}
            <Route
              path="/super-admin"
              element={
                <ProtectedRoute requiredRoles={superAdminRequiredRoles}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/counties"
              element={
                <ProtectedRoute requiredRoles={superAdminRequiredRoles}>
                  <CountyManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/county-config"
              element={
                <ProtectedRoute requiredRoles={superAdminRequiredRoles}>
                  <CountyConfigurationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/revenue-config"
              element={
                <ProtectedRoute requiredRoles={superAdminRequiredRoles}>
                  <RevenueCommercialConfigPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/roles-governance"
              element={
                <ProtectedRoute requiredRoles={superAdminRequiredRoles}>
                  <RolePermissionGovernancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/user-access-governance"
              element={
                <ProtectedRoute requiredRoles={superAdminRequiredRoles}>
                  <UserAccessGovernancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/sacco-welfare-oversight"
              element={
                <ProtectedRoute requiredRoles={superAdminRequiredRoles}>
                  <SaccoWelfareOversightPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/incident-escalation-support"
              element={
                <ProtectedRoute requiredRoles={superAdminRequiredRoles}>
                  <IncidentEscalationSupportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/security-audit-compliance"
              element={
                <ProtectedRoute requiredRoles={superAdminRequiredRoles}>
                  <SecurityAuditCompliancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/environment-deployment"
              element={
                <ProtectedRoute requiredRoles={superAdminRequiredRoles}>
                  <EnvironmentDeploymentControlsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/system-settings"
              element={
                <ProtectedRoute requiredRoles={superAdminRequiredRoles}>
                  <SystemSettingsPage />
                </ProtectedRoute>
              }
            />

            {/* County Portal (dashboard) — access by role per src/config/portalRoles.ts */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRoles={countyPortalAll}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/riders"
              element={
                <ProtectedRoute requiredRoles={countyRiders}>
                  <RidersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/registration-management"
              element={
                <ProtectedRoute requiredRoles={countyRegistrationOnly}>
                  <RegistrationManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/motorbikes"
              element={
                <ProtectedRoute requiredRoles={countyMotorbikesOwners}>
                  <MotorbikesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/owners"
              element={
                <ProtectedRoute requiredRoles={countyMotorbikesOwners}>
                  <OwnersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/saccos"
              element={
                <ProtectedRoute requiredRoles={countySaccos}>
                  <SaccosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/stages"
              element={
                <ProtectedRoute requiredRoles={countyStages}>
                  <StagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/permits"
              element={
                <ProtectedRoute requiredRoles={countyPaymentsPermitsReports}>
                  <PermitsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/payments"
              element={
                <ProtectedRoute requiredRoles={countyPaymentsPermitsReports}>
                  <PaymentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/penalties"
              element={
                <ProtectedRoute requiredRoles={countyPenalties}>
                  <PenaltiesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/verification"
              element={
                <ProtectedRoute requiredRoles={countyVerificationOnly}>
                  <VerificationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/reports"
              element={
                <ProtectedRoute requiredRoles={countyPaymentsPermitsReports}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute requiredRoles={countySettingsAndUsersOnly}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/users"
              element={
                <ProtectedRoute requiredRoles={countySettingsAndUsersOnly}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/support-tickets"
              element={
                <ProtectedRoute requiredRoles={countySupportTickets}>
                  <SupportTicketsPage />
                </ProtectedRoute>
              }
            />

            {/* Sacco Portal routes — see src/config/portalRoles.ts (SACCO_PORTAL_ACCESS_ROLES, STAGE_ROLES) */}
            <Route
              path="/sacco"
              element={
                <ProtectedRoute requiredRoles={saccoPortalAccess}>
                  <SaccoPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/registration-support"
              element={
                <ProtectedRoute requiredRoles={saccoPortalAccess}>
                  <RegistrationSupportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/members"
              element={
                <ProtectedRoute requiredRoles={saccoPortalAccess}>
                  <MemberManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/stages"
              element={
                <ProtectedRoute requiredRoles={saccoPortalAccess}>
                  <StageManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/compliance"
              element={
                <ProtectedRoute requiredRoles={saccoPortalAccess}>
                  <CompliancePenaltiesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/discipline"
              element={
                <ProtectedRoute requiredRoles={saccoPortalAccess}>
                  <DisciplineIncidentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/communication"
              element={
                <ProtectedRoute requiredRoles={saccoPortalAccess}>
                  <CommunicationToolsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/reports"
              element={
                <ProtectedRoute requiredRoles={saccoPortalAccess}>
                  <SaccoReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/settings"
              element={
                <ProtectedRoute requiredRoles={saccoAdminOnly}>
                  <SaccoProfileSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sacco/audit-logs"
              element={
                <ProtectedRoute requiredRoles={saccoAdminOnly}>
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
            <Route
              path="/rider-owner/penalties-payments"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin', 'county_admin']}>
                  <PenaltiesPaymentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider-owner/qr-id"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin', 'county_admin']}>
                  <QRIdVerificationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider-owner/compliance-status"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin', 'county_admin']}>
                  <ComplianceStatusPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider-owner/sacco-stage"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin', 'county_admin']}>
                  <SaccoStageInfoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider-owner/notifications"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin', 'county_admin']}>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider-owner/support-help"
              element={
                <ProtectedRoute requiredRoles={['platform_super_admin', 'county_super_admin', 'county_admin']}>
                  <SupportHelpPage />
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
