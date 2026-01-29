import { useRef } from 'react';
import { RiderOwnerLayout } from '@/components/layout/RiderOwnerLayout';
import { useAuth } from '@/hooks/useAuth';
import {
  useRiderOwnerDashboard,
  EXPIRING_SOON_DAYS,
  type RiderOwnerDashboardData,
} from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  QrCode,
  Download,
  Printer,
  Bike,
  Building2,
  Shield,
  AlertCircle,
  User,
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

function QRIdVerificationContent() {
  const { user, profile } = useAuth();
  const { data, isLoading, error } = useRiderOwnerDashboard(user?.id);
  const qrMobileRef = useRef<HTMLCanvasElement>(null);
  const qrDesktopRef = useRef<HTMLCanvasElement>(null);

  const rider = data?.rider;
  const displayName = rider?.full_name ?? profile?.full_name ?? 'Rider';
  const displayPhoto = rider?.photo_url ?? profile?.avatar_url ?? undefined;
  const plateNumbers = data?.motorbikes?.map((m) => m.registration_number) ?? [];
  const primaryPlate = plateNumbers[0] ?? '—';
  const saccoName = rider?.sacco?.name ?? null;
  const stageName = rider?.stage?.name ?? null;
  const latestPermit = data?.permits?.[0];
  const permitStatus = getPermitDisplayStatus(latestPermit);
  const permitExpiry = latestPermit?.expires_at
    ? format(parseISO(latestPermit.expires_at), 'dd MMM yyyy')
    : null;
  const complianceStatus = rider?.compliance_status ?? 'pending_review';

  const verificationUrl = rider?.qr_code
    ? `${window.location.origin}/verify/${encodeURIComponent(rider.qr_code)}`
    : '';

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const handleDownloadQR = () => {
    const isMediumOrLarger = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
    const canvas = isMediumOrLarger ? qrDesktopRef.current : qrMobileRef.current;
    if (!canvas) {
      toast.error('QR code not ready');
      return;
    }
    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `bodasure-qr-${rider?.qr_code ?? 'id'}.png`;
      a.click();
      toast.success('QR code downloaded');
    } catch {
      toast.error('Failed to download QR code');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
        <p className="text-destructive font-medium">Failed to load your profile</p>
        <p className="text-sm text-muted-foreground mt-1">Please try again later.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-full min-w-0">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[340px] w-full rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="rounded-xl border border-muted bg-muted/30 p-6 text-center">
        <User className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
        <p className="font-medium">No rider profile found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Complete your registration in Profile &amp; Registration to get your QR ID.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full min-w-0">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="h-7 w-7 text-primary" />
          QR ID &amp; Verification
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your digital ID card. Scan the QR to open the public verification page.
        </p>
      </div>

      {/* ID Card: mobile = compact card; md+ = airplane ticket / boarding pass */}
      <Card
        id="qr-id-card"
        className={cn(
          'overflow-hidden border-2 border-primary/20 shadow-lg print:shadow-none print:border-2',
          'max-w-lg',
          'md:max-w-4xl md:flex md:flex-col md:rounded-2xl md:border-primary/30'
        )}
      >
        {/* Brand header — full width, ticket-style on md+ */}
        <div className="bg-gradient-to-r from-primary to-primary/90 px-4 sm:px-6 py-3.5 md:flex md:items-center md:justify-between md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center shadow-inner flex-shrink-0">
              <span className="text-lg font-bold text-white">B</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight">BodaSure Rider ID</h2>
              <p className="text-xs text-white/80">Scan QR to verify</p>
            </div>
          </div>
          {/* Ticket-style label on md+ */}
          <p className="hidden md:block text-[10px] font-semibold text-white/70 uppercase tracking-[0.2em]">
            Rider boarding pass
          </p>
        </div>

        {/* Main content */}
        <CardContent className="p-4 sm:p-5 bg-card md:p-0 md:flex md:flex-col md:flex-1 md:min-w-0 md:border-t md:border-border/50 md:border-t-primary/10">
          <div className="flex gap-5 sm:gap-6 md:hidden">
            {/* Photo + QR — mobile only */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-2 ring-primary/30 shadow-md">
                <AvatarImage src={displayPhoto} />
                <AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              {rider.qr_code ? (
                <div className="bg-white p-2 rounded-lg border shadow-sm inline-flex">
                  <QRCodeCanvas
                    ref={qrMobileRef}
                    value={verificationUrl}
                    size={112}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              ) : (
                <div className="h-[112px] w-[112px] rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 flex flex-col items-center justify-center gap-1.5">
                  <QrCode className="h-8 w-8 text-muted-foreground/50" />
                  <span className="text-[11px] text-muted-foreground text-center px-2 font-medium">
                    No QR assigned
                  </span>
                </div>
              )}
            </div>
            {/* Details — mobile */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-2.5">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Name</p>
                <p className="font-semibold text-base truncate mt-0.5">{displayName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Bike className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Plate</p>
                  <p className="font-mono font-semibold text-sm mt-0.5">{primaryPlate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Sacco / Stage</p>
                  <p className="text-sm font-medium truncate mt-0.5">
                    {saccoName || stageName
                      ? [saccoName, stageName].filter(Boolean).join(' · ')
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-0.5">
                <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Permit / Compliance</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <StatusBadge status={permitStatus === 'none' ? 'pending' : permitStatus} />
                    <StatusBadge status={complianceStatus} />
                    {permitExpiry && permitStatus !== 'none' && (
                      <span className="text-[11px] text-muted-foreground">Exp: {permitExpiry}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* md+ airplane ticket layout */}
          <div className="hidden md:flex md:flex-1 md:min-w-0 md:flex-row md:bg-card">
            {/* Left: passenger info */}
            <div className="relative flex-1 flex items-center gap-5 pl-6 pr-4 py-5 min-w-0">
              <div className="flex items-center gap-4 flex-shrink-0 min-w-0">
                <Avatar className="h-16 w-16 ring-2 ring-primary/30 shadow-md flex-shrink-0">
                  <AvatarImage src={displayPhoto} />
                  <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 min-w-0 flex-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium">
                      Passenger
                    </p>
                    <p className="font-semibold text-base truncate mt-0.5">{displayName}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium flex items-center gap-1">
                        <Bike className="h-3 w-3" /> Plate
                      </p>
                      <p className="font-mono font-semibold text-sm mt-0.5">{primaryPlate}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Sacco / Stage
                      </p>
                      <p className="text-sm font-medium truncate mt-0.5 max-w-[180px]">
                        {saccoName || stageName
                          ? [saccoName, stageName].filter(Boolean).join(' · ')
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Permit / Compliance
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <StatusBadge status={permitStatus === 'none' ? 'pending' : permitStatus} />
                      <StatusBadge status={complianceStatus} />
                      {permitExpiry && permitStatus !== 'none' && (
                        <span className="text-[11px] text-muted-foreground">Exp {permitExpiry}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Perforation / tear line */}
            <div
              className="flex-shrink-0 w-6 flex flex-col items-center self-stretch"
              aria-hidden
            >
              <div
                className="w-px flex-1 min-h-[120px] self-stretch"
                style={{
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 3px, hsl(var(--muted-foreground) / 0.4) 3px, hsl(var(--muted-foreground) / 0.4) 5px)`,
                }}
              />
            </div>

            {/* QR stub */}
            <div className="flex-shrink-0 w-52 flex flex-col items-center justify-center gap-3 py-5 pr-6 bg-card">
              {rider.qr_code ? (
                <div className="bg-white p-2 rounded-lg border shadow-sm inline-flex">
                  <QRCodeCanvas
                    ref={qrDesktopRef}
                    value={verificationUrl}
                    size={120}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              ) : (
                <div className="h-[120px] w-[120px] rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 flex flex-col items-center justify-center gap-1.5">
                  <QrCode className="h-8 w-8 text-muted-foreground/50" />
                  <span className="text-[11px] text-muted-foreground text-center px-2 font-medium">
                    No QR assigned
                  </span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium">
                Scan to verify
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 print:hidden">
        <Button onClick={handleDownloadQR} variant="outline" className="gap-2" disabled={!rider.qr_code}>
          <Download className="h-4 w-4" />
          Download QR as image
        </Button>
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          Print ID card
        </Button>
      </div>

      {/* Print-only styles: hide nav and show only card */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #qr-id-card, #qr-id-card * { visibility: visible; }
          #qr-id-card { position: absolute; left: 0; top: 0; width: 100%; max-width: 400px; }
        }
      `}</style>
    </div>
  );
}

export default function QRIdVerificationPage() {
  return (
    <RiderOwnerLayout>
      <QRIdVerificationContent />
    </RiderOwnerLayout>
  );
}
