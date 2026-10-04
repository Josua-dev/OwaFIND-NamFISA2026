-- Allow any authenticated user to insert notifications for any user
-- This is needed so institution users can notify beneficiaries about claim status changes
-- and beneficiaries can notify institution users when claims are submitted
DROP POLICY IF EXISTS "notif_insert_own" ON notifications;
CREATE POLICY "notif_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);
