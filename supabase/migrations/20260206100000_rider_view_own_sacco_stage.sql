-- Riders can view their assigned sacco and stage (for rider portal QR ID / boarding pass).
-- County staff use get_user_county_id + user_can_view_county_data; riders don't have those,
-- so joined sacco/stage were coming back null. Add SELECT policies so riders can read
-- only the sacco and stage linked to their own rider row.

-- Saccos: rider can view the sacco they are assigned to
CREATE POLICY "Riders can view own assigned sacco"
  ON public.saccos FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND id IN (SELECT sacco_id FROM public.riders WHERE user_id = auth.uid() AND sacco_id IS NOT NULL)
  );

-- Stages: rider can view the stage they are assigned to
CREATE POLICY "Riders can view own assigned stage"
  ON public.stages FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND id IN (SELECT stage_id FROM public.riders WHERE user_id = auth.uid() AND stage_id IS NOT NULL)
  );
