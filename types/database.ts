export type UserRole = 'BENEFICIARY' | 'INSTITUTION_USER' | 'INSTITUTION_ADMIN' | 'REGULATOR' | 'SUPPORT_AGENT' | 'SUPER_ADMIN';

export type ClaimStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IDENTITY_REVIEW'
  | 'EVIDENCE_REVIEW'
  | 'INSTITUTION_REVIEW'
  | 'MORE_INFORMATION_REQUIRED'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'APPEAL'
  | 'CLOSED';

export type MatchClassification = 'GREEN' | 'AMBER' | 'RED';

export type VerificationStatus = 'VERIFIED' | 'NEEDS_REVIEW' | 'UNABLE_TO_VERIFY' | 'PENDING';

export type DocumentType =
  | 'IDENTITY_DOCUMENT'
  | 'PROOF_OF_EMPLOYMENT'
  | 'MARRIAGE_CERTIFICATE'
  | 'DEATH_CERTIFICATE'
  | 'BANK_CONFIRMATION'
  | 'OTHER_SUPPORTING_EVIDENCE';

export type DocumentScanStatus = 'PENDING' | 'CLEAN' | 'FLAGGED' | 'PROCESSING';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  role: UserRole;
  full_name: string;
  institution_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Institution {
  id: string;
  name: string;
  short_name: string;
  type: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  created_at: string;
}

export interface BenefitType {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface BenefitRecord {
  id: string;
  institution_id: string;
  benefit_type_id: string;
  holder_name: string;
  holder_national_id: string;
  holder_date_of_birth: string;
  holder_phone: string | null;
  holder_email: string | null;
  holder_employer: string | null;
  holder_employee_number: string | null;
  reference_number: string;
  estimated_value_min: number;
  estimated_value_max: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface BeneficiaryProfile {
  id: string;
  user_id: string;
  full_name: string;
  national_id: string;
  date_of_birth: string;
  phone: string;
  email: string;
  employer: string | null;
  employee_number: string | null;
  address: string | null;
  verification_status: VerificationStatus;
  consent_given: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchSignal {
  field: string;
  result: string;
  weight: number;
  detail: string;
}

export interface Match {
  id: string;
  beneficiary_profile_id: string;
  benefit_record_id: string;
  institution_id: string;
  score: number;
  classification: MatchClassification;
  status: string;
  signals: MatchSignal[];
  created_at: string;
  reviewed_at: string | null;
}

export interface Claim {
  id: string;
  claim_reference: string;
  match_id: string | null;
  beneficiary_profile_id: string;
  benefit_record_id: string;
  institution_id: string;
  benefit_type_id: string;
  status: ClaimStatus;
  submitted_by: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface ClaimStatusHistory {
  id: string;
  claim_id: string;
  previous_status: ClaimStatus | null;
  new_status: ClaimStatus;
  actor_id: string;
  actor_type: string;
  reason: string | null;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  claim_id: string;
  document_type: DocumentType;
  file_name: string;
  file_size: number;
  mime_type: string;
  scan_status: DocumentScanStatus;
  verification_status: VerificationStatus;
  uploaded_by: string;
  created_at: string;
}

export interface ConsentRecord {
  id: string;
  user_id: string;
  beneficiary_profile_id: string | null;
  purpose: string;
  data_categories: string[];
  consent_version: string;
  policy_version: string;
  status: string;
  created_at: string;
  revoked_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  claim_id: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  institution_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface SupportCase {
  id: string;
  user_id: string;
  claim_id: string | null;
  subject: string;
  description: string;
  status: string;
  created_at: string;
}

export interface VerificationCheck {
  id: string;
  beneficiary_profile_id: string;
  check_type: string;
  status: VerificationStatus;
  provider: string;
  result_detail: string;
  created_at: string;
}

export interface MatchResult {
  score: number;
  classification: MatchClassification;
  signals: MatchSignal[];
}

export interface DashboardStats {
  potentialBenefits: number;
  matchesRequiringReview: number;
  highConfidenceMatches: number;
  activeClaims: number;
  documentsRequired: number;
  claimUpdates: number;
}

export interface InstitutionDashboardStats {
  potentialMatches: number;
  claimsReceived: number;
  claimsUnderReview: number;
  documentsPending: number;
  resolvedClaims: number;
  averageResolutionTime: string;
}

export interface RegulatorStats {
  totalBenefitRecords: number;
  potentialMatches: number;
  verifiedMatches: number;
  openClaims: number;
  resolvedClaims: number;
  averageResolutionTime: string;
  participatingInstitutions: number;
}
