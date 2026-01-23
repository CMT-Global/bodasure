import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Search,
  QrCode,
  Camera,
  Bike,
  User,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { QRScanner } from '@/components/verification/QRScanner';
import { EnforcementVerificationView } from '@/components/verification/EnforcementVerificationView';
import {
  useRiderByQRCode,
  useRiderByPlate,
  useRiderByName,
} from '@/hooks/useVerification';
import { useAuth } from '@/hooks/useAuth';
import { RiderWithDetails } from '@/hooks/useData';

export default function VerificationPage() {
  const { profile, roles } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'plate'>('name');
  const [scannedQR, setScannedQR] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState<RiderWithDetails | null>(null);

  // Get county_id from profile or first role
  const countyId = useMemo(() => {
    return profile?.county_id || roles.find(r => r.county_id)?.county_id || undefined;
  }, [profile, roles]);

  // QR Code search
  const {
    data: qrRider,
    isLoading: qrLoading,
    error: qrError,
  } = useRiderByQRCode(scannedQR, countyId);

  // Plate search
  const {
    data: plateRider,
    isLoading: plateLoading,
    error: plateError,
  } = useRiderByPlate(searchType === 'plate' ? searchQuery : '', countyId);

  // Name search
  const {
    data: nameRider,
    isLoading: nameLoading,
    error: nameError,
  } = useRiderByName(searchType === 'name' ? searchQuery : '', countyId);

  // Determine which rider to show
  const currentRider = useMemo(() => {
    if (selectedRider) return selectedRider;
    if (qrRider) return qrRider;
    if (searchType === 'plate' && plateRider) return plateRider;
    if (searchType === 'name' && nameRider) return nameRider;
    return null;
  }, [selectedRider, qrRider, plateRider, nameRider, searchType]);

  // Update selected rider when search results change
  useEffect(() => {
    if (qrRider) {
      setSelectedRider(qrRider);
    } else if (searchType === 'plate' && plateRider) {
      setSelectedRider(plateRider);
    } else if (searchType === 'name' && nameRider) {
      setSelectedRider(nameRider);
    }
  }, [qrRider, plateRider, nameRider, searchType]);

  const isLoading = qrLoading || plateLoading || nameLoading;
  const hasError = qrError || plateError || nameError;

  const handleQRScan = (decodedText: string) => {
    setScannedQR(decodedText);
    setIsScannerOpen(false);
    setSearchQuery('');
    setSelectedRider(null);
  };

  const handleSearch = () => {
    setSelectedRider(null);
    setScannedQR('');
  };

  const handleClear = () => {
    setSearchQuery('');
    setScannedQR('');
    setSelectedRider(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Verification & Enforcement</h1>
            <p className="text-muted-foreground">
              Verify riders using QR code scanning or search
            </p>
          </div>
        </div>

        {/* Search and QR Scanner Section */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {/* QR Scanner Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => setIsScannerOpen(true)}
                className="w-full min-h-[44px]"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                Open Camera Scanner
              </Button>
              {scannedQR && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Scanned QR Code:</p>
                  <p className="font-mono text-sm">{scannedQR}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Rider
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={searchType === 'name' ? 'default' : 'outline'}
                  onClick={() => {
                    setSearchType('name');
                    setSearchQuery('');
                    setSelectedRider(null);
                  }}
                  className="flex-1 min-h-[44px]"
                >
                  <User className="h-4 w-4 mr-2" />
                  By Name
                </Button>
                <Button
                  variant={searchType === 'plate' ? 'default' : 'outline'}
                  onClick={() => {
                    setSearchType('plate');
                    setSearchQuery('');
                    setSelectedRider(null);
                  }}
                  className="flex-1 min-h-[44px]"
                >
                  <Bike className="h-4 w-4 mr-2" />
                  By Plate
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder={
                    searchType === 'name'
                      ? 'Enter rider name...'
                      : 'Enter bike plate number...'
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="flex-1 min-h-[44px] text-base sm:text-sm"
                />
                {currentRider && (
                  <Button variant="outline" onClick={handleClear} className="min-h-[44px] min-w-[80px]">
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Searching...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {hasError && !isLoading && (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
              <p className="text-destructive font-medium mb-2">Error searching rider</p>
              <p className="text-sm text-muted-foreground">
                Please try again or check your search query
              </p>
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {!isLoading &&
          !hasError &&
          !currentRider &&
          (searchQuery || scannedQR) && (
            <Card>
              <CardContent className="p-8 text-center">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No rider found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try a different search term or scan the QR code again
                </p>
              </CardContent>
            </Card>
          )}

        {/* Verification View */}
        {currentRider && !isLoading && (
          <EnforcementVerificationView rider={currentRider} countyId={countyId} />
        )}

        {/* Initial State */}
        {!isLoading &&
          !hasError &&
          !currentRider &&
          !searchQuery &&
          !scannedQR && (
            <Card>
              <CardContent className="p-12 text-center">
                <QrCode className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">
                  Start verification by scanning a QR code or searching for a rider
                </p>
                <p className="text-sm text-muted-foreground">
                  Use the camera scanner for instant mobile verification
                </p>
              </CardContent>
            </Card>
          )}

        {/* QR Scanner Modal */}
        {isScannerOpen && (
          <QRScanner
            onScanSuccess={handleQRScan}
            onClose={() => setIsScannerOpen(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
