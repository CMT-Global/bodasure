import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiderOwnerLayout } from '@/components/layout/RiderOwnerLayout';
import { useAuth } from '@/hooks/useAuth';
import { useRiderOwnerDashboard } from '@/hooks/useData';
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
  const rider = dashboardData?.rider ?? null;
  const countyId = rider?.county_id ?? undefined;
  const motorbikes = dashboardData?.motorbikes ?? [];

  const { data: permitTypes = [], isLoading: permitTypesLoading } = usePermitTypes(countyId);
  const { data: payments = [], isLoading: paymentsLoading } = useRiderPaymentHistory(
    rider?.id ?? '',
    countyId
  ) as { data: PaymentWithPermit[] };
  const initializePayment = useInitializePayment();

  const [selectedPermitType, setSelectedPermitType] = useState<PermitType | null>(null);
  const [selectedMotorbikeId, setSelectedMotorbikeId] = useState<string>('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [receiptPayment, setReceiptPayment] = useState<PaymentWithPermit | null>(null);

  const email = profile?.email ?? '';
  const riderId = rider?.id ?? '';
  const selectedType = selectedPermitType;

  const handlePay = () => {
    if (!selectedType || !selectedMotorbikeId || !email || !riderId || !countyId) {
      return;
    }
    initializePayment.mutate(
      {
        amount: selectedType.amount,
        email,
        phone: mpesaPhone.trim() || undefined,
        permit_type_id: selectedType.id,
        rider_id: riderId,
        motorbike_id: selectedMotorbikeId,
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
        <Button className="mt-4" variant="outline" onClick={() => navigate('/rider-owner')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const permitPayments = payments.filter(
    (p) => p.metadata && (p.metadata as Record<string, unknown>)?.permit_type_id
  );

  return (
    <div className="space-y-6 max-w-full min-w-0">
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
                <div className="grid gap-2 sm:grid-cols-3">
                  {permitTypes.map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => setSelectedPermitType(pt)}
                      className={cn(
                        'rounded-lg border-2 p-4 text-left transition-colors',
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
              </div>

              <div className="space-y-2">
                <Label>Motorbike</Label>
                <Select
                  value={selectedMotorbikeId}
                  onValueChange={setSelectedMotorbikeId}
                  disabled={motorbikes.length === 0}
                >
                  <SelectTrigger className="min-h-[44px]">
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
                {motorbikes.length === 0 && (
                  <p className="text-xs text-muted-foreground">No motorbikes linked to your profile.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mpesa-phone">M-Pesa phone (optional)</Label>
                <Input
                  id="mpesa-phone"
                  type="tel"
                  placeholder="254712345678"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  className="min-h-[44px]"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank for card payment. Enter phone for M-Pesa (test: use test numbers in
                  Paystack).
                </p>
              </div>

              <Button
                className="w-full sm:w-auto min-h-[44px]"
                disabled={
                  !selectedPermitType ||
                  !selectedMotorbikeId ||
                  !email ||
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => setReceiptPayment(payment)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 print:hidden"
                        onClick={() => handlePrintReceipt(payment)}
                      >
                        <Download className="h-4 w-4 mr-1" />
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

      {/* Receipt dialog */}
      <Dialog open={!!receiptPayment} onOpenChange={() => setReceiptPayment(null)}>
        <DialogContent className="max-w-md print:block">
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
              <div className="flex gap-2 print:hidden">
                <Button variant="outline" size="sm" onClick={() => handlePrintReceipt(receiptPayment)}>
                  <Download className="h-4 w-4 mr-2" />
                  Print / Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setReceiptPayment(null)}>
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
