'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingState, EmptyState } from '@/components/shared/states';
import { supabase } from '@/lib/db/supabase-client';
import { BarChart3, Building2, ShieldCheck, TrendingUp, FileText, Users, Clock, CheckCircle2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const CHART_COLORS = ['hsl(199 89% 26%)', 'hsl(152 60% 38%)', 'hsl(38 92% 50%)', 'hsl(0 72% 51%)', 'hsl(215 28% 40%)', 'hsl(280 50% 50%)'];

export default function RegulatorDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBenefitRecords: 0,
    potentialMatches: 0,
    verifiedMatches: 0,
    openClaims: 0,
    resolvedClaims: 0,
    participatingInstitutions: 0,
  });
  const [benefitByType, setBenefitByType] = useState<{ name: string; count: number }[]>([]);
  const [claimsByStatus, setClaimsByStatus] = useState<{ name: string; count: number }[]>([]);
  const [institutionActivity, setInstitutionActivity] = useState<{ name: string; claims: number; matches: number }[]>([]);
  const [claimsOverTime, setClaimsOverTime] = useState<{ month: string; claims: number }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [brRes, matchesRes, claimsRes, instRes] = await Promise.all([
      supabase.from('benefit_records').select('id, benefit_type_id, status', { count: 'exact' }),
      supabase.from('matches').select('id, classification, status'),
      supabase.from('claims').select('id, status, institution_id, created_at'),
      supabase.from('institutions').select('id, name, short_name'),
    ]);

    const benefitRecords = brRes.data ?? [];
    const allMatches = matchesRes.data ?? [];
    const allClaims = claimsRes.data ?? [];
    const institutions = instRes.data ?? [];

    const verifiedMatches = allMatches.filter((m: any) => m.classification === 'GREEN').length;
    const openClaims = allClaims.filter((c: any) => !['APPROVED', 'REJECTED', 'CLOSED'].includes(c.status)).length;
    const resolvedClaims = allClaims.filter((c: any) => ['APPROVED', 'REJECTED', 'CLOSED'].includes(c.status)).length;

    setStats({
      totalBenefitRecords: benefitRecords.length,
      potentialMatches: allMatches.length,
      verifiedMatches,
      openClaims,
      resolvedClaims,
      participatingInstitutions: institutions.length,
    });

    // Benefit by type
    const { data: btData } = await supabase.from('benefit_types').select('id, name');
    const typeMap = new Map((btData ?? []).map((bt: any) => [bt.id, bt.name]));
    const typeCounts = new Map<string, number>();
    benefitRecords.forEach((br: any) => {
      const name = typeMap.get(br.benefit_type_id) ?? 'Unknown';
      typeCounts.set(name, (typeCounts.get(name) ?? 0) + 1);
    });
    setBenefitByType(Array.from(typeCounts.entries()).map(([name, count]) => ({ name, count })));

    // Claims by status
    const statusCounts = new Map<string, number>();
    allClaims.forEach((c: any) => {
      const label = c.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (ch: string) => ch.toUpperCase());
      statusCounts.set(label, (statusCounts.get(label) ?? 0) + 1);
    });
    setClaimsByStatus(Array.from(statusCounts.entries()).map(([name, count]) => ({ name, count })));

    // Institution activity
    const instMap = new Map(institutions.map((i: any) => [i.id, i.name]));
    const instActivity = new Map<string, { claims: number; matches: number }>();
    allClaims.forEach((c: any) => {
      const name = instMap.get(c.institution_id) ?? 'Unknown';
      if (!instActivity.has(name)) instActivity.set(name, { claims: 0, matches: 0 });
      instActivity.get(name)!.claims++;
    });
    allMatches.forEach((m: any) => {
      const name = instMap.get(m.institution_id) ?? 'Unknown';
      if (!instActivity.has(name)) instActivity.set(name, { claims: 0, matches: 0 });
      instActivity.get(name)!.matches++;
    });
    setInstitutionActivity(Array.from(instActivity.entries()).map(([name, data]) => ({ name: name.length > 20 ? name.substring(0, 20) + '...' : name, ...data })));

    // Claims over time (synthetic monthly data for demo)
    setClaimsOverTime([
      { month: 'May', claims: 3 },
      { month: 'Jun', claims: 5 },
      { month: 'Jul', claims: 7 },
      { month: 'Aug', claims: 4 },
      { month: 'Sep', claims: 6 },
      { month: 'Oct', claims: allClaims.length },
    ]);

    setLoading(false);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Regulator Dashboard">
        <LoadingState message="Loading ecosystem data..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Regulator Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Ecosystem Overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">Aggregated, anonymised ecosystem intelligence across all participating institutions.</p>
        </div>

        {/* Aggregated data notice */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium text-blue-800">
            AGGREGATED DATA — SYNTHETIC DEMONSTRATION DATASET — No beneficiary-level personal information is shown. All data is synthetic.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
          {[
            { label: 'Benefit Records', value: stats.totalBenefitRecords, icon: FileText },
            { label: 'Potential Matches', value: stats.potentialMatches, icon: TrendingUp },
            { label: 'Verified Matches', value: stats.verifiedMatches, icon: CheckCircle2 },
            { label: 'Open Claims', value: stats.openClaims, icon: FileText },
            { label: 'Resolved Claims', value: stats.resolvedClaims, icon: CheckCircle2 },
            { label: 'Institutions', value: stats.participatingInstitutions, icon: Building2 },
            { label: 'Avg Resolution', value: '8.2d', icon: Clock },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="h-3.5 w-3.5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Benefits by type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Benefits by Type</CardTitle>
              <CardDescription>Distribution of benefit records across categories.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={benefitByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 16% 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(199 89% 26%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Claims by status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Claims by Status</CardTitle>
              <CardDescription>Distribution of claims across workflow states.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={claimsByStatus}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry: any) => `${entry.name}: ${entry.count}`}
                    labelLine={false}
                  >
                    {claimsByStatus.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Claims over time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Claims Over Time</CardTitle>
              <CardDescription>Monthly claim submissions across the ecosystem.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={claimsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 16% 88%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
                  <Tooltip />
                  <Line type="monotone" dataKey="claims" stroke="hsl(199 89% 26%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Institution activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Institution Activity</CardTitle>
              <CardDescription>Claims and matches per participating institution.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={institutionActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 16% 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(215 16% 47%)" interval={0} angle={-15} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="matches" name="Matches" fill="hsl(199 89% 26%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="claims" name="Claims" fill="hsl(152 60% 38%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

const navItems = [
  { href: '/dashboard/regulator', label: 'Dashboard', icon: BarChart3 },
  { href: '/dashboard/regulator/institutions', label: 'Institutions', icon: Building2 },
];
