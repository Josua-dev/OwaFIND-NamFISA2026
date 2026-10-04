'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState, EmptyState } from '@/components/shared/states';
import { ClaimStatusBadge } from '@/components/shared/status-badges';
import { supabase } from '@/lib/db/supabase-client';
import { formatDate } from '@/lib/utils/format';
import { Search, FileText, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';
import type { Claim, Institution, BenefitType } from '@/types/database';

interface ClaimWithDetails extends Claim {
  institutions: Institution;
  benefit_types: BenefitType;
}

export default function ClaimsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ClaimWithDetails[]>([]);

  useEffect(() => {
    if (!profile) return;
    loadClaims();
  }, [profile]);

  const loadClaims = async () => {
    if (!profile) return;
    const { data: bpData } = await supabase
      .from('beneficiary_profiles')
      .select('id')
      .eq('user_id', profile.user_id)
      .maybeSingle();

    if (bpData) {
      const { data } = await supabase
        .from('claims')
        .select(`*, institutions (*), benefit_types (*)`)
        .eq('beneficiary_profile_id', bpData.id)
        .order('created_at', { ascending: false });
      setClaims((data ?? []) as unknown as ClaimWithDetails[]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="My Claims">
        <LoadingState message="Loading claims..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="My Claims">
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">My Claims</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track the status of claims you have submitted.</p>
        </div>

        {claims.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                title="No claims yet"
                description="Start a claim from a potential match to begin the claims process."
                action={<Link href="/dashboard/beneficiary/matches"><button className="text-sm font-medium text-primary hover:underline">View Matches</button></Link>}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {claims.map((claim) => (
              <Link key={claim.id} href={`/dashboard/beneficiary/claims/${claim.id}`}>
                <Card className="hover:border-primary hover:shadow-sm transition-all cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{claim.claim_reference}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {claim.benefit_types.name} — {claim.institutions.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Submitted {formatDate(claim.created_at)}</p>
                      </div>
                      <ClaimStatusBadge status={claim.status} />
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
