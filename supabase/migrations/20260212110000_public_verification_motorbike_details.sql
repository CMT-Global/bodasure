-- Add motorbike details to public rider verification (QR and plate)
-- When a rider is assigned to a motorbike, verification response includes bike details.

CREATE OR REPLACE FUNCTION public.get_public_rider_by_qr(qr text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  perm record;
  bike record;
  result json;
BEGIN
  IF qr IS NULL OR trim(qr) = '' THEN
    RETURN NULL;
  END IF;

  SELECT r.id, r.county_id, r.full_name, r.photo_url, r.compliance_status,
         c.name AS county_name, s.name AS sacco_name, st.name AS stage_name
  INTO rec
  FROM public.riders r
  LEFT JOIN public.counties c ON c.id = r.county_id
  LEFT JOIN public.saccos s ON s.id = r.sacco_id
  LEFT JOIN public.stages st ON st.id = r.stage_id
  WHERE r.qr_code = trim(qr)
  LIMIT 1;

  IF rec.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, permit_number, status, expires_at
  INTO perm
  FROM public.permits
  WHERE rider_id = rec.id
    AND county_id = rec.county_id
    AND status IN ('active', 'pending')
  ORDER BY created_at DESC
  LIMIT 1;

  -- Motorbike assigned to this rider (if any)
  SELECT id, registration_number, make, model, color, year, chassis_number, engine_number
  INTO bike
  FROM public.motorbikes
  WHERE rider_id = rec.id
    AND county_id = rec.county_id
  LIMIT 1;

  result := json_build_object(
    'id', rec.id,
    'county_id', rec.county_id,
    'full_name', rec.full_name,
    'photo_url', rec.photo_url,
    'compliance_status', rec.compliance_status,
    'county_name', rec.county_name,
    'sacco_name', rec.sacco_name,
    'stage_name', rec.stage_name,
    'owner', NULL,
    'sacco', CASE WHEN rec.sacco_name IS NOT NULL THEN json_build_object('name', rec.sacco_name) ELSE NULL END,
    'stage', CASE WHEN rec.stage_name IS NOT NULL THEN json_build_object('name', rec.stage_name) ELSE NULL END,
    'permit', CASE
      WHEN perm.id IS NOT NULL THEN json_build_object(
        'id', perm.id,
        'permit_number', perm.permit_number,
        'status', perm.status,
        'expires_at', perm.expires_at
      )
      ELSE NULL
    END,
    'motorbike', CASE
      WHEN bike.id IS NOT NULL THEN json_build_object(
        'id', bike.id,
        'registration_number', bike.registration_number,
        'make', bike.make,
        'model', bike.model,
        'color', bike.color,
        'year', bike.year,
        'chassis_number', bike.chassis_number,
        'engine_number', bike.engine_number
      )
      ELSE NULL
    END
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_public_rider_by_qr(text) IS 'Returns public rider info (name, photo, permit, county, sacco, stage, compliance, motorbike) by qr_code for unauthenticated verification page.';

-- get_public_rider_by_plate: include full motorbike details (we already have the bike)
CREATE OR REPLACE FUNCTION public.get_public_rider_by_plate(plate_number text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bike record;
  rec record;
  perm record;
  result json;
BEGIN
  IF plate_number IS NULL OR trim(plate_number) = '' THEN
    RETURN NULL;
  END IF;

  SELECT id, rider_id, registration_number, make, model, color, year, chassis_number, engine_number
  INTO bike
  FROM public.motorbikes
  WHERE registration_number ILIKE '%' || trim(plate_number) || '%'
  LIMIT 1;

  IF bike.id IS NULL OR bike.rider_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT r.id, r.county_id, r.full_name, r.photo_url, r.compliance_status,
         c.name AS county_name, s.name AS sacco_name, st.name AS stage_name
  INTO rec
  FROM public.riders r
  LEFT JOIN public.counties c ON c.id = r.county_id
  LEFT JOIN public.saccos s ON s.id = r.sacco_id
  LEFT JOIN public.stages st ON st.id = r.stage_id
  WHERE r.id = bike.rider_id
  LIMIT 1;

  IF rec.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, permit_number, status, expires_at
  INTO perm
  FROM public.permits
  WHERE rider_id = rec.id
    AND county_id = rec.county_id
    AND status IN ('active', 'pending')
  ORDER BY created_at DESC
  LIMIT 1;

  result := json_build_object(
    'id', rec.id,
    'county_id', rec.county_id,
    'full_name', rec.full_name,
    'photo_url', rec.photo_url,
    'compliance_status', rec.compliance_status,
    'county_name', rec.county_name,
    'sacco_name', rec.sacco_name,
    'stage_name', rec.stage_name,
    'owner', NULL,
    'sacco', CASE WHEN rec.sacco_name IS NOT NULL THEN json_build_object('name', rec.sacco_name) ELSE NULL END,
    'stage', CASE WHEN rec.stage_name IS NOT NULL THEN json_build_object('name', rec.stage_name) ELSE NULL END,
    'permit', CASE
      WHEN perm.id IS NOT NULL THEN json_build_object(
        'id', perm.id,
        'permit_number', perm.permit_number,
        'status', perm.status,
        'expires_at', perm.expires_at
      )
      ELSE NULL
    END,
    'motorbike', json_build_object(
      'id', bike.id,
      'registration_number', bike.registration_number,
      'make', bike.make,
      'model', bike.model,
      'color', bike.color,
      'year', bike.year,
      'chassis_number', bike.chassis_number,
      'engine_number', bike.engine_number
    )
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_public_rider_by_plate(text) IS 'Returns public rider info (name, photo, permit, county, sacco, stage, compliance, motorbike) by plate for unauthenticated verification.';
