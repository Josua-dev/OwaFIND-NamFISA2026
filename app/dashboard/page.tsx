'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { LoadingState } from '@/components/shared/states';
import { DemoBanner } from '@/components/shared/demo-banner';

export default function DashboardRedirect() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.push('/login');
      return;
    }
    switch (profile.role) {
      case 'BENEFICIARY':
        router.push('/dashboard/beneficiary');
        break;
      case 'INSTITUTION_USER':
      case 'INSTITUTION_ADMIN':
        router.push('/dashboard/institution');
        break;
      case 'REGULATOR':
        router.push('/dashboard/regulator');
        break;
      case 'SUPER_ADMIN':
        router.push('/dashboard/admin');
        break;
      default:
        router.push('/login');
    }
  }, [profile, loading, router]);

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <LoadingState message="Loading your dashboard..." />
    </div>
  );
}
