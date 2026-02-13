-- Expire pending payments that have been pending for more than 10 minutes.
-- Used by dashboard/payments so riders' unsuccessful payments change from pending to failed.
-- SECURITY DEFINER so any authenticated user can trigger expiry for all counties (RLS would
-- otherwise block e.g. platform admins from updating payments in counties they don't "manage").

CREATE OR REPLACE FUNCTION public.expire_stale_pending_payments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.payments
  SET status = 'failed', updated_at = now()
  WHERE status = 'pending'
    AND created_at < (now() - interval '10 minutes');
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION public.expire_stale_pending_payments() IS
  'Marks payments as failed when they have been pending for more than 10 minutes. Call from dashboard/payments on load.';

GRANT EXECUTE ON FUNCTION public.expire_stale_pending_payments() TO authenticated;
