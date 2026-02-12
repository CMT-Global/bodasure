import { RiderWithDetails } from '@/hooks/useData';
import { useRiderPenalties } from '@/hooks/usePenalties';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Separator } from '@/components/ui/separator';
import { format, differenceInDays } from 'date-fns';
import {
  User,
  Phone,
  CreditCard,
  Shield,
  AlertTriangle,
  Building2,
  MapPin,
  Bike,
  FileText,
  Loader2,
  QrCode,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { QRCodeCanvas } from 'qrcode.react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface EnforcementVerificationViewProps {
  rider: RiderWithDetails | null;
  countyId?: string;
}

export function EnforcementVerificationView({
  rider,
  countyId,
}: EnforcementVerificationViewProps) {
  const [qrFlipped, setQrFlipped] = useState(false);
  const { data: penalties = [], isLoading: penaltiesLoading } = useRiderPenalties(
    rider?.id || '',
    countyId
  );

  if (!rider) {
    return (
      <Card className="min-w-0 overflow-hidden">
        <CardContent className="p-4 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">
          <User className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50 shrink-0" />
          <p>No rider selected. Search by name or plate or scan a QR code to verify.</p>
        </CardContent>
      </Card>
    );
  }

  const initials = rider.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const unpaidPenalties = penalties.filter((p) => !p.is_paid);
  const totalUnpaid = unpaidPenalties.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-4 w-full max-w-full min-w-0 overflow-x-hidden pb-6">
        {/* Rider Header Card */}
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
                <AvatarImage src={rider.photo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg sm:text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold truncate">{rider.full_name}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground font-mono break-all">ID: {rider.id_number}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <StatusBadge status={rider.status} />
                  <StatusBadge status={rider.compliance_status} />
                  {rider.permit && <StatusBadge status={rider.permit.status} />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Code & Hex ID Card */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <QrCode className="h-5 w-5 shrink-0" />
              QR Code & Verification ID
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Scan QR or use hex code for verification
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {rider.qr_code ? (
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4">
                <div
                  className="cursor-pointer [perspective:320px] w-[136px] h-[136px] flex-shrink-0 rounded-lg touch-manipulation"
                  onClick={() => setQrFlipped((f) => !f)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setQrFlipped((f) => !f)}
                  aria-label={qrFlipped ? 'Show QR code' : 'Show hex code'}
                >
                  <div
                    className={cn(
                      'relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]',
                      qrFlipped && '[transform:rotateY(180deg)]'
                    )}
                  >
                    <div className="absolute inset-0 [backface-visibility:hidden] bg-white p-2 rounded-lg border shadow-sm inline-flex items-center justify-center">
                      <QRCodeCanvas
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${encodeURIComponent(rider.qr_code)}`}
                        size={112}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div
                      className={cn(
                        'absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]',
                        'bg-muted/80 rounded-lg border shadow-sm inline-flex items-center justify-center p-3'
                      )}
                    >
                      <p className="font-mono text-xs break-all text-center text-foreground select-all">
                        {rider.qr_code}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 w-full sm:w-auto sm:flex-1 space-y-2">
                  <p className="text-xs text-muted-foreground">Click QR to flip and show hex code</p>
                  <p className="text-xs text-muted-foreground">Verification ID (hex)</p>
                  <p className="font-mono font-medium text-foreground break-all">{rider.qr_code}</p>
                  <p className="text-xs text-muted-foreground break-all">Verify at: /verify/{rider.qr_code}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 gap-2">
                <QrCode className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground font-medium">No QR code assigned</p>
                <p className="text-xs text-muted-foreground">This rider has no verification QR/hex ID.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permit Status Card */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="h-5 w-5 shrink-0" />
              Permit Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {rider.permit ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Permit Number</span>
                  <span className="font-mono font-medium">{rider.permit.permit_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={rider.permit.status} />
                </div>
                {rider.permit.expires_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Expiry Date</span>
                    <div className="text-right">
                      <p>{format(new Date(rider.permit.expires_at), 'PPP')}</p>
                      {rider.permit.status === 'active' && (
                        <p
                          className={`text-xs ${
                            differenceInDays(new Date(rider.permit.expires_at), new Date()) <= 30
                              ? 'text-yellow-500'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {differenceInDays(new Date(rider.permit.expires_at), new Date())} days
                          left
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active permit</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance Status Card */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={rider.compliance_status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Registration Status</span>
                <StatusBadge status={rider.status} />
              </div>
              {unpaidPenalties.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive mb-1">
                    {unpaidPenalties.length} Unpaid Penalty{unpaidPenalties.length > 1 ? 'ies' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total: {new Intl.NumberFormat('en-KE', {
                      style: 'currency',
                      currency: 'KES',
                    }).format(totalUnpaid)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sacco & Stage Card */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Building2 className="h-5 w-5 shrink-0" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
                  <Building2 className="h-4 w-4 shrink-0" />
                  Sacco
                </span>
                <span className="font-medium truncate">{rider.sacco?.name || 'Not assigned'}</span>
              </div>
              <Separator />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
                  <MapPin className="h-4 w-4 shrink-0" />
                  Stage
                </span>
                <span className="font-medium truncate">{rider.stage?.name || 'Not assigned'}</span>
              </div>
              {rider.motorbike && (
                <>
                  <Separator />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
                      <Bike className="h-4 w-4 shrink-0" />
                      Bike Plate
                    </span>
                    <span className="font-mono font-medium truncate">
                      {rider.motorbike.registration_number}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Motorbike details card (when rider is assigned to a bike) */}
        {rider.motorbike && (
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Bike className="h-5 w-5 shrink-0" />
                Motorbike details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-sm text-muted-foreground">Plate</span>
                  <span className="font-mono font-medium">{rider.motorbike.registration_number}</span>
                </div>
                {rider.motorbike.make && (
                  <>
                    <Separator />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="text-sm text-muted-foreground">Make</span>
                      <span className="font-medium">{rider.motorbike.make}</span>
                    </div>
                  </>
                )}
                {rider.motorbike.model && (
                  <>
                    <Separator />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="text-sm text-muted-foreground">Model</span>
                      <span className="font-medium">{rider.motorbike.model}</span>
                    </div>
                  </>
                )}
                {rider.motorbike.color && (
                  <>
                    <Separator />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="text-sm text-muted-foreground">Color</span>
                      <span className="font-medium capitalize">{rider.motorbike.color}</span>
                    </div>
                  </>
                )}
                {rider.motorbike.year != null && (
                  <>
                    <Separator />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="text-sm text-muted-foreground">Year</span>
                      <span className="font-medium">{rider.motorbike.year}</span>
                    </div>
                  </>
                )}
                {rider.motorbike.chassis_number && (
                  <>
                    <Separator />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="text-sm text-muted-foreground">Chassis number</span>
                      <span className="font-mono font-medium text-sm break-all">{rider.motorbike.chassis_number}</span>
                    </div>
                  </>
                )}
                {rider.motorbike.engine_number && (
                  <>
                    <Separator />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="text-sm text-muted-foreground">Engine number</span>
                      <span className="font-mono font-medium text-sm break-all">{rider.motorbike.engine_number}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Penalty History Card */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-5 w-5 shrink-0" />
              Penalty History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {penaltiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : penalties.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>No penalties recorded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {penalties.slice(0, 5).map((penalty) => (
                  <div
                    key={penalty.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-border min-w-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {penalty.penalty_type}
                        </Badge>
                        <StatusBadge status={penalty.is_paid ? 'paid' : 'unpaid'} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(penalty.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <p className="font-semibold text-sm sm:text-base">
                        {new Intl.NumberFormat('en-KE', {
                          style: 'currency',
                          currency: 'KES',
                        }).format(penalty.amount)}
                      </p>
                    </div>
                  </div>
                ))}
                {penalties.length > 5 && (
                  <p className="text-xs text-center text-muted-foreground">
                    +{penalties.length - 5} more penalties
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info Card */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Phone className="h-5 w-5 shrink-0" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{rider.phone}</span>
              </div>
              {rider.email && (
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{rider.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
