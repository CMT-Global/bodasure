import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Mail, Lock, User, Phone, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '+254' + digits.slice(1);
  if (!digits.startsWith('254')) return '+254' + digits;
  return '+' + digits;
}

export function SignupForm() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const normalizedPhone = normalizePhone(phone.trim());
    if (normalizedPhone.length < 12) {
      setError('Please enter a valid mobile number');
      return;
    }

    const emailTrimmed = email.trim();
    const emailForAuth =
      emailTrimmed || `phone+${normalizedPhone.replace(/\D/g, '')}@bodasure.local`;

    setIsLoading(true);
    try {
      const { data, error: signUpError } = await signUp(emailForAuth, password, fullName);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data?.user) {
        await supabase.from('profiles').update({ phone: normalizedPhone }).eq('id', data.user.id);
        setSignupSuccess(true);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl mx-4 shadow-xl">
        <CardHeader className="space-y-1 text-center px-6 pt-8 pb-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-500/20 text-green-600 dark:text-green-400">
            <CheckCircle className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Account created</CardTitle>
          <CardDescription className="text-muted-foreground">
            A verification link has been sent to your email. Please check your inbox to verify your account.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col space-y-4 px-6 pb-8">
          <Button asChild className="w-full min-h-[48px] font-medium">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl mx-4 shadow-xl">
      <CardHeader className="space-y-1 text-center px-6 pt-8 pb-4">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
          <span className="text-2xl font-bold text-primary-foreground">B</span>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
        <CardDescription className="text-muted-foreground">
          Riders and owners: sign up with phone and password by default. Email signup is also available. All users must complete their profile after registration.
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
                className="pl-10 min-h-[44px] text-base sm:text-sm"
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
                className="pl-10 min-h-[44px] text-base sm:text-sm"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">Used for account recovery. You can also log in with phone + OTP.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 min-h-[44px] text-base sm:text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">Leave empty for phone-only (riders/owners default). You can also sign in with email later.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Create a password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 min-h-[44px] text-base sm:text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 min-h-[44px] text-base sm:text-sm"
                required
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 px-6 pb-8">
          <Button type="submit" className="w-full glow-primary min-h-[48px] font-medium" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
