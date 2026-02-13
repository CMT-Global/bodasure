-- Allow platform super admin, county super admin, and county admin to update county row (e.g. settings JSON for penalty types, escalation rules).
-- This fixes: penalty types and escalation rules created in dashboard/settings not persisting on refresh.
-- Platform admins can update any county; county admins/super admins can update their county.
DROP POLICY IF EXISTS "County admins can update their county" ON public.counties;
CREATE POLICY "County admins can update their county"
  ON public.counties FOR UPDATE
  TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND (
      public.is_platform_admin(auth.uid())
      OR public.is_county_admin(auth.uid(), id)
    )
  );
