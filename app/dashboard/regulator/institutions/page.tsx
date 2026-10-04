'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState, EmptyState } from '@/components/shared/states';
import { supabase } from '@/lib/db/supabase-client';
import { BarChart3, Building2 } from 'lucide-react';
import type { Institution } from '@/types/database';

export default function RegulatorInstitutionsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState<(Institution & { claims: number; matches: number; records: number })[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: instData } = await supabase.from('institutions').select('*');
    const insts = (instData ?? []) as Institution[];

    const result = [];
    for (const inst of insts) {
      const [claimsCount, matchesCount, recordsCount] = await Promise.all([
        supabase.from('claims').select('id', { count: 'exact', head: true }).eq('institution_id', inst.id),
        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('institution_id', inst.id),
        supabase.from('benefit_records').select('id', { count: 'exact', head: true }).eq('institution_id', inst.id),
      ]);
      result.push({
        ...inst,
        claims: claimsCount.count ?? 0,
        matches: matchesCount.count ?? 0,
        records: recordsCount.count ?? 0,
      });
    }
    setInstitutions(result);
    setLoading(false);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Institutions">
        <LoadingState message="Loading institutions..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Institutions">
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Participating Institutions</h2>
          <p className="mt-1 text-sm text-muted-foreground">Aggregated activity across all institutions. No beneficiary-level data is shown.</p>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium text-blue-800">AGGREGATED DATA — No beneficiary-level PII is exposed in the regulator view.</p>
        </div>

        {institutions.length === 0 ? (
          <Card><CardContent className="py-12"><EmptyState title="No institutions found" /></CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {institutions.map((inst) => (
              <Card key={inst.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                      {inst.short_name.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{inst.name}</h3>
                      <p className="text-xs text-muted-foreground">{inst.type.replace(/_/g, ' ').toLowerCase()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-secondary/30 p-2">
                      <p className="font-display text-lg font-bold">{inst.records}</p>
                      <p className="text-xs text-muted-foreground">Records</p>
                    </div>
                    <div className="rounded-md bg-secondary/30 p-2">
                      <p className="font-display text-lg font-bold">{inst.matches}</p>
                      <p className="text-xs text-muted-foreground">Matches</p>
                    </div>
                    <div className="rounded-md bg-secondary/30 p-2">
                      <p className="font-display text-lg font-bold">{inst.claims}</p>
                      <p className="text-xs text-muted-foreground">Claims</p>
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
  { href: '/dashboard/regulator', label: 'Dashboard', icon: BarChart3 },
  { href: '/dashboard/regulator/institutions', label: 'Institutions', icon: Building2 },
];
