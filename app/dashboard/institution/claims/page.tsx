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
import { Building2, FileText, Search, ShieldCheck } from 'lucide-react';
import type { Claim, Institution, BenefitType, BeneficiaryProfile } from '@/types/database';

interface ClaimWithDetails extends Claim {
  institutions: Institution;
  benefit_types: BenefitType;
  beneficiary_profiles: BeneficiaryProfile;
}

export default function InstitutionClaimsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ClaimWithDetails[]>([]);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    if (!profile) return;
    loadClaims();
  }, [profile]);

  const loadClaims = async () => {
    if (!profile?.institution_id) return;
    const { data } = await supabase
      .from('claims')
      .select(`*, institutions (*), benefit_types (*), beneficiary_profiles (*)`)
      .eq('institution_id', profile.institution_id)
      .order('created_at', { ascending: false });
    setClaims((data ?? []) as unknown as ClaimWithDetails[]);
    setLoading(false);
  };

  const filtered = filter === 'ALL' ? claims : claims.filter((c) => c.status === filter);

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Claims">
        <LoadingState message="Loading claims..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Claims">
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Claims</h2>
          <p className="mt-1 text-sm text-muted-foreground">All claims received by your institution.</p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {['ALL', 'SUBMITTED', 'INSTITUTION_REVIEW', 'RESUBMITTED', 'MORE_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === status ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {status === 'ALL' ? 'All Claims' : status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState title="No claims found" description="No claims match the current filter." />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((claim) => (
              <Link key={claim.id} href={`/dashboard/institution/claims/${claim.id}`}>
                <Card className="hover:border-primary hover:shadow-sm transition-all cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{claim.claim_reference}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {claim.beneficiary_profiles.full_name} — {claim.benefit_types.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(claim.created_at)}</p>
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
  { href: '/dashboard/institution', label: 'Dashboard', icon: Building2 },
  { href: '/dashboard/institution/claims', label: 'Claims', icon: FileText },
  { href: '/dashboard/institution/matches', label: 'Matches', icon: Search },
  { href: '/dashboard/institution/audit', label: 'Audit Log', icon: ShieldCheck },
];
