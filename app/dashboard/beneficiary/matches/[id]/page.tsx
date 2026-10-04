'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { LoadingState, EmptyState } from '@/components/shared/states';
import { MatchClassificationBadge, ClaimStatusBadge } from '@/components/shared/status-badges';
import { MatchSignals, ConfidenceIndicator } from '@/components/shared/match-signals';
import { supabase } from '@/lib/db/supabase-client';
import { generateClaimReference, formatCurrencyRange, formatDate } from '@/lib/utils/format';
import { ArrowLeft, Building2, FileText, AlertCircle, Loader2, Info } from 'lucide-react';
import type { Match, BenefitRecord, BenefitType, Institution, Claim } from '@/types/database';
import { TrendingUp, Search } from 'lucide-react';

interface MatchDetail extends Match {
  benefit_records: BenefitRecord;
  benefit_types: BenefitType;
  institutions: Institution;
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [existingClaim, setExistingClaim] = useState<Claim | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadMatch();
  }, [id]);

  const loadMatch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('matches')
      .select(`*, benefit_records (*), benefit_types (*), institutions (*)`)
      .eq('id', id)
      .maybeSingle();
    setMatch(data as MatchDetail | null);

    if (data) {
      const { data: claim } = await supabase
        .from('claims')
        .select('*')
        .eq('match_id', data.id)
        .maybeSingle();
      setExistingClaim(claim as Claim | null);
    }
    setLoading(false);
  };

  const handleStartClaim = async () => {
    if (!match || !profile) return;
    setCreating(true);

    const claimRef = generateClaimReference();

    const { data: claim, error } = await supabase
      .from('claims')
      .insert({
        claim_reference: claimRef,
        match_id: match.id,
        beneficiary_profile_id: match.beneficiary_profile_id,
        benefit_record_id: match.benefit_record_id,
        institution_id: match.institution_id,
        benefit_type_id: match.benefit_records.benefit_type_id,
        status: 'DRAFT',
        submitted_by: profile.user_id,
      })
      .select('*')
      .single();

    if (claim && !error) {
      await supabase.from('claim_status_history').insert({
        claim_id: claim.id,
        previous_status: null,
        new_status: 'DRAFT',
        actor_id: profile.user_id,
        actor_type: 'BENEFICIARY',
        reason: 'Claim created by beneficiary',
      });

      await supabase.from('audit_logs').insert({
        actor_id: profile.user_id,
        actor_email: profile.email,
        actor_role: profile.role,
        action: 'CLAIM_CREATED',
        resource_type: 'claims',
        resource_id: claim.id,
        institution_id: match.institution_id,
        reason: `Claim created for ${match.benefit_types.name}`,
      });

      router.push(`/dashboard/beneficiary/claims/${claim.id}`);
    }
    setCreating(false);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Match Details">
        <LoadingState message="Loading match details..." />
      </DashboardLayout>
    );
  }

  if (!match) {
    return (
      <DashboardLayout navItems={navItems} title="Match Details">
        <EmptyState title="Match not found" description="This match may have been removed." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Match Details">
      <div className="space-y-6">
        <Link href="/dashboard/beneficiary/matches" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to matches
        </Link>

        {/* Match summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{match.institutions.name}</span>
                </div>
                <h2 className="font-display text-2xl font-semibold tracking-tight">{match.benefit_types.name}</h2>
                <p className="mt-2 text-lg font-medium text-primary">
                  {formatCurrencyRange(match.benefit_records.estimated_value_min, match.benefit_records.estimated_value_max)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <MatchClassificationBadge classification={match.classification} />
                  <ClaimStatusBadge status={match.status} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Match Confidence</p>
                <p className="font-display text-4xl font-bold text-foreground">{Math.round(match.score * 100)}%</p>
              </div>
            </div>
            <div className="mt-4">
              <ConfidenceIndicator score={match.score} classification={match.classification} />
            </div>
          </CardContent>
        </Card>

        {/* Important disclaimer */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              This record appears to match your information and may represent a benefit you are entitled to claim.
              The participating institution must verify entitlement. OwaFind does not guarantee that this benefit belongs to you.
            </p>
          </div>
        </div>

        {/* Match explanation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Why This Match Was Identified</CardTitle>
            <CardDescription>The matching engine compared your information against the benefit record using weighted signals.</CardDescription>
          </CardHeader>
          <CardContent>
            <MatchSignals signals={match.signals as unknown as Array<{ field: string; result: string; weight: number; detail: string }>} />
          </CardContent>
        </Card>

        {/* Benefit record details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Benefit Record Details</CardTitle>
            <CardDescription>Information about the benefit record held by the institution.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Reference Number</dt>
                <dd className="text-sm text-foreground mt-0.5">{match.benefit_records.reference_number}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Benefit Type</dt>
                <dd className="text-sm text-foreground mt-0.5">{match.benefit_types.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Institution</dt>
                <dd className="text-sm text-foreground mt-0.5">{match.institutions.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Estimated Value</dt>
                <dd className="text-sm text-foreground mt-0.5">{formatCurrencyRange(match.benefit_records.estimated_value_min, match.benefit_records.estimated_value_max)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Status</dt>
                <dd className="text-sm text-foreground mt-0.5 capitalize">{match.benefit_records.status.toLowerCase()}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Record Created</dt>
                <dd className="text-sm text-foreground mt-0.5">{formatDate(match.benefit_records.created_at)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Action */}
        <Card>
          <CardContent className="pt-6">
            {existingClaim ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Claim already started</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Reference: {existingClaim.claim_reference}</p>
                </div>
                <Link href={`/dashboard/beneficiary/claims/${existingClaim.id}`}>
                  <Button>View Claim <ArrowLeft className="ml-1 h-4 w-4 rotate-180" /></Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <h3 className="font-semibold text-foreground">Want to claim this benefit?</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-md">
                  Start a claim to begin the process. You will need to upload supporting evidence documents. The institution will review your claim and determine entitlement.
                </p>
                <Button onClick={handleStartClaim} size="lg" className="mt-4" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start Claim'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
