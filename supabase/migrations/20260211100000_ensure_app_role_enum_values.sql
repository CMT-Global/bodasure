-- Ensure all sacco/welfare official app_role enum values exist.
-- Fixes: "invalid input value for enum app_role: 'chairman'" when creating officials in sacco portal.
-- Idempotent: ADD VALUE IF NOT EXISTS is safe to run multiple times.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'chairman';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vice_chairman';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'secretary';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vice_secretary';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'treasurer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vice_treasurer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'general_official';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'stage_assistant';
