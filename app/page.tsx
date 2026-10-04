import Link from 'next/link';
import { ShieldCheck, Search, FileText, Building2, Lock, ChevronRight, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DemoBanner } from '@/components/shared/demo-banner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />

      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container-owafind flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-lg">O</div>
            <span className="font-display text-xl font-semibold tracking-tight">OwaFind</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
            <Link href="/#benefits" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Benefits</Link>
            <Link href="/#institutions" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">For Institutions</Link>
            <Link href="/#trust" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Trust & Security</Link>
            <Link href="/#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Find My Benefits <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-pattern" />
        <div className="container-owafind relative py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-6 bg-primary/5 border-primary/20 text-primary">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Financial Entitlement Discovery Platform
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-balance">
              Find What May Belong to You.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground text-balance max-w-2xl mx-auto">
              OwaFind helps people discover potential pension, insurance and other financial benefits that may be waiting to be claimed. We connect you with the institutions that hold them.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto">Find My Benefits <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
              <Link href="/#how-it-works">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">How OwaFind Works</Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              The participating institution remains responsible for determining entitlement and making payment.
            </p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-border bg-secondary/30">
        <div className="container-owafind py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Participating Institutions', value: '5' },
              { label: 'Benefit Records Indexed', value: '20+' },
              { label: 'Benefit Types Covered', value: '6' },
              { label: 'Demo Environment', value: 'Live' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-2xl md:text-3xl font-semibold text-primary">{stat.value}</p>
                <p className="mt-1 text-xs md:text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 border-b border-border">
        <div className="container-owafind">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">How OwaFind Works</h2>
            <p className="mt-3 text-muted-foreground">A structured, transparent process that puts you in control.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: 'Verify Your Identity', desc: 'Complete a secure identity verification so we can search accurately on your behalf.' },
              { icon: Search, title: 'Discover Benefits', desc: 'Our matching engine searches participating institutions for potential benefits linked to you.' },
              { icon: FileText, title: 'Start a Claim', desc: 'If a potential match is found, you can start a claim and upload supporting evidence.' },
              { icon: Building2, title: 'Institution Reviews', desc: 'The institution that holds the benefit reviews your claim and determines entitlement.' },
            ].map((step, idx) => (
              <Card key={step.title} className="relative">
                <CardHeader>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="absolute top-4 right-4 text-3xl font-bold text-border tabular-nums">{idx + 1}</div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits We Help Identify */}
      <section id="benefits" className="py-20 border-b border-border bg-secondary/30">
        <div className="container-owafind">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Benefits We Help Identify</h2>
            <p className="mt-3 text-muted-foreground">OwaFind can search for various categories of financial entitlements.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Pension Benefits', desc: 'Retirement pension benefits from pension funds.' },
              { title: 'Retirement Fund Benefits', desc: 'Benefits from retirement savings and provident funds.' },
              { title: 'Death Benefits', desc: 'Benefits payable to beneficiaries upon the death of a member.' },
              { title: 'Life Insurance Benefits', desc: 'Life insurance policy payouts and related benefits.' },
              { title: 'Funeral Benefits', desc: 'Funeral cover and related financial benefits.' },
              { title: 'Employee Benefits', desc: 'General employee benefits including provident funds.' },
            ].map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground">{benefit.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verification */}
      <section className="py-20 border-b border-border">
        <div className="container-owafind">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">How Verification Works</h2>
              <p className="mt-4 text-muted-foreground">
                Before benefit discovery, we verify your identity using a structured process. This ensures that searches are accurate and that institutions can trust the claims they receive through OwaFind.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  'You provide your identity details through a secure form.',
                  'Our demo identity verification service validates the information provided.',
                  'The verification produces a status: Verified, Needs Review, or Unable to Verify.',
                  'Only after verification and your explicit consent do we search for benefits.',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">{idx + 1}</div>
                    <p className="text-sm text-foreground">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-medium text-amber-800">
                  DEMO IDENTITY VERIFICATION SERVICE — This does not connect to any real government identity system. All data is synthetic.
                </p>
              </div>
            </div>
            <Card className="bg-secondary/30">
              <CardHeader>
                <CardTitle className="text-lg">What We Search With</CardTitle>
                <CardDescription>The following information helps us find potential matches.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {['National ID / Passport', 'Full name and previous names', 'Date of birth', 'Employer and employee number', 'Phone number', 'Email address'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
                <Separator className="my-2" />
                <p className="text-xs text-muted-foreground">
                  You control what information is used. You can revoke consent at any time.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Institutions */}
      <section id="institutions" className="py-20 border-b border-border bg-secondary/30">
        <div className="container-owafind">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">How Institutions Participate</h2>
            <p className="mt-3 text-muted-foreground">Institutions use OwaFind to receive verified claims and review them through a structured workflow.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { title: 'Receive Verified Claims', desc: 'Claims submitted through OwaFind come with identity verification and match confidence scoring.' },
              { title: 'Review with Context', desc: 'Each claim includes match signals, evidence documents, and a complete claim history timeline.' },
              { title: 'Maintain Authority', desc: 'The institution remains the sole authority on entitlement. OwaFind does not approve or pay claims.' },
            ].map((item) => (
              <Card key={item.title}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section id="trust" className="py-20 border-b border-border">
        <div className="container-owafind">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Trust & Security</h2>
            <p className="mt-3 text-muted-foreground">Built with security principles at every layer.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Lock, title: 'Authenticated Access', desc: 'Every user is authenticated. Role-based access controls ensure users only see what they should.' },
              { icon: ShieldCheck, title: 'Consent-First', desc: 'No benefit search happens without your explicit, documented consent.' },
              { icon: FileText, title: 'Full Audit Trail', desc: 'Sensitive actions — logins, claims, decisions — are all recorded in an audit log.' },
              { icon: Building2, title: 'Institution Isolation', desc: 'Institution users can only access their own institution\'s data. Cross-institution access is prevented.' },
              { icon: Search, title: 'Transparent Matching', desc: 'Every match comes with a full explanation of which signals contributed to the score.' },
              { icon: CheckCircle2, title: 'Controlled Workflows', desc: 'Claims follow a strict state machine. Status transitions are validated server-side.' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 border-b border-border bg-secondary/30">
        <div className="container-owafind max-w-3xl">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="mt-8">
            <AccordionItem value="q1">
              <AccordionTrigger className="text-left">Does OwaFind hold my money?</AccordionTrigger>
              <AccordionContent>No. OwaFind does not hold customer funds and does not act as the custodian of benefits. The underlying institution remains responsible for determining entitlement and making payment.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger className="text-left">Is this a guarantee that I have a benefit?</AccordionTrigger>
              <AccordionContent>No. OwaFind identifies potential matches. A match means a record appears to correspond to your information. The institution must verify entitlement before any payment is made.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger className="text-left">What information do you use to search?</AccordionTrigger>
              <AccordionContent>We use your identity details — national ID, name, date of birth, employer, phone, and email — to search for potential matches across participating institutions. You must give explicit consent before any search occurs.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger className="text-left">Can I revoke my consent?</AccordionTrigger>
              <AccordionContent>Yes. You can revoke your consent at any time. Revoking consent means future benefit searches will not be performed until you grant consent again.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger className="text-left">Is this connected to the Namibian government?</AccordionTrigger>
              <AccordionContent>No. This is a demo environment using synthetic data. The identity verification is a demo service. This is not connected to any real government identity system or real financial institution.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-b border-border">
        <div className="container-owafind text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Ready to Find Your Benefits?</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Start your benefit discovery journey today. It only takes a few minutes.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login">
              <Button size="lg">Find My Benefits <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">Sign In as Institution</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-secondary/30">
        <div className="container-owafind">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">O</div>
                <span className="font-display text-lg font-semibold">OwaFind</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Financial entitlement discovery and claims orchestration for Namibia.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Product</h4>
              <ul className="mt-3 space-y-2">
                <li><Link href="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">How It Works</Link></li>
                <li><Link href="/#benefits" className="text-sm text-muted-foreground hover:text-foreground">Benefits</Link></li>
                <li><Link href="/#trust" className="text-sm text-muted-foreground hover:text-foreground">Trust & Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Access</h4>
              <ul className="mt-3 space-y-2">
                <li><Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Beneficiary Sign In</Link></li>
                <li><Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Institution Portal</Link></li>
                <li><Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Regulator Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Contact</h4>
              <ul className="mt-3 space-y-2">
                <li className="text-sm text-muted-foreground">support@owafind.demo</li>
                <li className="text-sm text-muted-foreground">+264 61 000 0000</li>
              </ul>
            </div>
          </div>
          <Separator className="my-8" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} OwaFind. Demo Environment. Synthetic Data. Not Real Financial Information.
            </p>
            <p className="text-xs text-muted-foreground">
              The institution remains responsible for determining entitlement and payment.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
