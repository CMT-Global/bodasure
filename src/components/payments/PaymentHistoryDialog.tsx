import { useMemo } from 'react';
import { useRiderPaymentHistory } from '@/hooks/usePayments';
import { useRiderPenalties } from '@/hooks/usePenalties';
import type { Penalty } from '@/hooks/usePenalties';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Loader2, History, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface PaymentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riderId: string | null;
  riderName?: string;
  countyId?: string;
}

type HistoryItem =
  | { type: 'payment'; payment: Awaited<ReturnType<typeof useRiderPaymentHistory>['data']>[number] }
  | { type: 'penalty'; penalty: Penalty };

export function PaymentHistoryDialog({
  open,
  onOpenChange,
  riderId,
  riderName,
  countyId,
}: PaymentHistoryDialogProps) {
  const { data: payments, isLoading: paymentsLoading } = useRiderPaymentHistory(riderId || '', countyId);
  const { data: riderPenalties = [], isLoading: penaltiesLoading } = useRiderPenalties(riderId || '', countyId ?? undefined);

  const penaltyIdToPenalty = useMemo(
    () => new Map(riderPenalties.map((p) => [p.id, p])),
    [riderPenalties]
  );

  // Admin-marked penalties (paid, no payment row): include in history so penalty data shows
  const adminMarkedPenalties = useMemo(
    () =>
      riderPenalties.filter(
        (p) =>
          p.is_paid &&
          !p.payment_id &&
          !(p.description && p.description.includes('[WAIVED]'))
      ),
    [riderPenalties]
  );

  const historyItems = useMemo((): HistoryItem[] => {
    const fromPayments: HistoryItem[] = (payments || []).map((p) => ({ type: 'payment', payment: p }));
    const fromPenalties: HistoryItem[] = adminMarkedPenalties.map((p) => ({ type: 'penalty', penalty: p }));
    const combined = [...fromPayments, ...fromPenalties];
    combined.sort((a, b) => {
      const dateA = a.type === 'payment' ? (a.payment.paid_at || a.payment.created_at) : (a.penalty.paid_at || a.penalty.created_at);
      const dateB = b.type === 'payment' ? (b.payment.paid_at || b.payment.created_at) : (b.penalty.paid_at || b.penalty.created_at);
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
    return combined;
  }, [payments, adminMarkedPenalties]);

  const totalPaid = useMemo(() => {
    let sum = 0;
    (payments || []).forEach((p) => {
      if (p.status === 'completed' || p.paid_at) sum += Number(p.amount);
    });
    adminMarkedPenalties.forEach((p) => {
      sum += Number(p.amount);
    });
    return sum;
  }, [payments, adminMarkedPenalties]);

  const isLoading = paymentsLoading || penaltiesLoading;

  if (!riderId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(36rem,calc(100vw-2rem))] w-[calc(100vw-2rem)] sm:w-full max-h-[90vh] overflow-hidden flex flex-col overflow-x-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Payment History
          </DialogTitle>
          <DialogDescription>
            {riderName ? `Payment history for ${riderName}` : 'View all payments for this rider'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-2 -mr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : historyItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment history found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="text-2xl font-bold">
                        {new Intl.NumberFormat('en-KE', {
                          style: 'currency',
                          currency: 'KES',
                        }).format(totalPaid)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Payments</p>
                      <p className="text-2xl font-bold">{historyItems.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment List (payments + admin-marked penalties) */}
              <div className="space-y-3">
                {historyItems.map((item) =>
                  item.type === 'payment' ? (
                    <PaymentHistoryCard
                      key={item.payment.id}
                      payment={item.payment}
                      penaltyIdToPenalty={penaltyIdToPenalty}
                    />
                  ) : (
                    <PenaltyOnlyHistoryCard key={`penalty-${item.penalty.id}`} penalty={item.penalty} />
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaymentHistoryCard({
  payment,
  penaltyIdToPenalty,
}: {
  payment: Awaited<ReturnType<typeof useRiderPaymentHistory>['data']>[number];
  penaltyIdToPenalty: Map<string, Penalty>;
}) {
  const meta = payment.metadata as Record<string, unknown> | null | undefined;
  const isPenalty = meta?.payment_type === 'penalty';
  const penaltyId = meta?.penalty_id as string | undefined;
  const penalty = penaltyId ? penaltyIdToPenalty.get(penaltyId) : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">
                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(payment.amount)}
                </p>
                <StatusBadge status={payment.paid_at ? 'completed' : payment.status} />
              </div>
              {payment.payment_reference && (
                <p className="text-xs text-muted-foreground font-mono">Ref: {payment.payment_reference}</p>
              )}
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{format(new Date(payment.created_at), 'MMM d, yyyy')}</p>
              {payment.paid_at && (
                <p className="text-xs">Paid: {format(new Date(payment.paid_at), 'HH:mm')}</p>
              )}
            </div>
          </div>

          {payment.permits && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Permit Number</span>
                  <span className="font-mono font-medium">{payment.permits.permit_number}</span>
                </div>
                {payment.permits.permit_types && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Permit Type</span>
                    <span className="font-medium">{payment.permits.permit_types.name}</span>
                  </div>
                )}
                {payment.permits.issued_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Start Date</span>
                    <span>{format(new Date(payment.permits.issued_at), 'PPP')}</span>
                  </div>
                )}
                {payment.permits.expires_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Expiry Date</span>
                    <span>{format(new Date(payment.permits.expires_at), 'PPP')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Permit Status</span>
                  <StatusBadge status={payment.permits.status} />
                </div>
              </div>
            </>
          )}

          {isPenalty && penalty && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Payment Type</span>
                  <span className="font-medium">Penalty</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Penalty Type</span>
                  <span className="font-medium">{penalty.penalty_type}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(penalty.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Penalty Status</span>
                  <StatusBadge status={penalty.is_paid ? 'paid' : 'unpaid'} />
                </div>
                {penalty.paid_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Paid At</span>
                    <span>{format(new Date(penalty.paid_at), 'PPP p')}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {payment.payment_method && (
            <>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Method of payment</span>
                <span className="font-medium">
                  {payment.payment_method === 'mobile_money'
                    ? 'M-Pesa'
                    : payment.payment_method === 'card'
                      ? 'Card'
                      : payment.payment_method}
                </span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PenaltyOnlyHistoryCard({ penalty }: { penalty: Penalty }) {
  const dateStr = penalty.paid_at || penalty.created_at;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">
                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(penalty.amount)}
                </p>
                <StatusBadge status="completed" />
              </div>
              <p className="text-xs text-muted-foreground font-mono">Ref: ADMIN-{penalty.id.slice(0, 8)}</p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{format(new Date(dateStr), 'MMM d, yyyy')}</p>
              {penalty.paid_at && (
                <p className="text-xs">Paid: {format(new Date(penalty.paid_at), 'HH:mm')}</p>
              )}
            </div>
          </div>

          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Payment Type</span>
              <span className="font-medium">Penalty</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Penalty Type</span>
              <span className="font-medium">{penalty.penalty_type}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(penalty.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Penalty Status</span>
              <StatusBadge status="paid" />
            </div>
            {penalty.paid_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Paid At</span>
                <span>{format(new Date(penalty.paid_at), 'PPP p')}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Method of payment</span>
              <span className="font-medium">Offline</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
