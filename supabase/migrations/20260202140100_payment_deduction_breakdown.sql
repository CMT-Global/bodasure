-- Store per-payment deduction breakdown for monetization summary reporting.
-- Populated when payment is recorded; used for Finance View by county and date range.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS processing_fee DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS penalty_commission DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS sms_charges DECIMAL(10, 2);

COMMENT ON COLUMN public.payments.platform_fee IS 'Platform service fee in KES for this payment. Set once on success.';
COMMENT ON COLUMN public.payments.processing_fee IS 'Payment convenience/processing fee in KES. Set once on success.';
COMMENT ON COLUMN public.payments.penalty_commission IS 'Penalty commission in KES (for PENALTY payments). Set once on success.';
COMMENT ON COLUMN public.payments.sms_charges IS 'SMS cost recovery charged for this transaction if applicable. Set once on success.';
