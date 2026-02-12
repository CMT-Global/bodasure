-- Sacco and welfare officials can view user_roles and profiles for their entity.
-- Fixes: new user added in sacco portal not showing in officials list (RLS blocked SELECT).

-- =====================================================
-- 1. user_roles: Sacco officials can SELECT rows for their sacco
-- =====================================================
DROP POLICY IF EXISTS "Sacco officials can view user_roles in their sacco" ON public.user_roles;
CREATE POLICY "Sacco officials can view user_roles in their sacco"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND sacco_id IS NOT NULL
    AND sacco_id = public.get_user_sacco_id(auth.uid())
  );

-- =====================================================
-- 2. user_roles: Welfare officials can SELECT rows for their welfare group
-- =====================================================
DROP POLICY IF EXISTS "Welfare officials can view user_roles in their welfare group" ON public.user_roles;
CREATE POLICY "Welfare officials can view user_roles in their welfare group"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND welfare_group_id IS NOT NULL
    AND welfare_group_id = public.get_user_welfare_group_id(auth.uid())
  );

-- =====================================================
-- 3. profiles: Sacco officials can view profiles of users with a role in their sacco
-- =====================================================
DROP POLICY IF EXISTS "Sacco officials can view profiles of officials in their sacco" ON public.profiles;
CREATE POLICY "Sacco officials can view profiles of officials in their sacco"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND (
      id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = profiles.id
          AND ur.sacco_id = public.get_user_sacco_id(auth.uid())
          AND ur.sacco_id IS NOT NULL
      )
    )
  );

-- =====================================================
-- 4. profiles: Welfare officials can view profiles of users with a role in their welfare group
-- =====================================================
DROP POLICY IF EXISTS "Welfare officials can view profiles of officials in their welfare group" ON public.profiles;
CREATE POLICY "Welfare officials can view profiles of officials in their welfare group"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND (
      id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = profiles.id
          AND ur.welfare_group_id = public.get_user_welfare_group_id(auth.uid())
          AND ur.welfare_group_id IS NOT NULL
      )
    )
  );

-- =====================================================
-- 5. profiles: Sacco officials who manage officials can UPDATE profiles of users in their sacco
--    or of users in their county not yet assigned to any sacco/welfare (so new official's
--    county_id, full_name, phone can be set when creating from portal).
-- =====================================================
DROP POLICY IF EXISTS "Sacco officials can update profiles of officials in their sacco" ON public.profiles;
CREATE POLICY "Sacco officials can update profiles of officials in their sacco"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND public.user_can_manage_sacco_officials(auth.uid(), public.get_user_sacco_id(auth.uid()))
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = profiles.id
          AND ur.sacco_id = public.get_user_sacco_id(auth.uid())
          AND ur.sacco_id IS NOT NULL
      )
      OR (
        (profiles.county_id = (SELECT county_id FROM public.saccos WHERE id = public.get_user_sacco_id(auth.uid()) LIMIT 1)
         OR profiles.county_id IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles ur2
          WHERE ur2.user_id = profiles.id
            AND (ur2.sacco_id IS NOT NULL OR ur2.welfare_group_id IS NOT NULL)
        )
      )
    )
  )
  WITH CHECK (public.is_user_active(auth.uid()));

-- =====================================================
-- 5b. profiles: Welfare officials who manage officials can UPDATE profiles (same idea as sacco)
-- =====================================================
DROP POLICY IF EXISTS "Welfare officials can update profiles of officials in their welfare group" ON public.profiles;
CREATE POLICY "Welfare officials can update profiles of officials in their welfare group"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND public.user_can_manage_welfare_officials(auth.uid(), public.get_user_welfare_group_id(auth.uid()))
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = profiles.id
          AND ur.welfare_group_id = public.get_user_welfare_group_id(auth.uid())
          AND ur.welfare_group_id IS NOT NULL
      )
      OR (
        (profiles.county_id = (SELECT county_id FROM public.welfare_groups WHERE id = public.get_user_welfare_group_id(auth.uid()) LIMIT 1)
         OR profiles.county_id IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles ur2
          WHERE ur2.user_id = profiles.id
            AND (ur2.sacco_id IS NOT NULL OR ur2.welfare_group_id IS NOT NULL)
        )
      )
    )
  )
  WITH CHECK (public.is_user_active(auth.uid()));

-- =====================================================
-- 6. user_roles: Sacco officials who manage officials can INSERT/UPDATE/DELETE roles for their sacco
--    (so they can assign role when adding new user)
-- =====================================================
DROP POLICY IF EXISTS "Sacco officials can manage user_roles in their sacco" ON public.user_roles;
CREATE POLICY "Sacco officials can manage user_roles in their sacco"
  ON public.user_roles FOR ALL TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND sacco_id IS NOT NULL
    AND sacco_id = public.get_user_sacco_id(auth.uid())
    AND public.user_can_manage_sacco_officials(auth.uid(), sacco_id)
  )
  WITH CHECK (
    public.is_user_active(auth.uid())
    AND sacco_id IS NOT NULL
    AND sacco_id = public.get_user_sacco_id(auth.uid())
    AND public.user_can_manage_sacco_officials(auth.uid(), sacco_id)
  );

-- =====================================================
-- 7. user_roles: Welfare officials who manage officials can INSERT/UPDATE/DELETE roles for their welfare group
-- =====================================================
DROP POLICY IF EXISTS "Welfare officials can manage user_roles in their welfare group" ON public.user_roles;
CREATE POLICY "Welfare officials can manage user_roles in their welfare group"
  ON public.user_roles FOR ALL TO authenticated
  USING (
    public.is_user_active(auth.uid())
    AND welfare_group_id IS NOT NULL
    AND welfare_group_id = public.get_user_welfare_group_id(auth.uid())
    AND public.user_can_manage_welfare_officials(auth.uid(), welfare_group_id)
  )
  WITH CHECK (
    public.is_user_active(auth.uid())
    AND welfare_group_id IS NOT NULL
    AND welfare_group_id = public.get_user_welfare_group_id(auth.uid())
    AND public.user_can_manage_welfare_officials(auth.uid(), welfare_group_id)
  );
