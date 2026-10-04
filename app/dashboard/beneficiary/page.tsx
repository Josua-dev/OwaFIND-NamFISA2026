'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState, EmptyState } from '@/components/shared/states';
import { ClaimStatusBadge } from '@/components/shared/status-badges';
import { supabase } from '@/lib/db/supabase-client';
import { formatDate, formatCurrencyRange } from '@/lib/utils/format';
import Link from 'next/link';
import { Search, FileText, Bell, TrendingUp, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import type { BeneficiaryProfile, Match, Claim, Notification, BenefitRecord, BenefitType, Institution } from '@/types/database';

interface MatchWithDetails extends Match {
  benefit_records: BenefitRecord;
  benefit_types: BenefitType;
  institutions: Institution;
}

interface ClaimWithDetails extends Claim {
  institutions: Institution;
  benefit_types: BenefitType;
}

export default function BeneficiaryDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bp, setBp] = useState<BeneficiaryProfile | null>(null);
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [claims, setClaims] = useState<ClaimWithDetails[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

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
      const [matchesRes, claimsRes, notifRes] = await Promise.all([
        supabase
          .from('matches')
          .select(`
            *,
            benefit_records (*),
            benefit_types (*),
            institutions (*)
          `)
          .eq('beneficiary_profile_id', bpData.id)
          .order('score', { ascending: false }),
        supabase
          .from('claims')
          .select(`
            *,
            institutions (*),
            benefit_types (*)
          `)
          .eq('beneficiary_profile_id', bpData.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', profile.user_id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setMatches((matchesRes.data ?? []) as unknown as MatchWithDetails[]);
      setClaims((claimsRes.data ?? []) as unknown as ClaimWithDetails[]);
      setNotifications((notifRes.data ?? []) as Notification[]);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Dashboard">
        <LoadingState message="Loading your dashboard..." />
      </DashboardLayout>
    );
  }

  const pendingMatches = matches.filter((m) => m.status === 'PENDING');
  const highConfidenceMatches = matches.filter((m) => m.classification === 'GREEN');
  const activeClaims = claims.filter((c) => !['APPROVED', 'REJECTED', 'CLOSED'].includes(c.status));
  const unreadNotifications = notifications.filter((n) => !n.read);

  const needsVerification = !bp || bp.verification_status === 'PENDING';
  const needsConsent = bp && !bp.consent_given;

  return (
    <DashboardLayout navItems={navItems} title="Dashboard">
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Welcome, {profile?.full_name.split(' ')[0]}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's an overview of your benefit discovery journey.
          </p>
        </div>

        {/* Action prompts */}
        {needsVerification && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">Identity Verification Required</p>
                  <p className="text-sm text-amber-700">Complete identity verification to start discovering benefits.</p>
                </div>
              </div>
              <Link href="/verify">
                <Button size="sm">Verify Now</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {bp && needsConsent && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">Consent Required</p>
                  <p className="text-sm text-amber-700">Grant consent to allow benefit discovery across institutions.</p>
                </div>
              </div>
              <Link href="/consent">
                <Button size="sm">Grant Consent</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Potential Benefits</CardTitle>
              <Search className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold">{matches.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {highConfidenceMatches.length} high confidence
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Matches to Review</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold">{pendingMatches.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting your review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Claims</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold">{activeClaims.length}</p>
              <p className="text-xs text-muted-foreground mt-1">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Claim Updates</CardTitle>
              <Bell className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold">{unreadNotifications.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Unread notifications</p>
            </CardContent>
          </Card>
        </div>

        {/* Primary actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Find My Benefits</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Search participating institutions for potential benefits.</p>
                </div>
                <Link href="/discover">
                  <Button>Search <ArrowRight className="ml-1 h-4 w-4" /></Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">My Claims</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Track the status of your submitted claims.</p>
                </div>
                <Link href="/dashboard/beneficiary/claims">
                  <Button variant="outline">View Claims <ArrowRight className="ml-1 h-4 w-4" /></Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Potential Matches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Potential Benefits</CardTitle>
            <CardDescription>Matches found across participating institutions.</CardDescription>
          </CardHeader>
          <CardContent>
            {matches.length === 0 ? (
              <EmptyState
                title="No matches found yet"
                description="Complete your identity verification and run a benefit discovery search to find potential benefits."
                action={
                  <Link href="/discover">
                    <Button size="sm">Find My Benefits</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {matches.slice(0, 5).map((match) => (
                  <Link
                    key={match.id}
                    href={`/dashboard/beneficiary/matches/${match.id}`}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border p-4 hover:border-primary hover:shadow-sm transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{match.benefit_types.name}</p>
                        <ClaimStatusBadge status={match.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{match.institutions.name}</p>
                      <p className="text-sm text-primary mt-1">
                        {formatCurrencyRange(match.benefit_records.estimated_value_min, match.benefit_records.estimated_value_max)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-display text-2xl font-bold text-foreground">
                        {Math.round(match.score * 100)}%
                      </p>
                      <p className="text-xs text-muted-foreground">match confidence</p>
                    </div>
                  </Link>
                ))}
                {matches.length > 5 && (
                  <Link href="/dashboard/beneficiary/matches" className="block text-center text-sm font-medium text-primary hover:underline pt-2">
                    View all {matches.length} matches
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Claims */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Claims</CardTitle>
            <CardDescription>Claims you have submitted that are being processed.</CardDescription>
          </CardHeader>
          <CardContent>
            {activeClaims.length === 0 ? (
              <EmptyState title="No active claims" description="Start a claim from a potential match to begin the claims process." />
            ) : (
              <div className="space-y-3">
                {activeClaims.map((claim) => (
                  <Link
                    key={claim.id}
                    href={`/dashboard/beneficiary/claims/${claim.id}`}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border p-4 hover:border-primary hover:shadow-sm transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{claim.claim_reference}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {claim.benefit_types.name} — {claim.institutions.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Submitted {formatDate(claim.created_at)}</p>
                    </div>
                    <ClaimStatusBadge status={claim.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Updates</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <EmptyState title="No updates yet" />
            ) : (
              <div className="space-y-2">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`flex items-start gap-3 rounded-md p-3 ${notif.read ? 'bg-muted/30' : 'bg-primary/5 border border-primary/10'}`}>
                    {!notif.read && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{notif.title}</p>
                      <p className="text-sm text-muted-foreground">{notif.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {formatDate(notif.created_at)}
                    </span>
                  </div>
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
  { href: '/dashboard/beneficiary', label: 'Dashboard', icon: TrendingUp },
  { href: '/discover', label: 'Find Benefits', icon: Search },
  { href: '/dashboard/beneficiary/matches', label: 'My Matches', icon: Search },
  { href: '/dashboard/beneficiary/claims', label: 'My Claims', icon: FileText },
  { href: '/verify', label: 'Identity Verification', icon: AlertCircle },
];
