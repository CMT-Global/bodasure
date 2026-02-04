-- Allow platform admins to SELECT riders and owners (e.g. for super-admin user-access-governance list).
-- They can already manage profiles and user_roles; this lets the list include users who exist
-- only in riders/owners tables so role filter "rider" / "owner" works.

DROP POLICY IF EXISTS "Platform admins can view all riders" ON public.riders;
CREATE POLICY "Platform admins can view all riders"
  ON public.riders FOR SELECT TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can view all owners" ON public.owners;
CREATE POLICY "Platform admins can view all owners"
  ON public.owners FOR SELECT TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()));
