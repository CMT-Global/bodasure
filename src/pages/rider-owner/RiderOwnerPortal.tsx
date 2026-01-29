import { RiderOwnerLayout } from '@/components/layout/RiderOwnerLayout';
import { Users, Bike } from 'lucide-react';

export default function RiderOwnerPortal() {
  return (
    <RiderOwnerLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">
            Rider & Owner Portal — manage riders and motorbike owners.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center justify-center gap-4 min-h-[280px] text-center">
          <div className="flex gap-4 text-muted-foreground">
            <Users className="h-12 w-12" />
            <Bike className="h-12 w-12" />
          </div>
          <p className="text-muted-foreground max-w-md">
            Welcome to the Rider & Owner dashboard. More features coming soon.
          </p>
        </div>
      </div>
    </RiderOwnerLayout>
  );
}
