import { Motorbike } from '@/hooks/useData';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Bike, Calendar, QrCode, Edit, User, Hash, Palette, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MotorbikeDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorbike: Motorbike | null;
  onEdit: () => void;
}

export function MotorbikeDetailSheet({ open, onOpenChange, motorbike, onEdit }: MotorbikeDetailSheetProps) {
  if (!motorbike) return null;

  const registrationInitials = motorbike.registration_number
    .replace(/\s/g, '')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Motorbike Details</SheetTitle>
          <SheetDescription>Complete information about this motorbike</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={motorbike.photo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                <Bike className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold font-mono">{motorbike.registration_number}</h3>
              <p className="text-sm text-muted-foreground">
                {motorbike.make && motorbike.model 
                  ? `${motorbike.make} ${motorbike.model}`
                  : 'Make/Model not specified'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge status={motorbike.status} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Vehicle Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Vehicle Information</h4>
            <div className="grid grid-cols-2 gap-4">
              {motorbike.make && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Make</p>
                  <p className="font-medium">{motorbike.make}</p>
                </div>
              )}
              {motorbike.model && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Model</p>
                  <p className="font-medium">{motorbike.model}</p>
                </div>
              )}
              {motorbike.year && (
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Year</p>
                  </div>
                  <p className="font-medium">{motorbike.year}</p>
                </div>
              )}
              {motorbike.color && (
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Color</p>
                  </div>
                  <p className="font-medium capitalize">{motorbike.color}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Technical Details */}
          {(motorbike.chassis_number || motorbike.engine_number) && (
            <>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Technical Details</h4>
                <div className="grid grid-cols-1 gap-4">
                  {motorbike.chassis_number && (
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Chassis Number</p>
                      </div>
                      <p className="font-medium font-mono text-sm">{motorbike.chassis_number}</p>
                    </div>
                  )}
                  {motorbike.engine_number && (
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Engine Number</p>
                      </div>
                      <p className="font-medium font-mono text-sm">{motorbike.engine_number}</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Owner & Rider Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Associations</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Owner</p>
                </div>
                <p className="font-medium">{motorbike.owner?.full_name || 'Not assigned'}</p>
              </div>
              {motorbike.rider && (
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Rider</p>
                  </div>
                  <p className="font-medium">{motorbike.rider.full_name}</p>
                </div>
              )}
            </div>
          </div>

          {/* QR Code */}
          {motorbike.qr_code && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">QR Code</h4>
                <div className="flex items-center gap-3 rounded-lg border border-border p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <QrCode className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono font-medium">{motorbike.qr_code}</p>
                    <p className="text-xs text-muted-foreground">Scan to verify motorbike</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Registration Date */}
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Registration</h4>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Registered On</p>
              </div>
              <p className="font-medium">
                {format(new Date(motorbike.created_at), 'PPP')}
              </p>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={onEdit} className="flex-1">
              <Edit className="mr-2 h-4 w-4" />
              Edit Motorbike
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
