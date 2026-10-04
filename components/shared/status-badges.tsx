'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border' },
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  IDENTITY_REVIEW: { label: 'Identity Review', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  EVIDENCE_REVIEW: { label: 'Evidence Review', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  INSTITUTION_REVIEW: { label: 'Institution Review', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  MORE_INFORMATION_REQUIRED: { label: 'More Info Required', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  RESUBMITTED: { label: 'Resubmitted', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  APPROVED: { label: 'Approved', className: 'bg-green-50 text-green-700 border-green-200' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
  APPEAL: { label: 'Under Appeal', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  CLOSED: { label: 'Closed', className: 'bg-muted text-muted-foreground border-border' },
};

export function ClaimStatusBadge({ status, className }: { status: string; className?: string }) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

const classificationConfig: Record<string, { label: string; className: string }> = {
  GREEN: { label: 'High Confidence', className: 'bg-green-50 text-green-700 border-green-200' },
  AMBER: { label: 'Medium Confidence', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  RED: { label: 'Low Confidence', className: 'bg-red-50 text-red-700 border-red-200' },
};

export function MatchClassificationBadge({ classification, className }: { classification: string; className?: string }) {
  const config = classificationConfig[classification] ?? { label: classification, className: 'bg-muted text-muted-foreground border-border' };
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

const verificationConfig: Record<string, { label: string; className: string }> = {
  VERIFIED: { label: 'Verified', className: 'bg-green-50 text-green-700 border-green-200' },
  NEEDS_REVIEW: { label: 'Needs Review', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  UNABLE_TO_VERIFY: { label: 'Unable to Verify', className: 'bg-red-50 text-red-700 border-red-200' },
  PENDING: { label: 'Pending', className: 'bg-muted text-muted-foreground border-border' },
};

export function VerificationBadge({ status, className }: { status: string; className?: string }) {
  const config = verificationConfig[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

const documentTypeLabels: Record<string, string> = {
  IDENTITY_DOCUMENT: 'Identity Document',
  PROOF_OF_EMPLOYMENT: 'Proof of Employment',
  MARRIAGE_CERTIFICATE: 'Marriage Certificate',
  DEATH_CERTIFICATE: 'Death Certificate',
  BANK_CONFIRMATION: 'Bank Confirmation',
  OTHER_SUPPORTING_EVIDENCE: 'Other Supporting Evidence',
};

export function DocumentTypeLabel({ type }: { type: string }) {
  return <>{documentTypeLabels[type] ?? type}</>;
}
