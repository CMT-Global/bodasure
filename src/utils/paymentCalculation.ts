/**
 * Payment calculation engine — consistent process used everywhere.
 * For each payment: determine countyId, paymentType (PERMIT | PENALTY), period (if permit);
 * compute applicable deductions; ensure totalDeductions <= grossAmount; store on payment record once successful.
 *
 * Rules:
 * - Deductions must never exceed gross amount.
 * - Idempotent processing (no double deductions on retries/webhooks).
 * - All calculations use county's active settings at the time of transaction.
 */

export type PaymentType = 'PERMIT' | 'PENALTY';

export type SubscriptionPeriodKey =
  | 'weekly'
  | 'monthly'
  | 'three_months'
  | 'six_months'
  | 'annual';

/** Minimal monetization config used for calculation (matches CountyMonetizationSettings). */
export interface PaymentCalculationMonetization {
  platformServiceFee: {
    feeType: 'fixed' | 'percentage';
    fixedFeeCents?: number;
    percentageFee?: number;
    periods?: { period: SubscriptionPeriodKey; enabled: boolean }[];
    proportionalByWeeks?: boolean;
    periodDiscounts?: { period: SubscriptionPeriodKey; discountCents?: number; discountPercent?: number }[];
  };
  paymentConvenienceFee: {
    includedInPlatformFee: boolean;
    feeType: 'fixed' | 'percentage';
    fixedFeeCents?: number;
    percentageFee?: number;
  };
  penaltyCommission: {
    feeType: 'fixed' | 'percentage';
    fixedFeeCents?: number;
    percentageFee?: number;
  };
}

export interface PaymentCalculationInput {
  /** Gross amount paid by customer, in KES. */
  grossAmountKES: number;
  paymentType: PaymentType;
  /** Required for PERMIT; ignored for PENALTY. */
  period?: SubscriptionPeriodKey | null;
  monetization: PaymentCalculationMonetization;
}

export interface PaymentCalculationBreakdown {
  grossAmountKES: number;
  platformFeeKES: number;
  processingFeeKES: number;
  penaltyCommissionKES: number;
  totalDeductionsKES: number;
  netToCountyKES: number;
}

const ROUND = (x: number) => Math.round(x * 100) / 100;

function periodEnabled(
  periods: { period: SubscriptionPeriodKey; enabled: boolean }[] | undefined,
  period: SubscriptionPeriodKey
): boolean {
  if (!periods?.length) return true;
  const p = periods.find((x) => x.period === period);
  return p?.enabled ?? true;
}

function platformFeeForPermit(
  grossKES: number,
  period: SubscriptionPeriodKey | undefined | null,
  config: PaymentCalculationMonetization['platformServiceFee']
): number {
  if (!period || !periodEnabled(config.periods, period)) return 0;
  let fee = 0;
  if (config.feeType === 'fixed' && config.fixedFeeCents != null) {
    fee = config.fixedFeeCents / 100;
  } else if (config.feeType === 'percentage' && config.percentageFee != null) {
    fee = (grossKES * config.percentageFee) / 100;
  }
  const discount = config.periodDiscounts?.find((d) => d.period === period);
  if (discount) {
    if (discount.discountCents != null) fee = Math.max(0, fee - discount.discountCents / 100);
    if (discount.discountPercent != null) fee = Math.max(0, fee * (1 - discount.discountPercent / 100));
  }
  return ROUND(fee);
}

function processingFee(
  grossKES: number,
  config: PaymentCalculationMonetization['paymentConvenienceFee']
): number {
  if (config.includedInPlatformFee) return 0;
  if (config.feeType === 'fixed' && config.fixedFeeCents != null) {
    return ROUND(config.fixedFeeCents / 100);
  }
  if (config.feeType === 'percentage' && config.percentageFee != null) {
    return ROUND((grossKES * config.percentageFee) / 100);
  }
  return 0;
}

function penaltyCommissionFee(
  grossKES: number,
  config: PaymentCalculationMonetization['penaltyCommission']
): number {
  if (config.feeType === 'fixed' && config.fixedFeeCents != null) {
    return ROUND(config.fixedFeeCents / 100);
  }
  const pct = config.percentageFee ?? 0;
  return ROUND((grossKES * pct) / 100);
}

/**
 * Compute deduction breakdown for a single payment.
 * Uses county's active monetization settings. Deductions are capped so totalDeductions <= grossAmount.
 */
export function calculatePaymentDeductions(
  input: PaymentCalculationInput
): PaymentCalculationBreakdown {
  const { grossAmountKES, paymentType, period, monetization } = input;
  const gross = ROUND(Number(grossAmountKES) || 0);

  let platformFeeKES = 0;
  if (paymentType === 'PERMIT') {
    platformFeeKES = platformFeeForPermit(
      gross,
      period ?? null,
      monetization.platformServiceFee
    );
  }

  const processingFeeKES = processingFee(gross, monetization.paymentConvenienceFee);

  let penaltyCommissionKES = 0;
  if (paymentType === 'PENALTY') {
    penaltyCommissionKES = penaltyCommissionFee(gross, monetization.penaltyCommission);
  }

  let totalDeductions = ROUND(
    platformFeeKES + processingFeeKES + penaltyCommissionKES
  );
  if (totalDeductions > gross) {
    totalDeductions = gross;
  }
  const netToCounty = ROUND(gross - totalDeductions);

  return {
    grossAmountKES: gross,
    platformFeeKES,
    processingFeeKES,
    penaltyCommissionKES,
    totalDeductionsKES: totalDeductions,
    netToCountyKES: netToCounty,
  };
}
