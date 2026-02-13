-- Fix: actor_role not set for platform super admins when audit log has a county_id.
-- Platform roles (platform_super_admin, platform_admin) are stored with county_id NULL.
-- The previous trigger only matched (NEW.county_id IS NULL OR ur.county_id = NEW.county_id),
-- so for county-scoped audit logs no row matched and actor_role stayed NULL.
-- Include platform-level roles by also matching ur.county_id IS NULL.

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
      AND (
        NEW.county_id IS NULL
        OR ur.county_id = NEW.county_id
        OR ur.county_id IS NULL  /* platform-level roles */
      )
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

COMMENT ON FUNCTION public.set_audit_log_actor_role() IS 'Sets actor_role on audit log insert from user_roles; matches county-scoped or platform-level (county_id NULL) roles.';

-- Backfill actor_role for existing audit_logs where it is NULL (e.g. platform admins who acted before this fix).
UPDATE public.audit_logs al
SET actor_role = (
  SELECT ur.role::text
  FROM public.user_roles ur
  WHERE ur.user_id = al.user_id
    AND (
      al.county_id IS NULL
      OR ur.county_id = al.county_id
      OR ur.county_id IS NULL
    )
  ORDER BY CASE ur.role
    WHEN 'platform_super_admin' THEN 1
    WHEN 'platform_admin' THEN 2
    WHEN 'county_super_admin' THEN 3
    WHEN 'county_admin' THEN 4
    ELSE 5
  END
  LIMIT 1
)
WHERE al.user_id IS NOT NULL AND (al.actor_role IS NULL OR al.actor_role = '');
