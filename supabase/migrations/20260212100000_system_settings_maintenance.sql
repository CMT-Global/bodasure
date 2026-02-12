-- System settings key-value store (e.g. maintenance mode). Platform admins write; authenticated read.
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (needed to show maintenance message)
CREATE POLICY "Authenticated can read system_settings"
  ON public.system_settings FOR SELECT TO authenticated
  USING (true);

-- Only platform admins can insert/update/delete
CREATE POLICY "Platform admins can manage system_settings"
  ON public.system_settings FOR ALL TO authenticated
  USING (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_user_active(auth.uid()) AND public.is_platform_admin(auth.uid()));

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.system_settings IS 'Key-value system config. E.g. key=maintenance, value={ "global": false, "countyIds": [] }.';

-- Seed default maintenance settings (no maintenance)
INSERT INTO public.system_settings (key, value)
VALUES ('maintenance', '{"global": false, "countyIds": []}'::jsonb)
ON CONFLICT (key) DO NOTHING;
