import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Unauthorized() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/20 mb-6">
        <ShieldAlert className="h-10 w-10 text-destructive" />
      </div>
      
      <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        You don't have permission to access this page. Please contact your administrator if you believe this is an error.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild>
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}
