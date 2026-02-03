-- Sacco & Welfare Group Access — first-class entities
-- Both Saccos and Welfare Groups get: Profiles, Officials, Members, Stages, Compliance data.

-- =====================================================
-- 1. WELFARE GROUPS TABLE (mirror saccos)
-- =====================================================
CREATE TABLE public.welfare_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  registration_number TEXT,
  status public.registration_status NOT NULL DEFAULT 'pending',
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (county_id, name)
);

CREATE INDEX idx_welfare_groups_county ON public.welfare_groups(county_id);

-- Trigger for updated_at
CREATE TRIGGER update_welfare_groups_updated_at
  BEFORE UPDATE ON public.welfare_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.welfare_groups IS 'Welfare groups — first-class entity with profile, officials, members, stages, compliance (parallel to saccos).';

-- =====================================================
-- 2. USER ROLES: entity-scoped officials (sacco_id, welfare_group_id)
-- =====================================================
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS sacco_id UUID REFERENCES public.saccos(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS welfare_group_id UUID REFERENCES public.welfare_groups(id) ON DELETE CASCADE;

-- One row per (user, role, county) when no entity; one per (user, role, county, sacco_id) or (user, role, county, welfare_group_id) when scoped.
-- Drop the original UNIQUE (user_id, role, county_id) so we can have entity-scoped rows; replace with partial uniques.
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_county_id_key;

-- Partial unique: at most one county-level assignment per (user, role, county) when both entity ids are null
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_county_level_unique
  ON public.user_roles (user_id, role, county_id)
  WHERE sacco_id IS NULL AND welfare_group_id IS NULL;

-- At most one sacco-scoped assignment per (user, role, county, sacco_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_sacco_unique
  ON public.user_roles (user_id, role, county_id, sacco_id)
  WHERE sacco_id IS NOT NULL;

-- At most one welfare-scoped assignment per (user, role, county, welfare_group_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_welfare_unique
  ON public.user_roles (user_id, role, county_id, welfare_group_id)
  WHERE welfare_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_sacco ON public.user_roles(sacco_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_welfare_group ON public.user_roles(welfare_group_id);

-- =====================================================
-- 3. STAGES: optional link to welfare group (saccos already have sacco_id)
-- =====================================================
ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS welfare_group_id UUID REFERENCES public.welfare_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stages_welfare_group ON public.stages(welfare_group_id);

-- =====================================================
-- 4. RIDERS: optional welfare group membership (saccos already have sacco_id)
-- =====================================================
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS welfare_group_id UUID REFERENCES public.welfare_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_riders_welfare_group ON public.riders(welfare_group_id);

-- =====================================================
-- 5. HELPERS: get user's sacco_id / welfare_group_id for entity-scoped access
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_sacco_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sacco_id FROM public.user_roles
  WHERE user_id = _user_id
    AND sacco_id IS NOT NULL
    AND role IN ('sacco_admin', 'sacco_officer')
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_sacco_id(UUID) IS 'Returns the sacco_id for entity-scoped sacco roles; NULL if user has no sacco-scoped role.';

CREATE OR REPLACE FUNCTION public.get_user_welfare_group_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT welfare_group_id FROM public.user_roles
  WHERE user_id = _user_id
    AND welfare_group_id IS NOT NULL
    AND role IN ('welfare_admin', 'welfare_officer')
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_welfare_group_id(UUID) IS 'Returns the welfare_group_id for entity-scoped welfare roles; NULL if user has no welfare-scoped role.';

-- True if user can view/manage this sacco (county admin or platform admin or sacco-scoped role for this sacco)
CREATE OR REPLACE FUNCTION public.user_can_access_sacco(_user_id UUID, _sacco_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
  OR EXISTS (SELECT 1 FROM public.saccos s WHERE s.id = _sacco_id AND public.is_county_admin(_user_id, s.county_id))
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.sacco_id = _sacco_id
      AND ur.role IN ('sacco_admin', 'sacco_officer')
  );
$$;

-- True if user can view/manage this welfare group
CREATE OR REPLACE FUNCTION public.user_can_access_welfare_group(_user_id UUID, _welfare_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
  OR EXISTS (SELECT 1 FROM public.welfare_groups w WHERE w.id = _welfare_group_id AND public.is_county_admin(_user_id, w.county_id))
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.welfare_group_id = _welfare_group_id
      AND ur.role IN ('welfare_admin', 'welfare_officer')
  );
$$;

-- =====================================================
-- 6. RLS: saccos — sacco officials can view their sacco (in addition to county view)
-- =====================================================
DROP POLICY IF EXISTS "Sacco officials can view their sacco" ON public.saccos;
CREATE POLICY "Sacco officials can view their sacco"
  ON public.saccos FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND id = public.get_user_sacco_id(auth.uid())
  );

-- =====================================================
-- 7. RLS: welfare_groups (county view + entity-scoped welfare access)
-- =====================================================
ALTER TABLE public.welfare_groups ENABLE ROW LEVEL SECURITY;

-- County users can view welfare groups in their county
DROP POLICY IF EXISTS "County users can view welfare groups in their county" ON public.welfare_groups;
CREATE POLICY "County users can view welfare groups in their county"
  ON public.welfare_groups FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND county_id = public.get_user_county_id(auth.uid())
    AND public.user_can_view_county_data(auth.uid(), county_id)
  );

-- Welfare entity officials can view their welfare group
DROP POLICY IF EXISTS "Welfare officials can view their welfare group" ON public.welfare_groups;
CREATE POLICY "Welfare officials can view their welfare group"
  ON public.welfare_groups FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND id = public.get_user_welfare_group_id(auth.uid())
  );

-- County admins can manage welfare groups in their county
DROP POLICY IF EXISTS "County admins can manage welfare groups" ON public.welfare_groups;
CREATE POLICY "County admins can manage welfare groups"
  ON public.welfare_groups FOR ALL TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND public.is_county_admin(auth.uid(), county_id)
  )
  WITH CHECK (
    public.is_user_active(auth.uid())
    AND public.is_county_admin(auth.uid(), county_id)
  );

-- Welfare admins can update their own welfare group (profile/settings only; status may be county-only)
DROP POLICY IF EXISTS "Welfare admins can update their welfare group" ON public.welfare_groups;
CREATE POLICY "Welfare admins can update their welfare group"
  ON public.welfare_groups FOR UPDATE TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND id = public.get_user_welfare_group_id(auth.uid())
  )
  WITH CHECK (
    public.is_user_active(auth.uid())
    AND id = public.get_user_welfare_group_id(auth.uid())
  );

-- Platform admins can manage all welfare groups
DROP POLICY IF EXISTS "Platform admins can manage all welfare groups" ON public.welfare_groups;
CREATE POLICY "Platform admins can manage all welfare groups"
  ON public.welfare_groups FOR ALL TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()));

-- =====================================================
-- 8. RLS: user_roles — allow county admins to assign entity-scoped roles
-- =====================================================
-- (Existing policies already allow county admins to manage roles; ensure INSERT/UPDATE can set sacco_id/welfare_group_id.)
-- No change needed if county admins can manage all rows in their county; they can set sacco_id/welfare_group_id on insert/update.

-- =====================================================
-- 9. RLS: stages — welfare officials can view stages of their welfare group
-- =====================================================
DROP POLICY IF EXISTS "Welfare officials can view stages of their welfare group" ON public.stages;
CREATE POLICY "Welfare officials can view stages of their welfare group"
  ON public.stages FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND welfare_group_id IS NOT NULL
    AND welfare_group_id = public.get_user_welfare_group_id(auth.uid())
  );

-- =====================================================
-- 10. RLS: riders — welfare/sacco officials can view riders in their entity
-- =====================================================
DROP POLICY IF EXISTS "Welfare officials can view riders in their welfare group" ON public.riders;
CREATE POLICY "Welfare officials can view riders in their welfare group"
  ON public.riders FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND welfare_group_id IS NOT NULL
    AND welfare_group_id = public.get_user_welfare_group_id(auth.uid())
  );

-- Sacco officials can view riders in their sacco (existing county view may cover; add explicit sacco-scoped view)
DROP POLICY IF EXISTS "Sacco officials can view riders in their sacco" ON public.riders;
CREATE POLICY "Sacco officials can view riders in their sacco"
  ON public.riders FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND sacco_id IS NOT NULL
    AND sacco_id = public.get_user_sacco_id(auth.uid())
  );
