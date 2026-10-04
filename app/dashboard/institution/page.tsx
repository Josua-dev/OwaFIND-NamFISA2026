'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState, EmptyState } from '@/components/shared/states';
import { ClaimStatusBadge } from '@/components/shared/status-badges';
import { supabase } from '@/lib/db/supabase-client';
import { formatDate, formatCurrencyRange } from '@/lib/utils/format';
import { Building2, FileText, Search, BarChart3, ShieldCheck, Users, Clock, CheckCircle2, ArrowRight, Inbox } from 'lucide-react';
import type { Claim, Institution, BenefitType, BeneficiaryProfile, Match } from '@/types/database';

interface ClaimWithDetails extends Claim {
  institutions: Institution;
  benefit_types: BenefitType;
  beneficiary_profiles: BeneficiaryProfile;
}

export default function InstitutionDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ClaimWithDetails[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [pendingDocs, setPendingDocs] = useState(0);

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile || !profile.institution_id) return;
    setLoading(true);

    const [claimsRes, matchesRes] = await Promise.all([
      supabase
        .from('claims')
        .select(`*, institutions (*), benefit_types (*), beneficiary_profiles (*)`)
        .eq('institution_id', profile.institution_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('matches')
        .select('*')
        .eq('institution_id', profile.institution_id)
        .order('created_at', { ascending: false }),
    ]);

    setClaims((claimsRes.data ?? []) as unknown as ClaimWithDetails[]);
    setMatches((matchesRes.data ?? []) as Match[]);

    const { count } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .in('claim_id', (claimsRes.data ?? []).map((c: any) => c.id))
      .eq('verification_status', 'PENDING');

    setPendingDocs(count ?? 0);
    setLoading(false);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Institution Dashboard">
        <LoadingState message="Loading institution data..." />
      </DashboardLayout>
    );
  }

  const claimsReceived = claims.length;
  const claimsUnderReview = claims.filter((c) => ['IDENTITY_REVIEW', 'EVIDENCE_REVIEW', 'INSTITUTION_REVIEW', 'RESUBMITTED', 'MORE_INFORMATION_REQUIRED'].includes(c.status)).length;
  const resolvedClaims = claims.filter((c) => ['APPROVED', 'REJECTED', 'CLOSED'].includes(c.status)).length;
  const pendingMatches = matches.filter((m) => m.status === 'PENDING').length;

  const recentClaims = claims.slice(0, 5);

  return (
    <DashboardLayout navItems={navItems} title="Institution Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Welcome, {profile?.full_name.split(' ')[0]}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Institution portal for {profile?.institution_id ? 'your institution' : 'demo'}.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Potential Matches</CardTitle>
              <Search className="h-3.5 w-3.5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold">{pendingMatches}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Claims Received</CardTitle>
              <Inbox className="h-3.5 w-3.5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold">{claimsReceived}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Under Review</CardTitle>
              <Clock className="h-3.5 w-3.5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold">{claimsUnderReview}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Documents Pending</CardTitle>
              <FileText className="h-3.5 w-3.5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold">{pendingDocs}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Resolved Claims</CardTitle>
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold">{resolvedClaims}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Avg Resolution</CardTitle>
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold">8.2d</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Claims */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Claims</CardTitle>
                <CardDescription>Claims received by your institution.</CardDescription>
              </div>
              <Link href="/dashboard/institution/claims">
                <Button variant="outline" size="sm">View All <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentClaims.length === 0 ? (
              <EmptyState title="No claims received yet" description="Claims submitted by beneficiaries will appear here." />
            ) : (
              <div className="space-y-3">
                {recentClaims.map((claim) => (
                  <Link
                    key={claim.id}
                    href={`/dashboard/institution/claims/${claim.id}`}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border p-4 hover:border-primary hover:shadow-sm transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{claim.claim_reference}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {claim.beneficiary_profiles.full_name} — {claim.benefit_types.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(claim.created_at)}</p>
                    </div>
                    <ClaimStatusBadge status={claim.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
