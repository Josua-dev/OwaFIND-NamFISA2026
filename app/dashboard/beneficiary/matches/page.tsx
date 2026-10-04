'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState, EmptyState } from '@/components/shared/states';
import { MatchClassificationBadge, ClaimStatusBadge } from '@/components/shared/status-badges';
import { ConfidenceIndicator } from '@/components/shared/match-signals';
import { supabase } from '@/lib/db/supabase-client';
import { formatCurrencyRange } from '@/lib/utils/format';
import { Search, FileText, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';
import type { Match, BenefitRecord, BenefitType, Institution } from '@/types/database';

interface MatchWithDetails extends Match {
  benefit_records: BenefitRecord;
  benefit_types: BenefitType;
  institutions: Institution;
}

export default function MatchesPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);

  useEffect(() => {
    if (!profile) return;
    loadMatches();
  }, [profile]);

  const loadMatches = async () => {
    if (!profile) return;
    const { data: bpData } = await supabase
      .from('beneficiary_profiles')
      .select('id')
      .eq('user_id', profile.user_id)
      .maybeSingle();

    if (bpData) {
      const { data } = await supabase
        .from('matches')
        .select(`*, benefit_records (*), benefit_types (*), institutions (*)`)
        .eq('beneficiary_profile_id', bpData.id)
        .order('score', { ascending: false });
      setMatches((data ?? []) as unknown as MatchWithDetails[]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="My Matches">
        <LoadingState message="Loading matches..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="My Matches">
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Potential Benefits</h2>
          <p className="mt-1 text-sm text-muted-foreground">All matches found across participating institutions, sorted by confidence.</p>
        </div>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                title="No matches found yet"
                description="Run a benefit discovery search to find potential benefits."
                action={<Link href="/discover"><Button>Find My Benefits</Button></Link>}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <Link key={match.id} href={`/dashboard/beneficiary/matches/${match.id}`}>
                <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">{match.institutions.name}</p>
                        <h3 className="font-semibold text-foreground mt-0.5">{match.benefit_types.name}</h3>
                        <p className="mt-1 text-sm text-primary font-medium">
                          {formatCurrencyRange(match.benefit_records.estimated_value_min, match.benefit_records.estimated_value_max)}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <MatchClassificationBadge classification={match.classification} />
                          <ClaimStatusBadge status={match.status} />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 w-32">
                        <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                        <p className="font-display text-3xl font-bold">{Math.round(match.score * 100)}%</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <ConfidenceIndicator score={match.score} classification={match.classification} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
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
