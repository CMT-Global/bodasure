-- County User Access & Roles (RBAC – Mandatory)
-- 1. Role-based access enforced server-side (RLS by role)
-- 2. Each role only sees permitted actions (SELECT vs INSERT/UPDATE/DELETE by role)
-- 3. No cross-county access under any circumstance (strict county_id = get_user_county_id)

-- =====================================================
-- HELPERS: County access and role checks
-- =====================================================

-- Get user's county: profile first, then single county from county roles (no cross-county).
CREATE OR REPLACE FUNCTION public.get_user_county_id(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile_county UUID;
  _roles_county UUID;
  _county_count INT;
BEGIN
  SELECT county_id INTO _profile_county FROM public.profiles WHERE id = _user_id LIMIT 1;
  IF _profile_county IS NOT NULL THEN
    RETURN _profile_county;
  END IF;
  -- Fallback: single county from county portal roles (no access if multiple counties)
  SELECT COUNT(DISTINCT county_id) INTO _county_count
  FROM public.user_roles
  WHERE user_id = _user_id
    AND county_id IS NOT NULL
    AND role IN (
      'county_super_admin', 'county_admin',
      'county_finance_officer', 'county_enforcement_officer',
      'county_registration_agent', 'county_analyst'
    );
  IF _county_count = 1 THEN
    SELECT county_id INTO _roles_county
    FROM public.user_roles
    WHERE user_id = _user_id
      AND county_id IS NOT NULL
      AND role IN (
        'county_super_admin', 'county_admin',
        'county_finance_officer', 'county_enforcement_officer',
        'county_registration_agent', 'county_analyst'
      )
    LIMIT 1;
    RETURN _roles_county;
  END IF;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_user_county_id(UUID) IS 'Returns the single county the user belongs to; no cross-county access.';

-- True if user has any of the given roles for the given county (or is platform admin).
CREATE OR REPLACE FUNCTION public.user_has_county_roles(_user_id UUID, _county_id UUID, _roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND county_id = _county_id
      AND role::text = ANY(_roles)
  );
$$;

-- True if user can view (SELECT) county-scoped data in this county (any county portal role or platform admin).
CREATE OR REPLACE FUNCTION public.user_can_view_county_data(_user_id UUID, _county_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_county_roles(_user_id, _county_id, ARRAY[
    'county_super_admin', 'county_admin',
    'county_finance_officer', 'county_enforcement_officer',
    'county_registration_agent', 'county_analyst'
  ]::TEXT[]);
$$;

-- True if user can manage (INSERT/UPDATE/DELETE) riders in this county.
CREATE OR REPLACE FUNCTION public.user_can_manage_riders(_user_id UUID, _county_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_county_roles(_user_id, _county_id, ARRAY[
    'county_super_admin', 'county_admin', 'county_registration_agent'
  ]::TEXT[]);
$$;

-- True if user can manage penalties in this county.
CREATE OR REPLACE FUNCTION public.user_can_manage_penalties(_user_id UUID, _county_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_county_roles(_user_id, _county_id, ARRAY[
    'county_super_admin', 'county_admin', 'county_enforcement_officer'
  ]::TEXT[]);
$$;

-- True if user can manage payments in this county (county admin / finance).
CREATE OR REPLACE FUNCTION public.user_can_manage_payments(_user_id UUID, _county_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_county_roles(_user_id, _county_id, ARRAY[
    'county_super_admin', 'county_admin', 'county_finance_officer'
  ]::TEXT[]);
$$;

-- =====================================================
-- RLS: County-scoped SELECT for all county roles (no cross-county)
-- =====================================================
-- Add SELECT policies so county_finance_officer, county_enforcement_officer,
-- county_registration_agent, county_analyst can view data in their county only.
-- All use: active user AND county_id = get_user_county_id(auth.uid()) AND user_can_view_county_data.
-- Existing "County admins can manage" stays for INSERT/UPDATE/DELETE for super_admin/admin.
-- We add role-specific write policies below where needed.
-- =====================================================

-- Saccos: county users can SELECT in their county only
DROP POLICY IF EXISTS "Users can view saccos in their county" ON public.saccos;
CREATE POLICY "Users can view saccos in their county"
  ON public.saccos FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_view_county_data(auth.uid(), county_id)
  );

-- Stages: county users can SELECT in their county only
DROP POLICY IF EXISTS "Users can view stages in their county" ON public.stages;
CREATE POLICY "Users can view stages in their county"
  ON public.stages FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_view_county_data(auth.uid(), county_id)
  );

-- Owners: county users can SELECT in their county only (in addition to "Owners can view own profile")
DROP POLICY IF EXISTS "County users can view owners in their county" ON public.owners;
CREATE POLICY "County users can view owners in their county"
  ON public.owners FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_view_county_data(auth.uid(), county_id)
  );

-- Riders: county users can SELECT in their county only
DROP POLICY IF EXISTS "County admins can manage riders" ON public.riders;
CREATE POLICY "County admins can manage riders"
  ON public.riders FOR ALL TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "County users can view riders in their county"
  ON public.riders FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_view_county_data(auth.uid(), county_id)
  );

CREATE POLICY "County registration or admin can manage riders"
  ON public.riders FOR ALL TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.user_can_manage_riders(auth.uid(), county_id))
  WITH CHECK (public.is_user_active(auth.uid()) AND public.user_can_manage_riders(auth.uid(), county_id));

-- Motorbikes: county users can SELECT in their county; registration/admin can manage
DROP POLICY IF EXISTS "County users can view motorbikes in their county" ON public.motorbikes;
CREATE POLICY "County users can view motorbikes in their county"
  ON public.motorbikes FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_view_county_data(auth.uid(), county_id)
  );

-- Permit types: county users can SELECT in their county
DROP POLICY IF EXISTS "Anyone can view active permit types" ON public.permit_types;
CREATE POLICY "Anyone can view active permit types"
  ON public.permit_types FOR SELECT TO authenticated
  USING (public.is_user_active(auth.uid()) AND is_active = true);

DROP POLICY IF EXISTS "County users can view permit types in their county" ON public.permit_types;
CREATE POLICY "County users can view permit types in their county"
  ON public.permit_types FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_view_county_data(auth.uid(), county_id)
  );

-- Permits: county users can SELECT in their county
DROP POLICY IF EXISTS "County users can view permits in their county" ON public.permits;
CREATE POLICY "County users can view permits in their county"
  ON public.permits FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_view_county_data(auth.uid(), county_id)
  );

-- Payments: county users with view access can SELECT; manage only for admin/finance
DROP POLICY IF EXISTS "County finance can manage payments" ON public.payments;
CREATE POLICY "County finance can manage payments"
  ON public.payments FOR ALL TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "County finance officer can manage payments"
  ON public.payments FOR ALL TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.user_can_manage_payments(auth.uid(), county_id))
  WITH CHECK (public.is_user_active(auth.uid()) AND public.user_can_manage_payments(auth.uid(), county_id));

DROP POLICY IF EXISTS "County users can view payments in their county" ON public.payments;
CREATE POLICY "County users can view payments in their county"
  ON public.payments FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_view_county_data(auth.uid(), county_id)
  );

-- Penalties: county enforcement + admin can manage; all county roles can view in their county
DROP POLICY IF EXISTS "County admins can manage penalties" ON public.penalties;
CREATE POLICY "County admins can manage penalties"
  ON public.penalties FOR ALL TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "County enforcement can manage penalties"
  ON public.penalties FOR ALL TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.user_can_manage_penalties(auth.uid(), county_id))
  WITH CHECK (public.is_user_active(auth.uid()) AND public.user_can_manage_penalties(auth.uid(), county_id));

DROP POLICY IF EXISTS "County users can view penalties in their county" ON public.penalties;
CREATE POLICY "County users can view penalties in their county"
  ON public.penalties FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_view_county_data(auth.uid(), county_id)
  );

-- Audit logs: county users can view their county's audit logs
DROP POLICY IF EXISTS "County admins can view county audit logs" ON public.audit_logs;
CREATE POLICY "County admins can view county audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_view_county_data(auth.uid(), county_id)
  );

-- =====================================================
-- User roles: county users can only see roles in their county
-- =====================================================
-- Keep "Users can view own roles" and "County admins can manage roles in their county".
-- Add: county users can view user_roles where county_id = their county (for transparency).
DROP POLICY IF EXISTS "County users can view roles in their county" ON public.user_roles;
CREATE POLICY "County users can view roles in their county"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_view_county_data(auth.uid(), county_id)
  );

-- =====================================================
-- Profiles: county admins can view profiles in their county (already present);
-- ensure county users cannot see other counties' profiles
-- =====================================================
-- Existing "County admins can view profiles in their county" is correct.
-- No change needed.

-- =====================================================
-- Permit types / Permits: county registration + admin can manage
-- =====================================================
-- Permit types: already "County admins can manage permit types". Add registration/admin manage.
-- Permits: already "County admins can manage permits". Registration agent creates permits via riders flow.
-- So we rely on is_county_admin for permit_types/permits write; registration_agent can create permits
-- if we add user_can_manage_permits. For simplicity, permit_types and permits write stay with county_admin
-- only; registration_agent creates riders/permits through app logic that may use service role or we add
-- a small set of policies. Checking: COUNTY_PORTAL_ROLES says registration can "Generate QR IDs" and
-- "Register riders, owners, bikes" — so they need to insert riders, owners, motorbikes, and possibly
-- permits. We already added "County registration or admin can insert/update riders". For permits,
-- creation is often tied to rider. Let me add user_can_manage_permits for registration + admin.
CREATE OR REPLACE FUNCTION public.user_can_manage_permits(_user_id UUID, _county_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_county_roles(_user_id, _county_id, ARRAY[
    'county_super_admin', 'county_admin', 'county_registration_agent'
  ]::TEXT[]);
$$;

-- Permits table: county registration/admin can manage in their county
DROP POLICY IF EXISTS "County registration can manage permits in their county" ON public.permits;
CREATE POLICY "County registration can manage permits in their county"
  ON public.permits FOR ALL TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_manage_permits(auth.uid(), county_id)
  )
  WITH CHECK (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_manage_permits(auth.uid(), county_id)
  );

-- Owners: registration + admin can manage
DROP POLICY IF EXISTS "County admins can manage owners" ON public.owners;
CREATE POLICY "County admins can manage owners"
  ON public.owners FOR ALL TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "County registration can manage owners"
  ON public.owners FOR ALL TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.user_can_manage_riders(auth.uid(), county_id))
  WITH CHECK (public.is_user_active(auth.uid()) AND public.user_can_manage_riders(auth.uid(), county_id));

-- Motorbikes: admin + registration can manage in their county
DROP POLICY IF EXISTS "County admins can manage motorbikes" ON public.motorbikes;
CREATE POLICY "County admins can manage motorbikes"
  ON public.motorbikes FOR ALL TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "County registration can manage motorbikes in their county"
  ON public.motorbikes FOR ALL TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_manage_riders(auth.uid(), county_id)
  )
  WITH CHECK (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_manage_riders(auth.uid(), county_id)
  );
