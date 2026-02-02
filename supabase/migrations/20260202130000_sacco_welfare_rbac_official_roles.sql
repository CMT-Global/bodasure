-- Sacco & Welfare User Roles (RBAC) — Part 1: Extend app_role enum only.
-- New enum values must be committed before they can be used; functions/RLS are in the next migration.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'chairman';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vice_chairman';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'secretary';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vice_secretary';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'treasurer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vice_treasurer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'general_official';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'stage_assistant';
