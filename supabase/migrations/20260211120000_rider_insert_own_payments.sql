-- Allow riders to create (INSERT) their own payment records when initiating Paystack payments.
-- The paystack-initialize edge function runs with the user's JWT; without this policy, RLS blocks
-- the insert and the user sees "Failed to create payment record" (e.g. when starting a new payment
-- while another is still pending).
-- Riders can only insert rows where rider_id is one of their own rider records.

CREATE POLICY "Riders can insert own payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_user_active(auth.uid())
    AND rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
  );
