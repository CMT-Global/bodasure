-- Allow riders/owners to claim their record by email and auto-grant portal role.
-- When a user logs in and has no rider/owner role, we link them to an existing rider/owner
-- record by email (via RPC) and grant the role via trigger so they can access the portal.

-- 1) SECURITY DEFINER function: link current user to owner or rider by email (claim unlinked record)
CREATE OR REPLACE FUNCTION public.claim_rider_or_owner_by_email()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_owner_id uuid;
  v_rider_id uuid;
  v_county_id uuid;
  v_linked_as text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT LOWER(TRIM(email)) INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_email');
  END IF;

  -- Prefer owner: find owner with matching email and no user_id
  SELECT id, o.county_id INTO v_owner_id, v_county_id
  FROM public.owners o
  WHERE o.user_id IS NULL AND LOWER(TRIM(o.email)) = v_email
  LIMIT 1;

  IF v_owner_id IS NOT NULL THEN
    UPDATE public.owners SET user_id = v_user_id, updated_at = now() WHERE id = v_owner_id;
    v_linked_as := 'owner';
    RETURN jsonb_build_object('ok', true, 'linked_as', v_linked_as, 'county_id', v_county_id);
  END IF;

  -- Else try rider
  SELECT id, r.county_id INTO v_rider_id, v_county_id
  FROM public.riders r
  WHERE r.user_id IS NULL AND LOWER(TRIM(r.email)) = v_email
  LIMIT 1;

  IF v_rider_id IS NOT NULL THEN
    UPDATE public.riders SET user_id = v_user_id, updated_at = now() WHERE id = v_rider_id;
    v_linked_as := 'rider';
    RETURN jsonb_build_object('ok', true, 'linked_as', v_linked_as, 'county_id', v_county_id);
  END IF;

  -- Fallback: already linked to this user but role missing (e.g. manual user_id set). Ensure role exists.
  SELECT id, county_id INTO v_owner_id, v_county_id FROM public.owners WHERE user_id = v_user_id LIMIT 1;
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, county_id, granted_by)
    VALUES (v_user_id, 'owner'::public.app_role, v_county_id, NULL)
    ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('ok', true, 'linked_as', 'owner', 'county_id', v_county_id);
  END IF;
  SELECT id, county_id INTO v_rider_id, v_county_id FROM public.riders WHERE user_id = v_user_id LIMIT 1;
  IF v_rider_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, county_id, granted_by)
    VALUES (v_user_id, 'rider'::public.app_role, v_county_id, NULL)
    ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('ok', true, 'linked_as', 'rider', 'county_id', v_county_id);
  END IF;

  RETURN jsonb_build_object('ok', false, 'reason', 'no_matching_record');
END;
$$;

COMMENT ON FUNCTION public.claim_rider_or_owner_by_email() IS 'Links the current user to an existing owner or rider record by email (user_id was null). Trigger on owners/riders then grants the portal role.';

GRANT EXECUTE ON FUNCTION public.claim_rider_or_owner_by_email() TO authenticated;

-- 2) Function called by trigger: ensure user_roles has rider/owner when user_id is set on riders/owners
CREATE OR REPLACE FUNCTION public.grant_portal_role_on_rider_owner_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only when user_id is being set (from NULL to a value)
  IF NEW.user_id IS NOT NULL AND (OLD.user_id IS NULL OR OLD.user_id <> NEW.user_id) THEN
    IF TG_TABLE_NAME = 'owners' THEN
      INSERT INTO public.user_roles (user_id, role, county_id, granted_by)
      VALUES (NEW.user_id, 'owner'::public.app_role, NEW.county_id, NULL)
      ON CONFLICT DO NOTHING;
    ELSIF TG_TABLE_NAME = 'riders' THEN
      INSERT INTO public.user_roles (user_id, role, county_id, granted_by)
      VALUES (NEW.user_id, 'rider'::public.app_role, NEW.county_id, NULL)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Handle unique constraint: user_roles has partial unique (user_id, role, county_id) WHERE sacco_id IS NULL AND welfare_group_id IS NULL
-- Our INSERT uses county_id and no sacco_id/welfare_group_id so ON CONFLICT needs the same.
-- PostgreSQL ON CONFLICT DO NOTHING without a conflict target will ignore unique violations.
-- So we're good.

-- 3) Triggers on owners and riders
DROP TRIGGER IF EXISTS grant_portal_role_on_owner_link ON public.owners;
CREATE TRIGGER grant_portal_role_on_owner_link
  AFTER UPDATE OF user_id ON public.owners
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_portal_role_on_rider_owner_link();

DROP TRIGGER IF EXISTS grant_portal_role_on_rider_link ON public.riders;
CREATE TRIGGER grant_portal_role_on_rider_link
  AFTER UPDATE OF user_id ON public.riders
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_portal_role_on_rider_owner_link();
