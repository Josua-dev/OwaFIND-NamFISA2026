'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DemoBanner } from '@/components/shared/demo-banner';
import { LoadingState } from '@/components/shared/states';
import { supabase } from '@/lib/db/supabase-client';
import { ArrowLeft, ShieldCheck, Loader2, CheckCircle2, FileText } from 'lucide-react';
import type { BeneficiaryProfile, ConsentRecord } from '@/types/database';

export default function ConsentPage() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bp, setBp] = useState<BeneficiaryProfile | null>(null);
  const [existingConsent, setExistingConsent] = useState<ConsentRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);
    const { data: bpData } = await supabase
      .from('beneficiary_profiles')
      .select('*')
      .eq('user_id', profile.user_id)
      .maybeSingle();
    setBp(bpData as BeneficiaryProfile | null);

    const { data: consent } = await supabase
      .from('consent_records')
      .select('*')
      .eq('user_id', profile.user_id)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .maybeSingle();
    setExistingConsent(consent as ConsentRecord | null);
    setLoading(false);
  };

  const handleGrant = async () => {
    if (!profile || !bp || !agreed) return;
    setSubmitting(true);

    await supabase.from('consent_records').insert({
      user_id: profile.user_id,
      beneficiary_profile_id: bp.id,
      purpose: 'Benefit discovery and matching across participating institutions',
      data_categories: ['Identity information', 'Contact details', 'Employment history', 'Date of birth'],
      consent_version: '1.0',
      policy_version: '1.0',
      status: 'ACTIVE',
    });

    await supabase
      .from('beneficiary_profiles')
      .update({ consent_given: true, updated_at: new Date().toISOString() })
      .eq('id', bp.id);

    await supabase.from('audit_logs').insert({
      actor_id: profile.user_id,
      actor_email: profile.email,
      actor_role: profile.role,
      action: 'CONSENT_GRANTED',
      resource_type: 'consent',
      reason: 'Benefit discovery consent granted',
    });

    await refreshProfile();
    setSubmitting(false);
    router.push('/discover');
  };

  const handleRevoke = async () => {
    if (!profile || !existingConsent) return;
    setSubmitting(true);

    await supabase
      .from('consent_records')
      .update({ status: 'REVOKED', revoked_at: new Date().toISOString() })
      .eq('id', existingConsent.id);

    if (bp) {
      await supabase
        .from('beneficiary_profiles')
        .update({ consent_given: false, updated_at: new Date().toISOString() })
        .eq('id', bp.id);
    }

    await supabase.from('audit_logs').insert({
      actor_id: profile.user_id,
      actor_email: profile.email,
      actor_role: profile.role,
      action: 'CONSENT_REVOKED',
      resource_type: 'consent',
      reason: 'Benefit discovery consent revoked',
    });

    await refreshProfile();
    await loadData();
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DemoBanner />
        <LoadingState message="Loading..." />
      </div>
    );
  }

  const hasConsent = existingConsent && existingConsent.status === 'ACTIVE';

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <div className="container-narrow py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Consent for Benefit Discovery</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Before we search for benefits on your behalf, we need your explicit consent.
          </p>
        </div>

        {hasConsent ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Consent Active
              </CardTitle>
              <CardDescription>You have granted consent for benefit discovery. You can revoke it at any time.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Purpose</p>
                  <p className="text-sm text-foreground mt-0.5">{existingConsent!.purpose}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Data Categories</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {existingConsent!.data_categories.map((cat) => (
                      <span key={cat} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{cat}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Consent Version: {existingConsent!.consent_version}</span>
                  <span>Policy Version: {existingConsent!.policy_version}</span>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Link href="/discover">
                  <Button>Find My Benefits</Button>
                </Link>
                <Button variant="outline" onClick={handleRevoke} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Revoke Consent'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>What You Are Agreeing To</CardTitle>
              <CardDescription>Please review the following carefully before granting consent.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border border-border p-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    What information is being used
                  </h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your identity details (name, national ID, date of birth), contact information (phone, email), and employment history (employer, employee number) will be used to search for potential benefit matches.
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Why it is being used
                  </h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    To discover potential financial benefits that may belong to you across participating institutions. The matching engine compares your information against benefit records to identify potential matches.
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Who may receive information
                  </h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Participating institutions will receive match results and claim information when you initiate a claim. Institutions remain responsible for determining entitlement.
                  </p>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h4 className="text-sm font-semibold text-amber-900">Your Rights</h4>
                  <ul className="mt-2 space-y-1 text-sm text-amber-800">
                    <li>You can revoke consent at any time.</li>
                    <li>Revoking consent prevents future benefit searches.</li>
                    <li>Your existing claims will continue to be processed.</li>
                  </ul>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <Checkbox id="consent" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
                  <label htmlFor="consent" className="text-sm text-foreground cursor-pointer">
                    I have read and understood the above. I grant consent for OwaFind to use my information for benefit discovery purposes.
                  </label>
                </div>

                <Button onClick={handleGrant} className="w-full" disabled={!agreed || submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Grant Consent & Continue'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
