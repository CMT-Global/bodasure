import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-muted-foreground">Manage your account and county settings</p></div>
        <div className="rounded-xl border border-border bg-card p-8 text-center"><p className="text-muted-foreground">Settings panel coming soon</p></div>
      </div>
    </DashboardLayout>
  );
}
