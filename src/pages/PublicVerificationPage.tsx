import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useRiderByQRCode, useRiderByPlate } from '@/hooks/useVerification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, User, Loader2, AlertCircle, QrCode, Hash, MapPin, Building2, MapPinned, CheckCircle2, Home, Search, ClipboardList, Bike } from 'lucide-react';
import { RiderWithDetails } from '@/hooks/useData';

type PublicRider = RiderWithDetails & { countyName?: string | null };

/** Public view: name, photo, permit status, county, sacco, stage, compliance. No personal data, penalties, or actions. */
function PublicRiderResult({ rider }: { rider: PublicRider }) {
  const initials = rider.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const DetailRow = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border/50 last:border-0 last:pb-0 first:pt-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-medium text-right min-w-0">
        {typeof value === 'string' ? <span className="block truncate">{value}</span> : value}
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto space-y-5">
      <Card className="overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 ring-2 ring-primary/20">
              <AvatarImage src={rider.photo_url || undefined} alt={rider.full_name} />
              <AvatarFallback className="bg-primary/15 text-primary text-lg sm:text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                {rider.full_name}
              </h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {rider.permit ? (
                  <StatusBadge status={rider.permit.status} />
                ) : (
                  <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    No active permit
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Permit status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {rider.permit ? (
            <div className="flex justify-between items-center gap-2 py-1">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={rider.permit.status} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active permit on file.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Registration details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-0">
          {'countyName' in rider && rider.countyName && (
            <DetailRow icon={MapPin} label="County" value={rider.countyName} />
          )}
          {rider.sacco?.name && (
            <DetailRow icon={Building2} label="Sacco" value={rider.sacco.name} />
          )}
          {rider.stage?.name && (
            <DetailRow icon={MapPinned} label="Stage" value={rider.stage.name} />
          )}
          <DetailRow
            icon={CheckCircle2}
            label="Compliance"
            value={<StatusBadge status={rider.compliance_status ?? 'pending_review'} />}
          />
        </CardContent>
      </Card>

      {rider.motorbike && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Bike className="h-4 w-4 text-muted-foreground" />
              Motorbike details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-0">
            <DetailRow icon={Hash} label="Plate" value={rider.motorbike.registration_number} />
            {rider.motorbike.make && (
              <DetailRow icon={Bike} label="Make" value={rider.motorbike.make} />
            )}
            {rider.motorbike.model && (
              <DetailRow icon={Bike} label="Model" value={rider.motorbike.model} />
            )}
            {rider.motorbike.color && (
              <DetailRow icon={Bike} label="Color" value={rider.motorbike.color} />
            )}
            {rider.motorbike.year != null && (
              <DetailRow icon={Bike} label="Year" value={String(rider.motorbike.year)} />
            )}
            {rider.motorbike.chassis_number && (
              <DetailRow icon={Hash} label="Chassis number" value={rider.motorbike.chassis_number} />
            )}
            {rider.motorbike.engine_number && (
              <DetailRow icon={Hash} label="Engine number" value={rider.motorbike.engine_number} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Landing: verify by QR or by plate (public / guest access only). */
function VerifyLanding({ onPlateSubmit }: { onPlateSubmit: (plate: string) => void }) {
  const [qrInput, setQrInput] = useState('');
  const [plateInput, setPlateInput] = useState('');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">BodaSure Verification</CardTitle>
          <p className="text-sm text-muted-foreground">Verify a rider by QR code or plate number. No login required.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Verify by QR code
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Paste or enter QR code"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && qrInput.trim() && navigate(`/verify/${encodeURIComponent(qrInput.trim())}`)}
              />
              <Button
                onClick={() => qrInput.trim() && navigate(`/verify/${encodeURIComponent(qrInput.trim())}`)}
                disabled={!qrInput.trim()}
              >
                Verify
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase text-muted-foreground">
              <span className="bg-card px-2">Or</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Verify by plate number
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter plate number"
                value={plateInput}
                onChange={(e) => setPlateInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && plateInput.trim() && onPlateSubmit(plateInput.trim())}
              />
              <Button
                onClick={() => plateInput.trim() && onPlateSubmit(plateInput.trim())}
                disabled={!plateInput.trim()}
              >
                Verify
              </Button>
            </div>
          </div>
          <div className="pt-2 flex justify-center">
            <Button variant="secondary" onClick={() => navigate('/')}>
              Go to home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PublicVerificationPage() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const navigate = useNavigate();
  const [plateSearch, setPlateSearch] = useState<string | null>(null);

  const byQr = useRiderByQRCode(qrCode ?? '', undefined);
  const byPlate = useRiderByPlate(plateSearch ?? '', undefined);

  const isLoading = qrCode ? byQr.isLoading : byPlate.isLoading;
  const error = qrCode ? byQr.error : byPlate.error;
  const rider = qrCode ? byQr.data : byPlate.data;

  // No QR in URL and no plate search yet → show landing
  if (!qrCode && !plateSearch) {
    return (
      <VerifyLanding
        onPlateSubmit={(plate) => setPlateSearch(plate)}
      />
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
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-xl font-semibold">Rider not found</h1>
            <p className="text-sm text-muted-foreground">
              {qrCode
                ? 'This QR code could not be verified. It may be invalid or the rider may no longer be registered.'
                : 'No rider found for this plate number.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="outline" onClick={() => (setPlateSearch(null), window.history.replaceState({}, '', '/verify'))}>
                Try again
              </Button>
              <Button variant="secondary" onClick={() => navigate('/')}>
                Go to home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 sm:py-10 px-4">
      <div className="text-center mb-6 sm:mb-8 max-w-md mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">BodaSure Verification</h1>
        <p className="text-sm text-muted-foreground mt-2">Public rider verification — name, photo, permit, county, sacco, stage & compliance</p>
      </div>
      {plateSearch && (
        <div className="max-w-md mx-auto mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (setPlateSearch(null), window.history.replaceState({}, '', '/verify'))}
            className="gap-1.5 -ml-1.5"
          >
            ← Verify another rider
          </Button>
        </div>
      )}
      <PublicRiderResult rider={rider} />
      <div className="max-w-md mx-auto mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
          <Home className="h-4 w-4" />
          Home
        </Button>
        <Button variant="secondary" onClick={() => { setPlateSearch(null); navigate('/verify'); }} className="gap-2">
          <Search className="h-4 w-4" />
          Verify other rider
        </Button>
      </div>
    </div>
  );
}
