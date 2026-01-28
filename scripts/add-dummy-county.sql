-- SQL script to add a dummy county for testing
-- Run this in Supabase Dashboard > SQL Editor

-- Insert a dummy county (using a fixed UUID for easy reference)
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
  'active', -- Set to active so it appears in dropdowns
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
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  address = EXCLUDED.address,
  updated_at = now();

-- Verify the county was created
SELECT 
  id,
  name,
  code,
  status,
  contact_email,
  contact_phone,
  created_at
FROM public.counties
WHERE id = '550e8400-e29b-41d4-a716-446655440001';
