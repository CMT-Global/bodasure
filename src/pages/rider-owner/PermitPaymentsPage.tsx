import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiderOwnerLayout } from '@/components/layout/RiderOwnerLayout';
import { useAuth } from '@/hooks/useAuth';
import { useRiderOwnerDashboard, useRiderOwnerProfile } from '@/hooks/useData';
import {
  usePermitTypes,
  useRiderPaymentHistory,
  useInitializePayment,
  type PermitType,
  type Payment,
} from '@/hooks/usePayments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateMpesaPhone } from '@/hooks/usePayments';
import { permitPaymentFormSchema } from '@/lib/zod';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CreditCard,
  History,
  Loader2,
  Receipt,
  AlertCircle,
  Bike,
  FileText,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

type PaymentWithPermit = Payment & {
  permits: {
    id: string;
    permit_number: string;
    status: string;
    issued_at: string | null;
    expires_at: string | null;
    permit_types: { name: string; duration_days: number; amount: number } | null;
  } | null;
};

function PermitPaymentsContent() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: dashboardData, isLoading: dashboardLoading, error } = useRiderOwnerDashboard(user?.id);
  const { data: profileData } = useRiderOwnerProfile(user?.id);
  const rider = dashboardData?.rider ?? null;
  const countyId = rider?.county_id ?? undefined;
  // Include both rider-assigned bikes and owner's bikes (user may be rider and owner)
  const motorbikes = useMemo(() => {
    const byId = new Map<string, { id: string; registration_number: string }>();
    for (const m of dashboardData?.motorbikes ?? []) byId.set(m.id, m);
    for (const m of profileData?.motorbikes ?? []) byId.set(m.id, { id: m.id, registration_number: m.registration_number });
    for (const m of profileData?.ownedBikes ?? []) byId.set(m.id, { id: m.id, registration_number: m.registration_number });
    return Array.from(byId.values());
  }, [dashboardData?.motorbikes, profileData?.motorbikes, profileData?.ownedBikes]);

  const { data: permitTypes = [], isLoading: permitTypesLoading } = usePermitTypes(countyId);
  const { data: paymentsData, isLoading: paymentsLoading } = useRiderPaymentHistory(
    rider?.id ?? '',
    countyId
  );
  const payments = (paymentsData ?? []) as PaymentWithPermit[];
  const initializePayment = useInitializePayment();

  const [selectedPermitType, setSelectedPermitType] = useState<PermitType | null>(null);
  const [selectedMotorbikeId, setSelectedMotorbikeId] = useState<string>('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaPhoneError, setMpesaPhoneError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{
    permit_type_id?: string;
    motorbike_id?: string;
    phone?: string;
    email?: string;
  }>({});
  const [receiptPayment, setReceiptPayment] = useState<PaymentWithPermit | null>(null);

  const permitPaymentSchema = useMemo(() => permitPaymentFormSchema(false), []);

  const handleMpesaPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, '');
    setMpesaPhone(digitsOnly);
    setMpesaPhoneError(validateMpesaPhone(digitsOnly));
  };

  const email = profile?.email ?? '';
  const riderId = rider?.id ?? '';
  const selectedType = selectedPermitType;

  const handlePay = () => {
    setFormErrors({});
    const paymentMethod = mpesaPhone.trim() ? 'mobile_money' : 'card';
    const payload = {
      rider_id: riderId,
      motorbike_id: selectedMotorbikeId,
      permit_type_id: selectedType?.id ?? '',
      email,
      phone: mpesaPhone.trim() || undefined,
      payment_method: paymentMethod as 'card' | 'mobile_money',
      county_id: countyId ?? undefined,
    };
    const result = permitPaymentSchema.safeParse(payload);
    if (!result.success) {
      const issues = result.error.flatten().fieldErrors;
      setFormErrors({
        permit_type_id: issues.permit_type_id?.[0],
        motorbike_id: issues.motorbike_id?.[0],
        phone: issues.phone?.[0],
        email: issues.email?.[0],
      });
      if (issues.phone?.[0]) setMpesaPhoneError(issues.phone[0]);
      return;
    }
    setMpesaPhoneError(null);
    if (!selectedType || !countyId) return;
    initializePayment.mutate(
      {
        amount: selectedType.amount,
        email: result.data.email,
        phone: result.data.phone,
        permit_type_id: result.data.permit_type_id,
        rider_id: result.data.rider_id,
        motorbike_id: result.data.motorbike_id,
        county_id: countyId,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['rider-payment-history'] });
          queryClient.invalidateQueries({ queryKey: ['rider-owner-dashboard'] });
        },
      }
    );
  };

  const handlePrintReceipt = (payment: PaymentWithPermit) => {
    setReceiptPayment(payment);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
        <p className="text-destructive font-medium">Failed to load</p>
        <p className="text-sm text-muted-foreground mt-1">Please try again later.</p>
      </div>
    );
  }

  if (!rider && !dashboardLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center max-w-md mx-auto">
        <Bike className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No rider profile linked</h2>
        <p className="text-sm text-muted-foreground">
          Your account is not linked to a rider record. Contact your Sacco or county admin.
        </p>
        <Button className="mt-4 min-h-[44px] touch-manipulation w-full sm:w-auto" variant="outline" onClick={() => navigate('/rider-owner')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const permitPayments = payments.filter(
    (p) => p.metadata && (p.metadata as Record<string, unknown>)?.permit_type_id
  );

  return (
    <div className="space-y-6 max-w-full min-w-0 overflow-x-hidden">
      {/* Pay for permit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pay for permit
          </CardTitle>
          <CardDescription>
            Choose a permit option and pay via Paystack (card or M-Pesa). On success your permit
            becomes active and expiry updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {permitTypesLoading || dashboardLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : permitTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No permit options are configured for your county. Contact your county admin.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Permit type</Label>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {permitTypes.map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => {
                        setSelectedPermitType(pt);
                        if (formErrors.permit_type_id) setFormErrors((e) => ({ ...e, permit_type_id: undefined }));
                      }}
                      className={cn(
                        'rounded-lg border-2 p-4 text-left transition-colors min-h-[56px] touch-manipulation w-full',
                        selectedPermitType?.id === pt.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <p className="font-medium">{pt.name}</p>
                      <p className="text-lg font-bold text-primary mt-1">
                        {new Intl.NumberFormat('en-KE', {
                          style: 'currency',
                          currency: 'KES',
                        }).format(pt.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pt.duration_days} days
                      </p>
                    </button>
                  ))}
                </div>
                {formErrors.permit_type_id && (
                  <p className="text-xs text-destructive">{formErrors.permit_type_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Motorbike</Label>
                <Select
                  value={selectedMotorbikeId}
                  onValueChange={(v) => {
                    setSelectedMotorbikeId(v);
                    if (formErrors.motorbike_id) setFormErrors((e) => ({ ...e, motorbike_id: undefined }));
                  }}
                  disabled={motorbikes.length === 0}
                >
                  <SelectTrigger className={cn('min-h-[44px]', formErrors.motorbike_id && 'border-destructive')}>
                    <SelectValue placeholder="Select motorbike" />
                  </SelectTrigger>
                  <SelectContent>
                    {motorbikes.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.registration_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.motorbike_id && (
                  <p className="text-xs text-destructive">{formErrors.motorbike_id}</p>
                )}
                {motorbikes.length === 0 && !formErrors.motorbike_id && (
                  <p className="text-xs text-muted-foreground">No motorbikes linked to your profile.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mpesa-phone">M-Pesa phone (optional)</Label>
                <Input
                  id="mpesa-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="254712345678"
                  value={mpesaPhone}
                  onChange={(e) => {
                    handleMpesaPhoneChange(e);
                    if (formErrors.phone) setFormErrors((err) => ({ ...err, phone: undefined }));
                  }}
                  onBlur={() => setMpesaPhoneError(validateMpesaPhone(mpesaPhone))}
                  className={cn('min-h-[44px]', (mpesaPhoneError || formErrors.phone) && 'border-destructive')}
                  maxLength={15}
                />
                {(mpesaPhoneError || formErrors.phone) ? (
                  <p className="text-xs text-destructive">{mpesaPhoneError || formErrors.phone}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Leave blank for card payment. Digits only: 5 (local) or 6–15 (with country code, no +).
                  </p>
                )}
              </div>

              {formErrors.email && (
                <p className="text-sm text-destructive">{formErrors.email}</p>
              )}

              <Button
                className="w-full sm:w-auto min-h-[44px] touch-manipulation"
                disabled={
                  !selectedPermitType ||
                  !selectedMotorbikeId ||
                  !email ||
                  !!mpesaPhoneError ||
                  initializePayment.isPending
                }
                onClick={handlePay}
              >
                {initializePayment.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Pay with Paystack (KES + M-Pesa)
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Permit history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Permit history
          </CardTitle>
          <CardDescription>
            List of permit payments: reference, amount, date, status, and receipt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : permitPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No permit payments yet</p>
            </div>
          ) : (
            <ScrollArea className="rounded-md border">
              <div className="divide-y">
                {permitPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {new Intl.NumberFormat('en-KE', {
                            style: 'currency',
                            currency: 'KES',
                          }).format(payment.amount)}
                        </span>
                        <StatusBadge status={payment.status} />
                      </div>
                      {payment.payment_reference && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          Ref: {payment.payment_reference}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {format(new Date(payment.created_at), 'dd MMM yyyy, HH:mm')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 min-h-[44px] touch-manipulation"
                        onClick={() => setReceiptPayment(payment)}
                      >
                        <FileText className="h-4 w-4 mr-1 shrink-0" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 print:hidden min-h-[44px] touch-manipulation"
                        onClick={() => handlePrintReceipt(payment)}
                      >
                        <Download className="h-4 w-4 mr-1 shrink-0" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Receipt dialog - mobile-friendly */}
      <Dialog open={!!receiptPayment} onOpenChange={() => setReceiptPayment(null)}>
        <DialogContent className="max-w-[min(28rem,calc(100vw-2rem))] w-[calc(100vw-2rem)] sm:w-full print:block overflow-x-hidden">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment receipt
            </DialogTitle>
            <DialogDescription>View or print this receipt.</DialogDescription>
          </DialogHeader>
          {receiptPayment && (
            <div id="receipt-content" className="space-y-4 py-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono">{receiptPayment.payment_reference ?? '—'}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">
                    {new Intl.NumberFormat('en-KE', {
                      style: 'currency',
                      currency: 'KES',
                    }).format(receiptPayment.amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span>{format(new Date(receiptPayment.created_at), 'dd MMM yyyy, HH:mm')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={receiptPayment.status} />
                </div>
                {receiptPayment.paid_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid at</span>
                    <span>{format(new Date(receiptPayment.paid_at), 'dd MMM yyyy, HH:mm')}</span>
                  </div>
                )}
                {receiptPayment.permits && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Permit</span>
                      <span className="font-mono">{receiptPayment.permits.permit_number}</span>
                    </div>
                    {receiptPayment.permits.expires_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Expires</span>
                        <span>{format(new Date(receiptPayment.permits.expires_at), 'dd MMM yyyy')}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 print:hidden">
                <Button variant="outline" size="sm" className="min-h-[44px] touch-manipulation w-full sm:w-auto" onClick={() => handlePrintReceipt(receiptPayment)}>
                  <Download className="h-4 w-4 mr-2 shrink-0" />
                  Print / Save
                </Button>
                <Button variant="ghost" size="sm" className="min-h-[44px] touch-manipulation w-full sm:w-auto" onClick={() => setReceiptPayment(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PermitPaymentsPage() {
  return (
    <RiderOwnerLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Permit payments</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Pay for your permit (weekly / monthly / annual) and view payment history.
          </p>
        </div>
        <PermitPaymentsContent />
      </div>
    </RiderOwnerLayout>
  );
}
