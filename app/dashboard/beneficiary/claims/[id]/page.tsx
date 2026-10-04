'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { LoadingState, EmptyState } from '@/components/shared/states';
import { ClaimStatusBadge, DocumentTypeLabel, VerificationBadge } from '@/components/shared/status-badges';
import { supabase } from '@/lib/db/supabase-client';
import { canTransition, getClaimStatusLabel } from '@/lib/claims/claim-workflow';
import { formatDate, formatDateTime, formatCurrencyRange } from '@/lib/utils/format';
import { Search, FileText, TrendingUp, AlertCircle, ArrowLeft, Upload, Loader2, CheckCircle2, Clock, FileCheck } from 'lucide-react';
import type { Claim, Institution, BenefitType, ClaimStatusHistory, DocumentRecord, BenefitRecord } from '@/types/database';

interface ClaimDetail extends Claim {
  institutions: Institution;
  benefit_types: BenefitType;
  benefit_records: BenefitRecord;
}

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [history, setHistory] = useState<ClaimStatusHistory[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState<string>('IDENTITY_DOCUMENT');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadClaim();
  }, [id]);

  const loadClaim = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('claims')
      .select(`*, institutions (*), benefit_types (*), benefit_records (*)`)
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
    }
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!claim || !profile || !fileName) return;
    setUploading(true);

    const { error } = await supabase.from('documents').insert({
      claim_id: claim.id,
      document_type: docType,
      file_name: fileName,
      file_size: Math.floor(Math.random() * 300000) + 100000,
      mime_type: 'application/pdf',
      scan_status: 'CLEAN',
      verification_status: 'VERIFIED',
      uploaded_by: profile.user_id,
    });

    if (!error) {
      await supabase.from('audit_logs').insert({
        actor_id: profile.user_id,
        actor_email: profile.email,
        actor_role: profile.role,
        action: 'DOCUMENT_UPLOADED',
        resource_type: 'documents',
        institution_id: claim.institution_id,
        reason: `Document uploaded: ${docType}`,
      });
    }

    setUploading(false);
    setUploadOpen(false);
    setFileName('');
    await loadClaim();
  };

  const handleSubmit = async () => {
    if (!claim || !profile) return;
    if (!canTransition(claim.status, 'SUBMITTED')) return;
    setSubmitting(true);

    await supabase.from('claims').update({
      status: 'SUBMITTED',
      updated_at: new Date().toISOString(),
    }).eq('id', claim.id);

    await supabase.from('claim_status_history').insert({
      claim_id: claim.id,
      previous_status: claim.status,
      new_status: 'SUBMITTED',
      actor_id: profile.user_id,
      actor_type: 'BENEFICIARY',
      reason: 'Claim submitted by beneficiary',
    });

    await supabase.from('audit_logs').insert({
      actor_id: profile.user_id,
      actor_email: profile.email,
      actor_role: profile.role,
      action: 'CLAIM_SUBMITTED',
      resource_type: 'claims',
      resource_id: claim.id,
      institution_id: claim.institution_id,
      reason: 'Claim submitted to institution',
    });

    // Notify the beneficiary and institution users
    await supabase.from('notifications').insert({
      user_id: profile.user_id,
      title: 'Claim submitted',
      message: `Your claim ${claim.claim_reference} has been submitted successfully.`,
      type: 'INFO',
      claim_id: claim.id,
    });

    // Find institution users at this institution and notify them
    const { data: instUsers } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('institution_id', claim.institution_id)
      .in('role', ['INSTITUTION_USER', 'INSTITUTION_ADMIN']);

    if (instUsers && instUsers.length > 0) {
      const notifs = instUsers.map((u: any) => ({
        user_id: u.user_id,
        title: 'New claim received',
        message: `Claim ${claim.claim_reference} has been submitted and is awaiting review.`,
        type: 'INFO',
        claim_id: claim.id,
      }));
      await supabase.from('notifications').insert(notifs);
    }

    setSubmitting(false);
    await loadClaim();
  };

  const handleResubmit = async () => {
    if (!claim || !profile) return;
    if (!canTransition(claim.status, 'RESUBMITTED')) return;
    setResubmitting(true);

    await supabase.from('claims').update({
      status: 'RESUBMITTED',
      updated_at: new Date().toISOString(),
    }).eq('id', claim.id);

    await supabase.from('claim_status_history').insert({
      claim_id: claim.id,
      previous_status: claim.status,
      new_status: 'RESUBMITTED',
      actor_id: profile.user_id,
      actor_type: 'BENEFICIARY',
      reason: 'Claim resubmitted with additional documents',
    });

    await supabase.from('audit_logs').insert({
      actor_id: profile.user_id,
      actor_email: profile.email,
      actor_role: profile.role,
      action: 'CLAIM_RESUBMITTED',
      resource_type: 'claims',
      resource_id: claim.id,
      institution_id: claim.institution_id,
      reason: 'Claim resubmitted with additional evidence',
    });

    // Notify institution users
    const { data: instUsers } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('institution_id', claim.institution_id)
      .in('role', ['INSTITUTION_USER', 'INSTITUTION_ADMIN']);

    if (instUsers && instUsers.length > 0) {
      const notifs = instUsers.map((u: any) => ({
        user_id: u.user_id,
        title: 'Claim resubmitted',
        message: `Claim ${claim.claim_reference} has been resubmitted with additional evidence.`,
        type: 'INFO',
        claim_id: claim.id,
      }));
      await supabase.from('notifications').insert(notifs);
    }

    setResubmitting(false);
    await loadClaim();
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Claim Details">
        <LoadingState message="Loading claim..." />
      </DashboardLayout>
    );
  }

  if (!claim) {
    return (
      <DashboardLayout navItems={navItems} title="Claim Details">
        <EmptyState title="Claim not found" />
      </DashboardLayout>
    );
  }

  const canSubmit = canTransition(claim.status, 'SUBMITTED');

  return (
    <DashboardLayout navItems={navItems} title="Claim Details">
      <div className="space-y-6">
        <Link href="/dashboard/beneficiary/claims" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to claims
        </Link>

        {/* Claim header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight">{claim.claim_reference}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{claim.benefit_types.name}</p>
                <p className="text-sm text-muted-foreground">{claim.institutions.name}</p>
                {claim.benefit_records && (
                  <p className="mt-2 text-sm font-medium text-primary">
                    {formatCurrencyRange(claim.benefit_records.estimated_value_min, claim.benefit_records.estimated_value_max)}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <ClaimStatusBadge status={claim.status} />
                <p className="text-xs text-muted-foreground">Created {formatDate(claim.created_at)}</p>
              </div>
            </div>
            {claim.reason && (
              <div className="mt-4 rounded-md bg-secondary/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">Your reason for claiming</p>
                <p className="text-sm text-foreground mt-0.5">{claim.reason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit prompt for DRAFT */}
        {canSubmit && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">Ready to submit?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {documents.length === 0
                      ? 'Upload at least one supporting document before submitting.'
                      : 'Your claim has supporting documents. You can submit it for review.'}
                  </p>
                </div>
                <Button onClick={handleSubmit} disabled={submitting || documents.length === 0}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Claim'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* More info required notice */}
        {claim.status === 'MORE_INFORMATION_REQUIRED' && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Additional Information Required</p>
                    <p className="text-sm text-amber-700 mt-1">
                      The institution has requested more information. Please upload the requested document and resubmit your claim.
                    </p>
                  </div>
                </div>
                <Button onClick={handleResubmit} disabled={resubmitting || documents.length === 0}>
                  {resubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resubmit Claim'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Supporting Documents</CardTitle>
                  <CardDescription>Evidence uploaded for this claim.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <EmptyState title="No documents uploaded" description="Upload supporting evidence for your claim." />
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
              <CardTitle className="text-lg">Claim Timeline</CardTitle>
              <CardDescription>Complete history of your claim's journey.</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <EmptyState title="No activity yet" />
              ) : (
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a supporting evidence document for this claim.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
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
            <div className="space-y-2">
              <Label htmlFor="fileName">File Name</Label>
              <input
                id="fileName"
                type="file"
                accept=".pdf,.jpg,.png,.doc,.docx"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground hover:file:bg-primary/90"
              />
              <p className="text-xs text-muted-foreground">
                DEMO PROCESSING — Documents are scanned with a demo document verification service. No real malware scanning is performed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !fileName}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

const navItems = [
  { href: '/dashboard/beneficiary', label: 'Dashboard', icon: TrendingUp },
  { href: '/discover', label: 'Find Benefits', icon: Search },
  { href: '/dashboard/beneficiary/matches', label: 'My Matches', icon: Search },
  { href: '/dashboard/beneficiary/claims', label: 'My Claims', icon: FileText },
  { href: '/verify', label: 'Identity Verification', icon: AlertCircle },
];
