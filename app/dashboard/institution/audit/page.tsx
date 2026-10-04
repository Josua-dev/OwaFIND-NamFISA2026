'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState, EmptyState } from '@/components/shared/states';
import { supabase } from '@/lib/db/supabase-client';
import { formatDateTime } from '@/lib/utils/format';
import { Building2, FileText, Search, ShieldCheck } from 'lucide-react';
import type { AuditLog } from '@/types/database';

export default function InstitutionAuditPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (!profile) return;
    loadLogs();
  }, [profile]);

  const loadLogs = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('actor_id', profile.user_id)
      .order('created_at', { ascending: false })
      .limit(50);
    setLogs((data ?? []) as AuditLog[]);
    setLoading(false);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Audit Log">
        <LoadingState message="Loading audit log..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Audit Log">
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Audit Log</h2>
          <p className="mt-1 text-sm text-muted-foreground">A record of sensitive actions performed by you.</p>
        </div>

        {logs.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState title="No audit entries yet" description="Actions you perform will be recorded here." />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{log.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</p>
                      {log.reason && <p className="text-sm text-muted-foreground mt-0.5">{log.reason}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.resource_type} {log.resource_id && `— ${log.resource_id.substring(0, 8)}`}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground flex-shrink-0">{formatDateTime(log.created_at)}</p>
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
