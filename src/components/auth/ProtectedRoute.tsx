import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMaintenanceSettings, isUserUnderMaintenance } from '@/hooks/useMaintenanceSettings';
import MaintenancePage from '@/pages/MaintenancePage';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, roles, isLoading, isLoadingRoles, rolesLoaded, hasRole, isProfileComplete, countyId, isPlatformAdmin } = useAuth();
  const { data: maintenanceSettings, isLoading: maintenanceLoading } = useMaintenanceSettings();
  const location = useLocation();
  const pathname = location.pathname;

  // Wait for auth to load
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for roles to be loaded (either successfully or with error)
  if (isLoadingRoles || !rolesLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading permissions...</p>
        </div>
      </div>
    );
  }

  // Mandatory profile completion before accessing any protected route (except /complete-profile)
  if (!isProfileComplete && pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  // Maintenance mode: show full-page message for affected users (platform admins always bypass)
  if (!maintenanceLoading && isUserUnderMaintenance(maintenanceSettings, { countyId, isPlatformAdmin: isPlatformAdmin() })) {
    return <MaintenancePage />;
  }

  // When requiredRoles is specified, enforce them strictly (no bypass) — e.g. Super Admin Portal only for platform_super_admin/platform_admin
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role =>
      roles.some(userRole => userRole.role === role)
    );

    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
    return <>{children}</>;
  }

  // Super admins have access to everything else - bypass role checks
  const isSuperAdmin = hasRole('platform_super_admin') || hasRole('county_super_admin');

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
