import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiderOwnerLayout } from '@/components/layout/RiderOwnerLayout';
import { useAuth } from '@/hooks/useAuth';
import {
  useRiderOwnerDashboard,
  EXPIRING_SOON_DAYS,
  type RiderOwnerDashboardData,
} from '@/hooks/useData';
import { PaymentHistoryDialog } from '@/components/payments/PaymentHistoryDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { QuickActionCard } from '@/components/dashboard/QuickActionCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bike,
  CreditCard,
  AlertCircle,
  Calendar,
  QrCode,
  Receipt,
  HelpCircle,
  Copy,
  Shield,
} from 'lucide-react';
import { format, parseISO, isAfter, addDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type PermitDisplayStatus = 'active' | 'expired' | 'expiring_soon' | 'pending' | 'none';

function getPermitDisplayStatus(
  permit: RiderOwnerDashboardData['permits'][0] | undefined
): PermitDisplayStatus {
  if (!permit) return 'none';
  if (permit.status === 'pending') return 'pending';
  if (permit.status === 'expired') return 'expired';
  if (permit.status === 'active' && permit.expires_at) {
    const expiresAt = parseISO(permit.expires_at);
    if (isAfter(new Date(), expiresAt)) return 'expired';
    if (isAfter(addDays(new Date(), EXPIRING_SOON_DAYS), expiresAt)) return 'expiring_soon';
    return 'active';
  }
  return permit.status === 'active' ? 'active' : 'none';
}

function RiderOwnerDashboardContent() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data, isLoading, error } = useRiderOwnerDashboard(user?.id);
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const displayName = data?.rider?.full_name ?? profile?.full_name ?? 'Rider';
  const displayPhoto = data?.rider?.photo_url ?? profile?.avatar_url ?? undefined;
  const plateNumbers = data?.motorbikes?.map((m) => m.registration_number) ?? [];
  const saccoName = data?.rider?.sacco?.name ?? null;
  const stageName = data?.rider?.stage?.name ?? null;
  const latestPermit = data?.permits?.[0];
  const permitStatus = getPermitDisplayStatus(latestPermit);
  const permitExpiry = latestPermit?.expires_at
    ? format(parseISO(latestPermit.expires_at), 'dd MMM yyyy')
    : null;
  const outstandingTotal = data?.outstandingPenaltiesTotal ?? 0;
  const lastPaymentDate = data?.lastPayment?.paid_at
    ? format(parseISO(data.lastPayment.paid_at), 'dd MMM yyyy')
    : null;

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const handleCopyQr = () => {
    if (data?.rider?.qr_code) {
      navigator.clipboard.writeText(data.rider.qr_code);
      toast.success('QR code copied');
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
        <p className="text-destructive font-medium">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground mt-1">Please try again later.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-full min-w-0">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Owner-only: linked as owner but not as rider – show owner summary + quick actions
  if (!data?.rider && data?.owner) {
    const ownerName = data.owner.full_name ?? profile?.full_name ?? 'Owner';
    return (
      <div className="space-y-4 sm:space-y-6 max-w-full min-w-0">
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-border">
                <AvatarImage src={profile?.avatar_url} alt={ownerName} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {getInitials(ownerName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold truncate">{ownerName}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Linked as owner</p>
                {data.ownedBikesCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {data.ownedBikesCount} bike{data.ownedBikesCount !== 1 ? 's' : ''} registered
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold px-1">Quick actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <QuickActionCard
              title="Profile & Registration"
              description="Complete or update your profile"
              icon={<Shield className="h-5 w-5 sm:h-6 sm:w-6" />}
              statusColor="default"
              onClick={() => navigate('/rider-owner/profile')}
            />
            <QuickActionCard
              title="Support & Help"
              description="Get assistance"
              icon={<HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
              statusColor="green"
              onClick={() => navigate('/rider-owner/support-help')}
            />
          </div>
        </div>
      </div>
    );
  }

  // No rider and no owner – show message + quick actions so the page is still useful
  if (!data?.rider) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-full min-w-0">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center">
          <Bike className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">No rider profile linked</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your account is not linked to a rider or owner record. Contact your Sacco or county
            admin to link your profile, or complete your profile below.
          </p>
          <Button
            variant="default"
            onClick={() => navigate('/rider-owner/profile')}
            className="gap-2"
          >
            <Shield className="h-4 w-4" />
            Profile & Registration
          </Button>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold px-1">Quick actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <QuickActionCard
              title="Profile & Registration"
              description="Complete or update your profile"
              icon={<Shield className="h-5 w-5 sm:h-6 sm:w-6" />}
              statusColor="default"
              onClick={() => navigate('/rider-owner/profile')}
            />
            <QuickActionCard
              title="Support & Help"
              description="Get assistance"
              icon={<HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
              statusColor="green"
              onClick={() => navigate('/rider-owner/support-help')}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full min-w-0">
      {/* Rider name + photo */}
      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-border">
              <AvatarImage src={displayPhoto} alt={displayName} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold truncate">{displayName}</h1>
              {plateNumbers.length > 0 && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {plateNumbers.join(', ')}
                </p>
              )}
              {(saccoName || stageName) && (
                <p className="text-sm text-muted-foreground">
                  {[saccoName, stageName].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permit status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Permit status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge
              variant={
                permitStatus === 'active'
                  ? 'default'
                  : permitStatus === 'expiring_soon'
                    ? 'secondary'
                    : permitStatus === 'expired'
                      ? 'destructive'
                      : 'outline'
              }
              className={cn(
                permitStatus === 'expiring_soon' &&
                  'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
              )}
            >
              {permitStatus === 'active'
                ? 'Active'
                : permitStatus === 'expiring_soon'
                  ? 'Expiring soon'
                  : permitStatus === 'expired'
                    ? 'Expired'
                    : permitStatus === 'pending'
                      ? 'Pending'
                      : '—'}
            </Badge>
          </div>
          {permitExpiry && (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Expiry date
              </span>
              <span className="font-medium">{permitExpiry}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outstanding penalties & last payment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Outstanding penalties</span>
            <span className={cn('font-medium', outstandingTotal > 0 && 'text-destructive')}>
              {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(
                outstandingTotal
              )}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Last payment</span>
            <span className="font-medium">{lastPaymentDate ?? '—'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions - card grid matching county portal dashboard */}
      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold px-1">Quick actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <QuickActionCard
            title="Compliance Status"
            description="Check your compliance"
            icon={<Shield className="h-5 w-5 sm:h-6 sm:w-6" />}
            statusColor="green"
            onClick={() => navigate('/rider-owner/compliance-status')}
          />
          <QuickActionCard
            title="Pay Permit"
            description="Renew or pay for permit"
            icon={<CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />}
            statusColor="default"
            onClick={() => navigate('/rider-owner/permit-payments')}
          />
          <QuickActionCard
            title="Pay Penalty"
            description="Settle outstanding penalties"
            icon={<CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />}
            statusColor={outstandingTotal > 0 ? 'amber' : 'green'}
            onClick={() => navigate('/rider-owner/penalties-payments')}
          />
          <QuickActionCard
            title="View My QR ID"
            description="Show at checkpoints"
            icon={<QrCode className="h-5 w-5 sm:h-6 sm:w-6" />}
            statusColor="green"
            onClick={() => setQrOpen(true)}
          />
          <QuickActionCard
            title="View Receipts / Payments"
            description="Payment history"
            icon={<Receipt className="h-5 w-5 sm:h-6 sm:w-6" />}
            statusColor="green"
            onClick={() => setReceiptsOpen(true)}
          />
          <QuickActionCard
            title="Support / Help"
            description="Get assistance"
            icon={<HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
            statusColor="green"
            onClick={() => navigate('/rider-owner/support-help')}
          />
        </div>
      </div>

      <PaymentHistoryDialog
        open={receiptsOpen}
        onOpenChange={setReceiptsOpen}
        riderId={data.rider.id}
        riderName={data.rider.full_name}
        countyId={data.rider.county_id}
      />

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              My QR ID
            </DialogTitle>
            <DialogDescription>
              Show this code to enforcement or at checkpoints for verification.
            </DialogDescription>
          </DialogHeader>
          {data.rider.qr_code ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted p-4 font-mono text-center text-sm break-all select-all">
                {data.rider.qr_code}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={handleCopyQr}
              >
                <Copy className="h-4 w-4" />
                Copy code
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No QR code assigned yet.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RiderOwnerPortal() {
  return (
    <RiderOwnerLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Your permit, penalties, and quick actions.
          </p>
        </div>
        <RiderOwnerDashboardContent />
      </div>
    </RiderOwnerLayout>
  );
}
