import { Rider } from '@/hooks/useData';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Calendar, CreditCard, QrCode, Edit } from 'lucide-react';
import { format } from 'date-fns';

interface RiderDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rider: Rider | null;
  onEdit: () => void;
}

export function RiderDetailSheet({ open, onOpenChange, rider, onEdit }: RiderDetailSheetProps) {
  if (!rider) return null;

  const initials = rider.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Rider Details</SheetTitle>
          <SheetDescription>Complete information about this rider</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
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
              <p className="text-sm text-muted-foreground">ID: {rider.id_number}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge status={rider.status} />
                <StatusBadge status={rider.compliance_status} />
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

          {/* Organization */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Organization</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Sacco</p>
                <p className="font-medium">{rider.sacco?.name || 'Not assigned'}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Stage</p>
                <p className="font-medium">{rider.stage?.name || 'Not assigned'}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Owner</p>
                <p className="font-medium">{rider.owner?.full_name || 'Self-owned'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* License Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">License Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">License Number</p>
                </div>
                <p className="font-medium font-mono">{rider.license_number || 'Not provided'}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Expiry Date</p>
                </div>
                <p className="font-medium">
                  {rider.license_expiry 
                    ? format(new Date(rider.license_expiry), 'PPP')
                    : 'Not provided'}
                </p>
              </div>
            </div>
          </div>

          {/* QR Code */}
          {rider.qr_code && (
            <>
              <Separator />
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
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={onEdit} className="flex-1">
              <Edit className="mr-2 h-4 w-4" />
              Edit Rider
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
