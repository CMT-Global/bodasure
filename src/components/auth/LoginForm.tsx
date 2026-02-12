import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Loader2, Mail, Lock, Phone, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<'phone' | 'otp'>('phone');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sendOtpCooldown, setSendOtpCooldown] = useState(0);
  const [otpSentOnPhoneStep, setOtpSentOnPhoneStep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'email' | 'phone'>('email');
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSuspendedMessage, setShowSuspendedMessage] = useState(() => searchParams.get('suspended') === '1');
  const { signIn, requestOtp, verifyOtp } = useAuth();

  const isPhoneUnreachableError =
    !!error && (error.includes('Unable to reach the server') || /deploy the .* edge function/i.test(error));

  useEffect(() => {
    if (searchParams.get('suspended') === '1') {
      setShowSuspendedMessage(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Resend OTP cooldown (on OTP step): 1 minute after sending
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Send OTP cooldown (on phone step): when server returns "wait 1 minute", show timer
  useEffect(() => {
    if (sendOtpCooldown <= 0) return;
    const t = setInterval(() => setSendOtpCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [sendOtpCooldown]);

  // Clear "wait 1 minute" error when cooldown finishes so the message disappears
  useEffect(() => {
    if (sendOtpCooldown === 0 && error?.includes('wait 1 minute')) {
      setError(null);
    }
  }, [sendOtpCooldown, error]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error: err, retryAfterSeconds } = await requestOtp(phone);
      if (err) {
        setError(err);
        if (err.includes('wait 1 minute') && (retryAfterSeconds ?? 0) > 0) {
          setSendOtpCooldown(retryAfterSeconds ?? 60);
        }
      } else {
        setSendOtpCooldown(60);
        setOtpSentOnPhoneStep(true);
        setResendCooldown(60);
      }
    } catch {
      setError('Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await verifyOtp(phone, otp);
      if (error) setError(error);
      // On success, verifyOtp redirects via magic link
    } catch {
      setError('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const backToPhone = () => {
    setPhoneStep('phone');
    setOtp('');
    setError(null);
    setOtpSentOnPhoneStep(false);
  };

  return (
    <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl mx-4 shadow-xl">
      <CardHeader className="space-y-1 text-center px-6 pt-8 pb-4">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
          <span className="text-2xl font-bold text-primary-foreground">B</span>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
        <CardDescription className="text-muted-foreground">Sign in to your BodaSure account</CardDescription>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'email' | 'phone'); setError(null); }} className="w-full px-6">
        <TabsList className="grid w-full grid-cols-2 h-11 rounded-lg bg-muted/80 p-1">
          <TabsTrigger value="email" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Email</TabsTrigger>
          <TabsTrigger value="phone" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Phone</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-5">
          <form onSubmit={handleEmailSubmit}>
            <CardContent className="space-y-4 p-0">
              {showSuspendedMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">Your access has been suspended. Contact your administrator.</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 min-h-[44px] text-base sm:text-sm"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 min-h-[44px] text-base sm:text-sm"
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-6 pb-6 px-0">
              <Button type="submit" className="w-full glow-primary min-h-[48px] font-medium" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </TabsContent>

        <TabsContent value="phone" className="mt-5">
          {phoneStep === 'phone' ? (
            <form onSubmit={otpSentOnPhoneStep ? handleVerifyOtp : handleRequestOtp}>
              <CardContent className="space-y-4 p-0">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                    {isPhoneUnreachableError && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full border-primary text-primary hover:bg-primary/10"
                        onClick={() => { setActiveTab('email'); setError(null); }}
                      >
                        Sign in with email instead
                      </Button>
                    )}
                  </Alert>
                )}
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
                      readOnly={otpSentOnPhoneStep}
                    />
                  </div>
                  {!otpSentOnPhoneStep && (
                    <p className="text-xs text-muted-foreground">We'll send you a one-time code to sign in.</p>
                  )}
                </div>
                {otpSentOnPhoneStep && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Code sent to <strong>{phone}</strong>. Enter the 6-digit code below.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="otp-phone-step">Verification code</Label>
                      <Input
                        id="otp-phone-step"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="min-h-[44px] text-center text-lg tracking-widest"
                        required
                      />
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 pt-6 pb-6 px-0">
                {otpSentOnPhoneStep ? (
                  <>
                    <Button type="submit" className="w-full glow-primary min-h-[48px] font-medium" disabled={isLoading || otp.length < 4}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify & sign in'
                      )}
                    </Button>
                    {sendOtpCooldown > 0 ? (
                      <div className="flex flex-col items-center gap-2 w-full">
                        <p className="text-sm text-muted-foreground text-center">
                          Send another code in <span className="font-semibold tabular-nums text-foreground">{sendOtpCooldown}s</span>
                        </p>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-1000"
                            style={{ width: `${((60 - sendOtpCooldown) / 60) * 100}%` }}
                          />
                        </div>
                        <Button type="button" className="w-full min-h-[48px]" variant="secondary" disabled>
                          Send OTP
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        className="w-full min-h-[48px]"
                        variant="outline"
                        disabled={isLoading}
                        onClick={async (e) => {
                          e.preventDefault();
                          setError(null);
                          setIsLoading(true);
                          try {
                            const { error: err, retryAfterSeconds } = await requestOtp(phone);
                            if (err) {
                              setError(err);
                              if (err.includes('wait 1 minute') && (retryAfterSeconds ?? 0) > 0) {
                                setSendOtpCooldown(retryAfterSeconds ?? 60);
                              }
                            } else {
                              setSendOtpCooldown(60);
                            }
                          } catch {
                            setError('Failed to send OTP');
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'Send OTP again'
                        )}
                      </Button>
                    )}
                  </>
                ) : sendOtpCooldown > 0 ? (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <p className="text-sm text-muted-foreground text-center">
                      You can request a new code in <span className="font-semibold tabular-nums text-foreground">{sendOtpCooldown}s</span>
                    </p>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-1000"
                        style={{ width: `${((60 - sendOtpCooldown) / 60) * 100}%` }}
                      />
                    </div>
                    <Button type="button" className="w-full min-h-[48px]" variant="secondary" disabled>
                      Send OTP
                    </Button>
                  </div>
                ) : (
                  <Button type="submit" className="w-full glow-primary min-h-[48px] font-medium" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send OTP'
                    )}
                  </Button>
                )}
                {otpSentOnPhoneStep && (
                  <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={backToPhone}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Change number
                  </Button>
                )}
                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link to="/signup" className="font-medium text-primary hover:underline">
                    Sign up
                  </Link>
                </p>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <CardContent className="space-y-4 p-0">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                    {isPhoneUnreachableError && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full border-primary text-primary hover:bg-primary/10"
                        onClick={() => { setActiveTab('email'); setError(null); backToPhone(); }}
                      >
                        Sign in with email instead
                      </Button>
                    )}
                  </Alert>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mb-2 -ml-2"
                  onClick={backToPhone}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Change number
                </Button>
                <p className="text-sm text-muted-foreground">
                  Code sent to <strong>{phone}</strong>. Valid for 5 minutes. 3 attempts only. After 3 wrong codes, you can try again in 10 minutes.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification code</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="min-h-[44px] text-center text-lg tracking-widest"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 pt-6 pb-6 px-0">
                <Button type="submit" className="w-full glow-primary min-h-[48px] font-medium" disabled={isLoading || otp.length < 4}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & sign in'
                  )}
                </Button>
                {resendCooldown > 0 ? (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <p className="text-sm text-muted-foreground text-center">
                      Resend code in <span className="font-semibold tabular-nums text-foreground">{resendCooldown}s</span>
                    </p>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-1000"
                        style={{ width: `${((60 - resendCooldown) / 60) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="link"
                    className="text-muted-foreground"
                    disabled={isLoading}
                    onClick={() => {
                      setError(null);
                      setIsLoading(true);
                      requestOtp(phone).then(({ error }) => {
                        if (error) setError(error);
                        else setResendCooldown(60);
                        setIsLoading(false);
                      });
                    }}
                  >
                    Resend code
                  </Button>
                )}
              </CardFooter>
            </form>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
