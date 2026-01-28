-- SQL script to update user profile with county_id
-- Run this in Supabase Dashboard > SQL Editor
-- Replace 'shubhambhatt9082003@gmail.com' with your email if different

-- First, ensure the test county exists
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
  '550e8400-e29b-41d4-a716-446655440001', -- Fixed UUID for testing
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

-- Update your profile with the county_id
UPDATE public.profiles
SET 
  county_id = '550e8400-e29b-41d4-a716-446655440001',
  updated_at = now()
WHERE email = 'shubhambhatt9082003@gmail.com';

-- Verify the update
SELECT 
  id,
  email,
  full_name,
  county_id,
  updated_at
FROM public.profiles
WHERE email = 'shubhambhatt9082003@gmail.com';
