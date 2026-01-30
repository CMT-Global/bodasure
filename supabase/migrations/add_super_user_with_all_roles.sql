-- Script to add a user with all roles
-- 
-- INSTRUCTIONS:
-- 1. First, create the user via Supabase Auth (Dashboard > Authentication > Users > Add User)
--    OR use the signup form in your app
-- 2. Note the user's email and ID
-- 3. Replace the placeholders below with actual values
-- 4. Run this script in Supabase SQL Editor

-- =====================================================
-- OPTION 1: Assign all roles to an existing user by email
-- =====================================================
-- Replace 'your-email@example.com' with the actual email

DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT := 'your-email@example.com'; -- CHANGE THIS
  v_county_id UUID; -- Optional: Set to NULL for platform-level roles, or specific county_id
  v_granted_by UUID; -- Optional: Set to NULL or another admin user's ID
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please create the user first.', v_user_email;
  END IF;
  
  -- Update profile to ensure it exists
  INSERT INTO public.profiles (id, email, full_name, is_active)
  VALUES (v_user_id, v_user_email, 'Super Admin User', true)
  ON CONFLICT (id) DO UPDATE
  SET is_active = true;
  
  -- Delete existing roles for this user (optional - comment out if you want to keep existing roles)
  -- DELETE FROM public.user_roles WHERE user_id = v_user_id;
  
  -- Insert all 18 roles
  INSERT INTO public.user_roles (user_id, role, county_id, granted_by)
  VALUES
    (v_user_id, 'platform_super_admin', NULL, v_granted_by),
    (v_user_id, 'platform_admin', NULL, v_granted_by),
    (v_user_id, 'county_super_admin', v_county_id, v_granted_by),
    (v_user_id, 'county_admin', v_county_id, v_granted_by),
    (v_user_id, 'county_finance_officer', v_county_id, v_granted_by),
    (v_user_id, 'county_enforcement_officer', v_county_id, v_granted_by),
    (v_user_id, 'county_registration_agent', v_county_id, v_granted_by),
    (v_user_id, 'county_analyst', v_county_id, v_granted_by),
    (v_user_id, 'sacco_admin', v_county_id, v_granted_by),
    (v_user_id, 'sacco_officer', v_county_id, v_granted_by),
    (v_user_id, 'welfare_admin', v_county_id, v_granted_by),
    (v_user_id, 'welfare_officer', v_county_id, v_granted_by),
    (v_user_id, 'stage_chairman', v_county_id, v_granted_by),
    (v_user_id, 'stage_secretary', v_county_id, v_granted_by),
    (v_user_id, 'stage_treasurer', v_county_id, v_granted_by),
    (v_user_id, 'rider', v_county_id, v_granted_by),
    (v_user_id, 'owner', v_county_id, v_granted_by)
  ON CONFLICT (user_id, role, county_id) DO NOTHING;
  
  RAISE NOTICE 'Successfully assigned all roles to user: %', v_user_email;
END $$;

-- =====================================================
-- OPTION 2: Assign all roles to an existing user by user ID
-- =====================================================
-- Uncomment and replace the UUID below with the actual user ID

/*
DO $$
DECLARE
  v_user_id UUID := '00000000-0000-0000-0000-000000000000'; -- CHANGE THIS to actual user ID
  v_county_id UUID := NULL; -- Optional: Set to specific county_id or NULL
  v_granted_by UUID := NULL; -- Optional: Set to another admin user's ID
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User with ID % not found.', v_user_id;
  END IF;
  
  -- Update profile
  INSERT INTO public.profiles (id, email, full_name, is_active)
  SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email), true
  FROM auth.users
  WHERE id = v_user_id
  ON CONFLICT (id) DO UPDATE
  SET is_active = true;
  
  -- Insert all 18 roles
  INSERT INTO public.user_roles (user_id, role, county_id, granted_by)
  VALUES
    (v_user_id, 'platform_super_admin', NULL, v_granted_by),
    (v_user_id, 'platform_admin', NULL, v_granted_by),
    (v_user_id, 'county_super_admin', v_county_id, v_granted_by),
    (v_user_id, 'county_admin', v_county_id, v_granted_by),
    (v_user_id, 'county_finance_officer', v_county_id, v_granted_by),
    (v_user_id, 'county_enforcement_officer', v_county_id, v_granted_by),
    (v_user_id, 'county_registration_agent', v_county_id, v_granted_by),
    (v_user_id, 'county_analyst', v_county_id, v_granted_by),
    (v_user_id, 'sacco_admin', v_county_id, v_granted_by),
    (v_user_id, 'sacco_officer', v_county_id, v_granted_by),
    (v_user_id, 'welfare_admin', v_county_id, v_granted_by),
    (v_user_id, 'welfare_officer', v_county_id, v_granted_by),
    (v_user_id, 'stage_chairman', v_county_id, v_granted_by),
    (v_user_id, 'stage_secretary', v_county_id, v_granted_by),
    (v_user_id, 'stage_treasurer', v_county_id, v_granted_by),
    (v_user_id, 'rider', v_county_id, v_granted_by),
    (v_user_id, 'owner', v_county_id, v_granted_by)
  ON CONFLICT (user_id, role, county_id) DO NOTHING;
  
  RAISE NOTICE 'Successfully assigned all roles to user ID: %', v_user_id;
END $$;
*/

-- =====================================================
-- OPTION 3: Helper function to assign all roles to any user
-- =====================================================

CREATE OR REPLACE FUNCTION public.assign_all_roles_to_user(
  p_user_email TEXT,
  p_county_id UUID DEFAULT NULL,
  p_granted_by UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get user ID from auth.users
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RETURN 'ERROR: User with email ' || p_user_email || ' not found.';
  END IF;
  
  -- Ensure profile exists
  INSERT INTO public.profiles (id, email, full_name, is_active)
  VALUES (v_user_id, v_user_email, COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id), v_user_email), true)
  ON CONFLICT (id) DO UPDATE
  SET is_active = true;
  
  -- Insert all 18 roles
  INSERT INTO public.user_roles (user_id, role, county_id, granted_by)
  VALUES
    (v_user_id, 'platform_super_admin', NULL, p_granted_by),
    (v_user_id, 'platform_admin', NULL, p_granted_by),
    (v_user_id, 'county_super_admin', p_county_id, p_granted_by),
    (v_user_id, 'county_admin', p_county_id, p_granted_by),
    (v_user_id, 'county_finance_officer', p_county_id, p_granted_by),
    (v_user_id, 'county_enforcement_officer', p_county_id, p_granted_by),
    (v_user_id, 'county_registration_agent', p_county_id, p_granted_by),
    (v_user_id, 'county_analyst', p_county_id, p_granted_by),
    (v_user_id, 'sacco_admin', p_county_id, p_granted_by),
    (v_user_id, 'sacco_officer', p_county_id, p_granted_by),
    (v_user_id, 'welfare_admin', p_county_id, p_granted_by),
    (v_user_id, 'welfare_officer', p_county_id, p_granted_by),
    (v_user_id, 'stage_chairman', p_county_id, p_granted_by),
    (v_user_id, 'stage_secretary', p_county_id, p_granted_by),
    (v_user_id, 'stage_treasurer', p_county_id, p_granted_by),
    (v_user_id, 'rider', p_county_id, p_granted_by),
    (v_user_id, 'owner', p_county_id, p_granted_by)
  ON CONFLICT (user_id, role, county_id) DO NOTHING;
  
  RETURN 'SUCCESS: All roles assigned to user ' || p_user_email;
END;
$$;

-- =====================================================
-- USAGE EXAMPLES:
-- =====================================================

-- Example 1: Assign all roles using the helper function
-- SELECT public.assign_all_roles_to_user('admin@example.com', NULL, NULL);

-- Example 2: Assign all roles for a specific county
-- SELECT public.assign_all_roles_to_user('admin@example.com', 'your-county-uuid-here', NULL);

-- Example 3: Check what roles a user has
-- SELECT role, county_id FROM public.user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');
