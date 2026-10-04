'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoadingState, EmptyState } from '@/components/shared/states';
import { supabase } from '@/lib/db/supabase-client';
import { formatDateTime } from '@/lib/utils/format';
import { ShieldCheck, Building2, Users, FileText, BarChart3, Activity } from 'lucide-react';
import type { Profile, Institution, AuditLog, BenefitType } from '@/types/database';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [benefitTypes, setBenefitTypes] = useState<BenefitType[]>([]);
  const [counts, setCounts] = useState({ users: 0, institutions: 0, claims: 0, matches: 0, records: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [pRes, iRes, aRes, btRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('institutions').select('*').order('name'),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('benefit_types').select('*').order('name'),
    ]);

    setProfiles((pRes.data ?? []) as Profile[]);
    setInstitutions((iRes.data ?? []) as Institution[]);
    setAuditLogs((aRes.data ?? []) as AuditLog[]);
    setBenefitTypes((btRes.data ?? []) as BenefitType[]);

    const [claimsCount, matchesCount, recordsCount] = await Promise.all([
      supabase.from('claims').select('id', { count: 'exact', head: true }),
      supabase.from('matches').select('id', { count: 'exact', head: true }),
      supabase.from('benefit_records').select('id', { count: 'exact', head: true }),
    ]);

    setCounts({
      users: (pRes.data ?? []).length,
      institutions: (iRes.data ?? []).length,
      claims: claimsCount.count ?? 0,
      matches: matchesCount.count ?? 0,
      records: recordsCount.count ?? 0,
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Admin Dashboard">
        <LoadingState message="Loading system data..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Admin Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">System Administration</h2>
          <p className="mt-1 text-sm text-muted-foreground">Overview of users, institutions, and system activity.</p>
        </div>

        {/* System KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Users', value: counts.users, icon: Users },
            { label: 'Institutions', value: counts.institutions, icon: Building2 },
            { label: 'Benefit Records', value: counts.records, icon: FileText },
            { label: 'Matches', value: counts.matches, icon: BarChart3 },
            { label: 'Claims', value: counts.claims, icon: Activity },
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

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="institutions">Institutions</TabsTrigger>
            <TabsTrigger value="benefit-types">Benefit Types</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>

          {/* Users */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Users</CardTitle>
                <CardDescription>All registered users and their roles.</CardDescription>
              </CardHeader>
              <CardContent>
                {profiles.length === 0 ? (
                  <EmptyState title="No users found" />
                ) : (
                  <div className="space-y-2">
                    {profiles.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                            {p.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.full_name}</p>
                            <p className="text-xs text-muted-foreground">{p.email}</p>
                          </div>
                        </div>
                        <span className="rounded-md bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                          {p.role.replace(/_/g, ' ').toLowerCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Institutions */}
          <TabsContent value="institutions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Institutions</CardTitle>
                <CardDescription>All participating institutions.</CardDescription>
              </CardHeader>
              <CardContent>
                {institutions.length === 0 ? (
                  <EmptyState title="No institutions found" />
                ) : (
                  <div className="space-y-2">
                    {institutions.map((inst) => (
                      <div key={inst.id} className="rounded-md border border-border p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-xs">
                              {inst.short_name.substring(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{inst.name}</p>
                              <p className="text-xs text-muted-foreground">{inst.type.replace(/_/g, ' ').toLowerCase()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {inst.contact_email} — {inst.address}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Benefit Types */}
          <TabsContent value="benefit-types">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Benefit Types</CardTitle>
                <CardDescription>Categories of financial benefits in the system.</CardDescription>
              </CardHeader>
              <CardContent>
                {benefitTypes.length === 0 ? (
                  <EmptyState title="No benefit types found" />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {benefitTypes.map((bt) => (
                      <div key={bt.id} className="rounded-md border border-border p-3">
                        <p className="text-sm font-medium text-foreground">{bt.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{bt.description}</p>
                        <span className="mt-2 inline-block rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{bt.category}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Audit Log</CardTitle>
                <CardDescription>Complete audit trail of sensitive actions across the system.</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <EmptyState title="No audit entries found" />
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {log.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                          </p>
                          {log.reason && <p className="text-sm text-muted-foreground mt-0.5">{log.reason}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.actor_email} — {log.actor_role.replace(/_/g, ' ').toLowerCase()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.resource_type} {log.resource_id && `— ${log.resource_id.substring(0, 8)}`}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground flex-shrink-0">{formatDateTime(log.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

const navItems = [
  { href: '/dashboard/admin', label: 'Dashboard', icon: ShieldCheck },
];
