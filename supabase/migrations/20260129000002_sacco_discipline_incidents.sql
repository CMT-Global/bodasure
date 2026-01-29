-- Sacco discipline & incident records (warnings, disciplinary actions, incident reports)
CREATE TABLE public.sacco_discipline_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  sacco_id UUID NOT NULL REFERENCES public.saccos(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('warning', 'disciplinary_action', 'incident_report')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved', 'escalated', 'dismissed')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  submitted_to_county BOOLEAN NOT NULL DEFAULT false,
  county_submission_date TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sacco_discipline_incidents_sacco ON public.sacco_discipline_incidents(sacco_id);
CREATE INDEX idx_sacco_discipline_incidents_county ON public.sacco_discipline_incidents(county_id);
CREATE INDEX idx_sacco_discipline_incidents_created ON public.sacco_discipline_incidents(created_at DESC);

ALTER TABLE public.sacco_discipline_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "County/sacco users can insert discipline incidents"
  ON public.sacco_discipline_incidents FOR INSERT
  TO authenticated
  WITH CHECK (public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "County/sacco users can view discipline incidents in their county"
  ON public.sacco_discipline_incidents FOR SELECT
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "County/sacco users can update discipline incidents in their county"
  ON public.sacco_discipline_incidents FOR UPDATE
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));
