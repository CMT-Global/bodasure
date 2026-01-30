-- Auto-generate QR code for riders on INSERT when null
CREATE OR REPLACE FUNCTION public.set_rider_qr_code_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code TEXT;
  exists_check BOOLEAN;
BEGIN
  IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
    LOOP
      -- Generate: BS + 12 hex chars from random UUID
      new_code := 'BS' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
      SELECT EXISTS(SELECT 1 FROM public.riders WHERE qr_code = new_code) INTO exists_check;
      EXIT WHEN NOT exists_check;
    END LOOP;
    NEW.qr_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_rider_qr_code_trigger
  BEFORE INSERT ON public.riders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_rider_qr_code_on_insert();

-- Backfill existing riders that have no QR code (id + random ensures uniqueness per row)
UPDATE public.riders r
SET qr_code = 'BS' || upper(substr(replace(gen_random_uuid()::text || r.id::text, '-', ''), 1, 12))
WHERE r.qr_code IS NULL OR r.qr_code = '';
