-- Allow all authenticated users to SELECT profiles
-- This is needed so beneficiaries can look up institution users to notify them,
-- and institution users can see beneficiary names in claim reviews.
-- RLS still protects: users can only UPDATE their own profile.
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (true);
