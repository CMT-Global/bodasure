-- Payment calculation engine: store payment_type, period, and immutable breakdown (gross, deductions, net to county).
-- Used for consistent calculation everywhere; deductions never exceed gross; idempotent on webhook retries.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IS NULL OR payment_type IN ('PERMIT', 'PENALTY')),
  ADD COLUMN IF NOT EXISTS period TEXT,
  ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS total_deductions DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS net_to_county DECIMAL(10, 2);

COMMENT ON COLUMN public.payments.payment_type IS 'PERMIT or PENALTY; set at creation from metadata.';
COMMENT ON COLUMN public.payments.period IS 'Subscription period for permit payments (e.g. weekly, monthly, annual).';
COMMENT ON COLUMN public.payments.gross_amount IS 'Gross amount in KES (customer paid). Set once on success; immutable.';
COMMENT ON COLUMN public.payments.total_deductions IS 'Total deductions in KES (platform + processing + penalty commission). Set once on success; immutable.';
COMMENT ON COLUMN public.payments.net_to_county IS 'Net to county in KES (gross - total_deductions). Set once on success; immutable.';
