import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultDashboardForRoles } from "@/utils/getDefaultDashboard";
import { Loader2 } from "lucide-react";

interface RedirectIfAuthenticatedProps {
  children: React.ReactNode;
}

/**
 * When the user is already logged in and roles are loaded, redirects to
 * complete-profile if incomplete, else to their portal dashboard.
 */
export function RedirectIfAuthenticated({ children }: RedirectIfAuthenticatedProps) {
  const { user, profile, roles, rolesLoaded, isLoading, isProfileComplete } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !user) return;
    if (!rolesLoaded) return;

    if (!isProfileComplete) {
      navigate("/complete-profile", { replace: true });
      return;
    }
    const dashboard = getDefaultDashboardForRoles(roles);
    navigate(dashboard, { replace: true });
  }, [user, roles, rolesLoaded, isLoading, isProfileComplete, navigate]);

  if (!user) {
    return <>{children}</>;
  }

  if (!rolesLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return null;
}
