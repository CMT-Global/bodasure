-- Allow platform admins to SELECT all payments and penalties for county portal dashboard "All counties" view.
-- County users still only see their county via existing policies; this adds OR is_platform_admin for SELECT.

DROP POLICY IF EXISTS "Platform admins can view all payments" ON public.payments;
CREATE POLICY "Platform admins can view all payments"
  ON public.payments FOR SELECT TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can view all penalties" ON public.penalties;
CREATE POLICY "Platform admins can view all penalties"
  ON public.penalties FOR SELECT TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()));
