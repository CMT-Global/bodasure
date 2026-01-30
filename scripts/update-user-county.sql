-- SQL script to link existing county to user profile
-- Run this in Supabase Dashboard > SQL Editor
-- County '550e8400-e29b-41d4-a716-446655440001' (Test County) must already exist.
-- Replace 'shubhambhatt9082003@gmail.com' with your email if different.

-- Link the existing county to your profile
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
