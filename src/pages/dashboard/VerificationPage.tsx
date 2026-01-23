import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function VerificationPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Verification</h1><p className="text-muted-foreground">QR code and SMS verification tools</p></div>
        <div className="rounded-xl border border-border bg-card p-8 text-center"><p className="text-muted-foreground">Verification tools coming soon</p></div>
      </div>
    </DashboardLayout>
  );
}
