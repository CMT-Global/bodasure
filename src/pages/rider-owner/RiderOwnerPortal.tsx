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
import { Card, CardContent } from '@/components/ui/card';
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
  QrCode,
  Receipt,
  HelpCircle,
  Copy,
  Shield,
} from 'lucide-react';
import { format, parseISO, isAfter, addDays } from 'date-fns';
import { toast } from 'sonner';
import { QRCodeCanvas } from 'qrcode.react';
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
  const permitDaysLeft =
    latestPermit?.expires_at && (permitStatus === 'active' || permitStatus === 'expiring_soon')
      ? Math.max(
          0,
          Math.ceil(
            (parseISO(latestPermit.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
        )
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
            className="gap-2 min-h-[44px] touch-manipulation w-full sm:w-auto"
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
      {/* Quick actions – 2 cols mobile, 4 on large; large touch targets */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 min-w-0">
        <QuickActionCard
          title="Compliance Status"
          description="Check your compliance"
          icon={<Shield className="h-5 w-5 sm:h-6 sm:w-6" />}
          statusColor="orange"
          onClick={() => navigate('/rider-owner/compliance-status')}
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
          onClick={() => navigate('/rider-owner/qr-id')}
        />
        <QuickActionCard
          title="Support / Help"
          description="Get assistance"
          icon={<HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
          statusColor="green"
          onClick={() => navigate('/rider-owner/support-help')}
        />
      </div>

      {/* Permit status + Payments – same layout for visual balance */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 min-w-0">
        {/* Permit status card – mirrors Payments card layout */}
        <Card className="overflow-hidden rounded-xl border border-gray-600/50 dark:border-gray-500/40 bg-card transition-all hover:border-orange-500">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Shield
                    className={cn(
                      'h-4 w-4 shrink-0',
                      permitStatus === 'active' && 'text-green-600 dark:text-green-400',
                      (permitStatus === 'expiring_soon' || permitStatus === 'none' || permitStatus === 'pending') && 'text-orange-500',
                      permitStatus === 'expired' && 'text-red-500'
                    )}
                  />
                  Permit status
                </p>
                <p
                  className={cn(
                    'text-xl sm:text-2xl font-bold',
                    permitStatus === 'active' && 'text-green-600 dark:text-green-400',
                    permitStatus === 'expiring_soon' && 'text-amber-600 dark:text-amber-400',
                    permitStatus === 'expired' && 'text-red-600 dark:text-red-400',
                    (permitStatus === 'pending' || permitStatus === 'none') && 'text-muted-foreground'
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
                          : 'Not set'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {permitDaysLeft != null && (permitStatus === 'active' || permitStatus === 'expiring_soon')
                    ? `${permitDaysLeft} days left`
                    : permitStatus === 'expired'
                      ? 'Renew to stay compliant'
                      : permitStatus === 'pending'
                        ? 'Payment being processed'
                        : 'Get or renew your permit'}
                </p>
                {(permitStatus === 'expired' || permitStatus === 'expiring_soon' || permitStatus === 'none') ? (
                  <Button
                    size="sm"
                    className="mt-3 gap-2 bg-orange-500 hover:bg-orange-600 text-white border-0 min-h-[44px] touch-manipulation"
                    onClick={() => navigate('/rider-owner/permit-payments')}
                  >
                    <CreditCard className="h-4 w-4" />
                    {permitStatus === 'expired' ? 'Renew permit' : 'Pay permit'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3 gap-2 bg-muted hover:bg-muted/80 text-foreground min-h-[44px] touch-manipulation"
                    onClick={() => navigate('/rider-owner/compliance-status')}
                  >
                    <Shield className="h-4 w-4" />
                    View compliance
                  </Button>
                )}
              </div>
              <div
                className={cn(
                  'flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl flex-shrink-0',
                  permitStatus === 'active' && 'bg-green-500/10 text-green-600 dark:text-green-400',
                  (permitStatus === 'expiring_soon' || permitStatus === 'none' || permitStatus === 'pending') && 'bg-orange-500/10 text-orange-500',
                  permitStatus === 'expired' && 'bg-red-500/10 text-red-500'
                )}
              >
                <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments card */}
        <Card className="overflow-hidden rounded-xl border border-gray-600/50 dark:border-gray-500/40 bg-card transition-all hover:border-orange-500">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-orange-500" />
                  Payments
                </p>
                <p className={cn(
                  'text-xl sm:text-2xl font-bold text-foreground',
                  outstandingTotal > 0 && 'text-amber-600 dark:text-amber-400'
                )}>
                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(
                    outstandingTotal
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Outstanding penalties
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3 gap-2 bg-muted hover:bg-muted/80 text-foreground min-h-[44px] touch-manipulation"
                  onClick={() => setReceiptsOpen(true)}
                >
                  <Receipt className="h-4 w-4" />
                  View receipts
                </Button>
              </div>
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl flex-shrink-0 bg-green-500/10 text-green-600 dark:text-green-400">
                <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile hero card – clean, prominent identity block */}
      <Card className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex">
          {/* Orange accent strip */}
          <div className="w-1 sm:w-1.5 flex-shrink-0 bg-gradient-to-b from-orange-500 to-orange-600 rounded-l-2xl" />
          <CardContent className="p-6 sm:p-8 flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="relative flex-shrink-0">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-[3px] border-background shadow-lg ring-1 ring-black/5 dark:ring-white/5">
                  <AvatarImage src={displayPhoto} alt={displayName} className="object-cover" />
                  <AvatarFallback className="text-xl font-bold bg-muted text-foreground rounded-full">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                {permitStatus === 'active' && (
                  <span
                    className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-green-500 border-[3px] border-card shadow"
                    title="Permit active"
                    aria-hidden
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words leading-tight">
                  {displayName}
                </h1>
                {(saccoName || stageName) && (
                  <div className="flex items-start gap-2 text-muted-foreground min-w-0">
                    <Bike className="h-4 w-4 shrink-0 opacity-80 mt-0.5" aria-hidden />
                    <span className="text-sm break-words">
                      {[saccoName, stageName].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                )}
                {plateNumbers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {plateNumbers.map((plate) => (
                      <span
                        key={plate}
                        className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 font-mono text-xs font-medium text-foreground"
                      >
                        {plate}
                      </span>
                    ))}
                  </div>
                )}
                {data.rider.qr_code && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 mt-1 min-h-[44px] touch-manipulation w-full sm:w-auto shrink-0"
                    onClick={() => setQrOpen(true)}
                  >
                    <QrCode className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">View My QR ID</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      <PaymentHistoryDialog
        open={receiptsOpen}
        onOpenChange={setReceiptsOpen}
        riderId={data.rider.id}
        riderName={data.rider.full_name}
        countyId={data.rider.county_id}
      />

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-[min(400px,calc(100vw-2rem))] w-[calc(100vw-2rem)] sm:w-full overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 shrink-0" />
              My QR ID
            </DialogTitle>
            <DialogDescription>
              Show this code to enforcement or at checkpoints for verification.
            </DialogDescription>
          </DialogHeader>
          {data.rider.qr_code ? (
            <div className="space-y-4 min-w-0">
              <div className="flex justify-center rounded-lg bg-muted p-4 min-h-[200px] items-center">
                <QRCodeCanvas
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${encodeURIComponent(data.rider.qr_code)}`}
                  size={200}
                  level="M"
                  includeMargin
                />
              </div>
              <div className="rounded-lg bg-muted p-4 font-mono text-center text-sm break-all select-all overflow-x-auto">
                {data.rider.qr_code}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 min-h-[44px] touch-manipulation"
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
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? '';

  return (
    <RiderOwnerLayout>
      <div className="space-y-4 sm:space-y-6 max-w-full min-w-0 overflow-x-hidden">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold break-words">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            {firstName ? (
              <>Welcome back, <span className="text-foreground font-medium">{firstName}</span>. Your permit, payments, and quick actions.</>
            ) : (
              'Your permit, payments, and quick actions.'
            )}
          </p>
        </div>
        <RiderOwnerDashboardContent />
      </div>
    </RiderOwnerLayout>
  );
}
