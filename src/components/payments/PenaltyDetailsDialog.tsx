import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Receipt } from 'lucide-react';
import type { Penalty } from '@/hooks/usePenalties';

interface PenaltyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  penalty: Penalty | null;
  /** Payment method when paid via Paystack; 'offline' for admin-marked; undefined for unpaid/waived */
  paymentMethod?: string | null;
  /** Reference (e.g. ADMIN-xxx or payment_reference from Paystack) */
  reference?: string | null;
}

function getPenaltyStatus(penalty: Penalty): 'unpaid' | 'paid' | 'waived' {
  if (penalty.is_paid) return 'paid';
  if (penalty.description?.includes('[WAIVED]')) return 'waived';
  return 'unpaid';
}

function formatMethod(method: string | null | undefined): string {
  if (!method) return '—';
  if (method === 'mobile_money') return 'M-Pesa';
  if (method === 'card') return 'Card';
  return method;
}

export function PenaltyDetailsDialog({
  open,
  onOpenChange,
  penalty,
  paymentMethod,
  reference,
}: PenaltyDetailsDialogProps) {
  if (!penalty) return null;

  const status = getPenaltyStatus(penalty);
  const dateStr = penalty.paid_at || penalty.created_at;
  const isAdminMarked = penalty.is_paid && !penalty.payment_id && !penalty.description?.includes('[WAIVED]');
  const displayRef = reference ?? (isAdminMarked ? `ADMIN-${penalty.id.slice(0, 8)}` : null);
  const method = status === 'paid' ? (paymentMethod ?? (penalty.payment_id ? '—' : isAdminMarked ? 'offline' : undefined)) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(28rem,calc(100vw-2rem))] w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Penalty Details
          </DialogTitle>
          <DialogDescription>
            Full details for this penalty
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Header: Amount, Status, Date */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="text-xl font-bold">
                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(penalty.amount)}
                </p>
                {status === 'paid' && (
                  <StatusBadge status="completed" />
                )}
                {status === 'waived' && (
                  <StatusBadge status="waived" />
                )}
                {status === 'unpaid' && (
                  <StatusBadge status="unpaid" />
                )}
              </div>
              {displayRef && (
                <p className="text-xs text-muted-foreground font-mono">Ref: {displayRef}</p>
              )}
            </div>
            <div className="text-right text-sm text-muted-foreground shrink-0">
              <p>{format(new Date(dateStr), 'MMM d, yyyy')}</p>
              {penalty.paid_at && (
                <p className="text-xs">Paid: {format(new Date(penalty.paid_at), 'HH:mm')}</p>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
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
              <StatusBadge status={status === 'waived' ? 'waived' : status} />
            </div>
            {penalty.paid_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Paid At</span>
                <span>{format(new Date(penalty.paid_at), 'PPP p')}</span>
              </div>
            )}
            {method !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Method of payment</span>
                <span className="font-medium">{formatMethod(method)}</span>
              </div>
            )}
          </div>

          {penalty.description && !penalty.description.includes('[WAIVED]') && (
            <div className="text-sm">
              <span className="text-muted-foreground">Notes: </span>
              <span>{penalty.description}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
