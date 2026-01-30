// Quick script to update user profile with county_id
// Run this in your browser console while logged into the app
// Or use: node scripts/fix-user-county.js (if you have node-supabase setup)

// This script should be run in Supabase SQL Editor instead
// But here's the SQL you need:

const sql = `
-- Ensure test county exists
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

-- Update your profile with county_id
UPDATE public.profiles
SET 
  county_id = '550e8400-e29b-41d4-a716-446655440001',
  updated_at = now()
WHERE email = 'shubhambhatt9082003@gmail.com';

-- Also add a county role if you don't have one
INSERT INTO public.user_roles (user_id, role, county_id, granted_by)
SELECT 
  id,
  'county_super_admin',
  '550e8400-e29b-41d4-a716-446655440001',
  id
FROM public.profiles
WHERE email = 'shubhambhatt9082003@gmail.com'
ON CONFLICT (user_id, role, county_id) DO NOTHING;
`;

console.log('Copy and paste this SQL into Supabase SQL Editor:');
console.log(sql);
