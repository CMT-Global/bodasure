import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import {
  useAllCounties,
  useUpdateCountyConfig,
  useMonetizationSettingsHistory,
  getCountyConfigFromSettings,
  type CountyMonetizationSettings,
  type PlatformServiceFeeConfig,
  type PaymentConvenienceFeeConfig,
  type PenaltyCommissionConfig,
  type BulkSmsCostRecoveryConfig,
  type SubscriptionPeriodControlsConfig,
  type SubscriptionPeriodKey,
} from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Map,
  Loader2,
  Save,
  Percent,
  CreditCard,
  Scale,
  MessageSquare,
  Calendar,
  AlertCircle,
  Calculator,
  FileText,
  History,
  User,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  calculatePaymentDeductions,
  type PaymentType,
  type SubscriptionPeriodKey as CalcPeriodKey,
} from '@/utils/paymentCalculation';

const PERIOD_LABELS: Record<SubscriptionPeriodKey, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  three_months: '3 months',
  six_months: '6 months',
  annual: 'Annual',
};

/** Preview calculator: uses current county monetization to show deduction breakdown. */
function CalculationEnginePreview({
  monetization,
}: {
  monetization: CountyMonetizationSettings;
}) {
  const [period, setPeriod] = useState<CalcPeriodKey>('monthly');
  const [grossInput, setGrossInput] = useState<string>('1500');

  const grossKES = useMemo(() => {
    const n = Number(grossInput);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [grossInput]);

  const monetizationInput = useMemo(
    () => ({
      platformServiceFee: monetization.platformServiceFee,
      paymentConvenienceFee: monetization.paymentConvenienceFee,
      penaltyCommission: monetization.penaltyCommission,
    }),
    [monetization]
  );

  const permitBreakdown = useMemo(
    () =>
      calculatePaymentDeductions({
        grossAmountKES: grossKES,
        paymentType: 'PERMIT',
        period,
        monetization: monetizationInput,
      }),
    [grossKES, period, monetizationInput]
  );

  const penaltyBreakdown = useMemo(
    () =>
      calculatePaymentDeductions({
        grossAmountKES: grossKES,
        paymentType: 'PENALTY',
        period: null,
        monetization: monetizationInput,
      }),
    [grossKES, monetizationInput]
  );

  const BreakdownBlock = ({ title, breakdown }: { title: string; breakdown: ReturnType<typeof calculatePaymentDeductions> }) => (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="rounded-lg border bg-muted/30 p-4 font-mono text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Gross (KES)</span>
          <span>{breakdown.grossAmountKES.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Platform fee (KES)</span>
          <span>{breakdown.platformFeeKES.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Processing fee (KES)</span>
          <span>{breakdown.processingFeeKES.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Penalty commission (KES)</span>
          <span>{breakdown.penaltyCommissionKES.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 font-medium">
          <span>Total deductions (KES)</span>
          <span>{breakdown.totalDeductionsKES.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Net to county (KES)</span>
          <span>{breakdown.netToCountyKES.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">Preview (using this county&apos;s current settings)</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Period (for permit)</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as CalcPeriodKey)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABELS) as CalcPeriodKey[]).map((p) => (
                <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Gross amount (KES)</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={grossInput}
            onChange={(e) => setGrossInput(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <BreakdownBlock title="PERMIT payment" breakdown={permitBreakdown} />
        <BreakdownBlock title="PENALTY payment" breakdown={penaltyBreakdown} />
      </div>
    </div>
  );
}

function validatePlatformServiceFee(c: PlatformServiceFeeConfig): string | null {
  if (c.feeType === 'fixed') {
    const v = c.fixedFeeCents ?? 0;
    if (v < 0) return 'Fixed fee (KES) must be ≥ 0.';
  } else {
    const v = c.percentageFee ?? 0;
    if (v < 0 || v > 100) return 'Percentage must be between 0 and 100.';
  }
  return null;
}

function validatePaymentConvenienceFee(c: PaymentConvenienceFeeConfig): string | null {
  if (c.includedInPlatformFee) return null;
  if (c.feeType === 'fixed') {
    const v = c.fixedFeeCents ?? 0;
    if (v < 0) return 'Fixed fee (KES) must be ≥ 0.';
  } else {
    const v = c.percentageFee ?? 0;
    if (v < 0 || v > 100) return 'Percentage must be between 0 and 100.';
  }
  return null;
}

function validatePenaltyCommission(c: PenaltyCommissionConfig): string | null {
  if (c.feeType === 'fixed') {
    const v = c.fixedFeeCents ?? 0;
    if (v < 0) return 'Penalty commission (KES) must be ≥ 0.';
  } else {
    const v = c.percentageFee ?? 0;
    if (v < 0 || v > 100) return 'Penalty commission must be between 0 and 100%.';
  }
  return null;
}

function validateBulkSms(c: BulkSmsCostRecoveryConfig): string | null {
  if ((c.costPerSmsCents ?? 0) < 0) return 'Cost per SMS (KES) must be ≥ 0.';
  if (c.markupPercent != null && (c.markupPercent < 0 || c.markupPercent > 100)) return 'Markup % must be 0–100.';
  if (c.markupPerSmsCents != null && c.markupPerSmsCents < 0) return 'Markup per SMS (KES) must be ≥ 0.';
  return null;
}

/** Returns true if the new config changes any percentage-based fees (high-impact). */
function hasHighImpactChanges(
  current: CountyMonetizationSettings,
  next: CountyMonetizationSettings
): boolean {
  const a = current.platformServiceFee;
  const b = next.platformServiceFee;
  if (a.feeType === 'percentage' || b.feeType === 'percentage') {
    if ((a.percentageFee ?? 0) !== (b.percentageFee ?? 0)) return true;
  }
  const ad = a.periodDiscounts ?? [];
  const bd = b.periodDiscounts ?? [];
  for (let i = 0; i < Math.max(ad.length, bd.length); i++) {
    if ((ad[i]?.discountPercent ?? 0) !== (bd[i]?.discountPercent ?? 0)) return true;
  }
  if (!current.paymentConvenienceFee.includedInPlatformFee || !next.paymentConvenienceFee.includedInPlatformFee) {
    const pa = current.paymentConvenienceFee;
    const pb = next.paymentConvenienceFee;
    if (pa.feeType === 'percentage' || pb.feeType === 'percentage') {
      if ((pa.percentageFee ?? 0) !== (pb.percentageFee ?? 0)) return true;
    }
  }
  if (current.penaltyCommission.feeType === 'percentage' || next.penaltyCommission.feeType === 'percentage') {
    if ((current.penaltyCommission.percentageFee ?? 0) !== (next.penaltyCommission.percentageFee ?? 0)) return true;
  }
  if ((current.bulkSmsCostRecovery.markupPercent ?? 0) !== (next.bulkSmsCostRecovery.markupPercent ?? 0)) return true;
  return false;
}

export default function CountyMonetizationSettingsPage() {
  const { hasRole } = useAuth();
  /** Only Platform Super Admin can edit; platform_admin (internal finance) has read-only. */
  const canEditMonetization = hasRole('platform_super_admin');

  const [selectedCountyId, setSelectedCountyId] = useState<string | null>(null);
  const [showHighImpactConfirm, setShowHighImpactConfirm] = useState(false);
  const pendingSaveRef = useRef<{ countyId: string; config: CountyMonetizationSettings; effectiveFrom: string | undefined } | null>(null);

  const { data: counties = [], isLoading: countiesLoading } = useAllCounties();

  const selectedCounty = useMemo(
    () => counties.find(c => c.id === selectedCountyId) ?? null,
    [counties, selectedCountyId]
  );

  const config = useMemo(
    () => getCountyConfigFromSettings(selectedCounty?.settings as Record<string, unknown> | undefined),
    [selectedCounty]
  );

  const monetization = config.monetizationSettings ?? {
    platformServiceFee: {
      feeType: 'fixed' as const,
      fixedFeeCents: 0,
      applyScope: 'permit_payments_only' as const,
      basis: 'per_subscription_period' as const,
      periods: [
        { period: 'weekly' as const, enabled: true },
        { period: 'monthly' as const, enabled: true },
        { period: 'three_months' as const, enabled: true },
        { period: 'six_months' as const, enabled: true },
        { period: 'annual' as const, enabled: true },
      ],
      proportionalByWeeks: true,
      periodDiscounts: [],
    },
    paymentConvenienceFee: {
      includedInPlatformFee: true,
      feeType: 'fixed' as const,
      fixedFeeCents: 0,
      applyScope: 'all_transactions' as const,
      purposeLabel: 'processing/convenience fee',
    },
    penaltyCommission: {
      feeType: 'percentage' as const,
      fixedFeeCents: 0,
      percentageFee: 0,
      applyScope: 'penalty_payments_only' as const,
      chargedOnSuccessOnly: true,
    },
    bulkSmsCostRecovery: {
      costPerSmsCents: 0,
      messageCategories: {
        paymentConfirmation: true,
        permitExpiryReminders: true,
        penaltyAlerts: true,
        enforcementNotices: true,
      },
      applyScope: 'periodic_deduction' as const,
    },
    subscriptionPeriodControls: {
      enabledDurations: {
        weekly: true,
        monthly: true,
        three_months: true,
        six_months: true,
        annual: true,
      },
      basePermitPriceCentsPerPeriod: {},
    },
  };

  const [platformServiceFee, setPlatformServiceFee] = useState<PlatformServiceFeeConfig>(monetization.platformServiceFee);
  const [paymentConvenienceFee, setPaymentConvenienceFee] = useState<PaymentConvenienceFeeConfig>(monetization.paymentConvenienceFee);
  const [penaltyCommission, setPenaltyCommission] = useState<PenaltyCommissionConfig>(monetization.penaltyCommission);
  const [bulkSms, setBulkSms] = useState<BulkSmsCostRecoveryConfig>(monetization.bulkSmsCostRecovery);
  const [subscriptionPeriodControls, setSubscriptionPeriodControls] = useState<SubscriptionPeriodControlsConfig>(monetization.subscriptionPeriodControls);
  const [effectiveFrom, setEffectiveFrom] = useState<'immediate' | 'next_day' | 'next_week'>('immediate');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const monetizationHistory = useMonetizationSettingsHistory(selectedCountyId);

  useEffect(() => {
    setPlatformServiceFee(monetization.platformServiceFee);
    setPaymentConvenienceFee(monetization.paymentConvenienceFee);
    setPenaltyCommission(monetization.penaltyCommission);
    setBulkSms(monetization.bulkSmsCostRecovery);
    setSubscriptionPeriodControls(monetization.subscriptionPeriodControls);
  }, [monetization]);

  useEffect(() => {
    if (counties.length > 0 && !selectedCountyId) setSelectedCountyId(counties[0].id);
  }, [counties, selectedCountyId]);

  const updateMutation = useUpdateCountyConfig();

  const buildMonetizationConfig = (): CountyMonetizationSettings => ({
    platformServiceFee: {
      ...platformServiceFee,
      fixedFeeCents: platformServiceFee.fixedFeeCents ?? 0,
      percentageFee: platformServiceFee.percentageFee ?? 0,
    },
    paymentConvenienceFee: {
      ...paymentConvenienceFee,
      fixedFeeCents: paymentConvenienceFee.fixedFeeCents ?? 0,
      percentageFee: paymentConvenienceFee.percentageFee ?? 0,
    },
    penaltyCommission: {
      ...penaltyCommission,
      fixedFeeCents: penaltyCommission.fixedFeeCents ?? 0,
      percentageFee: penaltyCommission.percentageFee ?? 0,
    },
    bulkSmsCostRecovery: {
      ...bulkSms,
      messageCategories: { ...bulkSms.messageCategories },
      costPerSmsCents: bulkSms.costPerSmsCents ?? 0,
    },
    subscriptionPeriodControls: {
      enabledDurations: { ...subscriptionPeriodControls.enabledDurations },
      basePermitPriceCentsPerPeriod: { ...subscriptionPeriodControls.basePermitPriceCentsPerPeriod },
    },
  });

  const validationErrors = useMemo(() => {
    const a = validatePlatformServiceFee(platformServiceFee);
    const b = validatePaymentConvenienceFee(paymentConvenienceFee);
    const c = validatePenaltyCommission(penaltyCommission);
    const d = validateBulkSms(bulkSms);
    return [a, b, c, d].filter(Boolean) as string[];
  }, [platformServiceFee, paymentConvenienceFee, penaltyCommission, bulkSms]);

  const getEffectiveFromDate = (): string | undefined => {
    if (effectiveFrom === 'immediate') return undefined;
    const d = new Date();
    if (effectiveFrom === 'next_day') {
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    }
    if (effectiveFrom === 'next_week') {
      const day = d.getDay();
      const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
      d.setDate(d.getDate() + daysUntilMonday);
      return d.toISOString().slice(0, 10);
    }
    return undefined;
  };

  const performSave = (countyId: string, config: CountyMonetizationSettings, effectiveFrom: string | undefined) => {
    updateMutation.mutate(
      {
        countyId,
        config: { monetizationSettings: config },
        section: 'monetizationSettings',
        effectiveFrom,
      },
      {
        onError: () => {},
        onSettled: () => { pendingSaveRef.current = null; },
      }
    );
  };

  const handleSave = () => {
    if (!selectedCountyId) return;
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }
    const newConfig = buildMonetizationConfig();
    const effectiveFrom = getEffectiveFromDate();
    if (hasHighImpactChanges(monetization, newConfig)) {
      pendingSaveRef.current = { countyId: selectedCountyId, config: newConfig, effectiveFrom };
      setShowHighImpactConfirm(true);
      return;
    }
    performSave(selectedCountyId, newConfig, effectiveFrom);
  };

  const handleConfirmHighImpact = () => {
    const pending = pendingSaveRef.current;
    setShowHighImpactConfirm(false);
    if (pending) {
      performSave(pending.countyId, pending.config, pending.effectiveFrom);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 min-w-0 overflow-x-hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">County Monetization Settings</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Active settings per county. Per-county configuration: platform service fee, payment/convenience fee, penalty commission, bulk SMS cost recovery, and subscription period controls. Monetization deductions must align with enabled periods only. Version history and optional effective dates are in the &quot;Version history&quot; tab.
          </p>
        </div>

        {!canEditMonetization && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
            <Lock className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Read-only access</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Only Platform Super Admin can edit monetization settings. You can view all settings and version history.
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base">Select county</CardTitle>
            <CardDescription>Monetization settings are configured per county.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <Select
              value={selectedCountyId ?? ''}
              onValueChange={v => setSelectedCountyId(v || null)}
              disabled={countiesLoading}
            >
              <SelectTrigger className="w-full sm:max-w-sm min-h-[44px] sm:min-h-0">
                <SelectValue placeholder="Select a county" />
              </SelectTrigger>
              <SelectContent>
                {counties.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <Map className="h-4 w-4 text-muted-foreground" />
                      {c.name} ({c.code})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {!selectedCountyId ? (
          <p className="text-muted-foreground">Select a county to configure monetization settings.</p>
        ) : (
          <>
            {validationErrors.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">Validation</p>
                  <ul className="list-disc pl-4 mt-1 text-amber-700 dark:text-amber-300">
                    {validationErrors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-muted-foreground">Fee must not exceed collected amount; enforce at transaction time.</p>
                </div>
              </div>
            )}

            <Tabs defaultValue="platform-fee" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 p-1 h-auto gap-1 rounded-lg bg-muted [&>button]:min-h-[44px] [&>button]:min-w-0">
                <TabsTrigger value="platform-fee" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
                  <Percent className="h-4 w-4 shrink-0" /> <span className="truncate">Platform Fee</span>
                </TabsTrigger>
                <TabsTrigger value="convenience-fee" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
                  <CreditCard className="h-4 w-4 shrink-0" /> <span className="truncate">Convenience</span>
                </TabsTrigger>
                <TabsTrigger value="penalty-commission" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
                  <Scale className="h-4 w-4 shrink-0" /> <span className="truncate">Penalty</span>
                </TabsTrigger>
                <TabsTrigger value="sms-recovery" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
                  <MessageSquare className="h-4 w-4 shrink-0" /> <span className="truncate">Bulk SMS</span>
                </TabsTrigger>
                <TabsTrigger value="period-controls" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
                  <Calendar className="h-4 w-4 shrink-0" /> <span className="truncate">Periods</span>
                </TabsTrigger>
                <TabsTrigger value="calculation-engine" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
                  <Calculator className="h-4 w-4 shrink-0" /> <span className="truncate">Calculator</span>
                </TabsTrigger>
                <TabsTrigger value="version-history" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
                  <History className="h-4 w-4 shrink-0" /> <span className="truncate">History</span>
                </TabsTrigger>
              </TabsList>

              {/* A. Platform Service Fee (Primary) */}
              <TabsContent value="platform-fee" className="space-y-4">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Platform Service Fee (Primary)</CardTitle>
                    <CardDescription className="text-sm">
                      Fee type: Fixed (KES) or Percentage (%). Apply scope: Permit payments only. Basis: per subscription period. Rule: proportional by weeks (weekly fee × number of weeks). Optional discounts per period.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
                    <div className="grid gap-2">
                      <Label>Fee type</Label>
                      <Select
                        value={platformServiceFee.feeType}
                        onValueChange={v => setPlatformServiceFee(prev => ({ ...prev, feeType: v as 'fixed' | 'percentage' }))}
                        disabled={!canEditMonetization}
                      >
                        <SelectTrigger className="w-full sm:max-w-xs min-h-[44px] sm:min-h-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed (KES)</SelectItem>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {platformServiceFee.feeType === 'fixed' && (
                      <div className="grid gap-2">
                        <Label>Fixed fee (KES) — must be ≥ 0</Label>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          className="min-h-[44px] sm:min-h-0"
                          value={platformServiceFee.fixedFeeCents != null ? platformServiceFee.fixedFeeCents / 100 : ''}
                          onChange={e => setPlatformServiceFee(prev => ({ ...prev, fixedFeeCents: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100) }))}
                          disabled={!canEditMonetization}
                          readOnly={!canEditMonetization}
                          placeholder="0"
                        />
                      </div>
                    )}
                    {platformServiceFee.feeType === 'percentage' && (
                      <div className="grid gap-2">
                        <Label>Percentage (%) — 0–100</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          className="min-h-[44px] sm:min-h-0"
                          value={platformServiceFee.percentageFee ?? ''}
                          onChange={e => setPlatformServiceFee(prev => ({ ...prev, percentageFee: e.target.value === '' ? undefined : Number(e.target.value) }))}
                          disabled={!canEditMonetization}
                          readOnly={!canEditMonetization}
                          placeholder="0"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Apply scope: Permit payments only. Basis: per subscription period (Weekly, Monthly, 3 months, 6 months, Annual).</p>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={platformServiceFee.proportionalByWeeks}
                        onCheckedChange={v => setPlatformServiceFee(prev => ({ ...prev, proportionalByWeeks: v }))}
                        disabled={!canEditMonetization}
                      />
                      <Label>Proportional by weeks (weekly fee × number of weeks)</Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Optional period discounts (e.g. annual discount)</Label>
                      {platformServiceFee.periodDiscounts.map((d, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                          <Select
                            value={d.period}
                            onValueChange={v =>
                              setPlatformServiceFee(prev => ({
                                ...prev,
                                periodDiscounts: prev.periodDiscounts.map((pd, j) => (j === i ? { ...pd, period: v as SubscriptionPeriodKey } : pd)),
                              }))
                            }
                            disabled={!canEditMonetization}
                          >
                            <SelectTrigger className="w-full min-w-0 sm:w-[140px] min-h-[44px] sm:min-h-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(PERIOD_LABELS) as SubscriptionPeriodKey[]).map(p => (
                                <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            placeholder="Discount KES"
                            className="w-full min-w-0 sm:w-28 min-h-[44px] sm:min-h-0"
                            value={d.discountCents != null ? d.discountCents / 100 : ''}
                            onChange={e =>
                              setPlatformServiceFee(prev => ({
                                ...prev,
                                periodDiscounts: prev.periodDiscounts.map((pd, j) =>
                                  j === i ? { ...pd, discountCents: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100) } : pd
                                ),
                              }))
                            }
                            disabled={!canEditMonetization}
                            readOnly={!canEditMonetization}
                          />
                          <Input
                            type="number"
                            placeholder="Discount %"
                            className="w-full min-w-0 sm:w-24 min-h-[44px] sm:min-h-0"
                            min={0}
                            max={100}
                            value={d.discountPercent ?? ''}
                            onChange={e =>
                              setPlatformServiceFee(prev => ({
                                ...prev,
                                periodDiscounts: prev.periodDiscounts.map((pd, j) =>
                                  j === i ? { ...pd, discountPercent: e.target.value === '' ? undefined : Number(e.target.value) } : pd
                                ),
                              }))
                            }
                            disabled={!canEditMonetization}
                            readOnly={!canEditMonetization}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-[44px] sm:min-h-0 touch-manipulation w-full sm:w-auto"
                            onClick={() =>
                              setPlatformServiceFee(prev => ({ ...prev, periodDiscounts: prev.periodDiscounts.filter((_, j) => j !== i) }))
                            }
                            disabled={!canEditMonetization}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-[44px] sm:min-h-0 touch-manipulation w-full sm:w-auto"
                        onClick={() =>
                          setPlatformServiceFee(prev => ({
                            ...prev,
                            periodDiscounts: [...prev.periodDiscounts, { period: 'annual' }],
                          }))
                        }
                        disabled={!canEditMonetization}
                      >
                        Add period discount
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* B. Payment Processing / Convenience Fee */}
              <TabsContent value="convenience-fee" className="space-y-4">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Payment Processing / Convenience Fee</CardTitle>
                    <CardDescription className="text-sm">
                      Toggle: Included in Platform Fee (on/off). If not included: set fee type (Fixed or %), apply to all transactions (permits + penalties). Purpose label (internal): &quot;processing/convenience fee&quot;.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
                    <div className="flex items-center gap-2 min-h-[44px]">
                      <Switch
                        checked={paymentConvenienceFee.includedInPlatformFee}
                        onCheckedChange={v => setPaymentConvenienceFee(prev => ({ ...prev, includedInPlatformFee: v }))}
                        disabled={!canEditMonetization}
                      />
                      <Label>Included in Platform Fee</Label>
                    </div>
                    {!paymentConvenienceFee.includedInPlatformFee && (
                      <>
                        <div className="grid gap-2">
                          <Label>Fee type</Label>
                          <Select
                            value={paymentConvenienceFee.feeType}
                            onValueChange={v => setPaymentConvenienceFee(prev => ({ ...prev, feeType: v as 'fixed' | 'percentage' }))}
                            disabled={!canEditMonetization}
                          >
                            <SelectTrigger className="w-full sm:max-w-xs min-h-[44px] sm:min-h-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed (KES)</SelectItem>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {paymentConvenienceFee.feeType === 'fixed' && (
                          <div className="grid gap-2">
                            <Label>Fixed fee (KES) — ≥ 0</Label>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={paymentConvenienceFee.fixedFeeCents != null ? paymentConvenienceFee.fixedFeeCents / 100 : ''}
                              onChange={e => setPaymentConvenienceFee(prev => ({ ...prev, fixedFeeCents: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100) }))}
                              disabled={!canEditMonetization}
                              readOnly={!canEditMonetization}
                              placeholder="0"
                            />
                          </div>
                        )}
                        {paymentConvenienceFee.feeType === 'percentage' && (
                          <div className="grid gap-2">
                            <Label>Percentage (%) — 0–100</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={paymentConvenienceFee.percentageFee ?? ''}
                              onChange={e => setPaymentConvenienceFee(prev => ({ ...prev, percentageFee: e.target.value === '' ? undefined : Number(e.target.value) }))}
                              disabled={!canEditMonetization}
                              readOnly={!canEditMonetization}
                              placeholder="0"
                            />
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">Apply scope: All transactions (permits + penalties).</p>
                        <div className="grid gap-2">
                          <Label>Purpose label (internal only)</Label>
                          <Input
                            value={paymentConvenienceFee.purposeLabel}
                            onChange={e => setPaymentConvenienceFee(prev => ({ ...prev, purposeLabel: e.target.value }))}
                            placeholder="processing/convenience fee"
                            disabled={!canEditMonetization}
                            readOnly={!canEditMonetization}
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* C. Penalty Commission */}
              <TabsContent value="penalty-commission" className="space-y-4">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Penalty Commission</CardTitle>
                    <CardDescription className="text-sm">
                      Fee type: Fixed (KES) or Percentage (%). Apply scope: Penalty payments only. Charged only when penalty payment succeeds. Validation: KES ≥ 0 or 0–100%.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
                    <div className="grid gap-2">
                      <Label>Fee type</Label>
                      <Select
                        value={penaltyCommission.feeType}
                        onValueChange={v => setPenaltyCommission(prev => ({ ...prev, feeType: v as 'fixed' | 'percentage' }))}
                        disabled={!canEditMonetization}
                      >
                        <SelectTrigger className="w-full sm:max-w-xs min-h-[44px] sm:min-h-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed (KES)</SelectItem>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {penaltyCommission.feeType === 'fixed' && (
                      <div className="grid gap-2">
                        <Label>Fixed fee (KES) — must be ≥ 0</Label>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={penaltyCommission.fixedFeeCents != null ? penaltyCommission.fixedFeeCents / 100 : ''}
                          onChange={e => setPenaltyCommission(prev => ({ ...prev, fixedFeeCents: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100) }))}
                          disabled={!canEditMonetization}
                          readOnly={!canEditMonetization}
                          placeholder="0"
                        />
                      </div>
                    )}
                    {penaltyCommission.feeType === 'percentage' && (
                      <div className="grid gap-2">
                        <Label>Percentage (%) — 0–100</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={penaltyCommission.percentageFee ?? ''}
                          onChange={e => setPenaltyCommission(prev => ({ ...prev, percentageFee: e.target.value === '' ? undefined : Number(e.target.value) }))}
                          disabled={!canEditMonetization}
                          readOnly={!canEditMonetization}
                          placeholder="0"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={penaltyCommission.chargedOnSuccessOnly}
                        onCheckedChange={v => setPenaltyCommission(prev => ({ ...prev, chargedOnSuccessOnly: v }))}
                        disabled={!canEditMonetization}
                      />
                      <Label>Charged only when penalty payment succeeds</Label>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* D. Bulk SMS Cost Recovery */}
              <TabsContent value="sms-recovery" className="space-y-4">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Bulk SMS Cost Recovery</CardTitle>
                    <CardDescription className="text-sm">
                      Cost per SMS (KES, required). Optional markup per SMS (KES) or markup %. Message category toggles control charging/reporting. Apply scope: deducted from county collections periodically (recommended) or per transaction. Total SMS charges per county should be tracked and shown.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
                    <div className="grid gap-2">
                      <Label>Cost per SMS (KES) — required, ≥ 0</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={bulkSms.costPerSmsCents != null ? bulkSms.costPerSmsCents / 100 : ''}
                        onChange={e => setBulkSms(prev => ({ ...prev, costPerSmsCents: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100) }))}
                        disabled={!canEditMonetization}
                        readOnly={!canEditMonetization}
                        placeholder="0"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Optional markup per SMS (KES)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={bulkSms.markupPerSmsCents != null ? bulkSms.markupPerSmsCents / 100 : ''}
                        onChange={e =>
                          setBulkSms(prev => ({
                            ...prev,
                            markupPerSmsCents: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100),
                          }))
                        }
                        placeholder="—"
                        disabled={!canEditMonetization}
                        readOnly={!canEditMonetization}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Optional markup (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={bulkSms.markupPercent ?? ''}
                        onChange={e =>
                          setBulkSms(prev => ({
                            ...prev,
                            markupPercent: e.target.value === '' ? undefined : Number(e.target.value),
                          }))
                        }
                        placeholder="—"
                        disabled={!canEditMonetization}
                        readOnly={!canEditMonetization}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Message categories (control charging/reporting)</Label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(
                          [
                            ['paymentConfirmation', 'Payment confirmation'],
                            ['permitExpiryReminders', 'Permit expiry reminders'],
                            ['penaltyAlerts', 'Penalty alerts'],
                            ['enforcementNotices', 'Enforcement notices'],
                          ] as const
                        ).map(([key, label]) => (
                          <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                            <Label className="text-sm">{label}</Label>
                            <Switch
                              checked={bulkSms.messageCategories[key]}
                              onCheckedChange={v =>
                                setBulkSms(prev => ({
                                  ...prev,
                                  messageCategories: { ...prev.messageCategories, [key]: v },
                                }))
                              }
                              disabled={!canEditMonetization}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Apply scope</Label>
                      <Select
                        value={bulkSms.applyScope}
                        onValueChange={v => setBulkSms(prev => ({ ...prev, applyScope: v as 'periodic_deduction' | 'per_transaction' }))}
                        disabled={!canEditMonetization}
                      >
                        <SelectTrigger className="max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="periodic_deduction">Deducted from county collections periodically (recommended)</SelectItem>
                          <SelectItem value="per_transaction">Deducted per relevant transaction</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">Total SMS charges per county should be tracked and displayed in reporting.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Calculation Engine + Deduction Rules */}
              <TabsContent value="calculation-engine" className="space-y-4">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <FileText className="h-5 w-5 shrink-0" /> Calculation Engine & Deduction Rules
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Consistent calculation process used everywhere. For each payment we determine county, payment type, and period; compute deductions from this county&apos;s active settings; store gross, total deductions, and net to county on the payment record once successful.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
                    <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-3">
                      <p className="font-medium">Process (per payment)</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Determine <code className="text-foreground">countyId</code>, <code className="text-foreground">paymentType</code> (PERMIT or PENALTY), and <code className="text-foreground">period</code> (if permit).</li>
                        <li>Compute applicable deductions: Platform fee (permit only), Processing fee (if enabled; permit + penalty), Penalty commission (penalty only).</li>
                        <li>Compute <code className="text-foreground">grossAmount</code> (KES), <code className="text-foreground">totalDeductions</code> (KES), <code className="text-foreground">netToCounty</code> (KES).</li>
                        <li>Store these values on the payment record once successful (immutable thereafter).</li>
                      </ol>
                    </div>
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm space-y-2">
                      <p className="font-medium text-amber-800 dark:text-amber-200">Important rules</p>
                      <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
                        <li>Deductions must never exceed gross amount.</li>
                        <li>Idempotent processing: no double deductions on retries or webhooks.</li>
                        <li>All calculations use this county&apos;s active settings at the time of the transaction.</li>
                      </ul>
                    </div>
                    <CalculationEnginePreview monetization={buildMonetizationConfig()} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* E. Subscription Period Controls */}
              <TabsContent value="period-controls" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Period Controls (Permit Durations)</CardTitle>
                    <CardDescription>
                      Enable/disable which permit durations are available in this county. Set the county&apos;s base permit price per period (if not already elsewhere). Monetization deductions must align with enabled periods only.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Enabled permit durations</Label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(Object.keys(PERIOD_LABELS) as SubscriptionPeriodKey[]).map(period => (
                          <div key={period} className="flex items-center justify-between rounded-lg border p-3">
                            <Label className="text-sm">{PERIOD_LABELS[period]}</Label>
                            <Switch
                              checked={subscriptionPeriodControls.enabledDurations[period]}
                              onCheckedChange={v =>
                                setSubscriptionPeriodControls(prev => ({
                                  ...prev,
                                  enabledDurations: { ...prev.enabledDurations, [period]: v },
                                }))
                              }
                              disabled={!canEditMonetization}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Base permit price per period (KES, optional)</Label>
                      <p className="text-xs text-muted-foreground">If not set elsewhere; used to align monetization with enabled periods.</p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {(Object.keys(PERIOD_LABELS) as SubscriptionPeriodKey[]).map(period => (
                          <div key={period} className="flex items-center gap-2">
                            <Label className="w-24 shrink-0 text-sm text-muted-foreground">{PERIOD_LABELS[period]}</Label>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              placeholder="—"
                              value={
                                subscriptionPeriodControls.basePermitPriceCentsPerPeriod?.[period] != null
                                  ? subscriptionPeriodControls.basePermitPriceCentsPerPeriod[period]! / 100
                                  : ''
                              }
                              onChange={e =>
                                setSubscriptionPeriodControls(prev => ({
                                  ...prev,
                                  basePermitPriceCentsPerPeriod: {
                                    ...prev.basePermitPriceCentsPerPeriod,
                                    [period]: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100),
                                  },
                                }))
                              }
                              disabled={!canEditMonetization}
                              readOnly={!canEditMonetization}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              {/* Version history: who changed, when, previous vs new, optional effective date */}
              <TabsContent value="version-history" className="space-y-4">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <History className="h-5 w-5 shrink-0" /> Settings versioning & effective dates
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Active settings per county. History log: who changed it, when, previous vs new values, and optional effective date for changes (apply from next day/week).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <p className="text-sm text-muted-foreground mb-4">
                      This county&apos;s active monetization settings are shown in the tabs above. Changes apply prospectively; optional effective date is recorded for audit.
                    </p>
                    {monetizationHistory.isLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
                      </div>
                    ) : !monetizationHistory.data?.length ? (
                      <p className="text-sm text-muted-foreground">No monetization changes recorded yet.</p>
                    ) : (
                      <div className="rounded-lg border overflow-x-auto">
                        <table className="w-full text-sm min-w-[500px]">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-3 font-medium">When</th>
                              <th className="text-left p-3 font-medium">Who</th>
                              <th className="text-left p-3 font-medium">Role</th>
                              <th className="text-left p-3 font-medium">Effective from</th>
                              <th className="w-10 p-3" />
                            </tr>
                          </thead>
                          <tbody>
                            {monetizationHistory.data.map((entry) => (
                              <React.Fragment key={entry.id}>
                                <tr
                                  className="border-b hover:bg-muted/30 cursor-pointer min-h-[44px] touch-manipulation"
                                  onClick={() => setExpandedHistoryId((id) => (id === entry.id ? null : entry.id))}
                                >
                                  <td className="p-3">
                                    {new Date(entry.created_at).toLocaleString(undefined, {
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                    })}
                                  </td>
                                  <td className="p-3 flex items-center gap-1">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    {entry.who}
                                  </td>
                                  <td className="p-3">
                                    <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                                      {entry.actor_role ?? '—'}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    {entry.effective_from
                                      ? new Date(entry.effective_from).toLocaleDateString(undefined, { dateStyle: 'short' })
                                      : 'Immediate'}
                                  </td>
                                  <td className="p-3">
                                    {expandedHistoryId === entry.id ? (
                                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </td>
                                </tr>
                                {expandedHistoryId === entry.id && (
                                  <tr className="border-b bg-muted/20">
                                    <td colSpan={5} className="p-4">
                                      <div className="grid gap-4 sm:grid-cols-2 text-xs">
                                        <div>
                                          <p className="font-medium text-muted-foreground mb-1">Previous values</p>
                                          <pre className="rounded bg-background border p-3 overflow-auto max-h-48 font-mono whitespace-pre-wrap break-all">
                                            {entry.old_monetization
                                              ? JSON.stringify(entry.old_monetization, null, 2)
                                              : '—'}
                                          </pre>
                                        </div>
                                        <div>
                                          <p className="font-medium text-muted-foreground mb-1">New values</p>
                                          <pre className="rounded bg-background border p-3 overflow-auto max-h-48 font-mono whitespace-pre-wrap break-all">
                                            {entry.new_monetization
                                              ? JSON.stringify(entry.new_monetization, null, 2)
                                              : '—'}
                                          </pre>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {canEditMonetization && (
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-end gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                  <Label className="text-sm text-muted-foreground">Effective date</Label>
                  <Select value={effectiveFrom} onValueChange={(v) => setEffectiveFrom(v as 'immediate' | 'next_day' | 'next_week')}>
                    <SelectTrigger className="w-full sm:w-[180px] min-h-[44px] sm:min-h-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="next_day">Next day</SelectItem>
                      <SelectItem value="next_week">Next week (Monday)</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">Optional; recorded in history</span>
                </div>
                <Button onClick={handleSave} disabled={updateMutation.isPending || validationErrors.length > 0} className="w-full sm:w-auto min-h-[44px] touch-manipulation">
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save monetization settings
                </Button>
              </div>
            )}

            <AlertDialog open={showHighImpactConfirm} onOpenChange={setShowHighImpactConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm high-impact change</AlertDialogTitle>
                  <AlertDialogDescription>
                    This update changes fee percentages (platform fee, convenience fee, penalty commission, or markup). These changes affect revenue. Are you sure you want to continue?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmHighImpact}>
                    Confirm and save
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </SuperAdminLayout>
  );
}
