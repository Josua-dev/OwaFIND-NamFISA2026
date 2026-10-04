'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState, EmptyState } from '@/components/shared/states';
import { supabase } from '@/lib/db/supabase-client';
import { formatDateTime } from '@/lib/utils/format';
import { Search, FileText, TrendingUp, AlertCircle, Bell, CheckCircle2, Clock, Building2, ShieldCheck, BarChart3 } from 'lucide-react';
import type { Notification } from '@/types/database';

const navItemsByRole: Record<string, { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  BENEFICIARY: [
    { href: '/dashboard/beneficiary', label: 'Dashboard', icon: TrendingUp },
    { href: '/discover', label: 'Find Benefits', icon: Search },
    { href: '/dashboard/beneficiary/matches', label: 'My Matches', icon: Search },
    { href: '/dashboard/beneficiary/claims', label: 'My Claims', icon: FileText },
    { href: '/verify', label: 'Identity Verification', icon: AlertCircle },
  ],
  INSTITUTION_USER: [
    { href: '/dashboard/institution', label: 'Dashboard', icon: Building2 },
    { href: '/dashboard/institution/claims', label: 'Claims', icon: FileText },
    { href: '/dashboard/institution/matches', label: 'Matches', icon: Search },
    { href: '/dashboard/institution/audit', label: 'Audit Log', icon: ShieldCheck },
  ],
  INSTITUTION_ADMIN: [
    { href: '/dashboard/institution', label: 'Dashboard', icon: Building2 },
    { href: '/dashboard/institution/claims', label: 'Claims', icon: FileText },
    { href: '/dashboard/institution/matches', label: 'Matches', icon: Search },
    { href: '/dashboard/institution/audit', label: 'Audit Log', icon: ShieldCheck },
  ],
  REGULATOR: [
    { href: '/dashboard/regulator', label: 'Dashboard', icon: BarChart3 },
    { href: '/dashboard/regulator/institutions', label: 'Institutions', icon: Building2 },
  ],
  SUPER_ADMIN: [
    { href: '/dashboard/admin', label: 'Dashboard', icon: ShieldCheck },
  ],
};

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!profile) return;
    loadNotifications();
  }, [profile]);

  const loadNotifications = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.user_id)
      .order('created_at', { ascending: false });
    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  };

  const handleMarkAllRead = async () => {
    if (!profile) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.user_id).eq('read', false);
    await loadNotifications();
  };

  const navItems = navItemsByRole[profile?.role ?? 'BENEFICIARY'] ?? navItemsByRole.BENEFICIARY;

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Notifications">
        <LoadingState message="Loading notifications..." />
      </DashboardLayout>
    );
  }

  const unread = notifications.filter((n) => !n.read);

  return (
    <DashboardLayout navItems={navItems} title="Notifications">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Notifications</h2>
            <p className="mt-1 text-sm text-muted-foreground">{unread.length} unread notification{unread.length !== 1 ? 's' : ''}</p>
          </div>
          {unread.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark all as read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState title="No notifications" description="You'll see updates about your claims and verification here." />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <Card key={notif.id} className={notif.read ? '' : 'border-primary/20 bg-primary/5'}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    {!notif.read && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{notif.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        <Clock className="inline h-3 w-3 mr-1" />{formatDateTime(notif.created_at)}
                      </p>
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
