-- SQL script to assign platform_super_admin role to the currently logged in user
-- Run this in Supabase Dashboard > SQL Editor
-- Replace 'YOUR_EMAIL_HERE' with your actual email address

-- Step 1: Find the user ID by email
DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT := 'YOUR_EMAIL_HERE'; -- REPLACE THIS WITH YOUR EMAIL
  v_role_exists BOOLEAN;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE email = v_user_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please check the email address.', v_user_email;
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

-- Step 2: Also assign county_super_admin if you need it (replace COUNTY_ID with your county ID or leave NULL)
-- Uncomment and modify the following if you need county_super_admin role:
/*
DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT := 'YOUR_EMAIL_HERE'; -- REPLACE THIS WITH YOUR EMAIL
  v_county_id UUID := NULL; -- REPLACE WITH YOUR COUNTY ID OR LEAVE NULL
BEGIN
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE email = v_user_email
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, county_id, granted_by, granted_at)
    VALUES (v_user_id, 'county_super_admin', v_county_id, v_user_id, now())
    ON CONFLICT (user_id, role, county_id) DO NOTHING;
    
    RAISE NOTICE 'Successfully assigned county_super_admin role';
  END IF;
END $$;
*/

-- Step 3: Verify the role was assigned
SELECT 
  p.email,
  p.full_name,
  ur.role,
  ur.county_id,
  ur.granted_at
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.email = 'YOUR_EMAIL_HERE' -- REPLACE THIS WITH YOUR EMAIL
ORDER BY ur.granted_at DESC;
