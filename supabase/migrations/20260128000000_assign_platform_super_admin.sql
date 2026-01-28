-- Migration to assign platform_super_admin role to a specific user
-- This uses SECURITY DEFINER to bypass RLS for the initial admin setup

-- Function to assign platform_super_admin role by email
CREATE OR REPLACE FUNCTION public.assign_platform_super_admin(_email TEXT)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  role_assigned BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_role_exists BOOLEAN;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE email = _email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, _email, false, format('User with email %s not found', _email);
    RETURN;
  END IF;

  -- Check if role already exists
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = v_user_id
      AND role = 'platform_super_admin'
      AND county_id IS NULL
  ) INTO v_role_exists;

  IF v_role_exists THEN
    RETURN QUERY SELECT v_user_id, _email, true, 'User already has platform_super_admin role';
    RETURN;
  END IF;

  -- Insert the role
  INSERT INTO public.user_roles (user_id, role, county_id, granted_by, granted_at)
  VALUES (v_user_id, 'platform_super_admin', NULL, v_user_id, now())
  ON CONFLICT (user_id, role, county_id) DO NOTHING;

  RETURN QUERY SELECT v_user_id, _email, true, 'Successfully assigned platform_super_admin role';
END;
$$;

-- Assign the role to the specific user
SELECT * FROM public.assign_platform_super_admin('shubhambhatt9082003@gmail.com');

-- Optionally, drop the function after use (uncomment if desired)
-- DROP FUNCTION IF EXISTS public.assign_platform_super_admin(TEXT);
