-- Lockout after 3 failed OTP attempts: phone cannot request new OTP for 10 minutes
CREATE TABLE public.phone_otp_lockouts (
  phone TEXT NOT NULL PRIMARY KEY,
  locked_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_otp_lockouts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.phone_otp_lockouts IS '10-min lockout per phone after 3 failed OTP attempts; service role only.';
