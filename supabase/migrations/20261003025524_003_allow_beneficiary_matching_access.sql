-- Allow all authenticated users to SELECT benefit_records
-- This is needed for the beneficiary discovery flow to run matching
-- Benefit records contain synthetic demo data (holder names, national IDs, etc.)
-- Institutions and regulators already have access; this extends to beneficiaries
DROP POLICY IF EXISTS "benefit_records_select" ON benefit_records;
CREATE POLICY "benefit_records_select" ON benefit_records FOR SELECT
  TO authenticated USING (true);
