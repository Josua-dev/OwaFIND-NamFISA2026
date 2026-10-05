'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DemoBanner } from '@/components/shared/demo-banner';
import { LoadingState, EmptyState } from '@/components/shared/states';
import { MatchClassificationBadge, ClaimStatusBadge } from '@/components/shared/status-badges';
import { ConfidenceIndicator } from '@/components/shared/match-signals';
import { supabase } from '@/lib/db/supabase-client';
import { calculateMatch } from '@/lib/matching/matching-service';
import { formatCurrencyRange } from '@/lib/utils/format';
import { ArrowLeft, Search, CheckCircle2, Loader2, ArrowRight, AlertCircle, Building2 } from 'lucide-react';
import type { BeneficiaryProfile, Match, BenefitRecord, BenefitType, Institution } from '@/types/database';

interface MatchWithDetails extends Match {
  benefit_records: BenefitRecord;
  benefit_types: BenefitType;
  institutions: Institution;
}

const discoverySteps = [
  { label: 'Checking your information', duration: 800 },
  { label: 'Searching participating institutions', duration: 1200 },
  { label: 'Comparing benefit records', duration: 1000 },
  { label: 'Analyzing possible matches', duration: 1000 },
  { label: 'Results ready', duration: 400 },
];

export default function DiscoverPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bp, setBp] = useState<BeneficiaryProfile | null>(null);
  const [phase, setPhase] = useState<'idle' | 'searching' | 'results'>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [newMatchCount, setNewMatchCount] = useState(0);
  const [institutionCount, setInstitutionCount] = useState(0);
  const [recordCount, setRecordCount] = useState(0);

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

    const { count: instCount } = await supabase
      .from('institutions')
      .select('*', { count: 'exact', head: true });
    setInstitutionCount(instCount ?? 0);

    const { count: recCount } = await supabase
      .from('benefit_records')
      .select('*', { count: 'exact', head: true });
    setRecordCount(recCount ?? 0);

    if (bpData) {
      const { data: existingMatches } = await supabase
        .from('matches')
        .select(`*, benefit_records (*), benefit_types (*), institutions (*)`)
        .eq('beneficiary_profile_id', bpData.id)
        .order('score', { ascending: false });
      setMatches((existingMatches ?? []) as unknown as MatchWithDetails[]);
    }
    setLoading(false);
  };

  const runDiscovery = async () => {
    if (!bp || !profile) return;
    setPhase('searching');
    setCurrentStep(0);

    for (let i = 0; i < discoverySteps.length; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, discoverySteps[i].duration));
    }

    // Get existing match record IDs to skip
    const { data: existingMatches } = await supabase
      .from('matches')
      .select('benefit_record_id')
      .eq('beneficiary_profile_id', bp.id);

    const existingRecordIds = new Set((existingMatches ?? []).map((m: any) => m.benefit_record_id));
    let newCount = 0;
    const matchInserts: any[] = [];

    const batchSize = 1000;
    let offset = 0;
    let allRecords: BenefitRecord[] = [];

    while (true) {
      const { data: batch } = await supabase
        .from('benefit_records')
        .select('*')
        .range(offset, offset + batchSize - 1);
      if (!batch || batch.length === 0) break;
      allRecords = allRecords.concat(batch as BenefitRecord[]);
      if (batch.length < batchSize) break;
      offset += batchSize;
    }

    for (const record of allRecords) {
      if (existingRecordIds.has(record.id)) continue;

      const result = calculateMatch(
        {
          national_id: bp.national_id,
          name: bp.full_name,
          date_of_birth: bp.date_of_birth,
          phone: bp.phone,
          email: bp.email,
          employer: bp.employer,
          employee_number: bp.employee_number,
        },
        {
          national_id: record.holder_national_id,
          name: record.holder_name,
          date_of_birth: record.holder_date_of_birth,
          phone: record.holder_phone,
          email: record.holder_email,
          employer: record.holder_employer,
          employee_number: record.holder_employee_number,
        }
      );

      if (result.score >= 0.35) {
        matchInserts.push({
          beneficiary_profile_id: bp.id,
          benefit_record_id: record.id,
          institution_id: record.institution_id,
          score: result.score,
          classification: result.classification,
          status: 'PENDING',
          signals: JSON.parse(JSON.stringify(result.signals)),
        });
      }
    }

    // Batch insert matches
    const insertBatchSize = 500;
    for (let i = 0; i < matchInserts.length; i += insertBatchSize) {
      const batch = matchInserts.slice(i, i + insertBatchSize);
      const { data: inserted } = await supabase
        .from('matches')
        .insert(batch)
        .select(`*, benefit_records (*), benefit_types (*), institutions (*)`);
      if (inserted) {
        newCount += inserted.length;
      }
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      actor_id: profile.user_id,
      actor_email: profile.email,
      actor_role: profile.role,
      action: 'BENEFIT_SEARCHED',
      resource_type: 'benefit_records',
      reason: `Benefit discovery search completed. ${newCount} new matches found.`,
    });

    setNewMatchCount(newCount);
    await loadData();
    setPhase('results');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DemoBanner />
        <LoadingState message="Loading..." />
      </div>
    );
  }

  if (!bp) {
    return (
      <div className="min-h-screen bg-background">
        <DemoBanner />
        <div className="container-narrow py-8">
          <Card>
            <CardContent className="py-12">
              <EmptyState
                title="Identity verification required"
                description="Complete identity verification before searching for benefits."
                action={<Link href="/verify"><Button>Verify Identity</Button></Link>}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (bp.verification_status !== 'VERIFIED') {
    return (
      <div className="min-h-screen bg-background">
        <DemoBanner />
        <div className="container-narrow py-8">
          <Card>
            <CardContent className="py-12">
              <EmptyState
                title="Identity not verified"
                description="Your identity must be verified before benefit discovery."
                action={<Link href="/verify"><Button>Complete Verification</Button></Link>}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!bp.consent_given) {
    return (
      <div className="min-h-screen bg-background">
        <DemoBanner />
        <div className="container-narrow py-8">
          <Card>
            <CardContent className="py-12">
              <EmptyState
                title="Consent required"
                description="You must grant consent before we can search for benefits on your behalf."
                action={<Link href="/consent"><Button>Grant Consent</Button></Link>}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
              <Search className="h-5 w-5" />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Find My Benefits</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Search participating institutions for potential financial benefits that may belong to you.
          </p>
        </div>

        {/* Demo notice */}
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-800">
            SYNTHETIC DATA — This search uses demo benefit records from fictional institutions. No real institutions are contacted.
          </p>
        </div>

        {phase === 'idle' && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Search className="h-8 w-8" />
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold">Ready to Search</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md">
                  We will search across {institutionCount} participating institutions and compare your information against {recordCount.toLocaleString()} benefit records using our matching engine.
                </p>
                <Button onClick={runDiscovery} size="lg" className="mt-6">
                  Start Benefit Discovery
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'searching' && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <h3 className="mt-4 font-display text-lg font-semibold">Searching for Benefits...</h3>
                <div className="mt-8 w-full max-w-md space-y-3">
                  {discoverySteps.map((step, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 rounded-md p-3 transition-all ${
                        idx < currentStep ? 'bg-green-50 border border-green-200' :
                        idx === currentStep ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30 border border-border'
                      }`}
                    >
                      {idx < currentStep ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : idx === currentStep ? (
                        <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${idx <= currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'results' && (
          <div className="space-y-6">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">
                      {newMatchCount > 0 ? `${newMatchCount} new potential benefit${newMatchCount > 1 ? 's' : ''} found!` : 'Search complete'}
                    </p>
                    <p className="text-sm text-green-700">
                      {matches.length} total potential match{matches.length !== 1 ? 'es' : ''} across participating institutions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {matches.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <EmptyState
                    title="No potential matches found"
                    description="Based on your current information, no potential benefits were found. This doesn't mean you have no benefits — new records may be added by institutions over time."
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => (
                  <Link
                    key={match.id}
                    href={`/dashboard/beneficiary/matches/${match.id}`}
                    className="block"
                  >
                    <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{match.institutions.name}</span>
                            </div>
                            <h3 className="font-semibold text-foreground">{match.benefit_types.name}</h3>
                            <p className="mt-1 text-sm text-primary font-medium">
                              {formatCurrencyRange(match.benefit_records.estimated_value_min, match.benefit_records.estimated_value_max)}
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                              <MatchClassificationBadge classification={match.classification} />
                              <ClaimStatusBadge status={match.status} />
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 w-32">
                            <p className="text-xs text-muted-foreground mb-1">Match Confidence</p>
                            <p className="font-display text-3xl font-bold text-foreground">{Math.round(match.score * 100)}%</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <ConfidenceIndicator score={match.score} classification={match.classification} />
                        </div>
                        <div className="mt-4 flex items-center justify-end">
                          <span className="text-sm font-medium text-primary flex items-center gap-1">
                            View Details <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            <div className="flex justify-center gap-3">
              <Button onClick={runDiscovery} variant="outline">Search Again</Button>
              <Link href="/dashboard/beneficiary">
                <Button>Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
