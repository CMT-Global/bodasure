import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getDefaultDashboardForRoles } from '@/utils/getDefaultDashboard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, User, Phone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '+254' + digits.slice(1);
  if (!digits.startsWith('254')) return '+254' + digits;
  return '+' + digits;
}

export default function CompleteProfilePage() {
  const { user, profile, roles, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile?.id, profile?.full_name, profile?.phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = fullName.trim();
    const normalizedPhone = normalizePhone(phone.trim());
    if (!name) {
      setError('Please enter your full name.');
      return;
    }
    if (normalizedPhone.length < 12) {
      setError('Please enter a valid mobile number.');
      return;
    }
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: name, phone: normalizedPhone })
        .eq('id', user.id);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await refreshProfile();
      const dashboard = getDefaultDashboardForRoles(roles);
      navigate(dashboard, { replace: true });
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl shadow-xl">
        <CardHeader className="space-y-1 text-center px-6 pt-8 pb-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
            <span className="text-2xl font-bold text-primary-foreground">B</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Complete your profile</CardTitle>
          <CardDescription className="text-muted-foreground">
            Full name and mobile number are required before you can continue. This applies to all users, including riders, owners, and sacco officials.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 px-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 min-h-[44px]"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="07XX XXX XXX or +254 7XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 min-h-[44px]"
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="px-6 pb-8">
            <Button type="submit" className="w-full glow-primary min-h-[48px] font-medium" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save and continue'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
