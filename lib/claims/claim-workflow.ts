import type { ClaimStatus, UserRole } from '@/types/database';

const TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['INSTITUTION_REVIEW'],
  IDENTITY_REVIEW: ['EVIDENCE_REVIEW', 'MORE_INFORMATION_REQUIRED'],
  EVIDENCE_REVIEW: ['INSTITUTION_REVIEW', 'MORE_INFORMATION_REQUIRED'],
  INSTITUTION_REVIEW: ['APPROVED', 'REJECTED', 'MORE_INFORMATION_REQUIRED'],
  MORE_INFORMATION_REQUIRED: ['RESUBMITTED'],
  RESUBMITTED: ['INSTITUTION_REVIEW'],
  APPROVED: ['CLOSED'],
  REJECTED: ['APPEAL', 'CLOSED'],
  APPEAL: ['INSTITUTION_REVIEW', 'CLOSED'],
  CLOSED: [],
};

const ALLOWED_ACTORS: Partial<Record<ClaimStatus, UserRole[]>> = {
  DRAFT: ['BENEFICIARY'],
  SUBMITTED: ['INSTITUTION_USER', 'INSTITUTION_ADMIN'],
  IDENTITY_REVIEW: ['INSTITUTION_USER', 'INSTITUTION_ADMIN'],
  EVIDENCE_REVIEW: ['INSTITUTION_USER', 'INSTITUTION_ADMIN'],
  INSTITUTION_REVIEW: ['INSTITUTION_USER', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
  MORE_INFORMATION_REQUIRED: ['BENEFICIARY'],
  RESUBMITTED: ['INSTITUTION_USER', 'INSTITUTION_ADMIN'],
  APPROVED: ['INSTITUTION_USER', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
  REJECTED: ['INSTITUTION_USER', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'],
  APPEAL: ['BENEFICIARY'],
  CLOSED: ['SUPER_ADMIN'],
};

export function canTransition(from: ClaimStatus, to: ClaimStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function canActorTransition(
  currentStatus: ClaimStatus,
  targetStatus: ClaimStatus,
  role: UserRole
): boolean {
  if (!canTransition(currentStatus, targetStatus)) return false;
  const allowed = ALLOWED_ACTORS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function getValidTransitions(status: ClaimStatus): ClaimStatus[] {
  return TRANSITIONS[status] ?? [];
}

export function getClaimStatusLabel(status: ClaimStatus): string {
  const labels: Record<ClaimStatus, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    IDENTITY_REVIEW: 'Identity Review',
    EVIDENCE_REVIEW: 'Evidence Review',
    INSTITUTION_REVIEW: 'Institution Review',
    MORE_INFORMATION_REQUIRED: 'More Information Required',
    RESUBMITTED: 'Resubmitted',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    APPEAL: 'Under Appeal',
    CLOSED: 'Closed',
  };
  return labels[status] ?? status;
}

export const ALL_CLAIM_STATUSES: ClaimStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'IDENTITY_REVIEW',
  'EVIDENCE_REVIEW',
  'INSTITUTION_REVIEW',
  'MORE_INFORMATION_REQUIRED',
  'RESUBMITTED',
  'APPROVED',
  'REJECTED',
  'APPEAL',
  'CLOSED',
];
