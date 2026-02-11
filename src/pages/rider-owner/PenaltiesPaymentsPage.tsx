import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RiderOwnerLayout } from '@/components/layout/RiderOwnerLayout';
import { useAuth } from '@/hooks/useAuth';
import { useRiderOwnerDashboard } from '@/hooks/useData';
import { useRiderPenalties } from '@/hooks/usePenalties';
import { useInitializePenaltyPayment, useVerifyPayment } from '@/hooks/usePayments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CreditCard, Loader2, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { validateMpesaPhone } from '@/hooks/usePayments';
import type { Penalty } from '@/hooks/usePenalties';

function getPenaltyStatus(penalty: Penalty): 'unpaid' | 'paid' | 'waived' {
  if (penalty.is_paid) return 'paid';
  if (penalty.description?.includes('[WAIVED]')) return 'waived';
  return 'unpaid';
}

function PenaltiesPaymentsContent() {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: dashboardData, isLoading: dashboardLoading, error } = useRiderOwnerDashboard(user?.id);
  const rider = dashboardData?.rider ?? null;
  const countyId = rider?.county_id ?? undefined;
  const { data: penalties = [], isLoading: penaltiesLoading } = useRiderPenalties(rider?.id ?? '', countyId);
  const initializePenaltyPayment = useInitializePenaltyPayment();
  const verifyPayment = useVerifyPayment();

  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaPhoneError, setMpesaPhoneError] = useState<string | null>(null);
  const [payingPenaltyId, setPayingPenaltyId] = useState<string | null>(null);

  const paymentReference = searchParams.get('payment_reference');
  const verifiedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!paymentReference || verifiedRef.current === paymentReference) return;
    verifiedRef.current = paymentReference;
    verifyPayment.mutate(paymentReference, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['rider-penalties', rider?.id ?? '', countyId] });
        queryClient.invalidateQueries({ queryKey: ['rider-owner-dashboard'] });
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['rider-penalties', rider?.id ?? '', countyId] });
        }, 800);
        const next = new URLSearchParams(searchParams);
        next.delete('payment_reference');
        setSearchParams(next, { replace: true });
      },
    });
  }, [paymentReference]);

  const handleMpesaPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, '');
    setMpesaPhone(digitsOnly);
    setMpesaPhoneError(validateMpesaPhone(digitsOnly));
  };

  const email = profile?.email ?? '';
  const riderId = rider?.id ?? '';

  const handlePayPenalty = (penalty: Penalty) => {
    if (!email || !riderId || !countyId) return;
    const phoneError = validateMpesaPhone(mpesaPhone);
    if (phoneError) {
      setMpesaPhoneError(phoneError);
      return;
    }
    setMpesaPhoneError(null);
    setPayingPenaltyId(penalty.id);
    initializePenaltyPayment.mutate(
      {
        penalty_id: penalty.id,
        amount: Number(penalty.amount),
        email,
        phone: mpesaPhone.trim() || undefined,
        rider_id: riderId,
        county_id: countyId,
      },
      {
        onSettled: () => setPayingPenaltyId(null),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['rider-penalties', riderId, countyId] });
          queryClient.invalidateQueries({ queryKey: ['rider-owner-dashboard'] });
        },
      }
    );
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

  if (dashboardLoading || !dashboardData) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center max-w-md mx-auto">
        <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No rider profile linked</h2>
        <p className="text-sm text-muted-foreground">
          Your account is not linked to a rider. Contact your Sacco or county admin.
        </p>
      </div>
    );
  }

  const unpaidCount = penalties.filter((p) => getPenaltyStatus(p) === 'unpaid').length;

  return (
    <div className="space-y-6 max-w-full min-w-0 overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold break-words">Penalties & Payments</h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-1">
          View all penalties issued to you and pay via Paystack (KES + M-Pesa).
        </p>
      </div>

      {/* M-Pesa phone (optional, for Pay with M-Pesa) */}
      {unpaidCount > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pay with M-Pesa (optional)</CardTitle>
            <CardDescription>
              Enter your M-Pesa number to pay via mobile money. Leave blank to pay by card.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="254708374149"
              value={mpesaPhone}
              onChange={handleMpesaPhoneChange}
              onBlur={() => setMpesaPhoneError(validateMpesaPhone(mpesaPhone))}
              className={cn('w-full sm:max-w-xs min-h-[44px] touch-manipulation', mpesaPhoneError && 'border-destructive')}
            />
            {mpesaPhoneError ? (
              <p className="text-xs text-destructive">{mpesaPhoneError}</p>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            All penalties
          </CardTitle>
          <CardDescription>
            Type, amount, date issued, status, and notes. Pay unpaid penalties below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {penaltiesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : penalties.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center rounded-lg border border-dashed">
              No penalties issued to you.
            </p>
          ) : (
            <ul className="space-y-3">
              {penalties.map((penalty) => {
                const status = getPenaltyStatus(penalty);
                const isPaying = payingPenaltyId === penalty.id;
                const canPay = status === 'unpaid';
                return (
                  <li
                    key={penalty.id}
                    className={cn(
                      'flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border bg-card',
                      canPay && 'border-amber-500/30 bg-amber-500/5'
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{penalty.penalty_type}</span>
                        <Badge
                          variant={
                            status === 'paid'
                              ? 'default'
                              : status === 'waived'
                                ? 'secondary'
                                : 'destructive'
                          }
                          className="text-xs"
                        >
                          {status === 'paid' ? 'Paid' : status === 'waived' ? 'Waived' : 'Unpaid'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(
                          Number(penalty.amount)
                        )}{' '}
                        · Issued {format(new Date(penalty.created_at), 'dd MMM yyyy')}
                      </p>
                      {penalty.description && (
                        <p className="text-xs text-muted-foreground mt-1">{penalty.description}</p>
                      )}
                    </div>
                    {canPay && (
                      <Button
                        size="sm"
                        className="shrink-0 gap-2 min-h-[44px] touch-manipulation w-full sm:w-auto"
                        onClick={() => handlePayPenalty(penalty)}
                        disabled={initializePenaltyPayment.isPending || isPaying || !!mpesaPhoneError}
                      >
                        {isPaying ? (
                          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        ) : (
                          <CreditCard className="h-4 w-4 shrink-0" />
                        )}
                        Pay with Paystack
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PenaltiesPaymentsPage() {
  return (
    <RiderOwnerLayout>
      <PenaltiesPaymentsContent />
    </RiderOwnerLayout>
  );
}
