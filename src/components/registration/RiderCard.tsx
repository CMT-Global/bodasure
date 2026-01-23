import { RiderWithDetails } from '@/hooks/useData';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye, Phone, CreditCard, Bike } from 'lucide-react';

interface RiderCardProps {
  rider: RiderWithDetails;
  onView: (rider: RiderWithDetails) => void;
}

export function RiderCard({ rider, onView }: RiderCardProps) {
  const initials = rider.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={rider.photo_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h3 className="font-semibold text-sm truncate">{rider.full_name}</h3>
              <p className="text-xs text-muted-foreground font-mono">{rider.id_number}</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={rider.status} />
              <StatusBadge status={rider.compliance_status} />
              {rider.permit && (
                <StatusBadge status={rider.permit.status} />
              )}
            </div>
            
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{rider.phone}</span>
              </div>
              
              {rider.sacco?.name && (
                <div className="text-muted-foreground">
                  <span className="font-medium">Sacco:</span> {rider.sacco.name}
                </div>
              )}
              
              {rider.stage?.name && (
                <div className="text-muted-foreground">
                  <span className="font-medium">Stage:</span> {rider.stage.name}
                </div>
              )}
              
              {rider.motorbike?.registration_number && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Bike className="h-3 w-3" />
                  <span className="font-mono">{rider.motorbike.registration_number}</span>
                </div>
              )}
              
              {rider.permit && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="h-3 w-3" />
                  <span className="font-mono">{rider.permit.permit_number}</span>
                </div>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => onView(rider)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Profile
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
