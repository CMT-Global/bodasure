-- Rider/owner change requests (phone, photo, sacco/stage transfer, owner/rider reassignment)
-- Requests go to county/sacco approval queue; riders/owners cannot directly edit critical fields.

CREATE TABLE public.rider_update_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  rider_id UUID REFERENCES public.riders(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN (
    'phone',
    'photo',
    'sacco_stage_transfer',
    'owner_rider_reassignment'
  )),
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rider_or_owner_check CHECK (
    (rider_id IS NOT NULL AND owner_id IS NULL) OR (rider_id IS NULL AND owner_id IS NOT NULL)
  )
);

CREATE INDEX idx_rider_update_requests_county ON public.rider_update_requests(county_id);
CREATE INDEX idx_rider_update_requests_rider ON public.rider_update_requests(rider_id);
CREATE INDEX idx_rider_update_requests_owner ON public.rider_update_requests(owner_id);
CREATE INDEX idx_rider_update_requests_status ON public.rider_update_requests(status);
CREATE INDEX idx_rider_update_requests_created ON public.rider_update_requests(created_at DESC);

ALTER TABLE public.rider_update_requests ENABLE ROW LEVEL SECURITY;

-- Riders/owners can insert requests for their own rider or owner record
CREATE POLICY "Users can insert own rider or owner update requests"
  ON public.rider_update_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND (
      (rider_id IS NOT NULL AND rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()))
      OR (owner_id IS NOT NULL AND owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()))
    )
  );

-- Riders/owners can view their own requests; county admins can view all in their county
CREATE POLICY "Users can view own update requests"
  ON public.rider_update_requests FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid()
    OR public.is_county_admin(auth.uid(), county_id)
  );

-- Only county admins can update (approve/reject) requests
CREATE POLICY "County admins can update rider update requests"
  ON public.rider_update_requests FOR UPDATE
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));

CREATE TRIGGER update_rider_update_requests_updated_at
  BEFORE UPDATE ON public.rider_update_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
