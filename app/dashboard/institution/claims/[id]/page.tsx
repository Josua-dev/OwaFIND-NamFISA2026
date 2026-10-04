'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LoadingState, EmptyState } from '@/components/shared/states';
import { ClaimStatusBadge, DocumentTypeLabel, VerificationBadge, MatchClassificationBadge } from '@/components/shared/status-badges';
import { MatchSignals, ConfidenceIndicator } from '@/components/shared/match-signals';
import { supabase } from '@/lib/db/supabase-client';
import { canActorTransition, getClaimStatusLabel } from '@/lib/claims/claim-workflow';
import { formatDate, formatDateTime, formatCurrencyRange } from '@/lib/utils/format';
import { Building2, FileText, Search, ShieldCheck, ArrowLeft, CheckCircle2, XCircle, AlertCircle, FileCheck, Clock, Loader2 } from 'lucide-react';
import type { Claim, Institution, BenefitType, ClaimStatusHistory, DocumentRecord, BeneficiaryProfile, Match, BenefitRecord } from '@/types/database';

interface ClaimDetail extends Claim {
  institutions: Institution;
  benefit_types: BenefitType;
  beneficiary_profiles: BeneficiaryProfile;
  benefit_records: BenefitRecord;
}

export default function InstitutionClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [history, setHistory] = useState<ClaimStatusHistory[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [match, setMatch] = useState<Match | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | 'request_info' | 'accept'>('approve');
  const [reason, setReason] = useState('');
  const [requestedDocType, setRequestedDocType] = useState('PROOF_OF_EMPLOYMENT');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadClaim();
  }, [id]);

  const loadClaim = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('claims')
      .select(`*, institutions (*), benefit_types (*), beneficiary_profiles (*), benefit_records (*)`)
      .eq('id', id)
      .maybeSingle();
    setClaim(data as ClaimDetail | null);

    if (data) {
      const [histRes, docRes] = await Promise.all([
        supabase.from('claim_status_history').select('*').eq('claim_id', data.id).order('created_at', { ascending: true }),
        supabase.from('documents').select('*').eq('claim_id', data.id).order('created_at', { ascending: false }),
      ]);
      setHistory((histRes.data ?? []) as ClaimStatusHistory[]);
      setDocuments((docRes.data ?? []) as DocumentRecord[]);

      if (data.match_id) {
        const { data: matchData } = await supabase.from('matches').select('*').eq('id', data.match_id).maybeSingle();
        setMatch(matchData as Match | null);
      }
    }
    setLoading(false);
  };

  const openDialog = (act: 'approve' | 'reject' | 'request_info' | 'accept') => {
    setAction(act);
    setReason('');
    setDialogOpen(true);
  };

  const handleAction = async () => {
    if (!claim || !profile) return;
    if (action !== 'accept' && reason.length < 10) return;
    setActing(true);

    const targetStatus =
      action === 'approve' ? 'APPROVED' :
      action === 'reject' ? 'REJECTED' :
      action === 'accept' ? 'INSTITUTION_REVIEW' : 'MORE_INFORMATION_REQUIRED';

    if (!canActorTransition(claim.status, targetStatus, profile.role as any)) {
      setActing(false);
      return;
    }

    await supabase.from('claims').update({
      status: targetStatus,
      updated_at: new Date().toISOString(),
      closed_at: ['APPROVED', 'REJECTED'].includes(targetStatus) ? new Date().toISOString() : null,
    }).eq('id', claim.id);

    await supabase.from('claim_status_history').insert({
      claim_id: claim.id,
      previous_status: claim.status,
      new_status: targetStatus,
      actor_id: profile.user_id,
      actor_type: profile.role,
      reason: action === 'request_info' ? `${reason}. Requested document: ${requestedDocType.replace(/_/g, ' ')}` : action === 'accept' ? 'Claim accepted for review' : reason,
    });

    const auditAction =
      action === 'approve' ? 'CLAIM_APPROVED' :
      action === 'reject' ? 'CLAIM_REJECTED' :
      action === 'accept' ? 'CLAIM_REVIEW_STARTED' : 'INFORMATION_REQUESTED';

    await supabase.from('audit_logs').insert({
      actor_id: profile.user_id,
      actor_email: profile.email,
      actor_role: profile.role,
      action: auditAction,
      resource_type: 'claims',
      resource_id: claim.id,
      institution_id: claim.institution_id,
      reason: action === 'accept' ? 'Claim accepted for review' : reason,
    });

    const notifTitle =
      action === 'approve' ? 'Claim approved' :
      action === 'reject' ? 'Claim rejected' :
      action === 'accept' ? 'Claim under review' : 'Additional information required';
    const notifMessage =
      action === 'approve' ? `Your claim ${claim.claim_reference} has been approved by ${claim.institutions.name}.` :
      action === 'reject' ? `Your claim ${claim.claim_reference} has been rejected. Reason: ${reason}` :
      action === 'accept' ? `Your claim ${claim.claim_reference} has been accepted for review by ${claim.institutions.name}.` :
      `Additional information is required for claim ${claim.claim_reference}. ${reason}`;
    const notifType = action === 'approve' ? 'SUCCESS' : action === 'reject' ? 'ERROR' : action === 'accept' ? 'INFO' : 'WARNING';

    await supabase.from('notifications').insert({
      user_id: claim.submitted_by,
      title: notifTitle,
      message: notifMessage,
      type: notifType,
      claim_id: claim.id,
    });

    setActing(false);
    setDialogOpen(false);
    await loadClaim();
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Claim Review">
        <LoadingState message="Loading claim..." />
      </DashboardLayout>
    );
  }

  if (!claim) {
    return (
      <DashboardLayout navItems={navItems} title="Claim Review">
        <EmptyState title="Claim not found" />
      </DashboardLayout>
    );
  }

  const canAccept = claim.status === 'SUBMITTED';
  const canReview = ['INSTITUTION_REVIEW', 'RESUBMITTED'].includes(claim.status);
  const isClosed = ['APPROVED', 'REJECTED', 'CLOSED'].includes(claim.status);

  return (
    <DashboardLayout navItems={navItems} title="Claim Review">
      <div className="space-y-6">
        <Link href="/dashboard/institution/claims" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to claims
        </Link>

        {/* Claim header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight">{claim.claim_reference}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{claim.benefit_types.name}</p>
                <p className="mt-2 text-sm font-medium text-primary">
                  {formatCurrencyRange(claim.benefit_records.estimated_value_min, claim.benefit_records.estimated_value_max)}
                </p>
              </div>
              <ClaimStatusBadge status={claim.status} />
            </div>
          </CardContent>
        </Card>

        {/* Beneficiary info + Match confidence */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Beneficiary Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Full Name</dt>
                  <dd className="text-sm text-foreground mt-0.5">{claim.beneficiary_profiles.full_name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">National ID</dt>
                  <dd className="text-sm text-foreground mt-0.5">{claim.beneficiary_profiles.national_id}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Date of Birth</dt>
                  <dd className="text-sm text-foreground mt-0.5">{formatDate(claim.beneficiary_profiles.date_of_birth)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Phone</dt>
                  <dd className="text-sm text-foreground mt-0.5">{claim.beneficiary_profiles.phone}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Employer</dt>
                  <dd className="text-sm text-foreground mt-0.5">{claim.beneficiary_profiles.employer || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Identity Status</dt>
                  <dd className="mt-0.5"><VerificationBadge status={claim.beneficiary_profiles.verification_status} /></dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {match && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">OwaFind Match Confidence</CardTitle>
                <CardDescription>This is OwaFind's matching score — not an entitlement decision.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Confidence Score</span>
                  <span className="font-display text-2xl font-bold">{Math.round(match.score * 100)}%</span>
                </div>
                <ConfidenceIndicator score={match.score} classification={match.classification} />
                <div className="mt-3">
                  <MatchClassificationBadge classification={match.classification} />
                </div>
                <Separator className="my-4" />
                <div className="text-xs text-muted-foreground">
                  <AlertCircle className="inline h-3 w-3 mr-1" />
                  The institution remains the authority on entitlement.
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Match signals */}
        {match && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Match Explanation</CardTitle>
              <CardDescription>Detailed signals that contributed to the match score.</CardDescription>
            </CardHeader>
            <CardContent>
              <MatchSignals signals={match.signals as unknown as Array<{ field: string; result: string; weight: number; detail: string }>} />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evidence Documents</CardTitle>
              <CardDescription>Documents uploaded by the beneficiary.</CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <EmptyState title="No documents uploaded" />
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileCheck className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            <DocumentTypeLabel type={doc.document_type} /> — {formatDate(doc.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <VerificationBadge status={doc.scan_status === 'CLEAN' ? 'VERIFIED' : 'PENDING'} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Claim History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-4">
                {history.map((event, idx) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                        idx === history.length - 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {idx === history.length - 1 ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-current" />}
                      </div>
                      {idx < history.length - 1 && <div className="w-px h-full bg-border flex-1 min-h-[20px]" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-foreground">{getClaimStatusLabel(event.new_status as any)}</p>
                      {event.reason && <p className="text-sm text-muted-foreground mt-0.5">{event.reason}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(event.created_at)} — {event.actor_type === 'SYSTEM' ? 'System' : event.actor_type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Accept for review */}
        {canAccept && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">Claim Submitted</h3>
                  <p className="text-sm text-muted-foreground mt-1">Review the claim details and accept it for review to begin the entitlement process.</p>
                </div>
                <Button onClick={() => openDialog('accept')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Accept for Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        {canReview && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Entitlement Decision</CardTitle>
              <CardDescription>As the institution, you are the authority on entitlement. Provide a reason for your decision.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => openDialog('request_info')} variant="outline" className="flex-1">
                  <AlertCircle className="mr-2 h-4 w-4" /> Request More Information
                </Button>
                <Button onClick={() => openDialog('approve')} className="flex-1 bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Claim
                </Button>
                <Button onClick={() => openDialog('reject')} variant="destructive" className="flex-1">
                  <XCircle className="mr-2 h-4 w-4" /> Reject Claim
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isClosed && (
          <Card className="bg-secondary/30">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                This claim is {claim.status === 'APPROVED' ? 'approved' : claim.status === 'REJECTED' ? 'rejected' : 'closed'} and no further action is required.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve Claim' : action === 'reject' ? 'Reject Claim' : action === 'accept' ? 'Accept for Review' : 'Request More Information'}
            </DialogTitle>
            <DialogDescription>
              {action === 'approve'
                ? 'Approve this claim for payment processing. A reason is required and will be recorded in the audit log.'
                : action === 'reject'
                ? 'Reject this claim. A reason is required and will be recorded in the audit log.'
                : action === 'accept'
                ? 'Accept this claim for review. The claim will move into the institution review stage.'
                : 'Request additional information from the beneficiary. Select the missing document type and provide an explanation.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {action === 'request_info' && (
              <div className="space-y-2">
                <Label>Requested Document Type</Label>
                <Select value={requestedDocType} onValueChange={setRequestedDocType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDENTITY_DOCUMENT">Identity Document</SelectItem>
                    <SelectItem value="PROOF_OF_EMPLOYMENT">Proof of Employment</SelectItem>
                    <SelectItem value="MARRIAGE_CERTIFICATE">Marriage Certificate</SelectItem>
                    <SelectItem value="DEATH_CERTIFICATE">Death Certificate</SelectItem>
                    <SelectItem value="BANK_CONFIRMATION">Bank Confirmation</SelectItem>
                    <SelectItem value="OTHER_SUPPORTING_EVIDENCE">Other Supporting Evidence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {action !== 'accept' && (
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide a detailed reason for your decision..."
                  rows={4}
                />
                {reason.length > 0 && reason.length < 10 && (
                  <p className="text-xs text-destructive">Reason must be at least 10 characters.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAction}
              disabled={acting || (action !== 'accept' && reason.length < 10)}
              variant={action === 'approve' ? 'default' : action === 'reject' ? 'destructive' : 'outline'}
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> :
                action === 'approve' ? 'Approve' :
                action === 'reject' ? 'Reject' :
                action === 'accept' ? 'Accept' : 'Request Information'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

const navItems = [
  { href: '/dashboard/institution', label: 'Dashboard', icon: Building2 },
  { href: '/dashboard/institution/claims', label: 'Claims', icon: FileText },
  { href: '/dashboard/institution/matches', label: 'Matches', icon: Search },
  { href: '/dashboard/institution/audit', label: 'Audit Log', icon: ShieldCheck },
];
