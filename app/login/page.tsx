'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DemoBanner } from '@/components/shared/demo-banner';
import { Building2, ShieldCheck, User, BarChart3, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const demoAccounts = [
  { email: 'beneficiary@demo.owafind.local', label: 'Beneficiary', icon: User, desc: 'Discover and claim benefits', role: 'BENEFICIARY' },
  { email: 'institution@demo.owafind.local', label: 'Institution', icon: Building2, desc: 'Review and process claims', role: 'INSTITUTION_USER' },
  { email: 'regulator@demo.owafind.local', label: 'Regulator', icon: BarChart3, desc: 'Ecosystem oversight', role: 'REGULATOR' },
  { email: 'admin@demo.owafind.local', label: 'Admin', icon: ShieldCheck, desc: 'System administration', role: 'SUPER_ADMIN' },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setLoading(true);
    setEmail(demoEmail);
    setPassword('Demo1234!');
    const { error } = await signIn(demoEmail, 'Demo1234!');
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DemoBanner />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 justify-center mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-lg">O</div>
            <span className="font-display text-xl font-semibold">OwaFind</span>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
                </div>
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                    Quick Demo Access
                  </span>
                </div>
                <p className="mt-4 text-xs text-center text-muted-foreground mb-3">
                  Select a role to enter the demo environment with pre-configured accounts.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.email}
                      onClick={() => handleDemoLogin(account.email)}
                      disabled={loading}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary hover:shadow-sm disabled:opacity-50',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <account.icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">{account.label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{account.desc}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Password for all demo accounts: <span className="font-mono font-medium">Demo1234!</span>
                </p>
              </div>

              <div className="mt-6 text-center">
                <span className="text-sm text-muted-foreground">New to OwaFind? </span>
                <Link href="/register" className="text-sm font-medium text-primary hover:underline">Create an account</Link>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
