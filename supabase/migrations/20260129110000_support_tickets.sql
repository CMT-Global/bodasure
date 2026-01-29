-- Support tickets from rider/owner portal; visible to county support/admin
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  county_id UUID REFERENCES public.counties(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN (
    'payment_issue',
    'wrong_details',
    'penalty_dispute',
    'sacco_stage_issue',
    'technical_issue'
  )),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  penalty_id UUID REFERENCES public.penalties(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_county ON public.support_tickets(county_id);
CREATE INDEX idx_support_tickets_created ON public.support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own support tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own support tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "County admins can view support tickets in their county"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (
    county_id IS NOT NULL
    AND public.is_county_admin(auth.uid(), county_id)
  );

CREATE POLICY "Platform admins can view all support tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "County admins can update support tickets in their county"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (
    county_id IS NOT NULL
    AND public.is_county_admin(auth.uid(), county_id)
  );

CREATE POLICY "Platform admins can update all support tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
