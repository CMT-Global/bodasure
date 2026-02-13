-- Allow sacco users to view their county (e.g. to read revenue share rules in sacco/settings).
-- Extend get_user_county_id so sacco_admin/sacco_officer get county from their role when profile and county portal roles don't provide one.
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
  _sacco_county UUID;
  _sacco_count INT;
BEGIN
  SELECT county_id INTO _profile_county FROM public.profiles WHERE id = _user_id LIMIT 1;
  IF _profile_county IS NOT NULL THEN
    RETURN _profile_county;
  END IF;
  -- Fallback: single county from county portal roles (no cross-county)
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
  -- Fallback for sacco users: single county from sacco_admin/sacco_officer role (so they can read county settings e.g. revenue share rules)
  SELECT COUNT(DISTINCT county_id) INTO _sacco_count
  FROM public.user_roles
  WHERE user_id = _user_id
    AND county_id IS NOT NULL
    AND role IN ('sacco_admin', 'sacco_officer');
  IF _sacco_count = 1 THEN
    SELECT county_id INTO _sacco_county
    FROM public.user_roles
    WHERE user_id = _user_id
      AND county_id IS NOT NULL
      AND role IN ('sacco_admin', 'sacco_officer')
    LIMIT 1;
    RETURN _sacco_county;
  END IF;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_user_county_id(UUID) IS 'Returns the single county the user belongs to (profile, then county portal roles, then sacco roles). No cross-county access.';
