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
import { ScrollArea } from '@/components/ui/scroll-area';
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
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No rider selected. Search or scan a QR code to verify.</p>
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
    <ScrollArea className="h-full w-full overflow-x-hidden">
      <div className="space-y-4 p-3 sm:p-4 w-full max-w-full overflow-x-hidden">
        {/* Rider Header Card */}
        <Card>
          <CardContent className="p-3 sm:p-4">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <QrCode className="h-5 w-5" />
              QR Code & Verification ID
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Scan QR or use hex code for verification
            </p>
          </CardHeader>
          <CardContent>
            {rider.qr_code ? (
              <div className="flex flex-wrap items-center gap-4">
                <div
                  className="cursor-pointer [perspective:320px] w-[136px] h-[136px] flex-shrink-0 rounded-lg"
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
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs text-muted-foreground">Click QR to flip and show hex code</p>
                  <p className="text-xs text-muted-foreground">Verification ID (hex)</p>
                  <p className="font-mono font-medium text-foreground break-all">{rider.qr_code}</p>
                  <p className="text-xs text-muted-foreground">Verify at: /verify/{rider.qr_code}</p>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Permit Status
            </CardTitle>
          </CardHeader>
          <CardContent>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5" />
              Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Sacco
                </span>
                <span className="font-medium">{rider.sacco?.name || 'Not assigned'}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Stage
                </span>
                <span className="font-medium">{rider.stage?.name || 'Not assigned'}</span>
              </div>
              {rider.motorbike && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Bike className="h-4 w-4" />
                      Bike Plate
                    </span>
                    <span className="font-mono font-medium">
                      {rider.motorbike.registration_number}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Penalty History Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Penalty History
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {penalty.penalty_type}
                        </Badge>
                        <StatusBadge status={penalty.is_paid ? 'paid' : 'unpaid'} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(penalty.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
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
    </ScrollArea>
  );
}
