/*
# OwaFind RLS Policies

Enables Row Level Security on all tables and defines access policies.
- Beneficiaries see only their own profiles, matches, claims, documents, notifications, consent
- Institution users see records scoped to their institution
- Regulators see aggregated data (SELECT access on claims, matches, audit_logs for oversight)
- Super admins have broad access
*/

-- Enable RLS on all tables
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiary_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_checks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INSTITUTIONS (readable by all authenticated)
-- ============================================
DROP POLICY IF EXISTS "institutions_read_all" ON institutions;
CREATE POLICY "institutions_read_all" ON institutions FOR SELECT
  TO authenticated USING (true);

-- ============================================
-- BENEFIT TYPES (readable by all authenticated)
-- ============================================
DROP POLICY IF EXISTS "benefit_types_read_all" ON benefit_types;
CREATE POLICY "benefit_types_read_all" ON benefit_types FOR SELECT
  TO authenticated USING (true);

-- ============================================
-- PROFILES
-- ============================================
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- BENEFIT RECORDS
-- ============================================
DROP POLICY IF EXISTS "benefit_records_select" ON benefit_records;
CREATE POLICY "benefit_records_select" ON benefit_records FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.institution_id = benefit_records.institution_id)
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('REGULATOR', 'SUPER_ADMIN'))
  );

-- ============================================
-- BENEFICIARY PROFILES
-- ============================================
DROP POLICY IF EXISTS "bp_select_own" ON beneficiary_profiles;
CREATE POLICY "bp_select_own" ON beneficiary_profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN matches m ON m.beneficiary_profile_id = beneficiary_profiles.id
      WHERE p.user_id = auth.uid() AND p.institution_id = m.institution_id
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'SUPER_ADMIN')
  );

DROP POLICY IF EXISTS "bp_insert_own" ON beneficiary_profiles;
CREATE POLICY "bp_insert_own" ON beneficiary_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bp_update_own" ON beneficiary_profiles;
CREATE POLICY "bp_update_own" ON beneficiary_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- MATCHES
-- ============================================
DROP POLICY IF EXISTS "matches_select" ON matches;
CREATE POLICY "matches_select" ON matches FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM beneficiary_profiles bp WHERE bp.id = matches.beneficiary_profile_id AND bp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.institution_id = matches.institution_id)
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('REGULATOR', 'SUPER_ADMIN'))
  );

DROP POLICY IF EXISTS "matches_insert" ON matches;
CREATE POLICY "matches_insert" ON matches FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM beneficiary_profiles bp WHERE bp.id = matches.beneficiary_profile_id AND bp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "matches_update" ON matches;
CREATE POLICY "matches_update" ON matches FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.institution_id = matches.institution_id)
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'SUPER_ADMIN')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.institution_id = matches.institution_id)
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'SUPER_ADMIN')
  );

-- ============================================
-- CLAIMS
-- ============================================
DROP POLICY IF EXISTS "claims_select" ON claims;
CREATE POLICY "claims_select" ON claims FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM beneficiary_profiles bp WHERE bp.id = claims.beneficiary_profile_id AND bp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.institution_id = claims.institution_id)
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('REGULATOR', 'SUPER_ADMIN'))
  );

DROP POLICY IF EXISTS "claims_insert" ON claims;
CREATE POLICY "claims_insert" ON claims FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM beneficiary_profiles bp WHERE bp.id = claims.beneficiary_profile_id AND bp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "claims_update" ON claims;
CREATE POLICY "claims_update" ON claims FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM beneficiary_profiles bp WHERE bp.id = claims.beneficiary_profile_id AND bp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.institution_id = claims.institution_id)
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'SUPER_ADMIN')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM beneficiary_profiles bp WHERE bp.id = claims.beneficiary_profile_id AND bp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.institution_id = claims.institution_id)
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'SUPER_ADMIN')
  );

-- ============================================
-- CLAIM STATUS HISTORY
-- ============================================
DROP POLICY IF EXISTS "csh_select" ON claim_status_history;
CREATE POLICY "csh_select" ON claim_status_history FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM claims c
      JOIN beneficiary_profiles bp ON bp.id = c.beneficiary_profile_id
      WHERE c.id = claim_status_history.claim_id AND bp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM claims c
      JOIN profiles p ON p.institution_id = c.institution_id
      WHERE c.id = claim_status_history.claim_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('REGULATOR', 'SUPER_ADMIN'))
  );

DROP POLICY IF EXISTS "csh_insert" ON claim_status_history;
CREATE POLICY "csh_insert" ON claim_status_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = actor_id);

-- ============================================
-- DOCUMENTS
-- ============================================
DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select" ON documents FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM claims c
      JOIN beneficiary_profiles bp ON bp.id = c.beneficiary_profile_id
      WHERE c.id = documents.claim_id AND bp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM claims c
      JOIN profiles p ON p.institution_id = c.institution_id
      WHERE c.id = documents.claim_id AND p.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('REGULATOR', 'SUPER_ADMIN'))
  );

DROP POLICY IF EXISTS "documents_insert" ON documents;
CREATE POLICY "documents_insert" ON documents FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM claims c
      JOIN beneficiary_profiles bp ON bp.id = c.beneficiary_profile_id
      WHERE c.id = documents.claim_id AND bp.user_id = auth.uid()
    )
  );

-- ============================================
-- CONSENT RECORDS
-- ============================================
DROP POLICY IF EXISTS "consent_select_own" ON consent_records;
CREATE POLICY "consent_select_own" ON consent_records FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "consent_insert_own" ON consent_records;
CREATE POLICY "consent_insert_own" ON consent_records FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "consent_update_own" ON consent_records;
CREATE POLICY "consent_update_own" ON consent_records FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================
DROP POLICY IF EXISTS "notif_select_own" ON notifications;
CREATE POLICY "notif_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_insert_own" ON notifications;
CREATE POLICY "notif_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_update_own" ON notifications;
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- AUDIT LOGS
-- ============================================
DROP POLICY IF EXISTS "audit_select_own" ON audit_logs;
CREATE POLICY "audit_select_own" ON audit_logs FOR SELECT
  TO authenticated USING (
    auth.uid() = actor_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('SUPER_ADMIN', 'REGULATOR'))
  );

DROP POLICY IF EXISTS "audit_insert_own" ON audit_logs;
CREATE POLICY "audit_insert_own" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = actor_id);

-- ============================================
-- SUPPORT CASES
-- ============================================
DROP POLICY IF EXISTS "support_select_own" ON support_cases;
CREATE POLICY "support_select_own" ON support_cases FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('SUPPORT_AGENT', 'SUPER_ADMIN'))
  );

DROP POLICY IF EXISTS "support_insert_own" ON support_cases;
CREATE POLICY "support_insert_own" ON support_cases FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================
-- VERIFICATION CHECKS
-- ============================================
DROP POLICY IF EXISTS "vc_select_own" ON verification_checks;
CREATE POLICY "vc_select_own" ON verification_checks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM beneficiary_profiles bp WHERE bp.id = verification_checks.beneficiary_profile_id AND bp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'SUPER_ADMIN')
  );

DROP POLICY IF EXISTS "vc_insert_own" ON verification_checks;
CREATE POLICY "vc_insert_own" ON verification_checks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM beneficiary_profiles bp WHERE bp.id = verification_checks.beneficiary_profile_id AND bp.user_id = auth.uid())
  );
