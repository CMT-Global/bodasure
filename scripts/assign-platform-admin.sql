-- SQL script to assign platform_super_admin role to shubhambhatt9082003@gmail.com
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Find the user ID
DO $$
DECLARE
  v_user_id UUID;
  v_role_exists BOOLEAN;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE email = 'shubhambhatt9082003@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email shubhambhatt9082003@gmail.com not found';
  END IF;

  RAISE NOTICE 'Found user ID: %', v_user_id;

  -- Check if role already exists
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = v_user_id
      AND role = 'platform_super_admin'
      AND county_id IS NULL
  ) INTO v_role_exists;

  IF v_role_exists THEN
    RAISE NOTICE 'User already has platform_super_admin role';
  ELSE
    -- Insert the role (using the user's own ID as granted_by since this is initial setup)
    INSERT INTO public.user_roles (user_id, role, county_id, granted_by, granted_at)
    VALUES (v_user_id, 'platform_super_admin', NULL, v_user_id, now())
    ON CONFLICT (user_id, role, county_id) DO NOTHING;

    RAISE NOTICE 'Successfully assigned platform_super_admin role to user %', v_user_id;
  END IF;
END $$;

-- Verify the role was assigned
SELECT 
  p.email,
  p.full_name,
  ur.role,
  ur.county_id,
  ur.granted_at
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.email = 'shubhambhatt9082003@gmail.com'
  AND ur.role = 'platform_super_admin';
