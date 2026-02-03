-- Sacco portal: allow sacco users to view and approve/reject rider update requests for riders in their sacco.
-- Requests for riders (rider_id) in the user's sacco are visible; owner-only requests (owner_rider_reassignment) are not scoped by sacco here.

CREATE POLICY "Sacco can view rider update requests for their riders"
  ON public.rider_update_requests FOR SELECT
  TO authenticated
  USING (
    rider_id IS NOT NULL
    AND rider_id IN (
      SELECT id FROM public.riders
      WHERE sacco_id = public.get_user_sacco_id(auth.uid())
    )
  );

CREATE POLICY "Sacco can update rider update requests for their riders"
  ON public.rider_update_requests FOR UPDATE
  TO authenticated
  USING (
    rider_id IS NOT NULL
    AND rider_id IN (
      SELECT id FROM public.riders
      WHERE sacco_id = public.get_user_sacco_id(auth.uid())
    )
  );
