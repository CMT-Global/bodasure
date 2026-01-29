import { useRef } from 'react';
import { RiderOwnerLayout } from '@/components/layout/RiderOwnerLayout';
import { useAuth } from '@/hooks/useAuth';
import {
  useRiderOwnerDashboard,
  EXPIRING_SOON_DAYS,
  type RiderOwnerDashboardData,
} from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

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
    const canvas = qrCanvasRef.current;
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
      <div className="space-y-6 max-w-lg mx-auto">
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
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="h-7 w-7 text-primary" />
          QR ID &amp; Verification
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your digital ID card. Scan the QR to open the public verification page.
        </p>
      </div>

      {/* ID Card - also used for print */}
      <Card
        id="qr-id-card"
        className="overflow-hidden border-2 print:shadow-none print:border-2"
      >
        <CardHeader className="pb-2 pt-4 px-4 sm:px-6 bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">B</span>
            </div>
            <div>
              <CardTitle className="text-base">BodaSure Rider ID</CardTitle>
              <CardDescription className="text-xs">Scan QR to verify</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex gap-4 sm:gap-6">
            {/* Photo + QR */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-2 ring-border">
                <AvatarImage src={displayPhoto} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              {rider.qr_code ? (
                <div className="bg-white p-2 rounded-lg border inline-flex">
                  <QRCodeCanvas
                    ref={qrCanvasRef}
                    value={verificationUrl}
                    size={120}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              ) : (
                <div className="h-[120px] w-[120px] rounded-lg border bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground text-center px-2">
                    No QR assigned
                  </span>
                </div>
              )}
            </div>
            {/* Details */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Name</p>
                <p className="font-semibold truncate">{displayName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Bike className="h-3.5 w-3.5" />
                  Plate
                </p>
                <p className="font-mono font-semibold">{primaryPlate}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  Sacco / Stage
                </p>
                <p className="text-sm font-medium">
                  {saccoName || stageName
                    ? [saccoName, stageName].filter(Boolean).join(' · ')
                    : '—'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider w-full flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  Permit / Compliance
                </p>
                <StatusBadge status={permitStatus === 'none' ? 'pending' : permitStatus} />
                <StatusBadge status={complianceStatus} />
                {permitExpiry && permitStatus !== 'none' && (
                  <span className="text-xs text-muted-foreground">Exp: {permitExpiry}</span>
                )}
              </div>
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
