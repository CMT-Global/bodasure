import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useRiderByQRCode, useRiderByPlate } from '@/hooks/useVerification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, User, Loader2, AlertCircle, QrCode, Hash, MapPin, Building2, MapPinned, CheckCircle2, Home, Search } from 'lucide-react';
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

  return (
    <div className="max-w-md mx-auto space-y-4">
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
              <div className="flex flex-wrap gap-2 mt-2">
                {rider.permit ? (
                  <StatusBadge status={rider.permit.status} />
                ) : (
                  <span className="text-sm text-muted-foreground">No active permit</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Permit status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rider.permit ? (
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={rider.permit.status} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active permit on file.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registration details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {'countyName' in rider && rider.countyName && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">County</span>
              <span className="font-medium">{rider.countyName}</span>
            </div>
          )}
          {rider.sacco?.name && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Sacco</span>
              <span className="font-medium">{rider.sacco.name}</span>
            </div>
          )}
          {rider.stage?.name && (
            <div className="flex items-center gap-2 text-sm">
              <MapPinned className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Stage</span>
              <span className="font-medium">{rider.stage.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Compliance</span>
            <StatusBadge status={rider.compliance_status ?? 'pending_review'} />
          </div>
        </CardContent>
      </Card>
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
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">BodaSure Verification</h1>
        <p className="text-sm text-muted-foreground mt-1">Public rider verification — name, photo, permit, county, sacco, stage & compliance</p>
      </div>
      {plateSearch && (
        <div className="max-w-md mx-auto mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (setPlateSearch(null), window.history.replaceState({}, '', '/verify'))}
          >
            ← Verify another rider
          </Button>
        </div>
      )}
      <PublicRiderResult rider={rider} />
      <div className="max-w-md mx-auto mt-6 flex flex-col sm:flex-row gap-3 justify-center">
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
