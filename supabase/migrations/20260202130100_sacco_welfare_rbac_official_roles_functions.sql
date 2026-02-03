-- Sacco & Welfare User Roles (RBAC) — Part 2: Functions, RLS, system_role_templates.
-- Run after 20260202130000 (enum values must be committed first).

-- =====================================================
-- 1. UPDATE get_user_sacco_id — include official Sacco roles
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
    AND role::text = ANY(ARRAY[
      'sacco_admin', 'sacco_officer',
      'chairman', 'vice_chairman', 'secretary', 'vice_secretary',
      'treasurer', 'vice_treasurer', 'general_official'
    ]::text[])
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_sacco_id(UUID) IS 'Returns the sacco_id for entity-scoped sacco roles (admin, officer, or official roles); NULL if user has no sacco-scoped role.';

-- =====================================================
-- 2. UPDATE get_user_welfare_group_id — include official Welfare roles
-- =====================================================
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
    AND role::text = ANY(ARRAY[
      'welfare_admin', 'welfare_officer',
      'chairman', 'vice_chairman', 'secretary', 'vice_secretary',
      'treasurer', 'vice_treasurer', 'general_official'
    ]::text[])
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_welfare_group_id(UUID) IS 'Returns the welfare_group_id for entity-scoped welfare roles (admin, officer, or official roles); NULL if user has no welfare-scoped role.';

-- =====================================================
-- 3. UPDATE user_can_access_sacco / user_can_access_welfare_group — include official roles
-- =====================================================
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
      AND ur.role::text = ANY(ARRAY[
        'sacco_admin', 'sacco_officer',
        'chairman', 'vice_chairman', 'secretary', 'vice_secretary',
        'treasurer', 'vice_treasurer', 'general_official'
      ]::text[])
  );
$$;

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
      AND ur.role::text = ANY(ARRAY[
        'welfare_admin', 'welfare_officer',
        'chairman', 'vice_chairman', 'secretary', 'vice_secretary',
        'treasurer', 'vice_treasurer', 'general_official'
      ]::text[])
  );
$$;

-- =====================================================
-- 4. PERMISSION HELPERS — distinct permissions per role (default; configurable by county admin later)
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_sacco_role(_user_id UUID, _sacco_id UUID, _roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.sacco_id = _sacco_id
      AND ur.role::text = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_welfare_role(_user_id UUID, _welfare_group_id UUID, _roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.welfare_group_id = _welfare_group_id
      AND ur.role::text = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_sacco_profile(_user_id UUID, _sacco_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
  OR (public.is_county_admin(_user_id, (SELECT county_id FROM public.saccos WHERE id = _sacco_id)))
  OR public.user_has_sacco_role(_user_id, _sacco_id, ARRAY[
    'sacco_admin', 'sacco_officer',
    'chairman', 'vice_chairman', 'secretary', 'vice_secretary'
  ]::TEXT[]);
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_welfare_profile(_user_id UUID, _welfare_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
  OR (public.is_county_admin(_user_id, (SELECT county_id FROM public.welfare_groups WHERE id = _welfare_group_id)))
  OR public.user_has_welfare_role(_user_id, _welfare_group_id, ARRAY[
    'welfare_admin', 'welfare_officer',
    'chairman', 'vice_chairman', 'secretary', 'vice_secretary'
  ]::TEXT[]);
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_sacco_officials(_user_id UUID, _sacco_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
  OR (public.is_county_admin(_user_id, (SELECT county_id FROM public.saccos WHERE id = _sacco_id)))
  OR public.user_has_sacco_role(_user_id, _sacco_id, ARRAY['sacco_admin', 'chairman', 'vice_chairman']::TEXT[]);
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_welfare_officials(_user_id UUID, _welfare_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
  OR (public.is_county_admin(_user_id, (SELECT county_id FROM public.welfare_groups WHERE id = _welfare_group_id)))
  OR public.user_has_welfare_role(_user_id, _welfare_group_id, ARRAY['welfare_admin', 'chairman', 'vice_chairman']::TEXT[]);
$$;

CREATE OR REPLACE FUNCTION public.user_can_view_sacco_finances(_user_id UUID, _sacco_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
  OR (public.is_county_admin(_user_id, (SELECT county_id FROM public.saccos WHERE id = _sacco_id)))
  OR public.user_has_sacco_role(_user_id, _sacco_id, ARRAY[
    'sacco_admin', 'sacco_officer',
    'chairman', 'vice_chairman', 'secretary', 'vice_secretary',
    'treasurer', 'vice_treasurer', 'general_official'
  ]::TEXT[]);
$$;

CREATE OR REPLACE FUNCTION public.user_can_view_welfare_finances(_user_id UUID, _welfare_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
  OR (public.is_county_admin(_user_id, (SELECT county_id FROM public.welfare_groups WHERE id = _welfare_group_id)))
  OR public.user_has_welfare_role(_user_id, _welfare_group_id, ARRAY[
    'welfare_admin', 'welfare_officer',
    'chairman', 'vice_chairman', 'secretary', 'vice_secretary',
    'treasurer', 'vice_treasurer', 'general_official'
  ]::TEXT[]);
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_sacco_finances(_user_id UUID, _sacco_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
  OR (public.is_county_admin(_user_id, (SELECT county_id FROM public.saccos WHERE id = _sacco_id)))
  OR public.user_has_sacco_role(_user_id, _sacco_id, ARRAY['sacco_admin', 'chairman', 'vice_chairman', 'treasurer']::TEXT[]);
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_welfare_finances(_user_id UUID, _welfare_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
  OR (public.is_county_admin(_user_id, (SELECT county_id FROM public.welfare_groups WHERE id = _welfare_group_id)))
  OR public.user_has_welfare_role(_user_id, _welfare_group_id, ARRAY['welfare_admin', 'chairman', 'vice_chairman', 'treasurer']::TEXT[]);
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_sacco_members(_user_id UUID, _sacco_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
  OR (public.is_county_admin(_user_id, (SELECT county_id FROM public.saccos WHERE id = _sacco_id)))
  OR public.user_has_sacco_role(_user_id, _sacco_id, ARRAY[
    'sacco_admin', 'sacco_officer',
    'chairman', 'vice_chairman', 'secretary', 'vice_secretary'
  ]::TEXT[]);
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_welfare_members(_user_id UUID, _welfare_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id)
  OR (public.is_county_admin(_user_id, (SELECT county_id FROM public.welfare_groups WHERE id = _welfare_group_id)))
  OR public.user_has_welfare_role(_user_id, _welfare_group_id, ARRAY[
    'welfare_admin', 'welfare_officer',
    'chairman', 'vice_chairman', 'secretary', 'vice_secretary'
  ]::TEXT[]);
$$;

-- =====================================================
-- 5. RLS: saccos — Sacco officials with profile permission can UPDATE their sacco
-- =====================================================
DROP POLICY IF EXISTS "Sacco officials can update their sacco" ON public.saccos;
CREATE POLICY "Sacco officials can update their sacco"
  ON public.saccos FOR UPDATE TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND id = public.get_user_sacco_id(auth.uid())
    AND public.user_can_manage_sacco_profile(auth.uid(), id)
  )
  WITH CHECK (
    public.is_user_active(auth.uid())
    AND id = public.get_user_sacco_id(auth.uid())
    AND public.user_can_manage_sacco_profile(auth.uid(), id)
  );

-- =====================================================
-- 6. RLS: welfare_groups — Welfare officials with profile permission can UPDATE
-- =====================================================
DROP POLICY IF EXISTS "Welfare admins can update their welfare group" ON public.welfare_groups;
CREATE POLICY "Welfare officials can update their welfare group"
  ON public.welfare_groups FOR UPDATE TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND id = public.get_user_welfare_group_id(auth.uid())
    AND public.user_can_manage_welfare_profile(auth.uid(), id)
  )
  WITH CHECK (
    public.is_user_active(auth.uid())
    AND id = public.get_user_welfare_group_id(auth.uid())
    AND public.user_can_manage_welfare_profile(auth.uid(), id)
  );

-- =====================================================
-- 7. SYSTEM_ROLE_TEMPLATES — seed official Sacco/Welfare and Stage roles
-- =====================================================
INSERT INTO public.system_role_templates (role_key, name, category, locked)
VALUES
  ('chairman', 'Chairman', 'sacco', false),
  ('vice_chairman', 'Vice Chairman', 'sacco', false),
  ('secretary', 'Secretary', 'sacco', false),
  ('vice_secretary', 'Vice Secretary', 'sacco', false),
  ('treasurer', 'Treasurer', 'sacco', false),
  ('vice_treasurer', 'Vice Treasurer', 'sacco', false),
  ('general_official', 'General Official', 'sacco', false),
  ('stage_assistant', 'Stage Assistant', 'stage', false)
ON CONFLICT (role_key) DO NOTHING;

COMMENT ON TABLE public.system_role_templates IS 'Governance list of system roles. Default permissions per role; configurable by county admin (future: county_configurable_permissions).';
