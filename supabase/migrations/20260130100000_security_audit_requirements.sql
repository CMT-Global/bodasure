-- Security & Audit Requirements
-- 1. Every action logged with: User, Role, County, Timestamp
-- 2. Permission checks enforced server-side (RLS + is_user_active)
-- 3. Immediate access revocation on suspension

-- =====================================================
-- 1. AUDIT LOGS: Add actor_role (Role at time of action)
-- =====================================================

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_role TEXT;

COMMENT ON COLUMN public.audit_logs.actor_role IS 'Role of the user who performed the action (User, Role, County, Timestamp = user_id, actor_role, county_id, created_at).';

-- Set actor_role on INSERT from user_roles (primary role for that county)
CREATE OR REPLACE FUNCTION public.set_audit_log_actor_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.actor_role IS NULL THEN
    SELECT ur.role INTO NEW.actor_role
    FROM public.user_roles ur
    WHERE ur.user_id = NEW.user_id
      AND (NEW.county_id IS NULL OR ur.county_id = NEW.county_id)
    ORDER BY CASE ur.role
      WHEN 'platform_super_admin' THEN 1
      WHEN 'platform_admin' THEN 2
      WHEN 'county_super_admin' THEN 3
      WHEN 'county_admin' THEN 4
      ELSE 5
    END
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_audit_log_actor_role_trigger ON public.audit_logs;
CREATE TRIGGER set_audit_log_actor_role_trigger
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_audit_log_actor_role();

-- Allow authenticated active users to insert audit logs (for their county or platform-wide)
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_active FROM public.profiles WHERE id = _user_id LIMIT 1), false);
$$;

-- Policy: only active users can insert audit logs; scope by county or platform admin
DROP POLICY IF EXISTS "Active users can insert audit logs for their scope" ON public.audit_logs;
CREATE POLICY "Active users can insert audit logs for their scope"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_user_active(auth.uid())
    AND (
      county_id = public.get_user_county_id(auth.uid())
      OR public.is_platform_admin(auth.uid())
    )
  );

-- =====================================================
-- 2. SERVER-SIDE: Revoke access for suspended users (RLS)
-- =====================================================
-- Suspended users (is_active = false) cannot access any data except their own profile/roles
-- so the app can load and then sign them out immediately.

-- Counties: require active for all
DROP POLICY IF EXISTS "Platform admins can manage all counties" ON public.counties;
CREATE POLICY "Platform admins can manage all counties"
  ON public.counties FOR ALL
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own county" ON public.counties;
CREATE POLICY "Users can view their own county"
  ON public.counties FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND id = public.get_user_county_id(auth.uid()));

DROP POLICY IF EXISTS "Active counties are viewable for login" ON public.counties;
CREATE POLICY "Active counties are viewable for login"
  ON public.counties FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND status = 'active');

-- Profiles: users can always view own profile (so app can detect suspension and sign out).
-- Update own profile requires active (suspended users cannot change data).
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND id = auth.uid());

-- Other profile policies require active
DROP POLICY IF EXISTS "County admins can view profiles in their county" ON public.profiles;
CREATE POLICY "County admins can view profiles in their county"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

DROP POLICY IF EXISTS "Platform admins can manage all profiles" ON public.profiles;
CREATE POLICY "Platform admins can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()));

-- User roles: users can view own roles (so app can load and then check profile.is_active)
-- County/Platform admin management requires active
DROP POLICY IF EXISTS "Platform admins can manage all roles" ON public.user_roles;
CREATE POLICY "Platform admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "County admins can manage roles in their county" ON public.user_roles;
CREATE POLICY "County admins can manage roles in their county"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

-- Saccos
DROP POLICY IF EXISTS "County admins can manage saccos" ON public.saccos;
CREATE POLICY "County admins can manage saccos"
  ON public.saccos FOR ALL
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

DROP POLICY IF EXISTS "Users can view saccos in their county" ON public.saccos;
CREATE POLICY "Users can view saccos in their county"
  ON public.saccos FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND county_id = public.get_user_county_id(auth.uid()));

-- Stages
DROP POLICY IF EXISTS "County admins can manage stages" ON public.stages;
CREATE POLICY "County admins can manage stages"
  ON public.stages FOR ALL
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

DROP POLICY IF EXISTS "Users can view stages in their county" ON public.stages;
CREATE POLICY "Users can view stages in their county"
  ON public.stages FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND county_id = public.get_user_county_id(auth.uid()));

-- Owners
DROP POLICY IF EXISTS "County admins can manage owners" ON public.owners;
CREATE POLICY "County admins can manage owners"
  ON public.owners FOR ALL
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

DROP POLICY IF EXISTS "Owners can view own profile" ON public.owners;
CREATE POLICY "Owners can view own profile"
  ON public.owners FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND user_id = auth.uid());

-- Riders
DROP POLICY IF EXISTS "County admins can manage riders" ON public.riders;
CREATE POLICY "County admins can manage riders"
  ON public.riders FOR ALL
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

DROP POLICY IF EXISTS "Riders can view own profile" ON public.riders;
CREATE POLICY "Riders can view own profile"
  ON public.riders FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND user_id = auth.uid());

-- Motorbikes
DROP POLICY IF EXISTS "County admins can manage motorbikes" ON public.motorbikes;
CREATE POLICY "County admins can manage motorbikes"
  ON public.motorbikes FOR ALL
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

DROP POLICY IF EXISTS "Users can view their own motorbikes" ON public.motorbikes;
CREATE POLICY "Users can view their own motorbikes"
  ON public.motorbikes FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND (
    rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
    OR owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())
  ));

-- Permit types
DROP POLICY IF EXISTS "Anyone can view active permit types" ON public.permit_types;
CREATE POLICY "Anyone can view active permit types"
  ON public.permit_types FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND is_active = true);

DROP POLICY IF EXISTS "County admins can manage permit types" ON public.permit_types;
CREATE POLICY "County admins can manage permit types"
  ON public.permit_types FOR ALL
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

-- Permits
DROP POLICY IF EXISTS "County admins can manage permits" ON public.permits;
CREATE POLICY "County admins can manage permits"
  ON public.permits FOR ALL
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

DROP POLICY IF EXISTS "Riders can view own permits" ON public.permits;
CREATE POLICY "Riders can view own permits"
  ON public.permits FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

-- Payments
DROP POLICY IF EXISTS "County finance can manage payments" ON public.payments;
CREATE POLICY "County finance can manage payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

-- Penalties
DROP POLICY IF EXISTS "County admins can manage penalties" ON public.penalties;
CREATE POLICY "County admins can manage penalties"
  ON public.penalties FOR ALL
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

DROP POLICY IF EXISTS "Riders can view own penalties" ON public.penalties;
CREATE POLICY "Riders can view own penalties"
  ON public.penalties FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

-- Audit logs SELECT: only active users
DROP POLICY IF EXISTS "Platform admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Platform admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "County admins can view county audit logs" ON public.audit_logs;
CREATE POLICY "County admins can view county audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_county_admin(auth.uid(), county_id));

-- =====================================================
-- 3. OTHER TABLES: Enforce is_user_active (if tables exist)
-- =====================================================

-- support_tickets
DROP POLICY IF EXISTS "Users can insert own support tickets" ON public.support_tickets;
CREATE POLICY "Users can insert own support tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (public.is_user_active(auth.uid()) AND user_id = auth.uid());
DROP POLICY IF EXISTS "Users can view own support tickets" ON public.support_tickets;
CREATE POLICY "Users can view own support tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.is_user_active(auth.uid()) AND user_id = auth.uid());
DROP POLICY IF EXISTS "County admins can view support tickets in their county" ON public.support_tickets;
CREATE POLICY "County admins can view support tickets in their county"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.is_user_active(auth.uid()) AND county_id IS NOT NULL AND public.is_county_admin(auth.uid(), county_id));
DROP POLICY IF EXISTS "Platform admins can view all support tickets" ON public.support_tickets;
CREATE POLICY "Platform admins can view all support tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "County admins can update support tickets in their county" ON public.support_tickets;
CREATE POLICY "County admins can update support tickets in their county"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_user_active(auth.uid()) AND county_id IS NOT NULL AND public.is_county_admin(auth.uid(), county_id));
DROP POLICY IF EXISTS "Platform admins can update all support tickets" ON public.support_tickets;
CREATE POLICY "Platform admins can update all support tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()));

-- revenue_shares
DROP POLICY IF EXISTS "Platform admins can manage all revenue shares" ON public.revenue_shares;
CREATE POLICY "Platform admins can manage all revenue shares"
  ON public.revenue_shares FOR ALL TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "County admins can view revenue shares" ON public.revenue_shares;
CREATE POLICY "County admins can view revenue shares"
  ON public.revenue_shares FOR SELECT TO authenticated
  USING (public.is_user_active(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND county_id = revenue_shares.county_id
    AND role IN ('county_super_admin', 'county_admin', 'county_finance_officer', 'county_analyst')
  ));
DROP POLICY IF EXISTS "Sacco admins can view their revenue shares" ON public.revenue_shares;
CREATE POLICY "Sacco admins can view their revenue shares"
  ON public.revenue_shares FOR SELECT TO authenticated
  USING (public.is_user_active(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid() AND ur.role IN ('sacco_admin', 'sacco_officer')
    AND ur.county_id = revenue_shares.county_id
    AND revenue_shares.sacco_id IN (SELECT id FROM public.saccos WHERE county_id = ur.county_id)
  ));
DROP POLICY IF EXISTS "County admins can update revenue shares" ON public.revenue_shares;
CREATE POLICY "County admins can update revenue shares"
  ON public.revenue_shares FOR UPDATE TO authenticated
  USING (public.is_user_active(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND county_id = revenue_shares.county_id
    AND role IN ('county_super_admin', 'county_admin', 'county_finance_officer')
  ));
