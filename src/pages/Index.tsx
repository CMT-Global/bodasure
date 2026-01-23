import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Users, CreditCard, BarChart3, QrCode, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Index() {
  const { user, isLoading } = useAuth();

  // If user is logged in, redirect to dashboard
  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg font-bold text-primary-foreground">B</span>
            </div>
            <span className="text-xl font-semibold">
              Boda<span className="text-primary">Sure</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild className="glow-primary">
              <Link to="/signup">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute -right-40 bottom-0 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" />
        </div>

        <div className="container relative px-4">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Built for Counties, Designed For Efficiency
            </div>
            
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Digitizing Bodaboda{' '}
              <span className="gradient-text">Registration, Safety</span>
              {' '}& County Revenue
            </h1>
            
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
              A secure, all-in-one platform for county governments, bodaboda riders, and Saccos to streamline registration, permit payments, verification, and enforcement.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="glow-primary">
                <Link to="/signup">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">Sign in to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-20 border-t border-border/50">
        <div className="container px-4">
          <div className="text-center mb-12">
            <p className="text-primary text-sm font-medium mb-2">Platform Features</p>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Everything You Need to{' '}
              <span className="text-primary">Transform</span> Bodaboda Management
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Digital Registration System"
              description="Complete rider, owner & bike registration with document verification and anti-fraud duplicate detection."
            />
            <FeatureCard
              icon={<QrCode className="h-6 w-6" />}
              title="QR Verification & SMS Lookup"
              description="Instant public verification via QR scan or SMS for identity confirmation and enforcement support."
            />
            <FeatureCard
              icon={<CreditCard className="h-6 w-6" />}
              title="Digital Revenue Collection"
              description="M-Pesa integration with STK push, automated receipting & reconciliation. Zero cash handling."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Automated Penalties & Compliance"
              description="Auto-calculate late fees and fines. Track repeat offenders and block riders with unresolved violations."
            />
            <FeatureCard
              icon={<Building2 className="h-6 w-6" />}
              title="Sacco Management Dashboard"
              description="Member verification, compliance tracking, incident reporting and performance scorecards."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="County Administration Portal"
              description="Registration analytics, revenue dashboards, heat maps and complete audit trails."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} BodaSure. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 card-hover">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
