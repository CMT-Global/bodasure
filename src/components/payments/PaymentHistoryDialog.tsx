import { useRiderPaymentHistory } from '@/hooks/usePayments';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface PaymentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riderId: string | null;
  riderName?: string;
  countyId?: string;
}

export function PaymentHistoryDialog({
  open,
  onOpenChange,
  riderId,
  riderName,
  countyId,
}: PaymentHistoryDialogProps) {
  const { data: payments, isLoading } = useRiderPaymentHistory(riderId || '', countyId);

  if (!riderId) return null;

  // Treat as paid if status is completed OR paid_at is set (e.g. webhook set paid_at but status lagged)
  const totalPaid = payments
    ?.filter(p => p.status === 'completed' || !!p.paid_at)
    .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(36rem,calc(100vw-2rem))] w-[calc(100vw-2rem)] sm:w-full max-h-[90vh] overflow-hidden flex flex-col overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Payment History
          </DialogTitle>
          <DialogDescription>
            {riderName ? `Payment history for ${riderName}` : 'View all payments for this rider'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !payments || payments.length === 0 ? (
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
                      <p className="text-2xl font-bold">{payments.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment List */}
              <div className="space-y-3">
                {payments.map((payment) => (
                  <Card key={payment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold">
                                {new Intl.NumberFormat('en-KE', {
                                  style: 'currency',
                                  currency: 'KES',
                                }).format(payment.amount)}
                              </p>
                              <StatusBadge status={payment.paid_at ? 'completed' : payment.status} />
                            </div>
                            {payment.payment_reference && (
                              <p className="text-xs text-muted-foreground font-mono">
                                Ref: {payment.payment_reference}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <p>{format(new Date(payment.created_at), 'MMM d, yyyy')}</p>
                            {payment.paid_at && (
                              <p className="text-xs">
                                Paid: {format(new Date(payment.paid_at), 'HH:mm')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Permit Details */}
                        {payment.permits && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Permit Number</span>
                                <span className="font-mono font-medium">
                                  {payment.permits.permit_number}
                                </span>
                              </div>
                              {payment.permits.permit_types && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Permit Type</span>
                                  <span className="font-medium">
                                    {payment.permits.permit_types.name}
                                  </span>
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

                        {/* Payment Method */}
                        {payment.payment_method && (
                          <div className="text-xs text-muted-foreground">
                            Method: {payment.payment_method === 'mobile_money' ? 'M-Pesa' : payment.payment_method}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
