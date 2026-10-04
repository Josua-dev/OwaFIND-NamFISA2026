'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DemoBanner } from '@/components/shared/demo-banner';
import { LoadingState } from '@/components/shared/states';
import { VerificationBadge } from '@/components/shared/status-badges';
import { supabase } from '@/lib/db/supabase-client';
import { ArrowLeft, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { BeneficiaryProfile, VerificationCheck } from '@/types/database';
import Link from 'next/link';

export default function VerifyPage() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bp, setBp] = useState<BeneficiaryProfile | null>(null);
  const [checks, setChecks] = useState<VerificationCheck[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    national_id: '',
    date_of_birth: '',
    phone: '',
    email: '',
    employer: '',
    employee_number: '',
    address: '',
  });

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

    if (bpData) {
      setForm({
        full_name: bpData.full_name || profile.full_name,
        national_id: bpData.national_id || '',
        date_of_birth: bpData.date_of_birth || '',
        phone: bpData.phone || '',
        email: bpData.email || profile.email,
        employer: bpData.employer || '',
        employee_number: bpData.employee_number || '',
        address: bpData.address || '',
      });

      const { data: checksData } = await supabase
        .from('verification_checks')
        .select('*')
        .eq('beneficiary_profile_id', bpData.id)
        .order('created_at', { ascending: false });
      setChecks((checksData ?? []) as VerificationCheck[]);
    } else {
      setForm((prev) => ({ ...prev, full_name: profile.full_name, email: profile.email }));
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSubmitting(true);

    let bpId = bp?.id;

    if (!bp) {
      const { data, error: insertError } = await supabase
        .from('beneficiary_profiles')
        .insert({
          user_id: profile.user_id,
          full_name: form.full_name,
          national_id: form.national_id,
          date_of_birth: form.date_of_birth,
          phone: form.phone,
          email: form.email,
          employer: form.employer || null,
          employee_number: form.employee_number || null,
          address: form.address || null,
          verification_status: 'PENDING',
        })
        .select()
        .single();
      if (insertError) {
        setError(insertError.message);
        setSubmitting(false);
        return;
      }
      bpId = data.id;
      setBp(data as BeneficiaryProfile);
    } else {
      const { error: updateError } = await supabase
        .from('beneficiary_profiles')
        .update({
          full_name: form.full_name,
          national_id: form.national_id,
          date_of_birth: form.date_of_birth,
          phone: form.phone,
          email: form.email,
          employer: form.employer || null,
          employee_number: form.employee_number || null,
          address: form.address || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bp.id);
      if (updateError) {
        setError(updateError.message);
        setSubmitting(false);
        return;
      }
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      actor_id: profile.user_id,
      actor_email: profile.email,
      actor_role: profile.role,
      action: 'IDENTITY_VERIFICATION_SUBMITTED',
      resource_type: 'beneficiary_profiles',
      resource_id: bpId,
    });

    setSubmitting(false);
    await runVerificationInternal(bpId);
  };

  const runVerification = async () => {
    if (!bp || !profile) return;
    setError(null);
    await runVerificationInternal(bp.id);
  };

  const runVerificationInternal = async (bpId?: string) => {
    if (!profile) return;
    const currentBpId = bpId ?? bp?.id;
    if (!currentBpId) {
      setError('Could not find your profile. Please try saving your information again.');
      return;
    }
    setVerifying(true);

    // Simulate demo identity verification
    await new Promise((r) => setTimeout(r, 2500));

    // Create verification checks
    const checksData = [
      { check_type: 'IDENTITY_DOCUMENT', status: 'VERIFIED', detail: 'Identity document verified. Name, national ID, and date of birth match.' },
      { check_type: 'PERSONAL_DETAILS', status: 'VERIFIED', detail: 'Personal details verified against demo identity provider records.' },
      { check_type: 'EMPLOYMENT_HISTORY', status: 'NEEDS_REVIEW', detail: 'Employment history partially verified. Some employer records require manual review.' },
    ];

    for (const check of checksData) {
      const { error: checkError } = await supabase.from('verification_checks').insert({
        beneficiary_profile_id: currentBpId,
        check_type: check.check_type,
        status: check.status,
        provider: 'DEMO_IDENTITY_PROVIDER',
        result_detail: check.detail,
      });
      if (checkError) {
        setError(`Failed to save verification check: ${checkError.message}`);
        setVerifying(false);
        return;
      }
    }

    // Update verification status
    const { error: statusError } = await supabase
      .from('beneficiary_profiles')
      .update({ verification_status: 'VERIFIED', updated_at: new Date().toISOString() })
      .eq('id', currentBpId);
    if (statusError) {
      setError(`Failed to update verification status: ${statusError.message}`);
      setVerifying(false);
      return;
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      actor_id: profile.user_id,
      actor_email: profile.email,
      actor_role: profile.role,
      action: 'IDENTITY_VERIFIED',
      resource_type: 'beneficiary_profiles',
      resource_id: currentBpId,
    });

    await refreshProfile();
    await loadData();
    setVerifying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DemoBanner />
        <LoadingState message="Loading..." />
      </div>
    );
  }

  const isVerified = bp?.verification_status === 'VERIFIED';

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
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Identity Verification</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Verify your identity so we can accurately search for benefits that may belong to you.
          </p>
          {bp && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <VerificationBadge status={bp.verification_status} />
            </div>
          )}
        </div>

        {/* Demo provider notice */}
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-800">
            DEMO IDENTITY VERIFICATION SERVICE — This does not connect to any real government identity system. All data is synthetic and for demonstration purposes only.
          </p>
        </div>

        {isVerified ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Identity Verified
              </CardTitle>
              <CardDescription>Your identity has been verified. You can now proceed to consent and benefit discovery.</CardDescription>
            </CardHeader>
            <CardContent>
              {checks.length > 0 && (
                <div className="space-y-2 mb-6">
                  <h4 className="text-sm font-semibold text-foreground">Verification Checks</h4>
                  {checks.map((check) => (
                    <div key={check.id} className="flex items-center justify-between rounded-md border border-border p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{check.check_type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">{check.result_detail}</p>
                      </div>
                      <VerificationBadge status={check.status} />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                {!bp?.consent_given && (
                  <Link href="/consent">
                    <Button>Continue to Consent</Button>
                  </Link>
                )}
                <Link href="/discover">
                  <Button variant="outline">Find My Benefits</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : verifying ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <h3 className="mt-4 font-semibold text-foreground">Verifying your identity...</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-md">
                  The demo identity verification service is checking your information. This takes a few seconds.
                </p>
                <div className="mt-6 space-y-2 text-left w-full max-w-md">
                  {['Checking identity document', 'Verifying personal details', 'Validating employment history'].map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Enter Your Identity Details</CardTitle>
              <CardDescription>Provide accurate information for the best matching results.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="national_id">National ID / Passport *</Label>
                    <Input id="national_id" value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth *</Label>
                    <Input id="date_of_birth" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+264 81 234 5678" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employer">Employer</Label>
                    <Input id="employer" value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employee_number">Employee Number</Label>
                    <Input id="employee_number" value={form.employee_number} onChange={(e) => setForm({ ...form, employee_number: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                </div>

                {bp && (
                  <Button type="button" onClick={runVerification} className="w-full" disabled={verifying}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Run Identity Verification
                  </Button>
                )}
                {!bp && (
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & Continue'}
                  </Button>
                )}
                {bp && (
                  <Button type="submit" variant="outline" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Information'}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
