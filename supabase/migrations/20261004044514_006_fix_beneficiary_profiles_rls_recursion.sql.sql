-- Break infinite recursion in beneficiary_profiles SELECT policy.
-- The bp_select_own policy queried matches, whose own SELECT policy queried
-- beneficiary_profiles back, creating an infinite RLS recursion.
-- Fix: replace the inline subquery with a SECURITY DEFINER function that
-- bypasses RLS, so the circular dependency is broken.

CREATE OR REPLACE FUNCTION public.bp_linked_to_my_institution(bp_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN matches m ON m.institution_id = p.institution_id
    WHERE p.user_id = auth.uid()
      AND m.beneficiary_profile_id = bp_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.bp_linked_to_my_institution(uuid) TO authenticated;

-- Replace the recursive SELECT policy
DROP POLICY IF EXISTS bp_select_own ON beneficiary_profiles;

CREATE POLICY bp_select_own ON beneficiary_profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.bp_linked_to_my_institution(id)
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'SUPER_ADMIN'
    )
  );
