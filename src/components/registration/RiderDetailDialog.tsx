import { RiderWithDetails } from '@/hooks/useData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Separator } from '@/components/ui/separator';
import { Phone, Mail, MapPin, Calendar, CreditCard, QrCode, Bike, Building2, MapPin as MapPinIcon } from 'lucide-react';
import { format } from 'date-fns';
import { RegistrationHistory } from './RegistrationHistory';
import { RiderStatusActions } from '@/components/riders/RiderStatusActions';
import { RiderComplianceActions } from '@/components/riders/RiderComplianceActions';

interface RiderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rider: RiderWithDetails | null;
  /** When true, show Approve / Reject / Suspend / Reinstate (e.g. county Registration Management) */
  showStatusActions?: boolean;
}

export function RiderDetailDialog({
  open,
  onOpenChange,
  rider,
  showStatusActions = false,
}: RiderDetailDialogProps) {
  if (!rider) return null;

  const initials = rider.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl h-[90vh] max-h-[90dvh] overflow-hidden flex flex-col p-0 gap-0 mx-4 sm:mx-6">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>Rider Profile</DialogTitle>
          <DialogDescription>Complete information about this rider</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 pb-6 min-w-0">
          <div className="space-y-6 pr-2 max-w-full">
            {/* Header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={rider.photo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{rider.full_name}</h3>
                <p className="text-sm text-muted-foreground font-mono">ID: {rider.id_number}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status={rider.status} />
                  <StatusBadge status={rider.compliance_status} />
                  {rider.permit && (
                    <StatusBadge status={rider.permit.status} />
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{rider.phone}</span>
                </div>
                {rider.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{rider.email}</span>
                  </div>
                )}
                {rider.address && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{rider.address}</span>
                  </div>
                )}
                {rider.date_of_birth && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(rider.date_of_birth), 'PPP')}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Organization & Vehicle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Organization</h4>
                <div className="space-y-2">
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Sacco</p>
                    </div>
                    <p className="font-medium">{rider.sacco?.name || 'Not assigned'}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Stage</p>
                    </div>
                    <p className="font-medium">{rider.stage?.name || 'Not assigned'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Vehicle & Permit</h4>
                <div className="space-y-2">
                  {rider.motorbike ? (
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Bike className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Bike Plate</p>
                      </div>
                      <p className="font-medium font-mono">{rider.motorbike.registration_number}</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm text-muted-foreground">No bike assigned</p>
                    </div>
                  )}
                  
                  {rider.permit ? (
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Permit Status</p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium font-mono">{rider.permit.permit_number}</p>
                        <StatusBadge status={rider.permit.status} />
                        {rider.permit.expires_at && (
                          <p className="text-xs text-muted-foreground">
                            Expires: {format(new Date(rider.permit.expires_at), 'PPP')}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm text-muted-foreground">No active permit</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* License Info */}
            {rider.license_number && (
              <>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">License Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">License Number</p>
                      </div>
                      <p className="font-medium font-mono">{rider.license_number}</p>
                    </div>
                    {rider.license_expiry && (
                      <div className="rounded-lg border border-border p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Expiry Date</p>
                        </div>
                        <p className="font-medium">
                          {format(new Date(rider.license_expiry), 'PPP')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* QR Code */}
            {rider.qr_code && (
              <>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">QR Code</h4>
                  <div className="flex items-center gap-3 rounded-lg border border-border p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <QrCode className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono font-medium">{rider.qr_code}</p>
                      <p className="text-xs text-muted-foreground">Scan to verify rider</p>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Registration History */}
            <RegistrationHistory riderId={rider.id} />

            {showStatusActions && (
              <>
                <Separator />
                <div className="space-y-6">
                  <h4 className="text-sm font-medium text-muted-foreground">Actions</h4>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                    <RiderStatusActions
                      rider={{ id: rider.id, full_name: rider.full_name, status: rider.status }}
                      contextLabel="rider"
                      onSuccess={() => onOpenChange(false)}
                    />
                    <RiderComplianceActions
                      rider={{
                        id: rider.id,
                        full_name: rider.full_name,
                        compliance_status: rider.compliance_status,
                      }}
                      onSuccess={() => onOpenChange(false)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
