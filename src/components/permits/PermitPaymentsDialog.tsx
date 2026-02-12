import { usePermitPayments } from '@/hooks/usePayments';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Loader2, CreditCard, Receipt } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface PermitPaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permitId: string | null;
  permitNumber?: string;
}

export function PermitPaymentsDialog({
  open,
  onOpenChange,
  permitId,
  permitNumber,
}: PermitPaymentsDialogProps) {
  const { data: payments, isLoading: paymentsLoading } = usePermitPayments(permitId || '');

  if (!permitId) return null;

  const isLoading = paymentsLoading;
  const totalPaid = payments
    ?.filter(p => p.status === 'completed' || p.paid_at)
    .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Permit Payments
          </DialogTitle>
          <DialogDescription>
            {permitNumber ? `Payment history for permit ${permitNumber}` : 'View all payments for this permit'}
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
              <p>No payment history found for this permit</p>
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

              {/* Payment List - full details per payment */}
              <div className="space-y-3">
                {payments.map((payment) => (
                  <Card key={payment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">
                            {new Intl.NumberFormat('en-KE', {
                              style: 'currency',
                              currency: 'KES',
                            }).format(payment.amount)}
                          </p>
                          <StatusBadge status={payment.paid_at ? 'completed' : payment.status} />
                        </div>

                        <Separator />
                        <div className="space-y-2 rounded-lg bg-muted/30 p-3">
                          {payment.payment_reference && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Reference</span>
                              <span className="font-mono text-right break-all">{payment.payment_reference}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-medium">
                              {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(payment.amount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Date</span>
                            <span>{format(new Date(payment.created_at), 'dd MMM yyyy, HH:mm')}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Status</span>
                            <StatusBadge status={payment.paid_at ? 'completed' : payment.status} />
                          </div>
                          {payment.paid_at && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Paid at</span>
                              <span>{format(new Date(payment.paid_at), 'dd MMM yyyy, HH:mm')}</span>
                            </div>
                          )}
                          {payment.riders && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Rider</span>
                              <span className="text-right">
                                {payment.riders.full_name} ({payment.riders.phone})
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Method of payment</span>
                            <span className="font-medium">
                              {payment.payment_method === 'mobile_money'
                                ? 'M-Pesa'
                                : payment.payment_method === 'card'
                                  ? 'Card'
                                  : payment.payment_method ?? '—'}
                            </span>
                          </div>
                        </div>
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
