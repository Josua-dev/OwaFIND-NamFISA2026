/*
# OwaFind Core Schema — Tables Only

Creates all core tables for the OwaFind platform.
RLS policies will be added in a separate migration after all tables exist.
*/

-- ============================================
-- INSTITUTIONS (no dependencies)
-- ============================================
CREATE TABLE IF NOT EXISTS institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text NOT NULL,
  type text NOT NULL DEFAULT 'PENSION_FUND',
  description text,
  contact_email text,
  contact_phone text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- BENEFIT TYPES (no dependencies)
-- ============================================
CREATE TABLE IF NOT EXISTS benefit_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  category text NOT NULL DEFAULT 'PENSION'
);

-- ============================================
-- PROFILES (depends on institutions)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'BENEFICIARY',
  full_name text NOT NULL DEFAULT 'Demo User',
  institution_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_institution_id_fkey'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_institution_id_fkey
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- BENEFIT RECORDS (depends on institutions, benefit_types)
-- ============================================
CREATE TABLE IF NOT EXISTS benefit_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  benefit_type_id uuid NOT NULL REFERENCES benefit_types(id),
  holder_name text NOT NULL,
  holder_national_id text NOT NULL,
  holder_date_of_birth date NOT NULL,
  holder_phone text,
  holder_email text,
  holder_employer text,
  holder_employee_number text,
  reference_number text NOT NULL,
  estimated_value_min numeric NOT NULL DEFAULT 0,
  estimated_value_max numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NAD',
  status text NOT NULL DEFAULT 'UNCLAIMED',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_br_institution ON benefit_records(institution_id);
CREATE INDEX IF NOT EXISTS idx_br_national_id ON benefit_records(holder_national_id);
CREATE INDEX IF NOT EXISTS idx_br_status ON benefit_records(status);

-- ============================================
-- BENEFICIARY PROFILES (depends on auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS beneficiary_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  national_id text NOT NULL,
  date_of_birth date NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  employer text,
  employee_number text,
  address text,
  verification_status text NOT NULL DEFAULT 'PENDING',
  consent_given boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bp_user ON beneficiary_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_bp_national_id ON beneficiary_profiles(national_id);

-- ============================================
-- MATCHES (depends on beneficiary_profiles, benefit_records, institutions)
-- ============================================
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_profile_id uuid NOT NULL REFERENCES beneficiary_profiles(id) ON DELETE CASCADE,
  benefit_record_id uuid NOT NULL REFERENCES benefit_records(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  classification text NOT NULL DEFAULT 'RED',
  status text NOT NULL DEFAULT 'PENDING',
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_matches_beneficiary ON matches(beneficiary_profile_id);
CREATE INDEX IF NOT EXISTS idx_matches_institution ON matches(institution_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- ============================================
-- CLAIMS (depends on matches, beneficiary_profiles, benefit_records, institutions, benefit_types)
-- ============================================
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_reference text NOT NULL UNIQUE,
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  beneficiary_profile_id uuid NOT NULL REFERENCES beneficiary_profiles(id) ON DELETE CASCADE,
  benefit_record_id uuid NOT NULL REFERENCES benefit_records(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  benefit_type_id uuid NOT NULL REFERENCES benefit_types(id),
  status text NOT NULL DEFAULT 'DRAFT',
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_claims_beneficiary ON claims(beneficiary_profile_id);
CREATE INDEX IF NOT EXISTS idx_claims_institution ON claims(institution_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_reference ON claims(claim_reference);

-- ============================================
-- CLAIM STATUS HISTORY (depends on claims)
-- ============================================
CREATE TABLE IF NOT EXISTS claim_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_type text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csh_claim ON claim_status_history(claim_id);

-- ============================================
-- DOCUMENTS (depends on claims)
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  scan_status text NOT NULL DEFAULT 'PENDING',
  verification_status text NOT NULL DEFAULT 'PENDING',
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_claim ON documents(claim_id);

-- ============================================
-- CONSENT RECORDS (depends on auth.users, beneficiary_profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  beneficiary_profile_id uuid REFERENCES beneficiary_profiles(id) ON DELETE SET NULL,
  purpose text NOT NULL,
  data_categories text[] NOT NULL DEFAULT '{}',
  consent_version text NOT NULL DEFAULT '1.0',
  policy_version text NOT NULL DEFAULT '1.0',
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_consent_user ON consent_records(user_id);

-- ============================================
-- NOTIFICATIONS (depends on auth.users, claims)
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'INFO',
  read boolean NOT NULL DEFAULT false,
  claim_id uuid REFERENCES claims(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(user_id, read);

-- ============================================
-- AUDIT LOGS (depends on auth.users, institutions)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_email text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  institution_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ============================================
-- SUPPORT CASES (depends on auth.users, claims)
-- ============================================
CREATE TABLE IF NOT EXISTS support_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES claims(id) ON DELETE SET NULL,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- VERIFICATION CHECKS (depends on beneficiary_profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS verification_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_profile_id uuid NOT NULL REFERENCES beneficiary_profiles(id) ON DELETE CASCADE,
  check_type text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  provider text NOT NULL DEFAULT 'DEMO_IDENTITY_PROVIDER',
  result_detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vc_beneficiary ON verification_checks(beneficiary_profile_id);
