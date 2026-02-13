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

/** Mobile-friendly key-value row: label above value on small screens so long values (Ref, M-Pesa) don't truncate */
function DetailRow({
  label,
  value,
  mono,
}: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between min-w-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm font-medium break-words min-w-0 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

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
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-full sm:max-w-[36rem] max-h-[90dvh] sm:max-h-[90vh] overflow-hidden flex flex-col overflow-x-hidden p-4 sm:p-6 min-w-0 rounded-xl">
        <DialogHeader className="shrink-0 space-y-1 pr-8 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <History className="h-5 w-5 shrink-0 text-primary" />
            Payment History
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground break-words pr-2">
            {riderName ? `Payment history for ${riderName}` : 'View all payments for this rider'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-1 px-1 sm:mx-0 sm:px-0 min-w-0 w-full">
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
            <div className="space-y-4 min-w-0 w-full pb-2">
              {/* Summary Card */}
              <Card className="min-w-0 w-full overflow-hidden border-border/80">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="text-xl sm:text-2xl font-bold text-primary break-words">
                        {new Intl.NumberFormat('en-KE', {
                          style: 'currency',
                          currency: 'KES',
                        }).format(totalPaid)}
                      </p>
                    </div>
                    <div className="text-left sm:text-right min-w-0">
                      <p className="text-sm text-muted-foreground">Total Payments</p>
                      <p className="text-xl sm:text-2xl font-bold">{historyItems.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment List (payments + admin-marked penalties) */}
              <div className="space-y-4">
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

  const paymentMethodLabel =
    payment.payment_method === 'mobile_money'
      ? 'M-Pesa'
      : payment.payment_method === 'card'
        ? 'Card'
        : payment.payment_method ?? '';

  return (
    <Card className="min-w-0 overflow-hidden border-border/80 shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Amount + status + ref + date: stacked on mobile */}
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-lg">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(payment.amount)}
              </p>
              <StatusBadge status={payment.paid_at ? 'completed' : payment.status} />
            </div>
            {payment.payment_reference && (
              <p className="text-xs text-muted-foreground font-mono break-all min-w-0">Ref: {payment.payment_reference}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {format(new Date(payment.created_at), 'MMM d, yyyy')}
              {payment.paid_at && ` · Paid ${format(new Date(payment.paid_at), 'HH:mm')}`}
            </p>
          </div>

          {payment.permits && (
            <>
              <Separator className="my-3" />
              <div className="space-y-3 min-w-0">
                <DetailRow label="Permit Number" value={payment.permits.permit_number} mono />
                {payment.permits.permit_types && (
                  <DetailRow label="Permit Type" value={payment.permits.permit_types.name} />
                )}
                {payment.permits.issued_at && (
                  <DetailRow label="Start Date" value={format(new Date(payment.permits.issued_at), 'PPP')} />
                )}
                {payment.permits.expires_at && (
                  <DetailRow label="Expiry Date" value={format(new Date(payment.permits.expires_at), 'PPP')} />
                )}
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between min-w-0">
                  <span className="text-sm text-muted-foreground">Permit Status</span>
                  <span className="w-fit">
                    <StatusBadge status={payment.permits.status} className="shrink-0" />
                  </span>
                </div>
              </div>
            </>
          )}

          {isPenalty && penalty && (
            <>
              <Separator className="my-3" />
              <div className="space-y-3 min-w-0">
                <DetailRow label="Payment Type" value="Penalty" />
                <DetailRow label="Penalty Type" value={penalty.penalty_type} />
                <DetailRow
                  label="Amount"
                  value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(penalty.amount)}
                />
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between min-w-0">
                  <span className="text-sm text-muted-foreground">Penalty Status</span>
                  <span className="w-fit">
                    <StatusBadge status={penalty.is_paid ? 'paid' : 'unpaid'} className="shrink-0" />
                  </span>
                </div>
                {penalty.paid_at && (
                  <DetailRow label="Paid At" value={format(new Date(penalty.paid_at), 'PPP p')} />
                )}
              </div>
            </>
          )}

          {payment.payment_method && (
            <>
              <Separator className="my-3" />
              <DetailRow label="Method of payment" value={paymentMethodLabel} />
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
    <Card className="min-w-0 overflow-hidden border-border/80 shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-lg">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(penalty.amount)}
              </p>
              <StatusBadge status="completed" />
            </div>
            <p className="text-xs text-muted-foreground font-mono">Ref: ADMIN-{penalty.id.slice(0, 8)}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(dateStr), 'MMM d, yyyy')}
              {penalty.paid_at && ` · Paid ${format(new Date(penalty.paid_at), 'HH:mm')}`}
            </p>
          </div>

          <Separator className="my-3" />
          <div className="space-y-3 min-w-0">
            <DetailRow label="Payment Type" value="Penalty" />
            <DetailRow label="Penalty Type" value={penalty.penalty_type} />
            <DetailRow
              label="Amount"
              value={new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(penalty.amount)}
            />
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between min-w-0">
              <span className="text-sm text-muted-foreground">Penalty Status</span>
              <span className="w-fit">
                <StatusBadge status="paid" className="shrink-0" />
              </span>
            </div>
            {penalty.paid_at && (
              <DetailRow label="Paid At" value={format(new Date(penalty.paid_at), 'PPP p')} />
            )}
            <DetailRow label="Method of payment" value="Offline" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
