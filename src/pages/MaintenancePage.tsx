import { Wrench, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function MaintenancePage() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <Wrench className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold mb-2">Under maintenance</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        The system is undergoing scheduled maintenance to ensure improved reliability and compliance.
        We apologize for the inconvenience and appreciate your patience.
      </p>
      <Button variant="outline" onClick={() => signOut()}>
        <LogOut className="h-4 w-4 mr-2" />
        Log out
      </Button>
    </div>
  );
}
