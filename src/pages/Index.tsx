import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ArrowRight, Shield, Users, CreditCard, BarChart3, QrCode, Building2, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Index() {
  const { user, isLoading, hasRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If user is logged in, redirect: platform_super_admin/platform_admin -> Super Admin Portal, others -> dashboard
  if (!isLoading && user) {
    if (hasRole('platform_super_admin') || hasRole('platform_admin')) {
      return <Navigate to="/super-admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const navLinks = (
    <>
      <Button variant="ghost" asChild className="min-h-[44px] text-sm sm:text-base w-full justify-center md:w-auto md:justify-start">
        <Link to="/verify" onClick={() => setMobileMenuOpen(false)}>Verify a rider</Link>
      </Button>
      <Button variant="ghost" asChild className="min-h-[44px] text-sm sm:text-base w-full justify-center md:w-auto md:justify-start">
        <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
      </Button>
      <Button asChild className="glow-primary min-h-[44px] text-sm sm:text-base w-full justify-center md:w-auto md:justify-start">
        <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
          Get Started
          <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
        </Link>
      </Button>
    </>
  );

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="container flex h-14 sm:h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary">
              <span className="text-base sm:text-lg font-bold text-primary-foreground">B</span>
            </div>
            <span className="text-lg sm:text-xl font-semibold">
              Boda<span className="text-primary">Sure</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-3">
            {navLinks}
          </nav>

          {/* Mobile menu */}
          <div className="flex md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[44px] min-w-[44px]" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(320px,100vw-2rem)] flex flex-col gap-4 pt-8">
                <div className="flex flex-col gap-2">
                  {navLinks}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero section - top padding clears fixed header + extra breathing room + safe area */}
      <section className="relative pt-[calc(3.5rem+env(safe-area-inset-top)+2rem)] sm:pt-32 pb-12 sm:pb-20 overflow-hidden px-4 sm:px-6">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute -right-40 bottom-0 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" />
        </div>

        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
              <span className="hidden sm:inline">Built for Counties, Designed For Efficiency</span>
              <span className="sm:hidden">Built for Counties</span>
            </div>
            
            <h1 className="mb-4 sm:mb-6 text-2xl leading-tight sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Digitizing Bodaboda{' '}
              <span className="gradient-text">Registration, Safety</span>
              {' '}& County Revenue
            </h1>
            
            <p className="mx-auto mb-6 sm:mb-10 max-w-2xl text-sm sm:text-base md:text-lg text-muted-foreground px-1">
              A secure, all-in-one platform for county governments, bodaboda riders, and Saccos to streamline registration, permit payments, verification, and enforcement.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-xs sm:max-w-none mx-auto">
              <Button size="lg" asChild className="glow-primary w-full sm:w-auto min-h-[48px]">
                <Link to="/signup">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto min-h-[48px]">
                <Link to="/login">Sign in to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-10 sm:py-20 border-t border-border/50">
        <div className="container px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-primary text-xs sm:text-sm font-medium mb-2">Platform Features</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
              Everything You Need to{' '}
              <span className="text-primary">Transform</span> Bodaboda Management
            </h2>
          </div>

          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
      <footer className="border-t border-border/50 py-6 sm:py-8">
        <div className="container px-4 sm:px-6 text-center">
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
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 card-hover">
      <div className="mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-base sm:text-lg font-semibold">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
