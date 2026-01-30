import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';

export default function SuperAdminDashboard() {
  return (
    <SuperAdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">
            Super Admin portal dashboard.
          </p>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
