import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RiderOwnerLayout } from '@/components/layout/RiderOwnerLayout';
import { useAuth } from '@/hooks/useAuth';
import { useRiderOwnerDashboard, useRiderOwnerProfile, EXPIRING_SOON_DAYS } from '@/hooks/useData';
import {
  usePermitTypes,
  useRiderPermits,
  useRiderPaymentHistory,
  useInitializePayment,
  useVerifyPayment,
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
  RefreshCw,
  Loader2,
  Receipt,
  AlertCircle,
  Bike,
  FileText,
  Download,
  Clock,
} from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const { data: riderPermits = [], isLoading: riderPermitsLoading } = useRiderPermits(rider?.id);
  const { data: paymentsData, isLoading: paymentsLoading } = useRiderPaymentHistory(
    rider?.id ?? '',
    countyId
  );
  const payments = (paymentsData ?? []) as PaymentWithPermit[];
  const initializePayment = useInitializePayment();
  const verifyPayment = useVerifyPayment();

  // Only consider permits that have a valid (completed) payment — so deleted/cancelled payments don't block buying
  const permitsWithValidPayment = useMemo(() => {
    const paidPermitIds = new Set<string>();
    const completedPayments = payments.filter((p) => p.status === 'completed' || p.paid_at);
    const normalizeId = (id: string | null | undefined) => (id ? String(id).trim() : '');
    for (const p of completedPayments) {
      const id = p.permit_id ?? p.permits?.id;
      if (id) paidPermitIds.add(String(id));
    }
    // Fallback 1: match by permit_number from metadata when payment doesn't have permit_id yet
    for (const p of completedPayments) {
      if (p.permit_id || p.permits?.id) continue;
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      const metaPermitNumber = (meta.permit_number as string | undefined)?.trim?.();
      const metaPermitTypeId = normalizeId(meta.permit_type_id as string | undefined);
      if (metaPermitNumber) {
        const matched = riderPermits.find(
          (permit) =>
            permit.permit_number === metaPermitNumber &&
            (!metaPermitTypeId || normalizeId(permit.permit_type_id) === metaPermitTypeId)
        );
        if (matched) paidPermitIds.add(matched.id);
      }
    }
    // Fallback 2: match by permit_type_id + motorbike_id from metadata (normalize IDs for consistent matching)
    for (const p of completedPayments) {
      if (p.permit_id || p.permits?.id) continue;
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      const metaPermitTypeId = normalizeId(meta.permit_type_id as string | undefined);
      const metaMotorbikeId = normalizeId(meta.motorbike_id as string | undefined);
      if (metaPermitTypeId && metaMotorbikeId) {
        riderPermits
          .filter(
            (permit) =>
              normalizeId(permit.permit_type_id) === metaPermitTypeId &&
              normalizeId(permit.motorbike_id) === metaMotorbikeId
          )
          .forEach((permit) => paidPermitIds.add(permit.id));
      }
    }
    // Fallback 3: match by permit_type_id only when motorbike_id missing in metadata — add all permits of that type (rider may have multiple e.g. two monthly permits for two bikes)
    for (const p of completedPayments) {
      if (p.permit_id || p.permits?.id) continue;
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      const metaPermitTypeId = normalizeId(meta.permit_type_id as string | undefined);
      if (metaPermitTypeId) {
        riderPermits
          .filter((permit) => normalizeId(permit.permit_type_id) === metaPermitTypeId)
          .forEach((permit) => paidPermitIds.add(permit.id));
      }
    }
    return riderPermits.filter((permit) => paidPermitIds.has(permit.id));
  }, [riderPermits, payments]);

  // Block permit type for that bike until the permit is "expiring soon" (within EXPIRING_SOON_DAYS). Once expiring soon or expired, rider can renew.
  const activePermitKeys = useMemo(() => {
    const now = new Date();
    const expiringSoonThreshold = addDays(now, EXPIRING_SOON_DAYS);
    const set = new Set<string>();
    const normalizeId = (id: string | null | undefined) => (id ? String(id).trim() : '');
    const key = (motorbikeId: string, permitTypeId: string) =>
      `${String(motorbikeId).trim()}|${String(permitTypeId).trim()}`;
    // Only block when permit has more than EXPIRING_SOON_DAYS left — do not add when within "expiring soon" window so renewal is allowed and "Expiring soon" shows
    const shouldBlock = (expiresAt: Date) =>
      expiresAt > now && expiresAt > expiringSoonThreshold;

    // 1) From permits with linked payment
    for (const p of permitsWithValidPayment) {
      if (p.status !== 'active' || !p.expires_at) continue;
      const expiresAt = parseISO(p.expires_at);
      if (shouldBlock(expiresAt)) set.add(key(p.motorbike_id, p.permit_type_id));
    }

    // 2) From completed transactions (payments) so each bought permit type disables until showing expiry soon
    const completedPayments = payments.filter((p) => p.status === 'completed' || p.paid_at);
    for (const payment of completedPayments) {
      const meta = (payment.metadata ?? {}) as Record<string, unknown>;
      const metaPermitTypeId = normalizeId(meta.permit_type_id as string | undefined);
      const metaMotorbikeId = normalizeId(meta.motorbike_id as string | undefined);
      if (!metaPermitTypeId) continue;
      const matchingPermits = metaMotorbikeId
        ? riderPermits.filter(
            (permit) =>
              normalizeId(permit.permit_type_id) === metaPermitTypeId &&
              normalizeId(permit.motorbike_id) === metaMotorbikeId
          )
        : riderPermits.filter((permit) => normalizeId(permit.permit_type_id) === metaPermitTypeId);
      for (const permit of matchingPermits) {
        if (permit.status !== 'active' || !permit.expires_at) continue;
        const expiresAt = parseISO(permit.expires_at);
        if (shouldBlock(expiresAt)) set.add(key(permit.motorbike_id, permit.permit_type_id));
      }
    }

    return set;
  }, [permitsWithValidPayment, payments, riderPermits]);

  // Match county portal: treat as paid if status is completed OR paid_at is set (webhook may set paid_at first)
  const getPaymentDisplayStatus = (p: PaymentWithPermit) =>
    p.status === 'completed' || p.paid_at ? 'completed' : p.status;

  // When returning from Paystack with ?payment_reference=..., verify and refresh so status shows Completed
  const paymentReference = searchParams.get('payment_reference');
  const verifiedRef = useRef<string | null>(null);
  const autoSyncAttemptedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!paymentReference || verifiedRef.current === paymentReference) return;
    verifiedRef.current = paymentReference;
    verifyPayment.mutate(paymentReference, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['rider-payment-history'] });
        queryClient.invalidateQueries({ queryKey: ['rider-owner-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['rider-permits'] });
        // Refetch multiple times to pick up DB update from verify (can be delayed)
        [800, 1500, 3000].forEach((ms) =>
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['rider-payment-history'] });
            queryClient.invalidateQueries({ queryKey: ['rider-owner-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['rider-permits'] });
          }, ms)
        );
        const next = new URLSearchParams(searchParams);
        next.delete('payment_reference');
        setSearchParams(next, { replace: true });
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when param appears
  }, [paymentReference]);

  // Auto-sync payments that have paid_at but status still pending (e.g. webhook missed) so permit is created and status updated
  useEffect(() => {
    if (!payments.length || !rider?.id) return;
    for (const p of payments) {
      const ref = p.payment_reference;
      if (!ref || autoSyncAttemptedRef.current.has(ref)) continue;
      const meta = p.metadata as Record<string, unknown> | null;
      const needsSync =
        (p.status !== 'completed' && !!p.paid_at) ||
        (!!meta?.permit_type_id && !p.permit_id && !!meta?.permit_number);
      if (needsSync) {
        autoSyncAttemptedRef.current.add(ref);
        verifyPayment.mutate(ref, {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['rider-payment-history'] });
            queryClient.invalidateQueries({ queryKey: ['rider-owner-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['rider-permits'] });
          },
        });
        break; // one at a time
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- verifyPayment and queryClient are stable; only re-run when payments/rider change
  }, [payments, rider?.id]);

  const [selectedPermitType, setSelectedPermitType] = useState<PermitType | null>(null);
  const [selectedMotorbikeId, setSelectedMotorbikeId] = useState<string>('');
  const [mpesaPhone, setMpesaPhone] = useState('');

  // When rider has only one bike, pre-select it so "already have active permit" block applies as soon as they pick a permit type
  useEffect(() => {
    if (motorbikes.length === 1 && (!selectedMotorbikeId || !motorbikes.some((m) => m.id === selectedMotorbikeId))) {
      setSelectedMotorbikeId(motorbikes[0].id);
    }
  }, [motorbikes, selectedMotorbikeId]);

  // When rider has only one permit, pre-select that permit type and bike so "Already have active" / "You can renew" shows on that permit
  useEffect(() => {
    if (
      permitTypes.length > 0 &&
      permitsWithValidPayment.length === 1 &&
      motorbikes.some((m) => m.id === permitsWithValidPayment[0].motorbike_id)
    ) {
      const single = permitsWithValidPayment[0];
      const matchingType = permitTypes.find((pt) => pt.id === single.permit_type_id);
      if (matchingType && (!selectedMotorbikeId || selectedMotorbikeId === single.motorbike_id)) {
        setSelectedMotorbikeId(single.motorbike_id);
        setSelectedPermitType((prev) => (prev?.id === matchingType.id ? prev : matchingType));
      }
    }
  }, [permitTypes, permitsWithValidPayment, motorbikes, selectedMotorbikeId]);
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

  // Block buying if rider already has an active permit for this bike + permit type (normalize IDs for consistent match)
  const activePermitKey = selectedMotorbikeId && selectedType
    ? `${String(selectedMotorbikeId).trim()}|${String(selectedType.id).trim()}`
    : '';
  const hasActivePermitForSelection = !!activePermitKey && activePermitKeys.has(activePermitKey);

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

  // Only show permit payments that resulted in a permit (completed) or are linked to a permit.
  // This avoids showing e.g. "Quarterly Permit" in history when the rider never completed that payment.
  const permitPayments = useMemo(
    () =>
      payments.filter((p) => {
        const isPermitPayment =
          p.metadata && (p.metadata as Record<string, unknown>)?.permit_type_id;
        if (!isPermitPayment) return false;
        const hasCompletedOrLinked =
          p.status === 'completed' || !!p.paid_at || !!p.permit_id || !!p.permits?.id;
        return hasCompletedOrLinked;
      }),
    [payments]
  );

  return (
    <div className="space-y-6 max-w-full min-w-0 overflow-x-hidden w-full">
      {/* Pay for permit */}
      <Card className="min-w-0 overflow-hidden">
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
        <CardContent className="space-y-4 min-w-0">
          {hasActivePermitForSelection && selectedType && selectedMotorbikeId && (() => {
            const activePermit = permitsWithValidPayment.find(
              (p) =>
                p.motorbike_id === selectedMotorbikeId &&
                p.permit_type_id === selectedType.id &&
                p.status === 'active' &&
                p.expires_at &&
                parseISO(p.expires_at) > new Date()
            );
            const expiryStr = activePermit?.expires_at
              ? format(parseISO(activePermit.expires_at), 'dd MMM yyyy')
              : '';
            return (
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                You already have an active <strong>{selectedType.name}</strong> permit for this motorbike
                {expiryStr ? ` until ${expiryStr}` : ''}. You can renew when it is expiring soon (within {EXPIRING_SOON_DAYS} days of expiry) or after it expires.
              </div>
            );
          })()}
          {!hasActivePermitForSelection && selectedType && selectedMotorbikeId && (() => {
            const expiringPermit = permitsWithValidPayment.find(
              (p) =>
                p.motorbike_id === selectedMotorbikeId &&
                p.permit_type_id === selectedType.id &&
                p.status === 'active' &&
                p.expires_at
            );
            if (!expiringPermit?.expires_at) return null;
            const now = new Date();
            const expiringSoonThreshold = addDays(now, EXPIRING_SOON_DAYS);
            const expiresAt = parseISO(expiringPermit.expires_at);
            const isExpiringSoon = expiresAt > now && expiresAt <= expiringSoonThreshold;
            if (!isExpiringSoon) return null;
            return (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-800 dark:text-green-200">
                Your <strong>{selectedType.name}</strong> permit for this motorbike expires on{' '}
                <strong>{format(expiresAt, 'dd MMM yyyy')}</strong>. You can renew now.
              </div>
            );
          })()}
          {permitTypesLoading || dashboardLoading || riderPermitsLoading ? (
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
                  {permitTypes.map((pt) => {
                    const blockKey = selectedMotorbikeId && pt.id
                      ? `${String(selectedMotorbikeId).trim()}|${String(pt.id).trim()}`
                      : '';
                    const isBlocked = !!blockKey && activePermitKeys.has(blockKey);
                    const activePermit = isBlocked
                      ? permitsWithValidPayment.find(
                          (p) =>
                            p.motorbike_id === selectedMotorbikeId &&
                            p.permit_type_id === pt.id &&
                            p.status === 'active' &&
                            p.expires_at
                        )
                      : null;
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        disabled={isBlocked}
                        onClick={() => {
                          if (isBlocked) return;
                          setSelectedPermitType(pt);
                          if (formErrors.permit_type_id) setFormErrors((e) => ({ ...e, permit_type_id: undefined }));
                        }}
                        className={cn(
                          'rounded-lg border-2 p-4 text-left transition-colors min-h-[56px] touch-manipulation w-full',
                          isBlocked && 'opacity-80 cursor-not-allowed border-amber-500/50 bg-amber-500/5',
                          !isBlocked && selectedPermitType?.id === pt.id && 'border-primary bg-primary/5',
                          !isBlocked && selectedPermitType?.id !== pt.id && 'border-border hover:border-primary/50'
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
                        {isBlocked && activePermit?.expires_at && (
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 font-medium">
                            Already have active · expires {format(parseISO(activePermit.expires_at), 'dd MMM yyyy')}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
                {formErrors.permit_type_id && (
                  <p className="text-xs text-destructive">{formErrors.permit_type_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Motorbike</Label>
                <Select
                  key={selectedMotorbikeId || 'none'}
                  value={selectedMotorbikeId || undefined}
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
                className={cn(
                  'w-full min-h-[44px] touch-manipulation shrink-0',
                  hasActivePermitForSelection && 'opacity-70 cursor-not-allowed'
                )}
                disabled={
                  !selectedPermitType ||
                  !selectedMotorbikeId ||
                  !email ||
                  !!mpesaPhoneError ||
                  hasActivePermitForSelection ||
                  initializePayment.isPending
                }
                title={
                  hasActivePermitForSelection
                    ? 'You already have an active permit for this selection. Renew when it is expiring soon or after it expires.'
                    : undefined
                }
                onClick={handlePay}
              >
                {initializePayment.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4 shrink-0" />
                )}
                <span className="truncate">Pay with Paystack (KES + M-Pesa)</span>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* All permits */}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <RefreshCw className="h-5 w-5 shrink-0" />
            All permits
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Permit name, issued date, and expiry for each permit.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {riderPermitsLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : permitsWithValidPayment.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground px-4">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No permits yet</p>
              <p className="text-xs mt-1">Pay for a permit above to see it here.</p>
            </div>
          ) : (
            <div className="min-w-0 divide-y divide-border">
              {permitsWithValidPayment.map((permit) => {
                const bikeLabel = motorbikes.find((m) => m.id === permit.motorbike_id)?.registration_number ?? '—';
                const now = new Date();
                const expiringSoonThreshold = addDays(now, EXPIRING_SOON_DAYS);
                const expiresAt = permit.expires_at ? parseISO(permit.expires_at) : null;
                const isExpiringSoon =
                  permit.status === 'active' &&
                  expiresAt &&
                  expiresAt > now &&
                  expiresAt <= expiringSoonThreshold;
                const permitLabel = [permit.permit_types?.name ?? 'Permit', permit.permit_number].filter(Boolean).join(' · ') || '—';
                return (
                  <div
                    key={permit.id}
                    className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-6 min-w-0"
                  >
                    {/* Name + Status */}
                    <div className="flex items-center gap-2 flex-shrink-0 min-w-0 flex-wrap">
                      <span className="text-lg font-bold text-foreground whitespace-nowrap">
                        {permit.permit_types?.name ?? 'Permit'}
                      </span>
                      <StatusBadge status={permit.status} />
                      {isExpiringSoon && (
                        <Badge variant="secondary" className="gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 shrink-0">
                          <Clock className="h-3 w-3" />
                          Expiring soon
                        </Badge>
                      )}
                    </div>
                    {/* PERMIT (type · number) */}
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Permit</span>
                      <span className="text-sm text-foreground truncate" title={permitLabel}>{permitLabel}</span>
                    </div>
                    {/* ISSUED */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Issued</span>
                      <span className="text-sm text-foreground">
                        {permit.issued_at ? format(parseISO(permit.issued_at), 'dd MMM yyyy') : '—'}
                      </span>
                    </div>
                    {/* EXPIRES */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expires</span>
                      <span className="text-sm text-foreground">
                        {permit.expires_at ? format(parseISO(permit.expires_at), 'dd MMM yyyy') : '—'}
                      </span>
                    </div>
                    {/* MOTORBIKE */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0 min-w-0">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Motorbike</span>
                      <span className="text-sm text-foreground">{bikeLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permit history */}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <RefreshCw className="h-5 w-5 shrink-0" />
            Permit history
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            List of permit payments: reference, amount, date, status, and receipt.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {paymentsLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : permitPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground px-4">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No permit payments yet</p>
            </div>
          ) : (
            <div className="min-w-0 divide-y divide-border">
              {permitPayments.map((payment) => {
                const meta = (payment.metadata ?? {}) as Record<string, unknown>;
                const permitNumber = payment.permits?.permit_number ?? (meta.permit_number as string | undefined);
                const permitTypeName = payment.permits?.permit_types?.name ?? permitTypes.find((pt) => pt.id === meta.permit_type_id)?.name;
                const expiresAt = payment.permits?.expires_at ?? null;
                const permitLabel = [permitTypeName, permitNumber].filter(Boolean).join(' · ') || '—';
                return (
                  <div
                    key={payment.id}
                    className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-6 min-w-0"
                  >
                    {/* Amount + Status */}
                    <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
                      <span className="text-lg font-bold text-foreground whitespace-nowrap">
                        Ksh {payment.amount.toFixed(2)}
                      </span>
                      <StatusBadge status={getPaymentDisplayStatus(payment)} />
                    </div>
                    {/* PERMIT */}
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Permit</span>
                      <span className="text-sm text-foreground truncate" title={permitLabel}>{permitLabel}</span>
                    </div>
                    {/* DATE */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</span>
                      <span className="text-sm text-foreground">
                        {format(new Date(payment.created_at), 'dd MMM yyyy, HH:mm')}
                      </span>
                    </div>
                    {/* REFERENCE */}
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1 max-w-[12rem]">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reference</span>
                      <span className="text-sm text-foreground font-mono truncate break-all" title={payment.payment_reference ?? ''}>
                        {payment.payment_reference ?? '—'}
                      </span>
                    </div>
                    {/* EXPIRES */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expires</span>
                      <span className="text-sm text-foreground">
                        {expiresAt ? format(new Date(expiresAt), 'dd MMM yyyy') : '—'}
                      </span>
                    </div>
                    {/* Action buttons - stacked vertically */}
                    <div className="flex flex-shrink-0 flex-col gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="min-h-[36px] touch-manipulation bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        onClick={() => setReceiptPayment(payment)}
                      >
                        <FileText className="h-4 w-4 mr-1.5 shrink-0" />
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="min-h-[36px] touch-manipulation print:hidden bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        onClick={() => handlePrintReceipt(payment)}
                      >
                        <Download className="h-4 w-4 mr-1.5 shrink-0" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
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
          {receiptPayment && (() => {
            const meta = (receiptPayment.metadata ?? {}) as Record<string, unknown>;
            const permitTypeId = meta.permit_type_id as string | undefined;
            const permitTypeName =
              receiptPayment.permits?.permit_types?.name ??
              permitTypes.find((pt) => pt.id === permitTypeId)?.name;
            const permitNumber =
              receiptPayment.permits?.permit_number ??
              (meta.permit_number as string | undefined);
            const durationDays =
              receiptPayment.permits?.permit_types?.duration_days ??
              permitTypes.find((pt) => pt.id === permitTypeId)?.duration_days;
            const isPermitPayment = !!permitTypeId || !!receiptPayment.permits;
            return (
            <div id="receipt-content" className="space-y-4 py-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono break-all text-right">{receiptPayment.payment_reference ?? '—'}</span>
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
                  <StatusBadge status={getPaymentDisplayStatus(receiptPayment)} />
                </div>
                {receiptPayment.payment_method && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Method of payment</span>
                    <span>
                      {receiptPayment.payment_method === 'mobile_money'
                        ? 'M-Pesa'
                        : receiptPayment.payment_method === 'card'
                          ? 'Card'
                          : receiptPayment.payment_method}
                    </span>
                  </div>
                )}
                {receiptPayment.paid_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid at</span>
                    <span>{format(new Date(receiptPayment.paid_at), 'dd MMM yyyy, HH:mm')}</span>
                  </div>
                )}
                {isPermitPayment && (
                  <>
                    <Separator />
                    <p className="text-xs font-medium text-muted-foreground pt-1">Permit</p>
                    {permitTypeName && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Type</span>
                        <span>{permitTypeName}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Permit number</span>
                      <span className="font-mono">{permitNumber ?? receiptPayment.permits?.permit_number ?? '—'}</span>
                    </div>
                    {durationDays != null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Duration</span>
                        <span>{durationDays} days</span>
                      </div>
                    )}
                    {receiptPayment.permits?.issued_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Issued</span>
                        <span>{format(new Date(receiptPayment.permits.issued_at), 'dd MMM yyyy')}</span>
                      </div>
                    )}
                    {receiptPayment.permits?.expires_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Expires</span>
                        <span>{format(new Date(receiptPayment.permits.expires_at), 'dd MMM yyyy')}</span>
                      </div>
                    )}
                    {receiptPayment.permits?.status && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Permit status</span>
                        <StatusBadge status={receiptPayment.permits.status} />
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
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PermitPaymentsPage() {
  return (
    <RiderOwnerLayout>
      <div className="space-y-4 sm:space-y-6 max-w-full min-w-0 overflow-x-hidden">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold break-words">Permit payments</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Pay for your permit (weekly / monthly / annual) and view payment history.
          </p>
        </div>
        <PermitPaymentsContent />
      </div>
    </RiderOwnerLayout>
  );
}

