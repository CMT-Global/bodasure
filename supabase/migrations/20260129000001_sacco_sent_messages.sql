-- Store every message sent from Sacco Communication page (so send always persists)
CREATE TABLE public.sacco_sent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  sacco_id UUID NOT NULL REFERENCES public.saccos(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all', 'stage', 'non_compliant')),
  stage_id UUID REFERENCES public.stages(id) ON DELETE SET NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sacco_sent_messages_sacco ON public.sacco_sent_messages(sacco_id);
CREATE INDEX idx_sacco_sent_messages_created ON public.sacco_sent_messages(created_at DESC);

ALTER TABLE public.sacco_sent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "County/sacco users can insert sent messages"
  ON public.sacco_sent_messages FOR INSERT
  TO authenticated
  WITH CHECK (public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "County/sacco users can view sent messages in their county"
  ON public.sacco_sent_messages FOR SELECT
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));
