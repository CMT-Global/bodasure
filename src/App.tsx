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

            {/* Protected dashboard routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/riders"
              element={
                <ProtectedRoute>
                  <RidersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/registration-management"
              element={
                <ProtectedRoute>
                  <RegistrationManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/motorbikes"
              element={
                <ProtectedRoute>
                  <MotorbikesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/owners"
              element={
                <ProtectedRoute>
                  <OwnersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/saccos"
              element={
                <ProtectedRoute>
                  <SaccosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/stages"
              element={
                <ProtectedRoute>
                  <StagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/permits"
              element={
                <ProtectedRoute>
                  <PermitsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/payments"
              element={
                <ProtectedRoute>
                  <PaymentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/penalties"
              element={
                <ProtectedRoute>
                  <PenaltiesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/verification"
              element={
                <ProtectedRoute>
                  <VerificationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/reports"
              element={
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/users"
              element={
                <ProtectedRoute>
                  <UsersPage />
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
