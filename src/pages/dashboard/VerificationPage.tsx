import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
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
import { useEffectiveCountyId } from '@/contexts/PlatformSuperAdminCountyContext';
import { CountyFilterBar } from '@/components/shared/CountyFilterBar';
import { RiderWithDetails } from '@/hooks/useData';
import { verificationSearchFormSchema, type VerificationSearchFormValues } from '@/lib/zod';

export default function VerificationPage() {
  const { profile, roles } = useAuth();
  const countyId = useEffectiveCountyId();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'plate'>('name');
  const [scannedQR, setScannedQR] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState<RiderWithDetails | null>(null);

  const searchForm = useForm<VerificationSearchFormValues>({
    resolver: zodResolver(verificationSearchFormSchema),
    defaultValues: { search_type: 'name', search_query: '' },
  });

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
    searchForm.reset({ search_type: searchType, search_query: '' });
  };

  const handleClear = () => {
    setSearchQuery('');
    setScannedQR('');
    setSelectedRider(null);
    searchForm.reset({ search_type: searchType, search_query: '' });
  };

  const onSearchSubmit = (values: VerificationSearchFormValues) => {
    const q = values.search_query.trim();
    setSearchQuery(q);
    setSearchType(values.search_type);
    setSelectedRider(null);
  };

  const setSearchTypeAndClear = (type: 'name' | 'plate') => {
    searchForm.setValue('search_type', type);
    searchForm.setValue('search_query', '');
    setSearchQuery('');
    setSelectedRider(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">Verification & Enforcement</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Verify riders using QR code scanning or search by name or plate
            </p>
          </div>
          <CountyFilterBar />
        </div>

        {/* Search and QR Scanner Section */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {/* QR Scanner Card */}
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <QrCode className="h-5 w-5 shrink-0" />
                QR Code Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <Button
                onClick={() => setIsScannerOpen(true)}
                className="w-full min-h-[44px] touch-manipulation"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5 shrink-0" />
                Open Camera Scanner
              </Button>
              {scannedQR && (
                <div className="p-3 rounded-lg bg-muted min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Scanned QR Code:</p>
                  <p className="font-mono text-sm break-all">{scannedQR}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search Card - By Name or By Plate (validation from @/lib/zod) */}
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Search className="h-5 w-5 shrink-0" />
                Search Rider
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Search by rider name or bike plate number
              </p>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <Form {...searchForm}>
                <form onSubmit={searchForm.handleSubmit(onSearchSubmit)} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant={searchForm.watch('search_type') === 'name' ? 'default' : 'outline'}
                      onClick={() => setSearchTypeAndClear('name')}
                      className="flex-1 min-h-[44px] touch-manipulation"
                    >
                      <User className="h-4 w-4 mr-2 shrink-0" />
                      By Name
                    </Button>
                    <Button
                      type="button"
                      variant={searchForm.watch('search_type') === 'plate' ? 'default' : 'outline'}
                      onClick={() => setSearchTypeAndClear('plate')}
                      className="flex-1 min-h-[44px] touch-manipulation"
                    >
                      <Bike className="h-4 w-4 mr-2 shrink-0" />
                      By Plate
                    </Button>
                  </div>

                  <FormField
                    control={searchForm.control}
                    name="search_query"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <FormControl>
                            <Input
                              placeholder={
                                searchForm.watch('search_type') === 'name'
                                  ? 'Enter rider name...'
                                  : 'Enter bike plate number...'
                              }
                              className="flex-1 min-h-[44px] min-w-0 text-base sm:text-sm"
                              {...field}
                            />
                          </FormControl>
                          <div className="flex gap-2">
                            <Button type="submit" className="min-h-[44px] flex-1 sm:flex-initial touch-manipulation">
                              <Search className="h-4 w-4 mr-2 sm:mr-0" />
                              <span className="sm:inline">Search</span>
                            </Button>
                            {currentRider && (
                              <Button type="button" variant="outline" onClick={handleClear} className="min-h-[44px] min-w-0 sm:min-w-[80px] touch-manipulation">
                                Clear
                              </Button>
                            )}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="min-w-0 overflow-hidden">
            <CardContent className="p-6 sm:p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary shrink-0" />
              <p className="text-muted-foreground text-sm sm:text-base">Searching...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {hasError && !isLoading && (
          <Card className="min-w-0 overflow-hidden">
            <CardContent className="p-6 sm:p-8 text-center">
              <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-destructive opacity-50 shrink-0" />
              <p className="text-destructive font-medium mb-2 text-sm sm:text-base">Error searching rider</p>
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
          (searchQuery.trim() || scannedQR) && (
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="p-6 sm:p-8 text-center">
                <User className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50 text-muted-foreground shrink-0" />
                <p className="text-muted-foreground text-sm sm:text-base">No rider found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try a different {searchType === 'plate' ? 'plate number' : 'name'} or scan the QR code again
                </p>
              </CardContent>
            </Card>
          )}

        {/* Verification View - rider result (scrolls with page on mobile) */}
        {currentRider && !isLoading && (
          <section className="w-full min-w-0 overflow-x-hidden" aria-label="Rider verification details">
            <EnforcementVerificationView rider={currentRider} countyId={countyId} />
          </section>
        )}

        {/* Initial State */}
        {!isLoading &&
          !hasError &&
          !currentRider &&
          !searchQuery.trim() &&
          !scannedQR && (
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="p-6 sm:p-12 text-center">
                <QrCode className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-50 text-muted-foreground shrink-0" />
                <p className="text-muted-foreground mb-2 text-sm sm:text-base">
                  Start verification by scanning a QR code or searching by name or plate
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
