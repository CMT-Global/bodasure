-- Fix infinite recursion in "Owners can view riders assigned to their owned bikes" policy.
-- The policy referenced motorbikes, and motorbikes RLS references riders, causing recursion.
-- Use a SECURITY DEFINER function to bypass RLS when resolving owner's bike rider IDs.

DROP POLICY IF EXISTS "Owners can view riders assigned to their owned bikes" ON public.riders;

CREATE OR REPLACE FUNCTION public.get_rider_ids_for_owner_bikes(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rider_id FROM public.motorbikes
  WHERE rider_id IS NOT NULL
    AND owner_id IN (SELECT id FROM public.owners WHERE user_id = _user_id);
$$;

COMMENT ON FUNCTION public.get_rider_ids_for_owner_bikes(UUID) IS
  'Returns rider IDs assigned to bikes owned by the given user. SECURITY DEFINER to avoid RLS recursion.';

CREATE POLICY "Owners can view riders assigned to their owned bikes"
  ON public.riders FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND id IN (SELECT public.get_rider_ids_for_owner_bikes(auth.uid()))
  );
