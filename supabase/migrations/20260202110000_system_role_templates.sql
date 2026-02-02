-- System role templates: governance list of roles (name, category, locked).
-- Add/delete from Super Admin "Manage roles" UI persists here.
-- user_roles still uses app_role enum for assignments; this table is the template list.

CREATE TABLE IF NOT EXISTS public.system_role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_role_templates ENABLE ROW LEVEL SECURITY;

-- Platform admins can do everything; authenticated can read (for UI)
CREATE POLICY "Authenticated can read system_role_templates"
  ON public.system_role_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Platform admins can manage system_role_templates"
  ON public.system_role_templates FOR ALL TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()));

CREATE TRIGGER update_system_role_templates_updated_at
  BEFORE UPDATE ON public.system_role_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.system_role_templates IS 'Governance list of system roles (templates). Add/delete from Super Admin Role & Permission Governance.';

-- Seed default roles (same as frontend INITIAL_SYSTEM_ROLES)
INSERT INTO public.system_role_templates (role_key, name, category, locked)
VALUES
  ('platform_super_admin', 'Platform Super Admin', 'county', true),
  ('platform_admin', 'Platform Admin', 'county', true),
  ('county_super_admin', 'County Super Admin', 'county', false),
  ('county_admin', 'County Admin', 'county', false),
  ('sacco_admin', 'Sacco / Welfare Admin', 'sacco', false),
  ('sacco_officer', 'Sacco / Welfare Officer', 'sacco', false),
  ('stage_chairman', 'Stage Chairman', 'stage', false),
  ('stage_secretary', 'Stage Secretary', 'stage', false),
  ('stage_treasurer', 'Stage Treasurer', 'stage', false),
  ('rider', 'Rider', 'rider_owner', false),
  ('owner', 'Owner', 'rider_owner', false)
ON CONFLICT (role_key) DO NOTHING;
