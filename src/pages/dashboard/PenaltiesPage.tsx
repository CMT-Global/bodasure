import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function PenaltiesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Penalties</h1><p className="text-muted-foreground">Manage fines and violations</p></div>
        <div className="rounded-xl border border-border bg-card p-8 text-center"><p className="text-muted-foreground">Penalty management coming soon</p></div>
      </div>
    </DashboardLayout>
  );
}
