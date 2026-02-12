-- Phone OTP table for SMS-based login (used only by Edge Functions with service role)
CREATE TABLE public.phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_phone_otps_phone_expires ON public.phone_otps(phone, expires_at);

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role (Edge Functions) can access; anon/authenticated get no access.

COMMENT ON TABLE public.phone_otps IS 'OTP codes for phone login; access via service role only.';
