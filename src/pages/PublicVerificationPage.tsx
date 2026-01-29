import { useParams } from 'react-router-dom';
import { useRiderByQRCode } from '@/hooks/useVerification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Shield, User, Bike, Building2, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function PublicVerificationPage() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const { data: rider, isLoading, error } = useRiderByQRCode(qrCode ?? '', undefined);

  if (!qrCode) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-xl font-semibold mb-2">Invalid verification link</h1>
            <p className="text-sm text-muted-foreground">No QR code was provided. Scan a rider&apos;s QR ID to verify.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verifying rider...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !rider) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h1 className="text-xl font-semibold mb-2">Rider not found</h1>
            <p className="text-sm text-muted-foreground">
              This QR code could not be verified. It may be invalid or the rider may no longer be registered.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = rider.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">BodaSure Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">Public rider verification</p>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 ring-2 ring-border">
                <AvatarImage src={rider.photo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  {rider.full_name}
                </h2>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {rider.id_number}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <StatusBadge status={rider.status} />
                  <StatusBadge status={rider.compliance_status} />
                  {rider.permit && <StatusBadge status={rider.permit.status} />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Permit & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rider.permit ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Permit</span>
                  <span className="font-mono font-medium">{rider.permit.permit_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={rider.permit.status} />
                </div>
                {rider.permit.expires_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expires</span>
                    <span>{format(new Date(rider.permit.expires_at), 'dd MMM yyyy')}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No active permit</p>
            )}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Compliance</span>
              <StatusBadge status={rider.compliance_status} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Organization & Plate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                Sacco
              </span>
              <span className="font-medium text-right">{rider.sacco?.name || '—'}</span>
            </div>
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Stage
              </span>
              <span className="font-medium text-right">{rider.stage?.name || '—'}</span>
            </div>
            {rider.motorbike && (
              <div className="flex justify-between text-sm items-center gap-2 pt-2 border-t">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Bike className="h-4 w-4" />
                  Plate
                </span>
                <span className="font-mono font-semibold">{rider.motorbike.registration_number}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
