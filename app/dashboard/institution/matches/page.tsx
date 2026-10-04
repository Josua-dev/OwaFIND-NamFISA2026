'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState, EmptyState } from '@/components/shared/states';
import { MatchClassificationBadge, ClaimStatusBadge } from '@/components/shared/status-badges';
import { ConfidenceIndicator } from '@/components/shared/match-signals';
import { supabase } from '@/lib/db/supabase-client';
import { formatCurrencyRange, formatDate } from '@/lib/utils/format';
import { Building2, FileText, Search, ShieldCheck } from 'lucide-react';
import type { Match, BenefitRecord, BenefitType, BeneficiaryProfile } from '@/types/database';

interface MatchWithDetails extends Match {
  benefit_records: BenefitRecord;
  benefit_types: BenefitType;
  beneficiary_profiles: BeneficiaryProfile;
}

export default function InstitutionMatchesPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);

  useEffect(() => {
    if (!profile) return;
    loadMatches();
  }, [profile]);

  const loadMatches = async () => {
    if (!profile?.institution_id) return;
    const { data } = await supabase
      .from('matches')
      .select(`*, benefit_records (*), benefit_types (*), beneficiary_profiles (*)`)
      .eq('institution_id', profile.institution_id)
      .order('score', { ascending: false });
    setMatches((data ?? []) as unknown as MatchWithDetails[]);
    setLoading(false);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Matches">
        <LoadingState message="Loading matches..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Matches">
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Potential Matches</h2>
          <p className="mt-1 text-sm text-muted-foreground">Beneficiary profiles matched against your institution's benefit records.</p>
        </div>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState title="No matches found" description="No beneficiary profiles have been matched against your records yet." />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <Card key={match.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{match.beneficiary_profiles.full_name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{match.benefit_types.name}</p>
                      <p className="text-sm text-primary mt-1">{formatCurrencyRange(match.benefit_records.estimated_value_min, match.benefit_records.estimated_value_max)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Ref: {match.benefit_records.reference_number}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <MatchClassificationBadge classification={match.classification} />
                        <ClaimStatusBadge status={match.status} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 w-32">
                      <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                      <p className="font-display text-3xl font-bold">{Math.round(match.score * 100)}%</p>
                      <div className="mt-2">
                        <ConfidenceIndicator score={match.score} classification={match.classification} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

const navItems = [
  { href: '/dashboard/institution', label: 'Dashboard', icon: Building2 },
  { href: '/dashboard/institution/claims', label: 'Claims', icon: FileText },
  { href: '/dashboard/institution/matches', label: 'Matches', icon: Search },
  { href: '/dashboard/institution/audit', label: 'Audit Log', icon: ShieldCheck },
];
