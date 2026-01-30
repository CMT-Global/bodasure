-- Complete setup script for SACCO Dashboard
-- Run this in Supabase Dashboard > SQL Editor
-- This will:
-- 1. Create a test county
-- 2. Update your profile with county_id
-- 3. Create a test SACCO
-- 4. Create test stages
-- 5. Add a county role to your account

-- Step 1: Ensure test county exists
INSERT INTO public.counties (
  id,
  name,
  code,
  status,
  contact_email,
  contact_phone,
  address,
  settings
)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'Test County',
  'TEST',
  'active',
  'test@county.example.com',
  '+254700000000',
  'Test County, Kenya',
  '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  status = EXCLUDED.status,
  updated_at = now();

-- Step 2: Update your profile with county_id
UPDATE public.profiles
SET 
  county_id = '550e8400-e29b-41d4-a716-446655440001',
  updated_at = now()
WHERE email = 'shubhambhatt9082003@gmail.com';

-- Step 3: Add county role to your account
INSERT INTO public.user_roles (user_id, role, county_id, granted_by)
SELECT 
  id,
  'county_super_admin',
  '550e8400-e29b-41d4-a716-446655440001',
  id
FROM public.profiles
WHERE email = 'shubhambhatt9082003@gmail.com'
ON CONFLICT (user_id, role, county_id) DO NOTHING;

-- Step 4: Create a test SACCO
INSERT INTO public.saccos (
  id,
  county_id,
  name,
  registration_number,
  status,
  contact_email,
  contact_phone,
  address
)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '550e8400-e29b-41d4-a716-446655440001',
  'Test SACCO',
  'SACCO-001',
  'approved',
  'test@sacco.example.com',
  '+254700000001',
  'Test SACCO Address'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  status = 'approved',
  updated_at = now();

-- Step 5: Create test stages
INSERT INTO public.stages (
  id,
  county_id,
  sacco_id,
  name,
  location,
  status
)
VALUES 
  (
    's1t2a3g4-e5f6-7890-abcd-ef1234567891',
    '550e8400-e29b-41d4-a716-446655440001',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Stage 1',
    'Downtown',
    'approved'
  ),
  (
    's1t2a3g4-e5f6-7890-abcd-ef1234567892',
    '550e8400-e29b-41d4-a716-446655440001',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Stage 2',
    'Uptown',
    'approved'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  status = 'approved',
  updated_at = now();

-- Step 6: Verify everything was created
SELECT 
  'County' as type,
  id::text,
  name
FROM public.counties
WHERE id = '550e8400-e29b-41d4-a716-446655440001'

UNION ALL

SELECT 
  'SACCO' as type,
  id::text,
  name
FROM public.saccos
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

UNION ALL

SELECT 
  'Profile' as type,
  id::text,
  full_name || ' (' || email || ')' as name
FROM public.profiles
WHERE email = 'shubhambhatt9082003@gmail.com';
