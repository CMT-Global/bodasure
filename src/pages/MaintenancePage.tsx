import { Wrench } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <Wrench className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold mb-2">Under maintenance</h1>
      <p className="text-muted-foreground max-w-md">
        We're performing scheduled maintenance. Please try again later.
      </p>
    </div>
  );
}
