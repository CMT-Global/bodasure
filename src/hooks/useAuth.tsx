import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session, AuthError, FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/** County portal roles that carry county_id — must match backend get_user_county_id(). Use role's county as source of truth for county users. */
const COUNTY_PORTAL_ROLES_WITH_COUNTY = [
  'county_super_admin',
  'county_admin',
  'county_finance_officer',
  'county_enforcement_officer',
  'county_registration_agent',
  'county_analyst',
] as const;

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  county_id: string | null;
  is_active: boolean;
}

interface UserRole {
  id: string;
  role: string;
  county_id: string | null;
  /** County name from joined counties table (fetched with user_roles). */
  county_name?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  isLoading: boolean;
  isLoadingRoles: boolean;
  rolesLoaded: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ data: { user: User } | null; error: AuthError | null }>;
  /** Request OTP for phone login. Call verifyOtp after user receives SMS. */
  requestOtp: (phone: string) => Promise<{ error: string | null; retryAfterSeconds?: number }>;
  /** Verify OTP and complete phone login/signup; on success redirects via magic link. Optional fullName for new-account signup. */
  verifyOtp: (phone: string, otp: string, fullName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  isPlatformAdmin: () => boolean;
  isCountyAdmin: () => boolean;
  /** Effective county ID for county portal: from county portal role first (source of truth), then profile. Never use hardcoded fallback. */
  countyId: string | undefined;
  /** County name from the user's county portal role (same source as countyId). Fetched with roles. */
  countyName: string | undefined;
  /** True when profile has full_name and phone set. Required before accessing app; redirect to /complete-profile if false. */
  isProfileComplete: boolean;
  /** Re-fetch profile from DB (e.g. after completing profile). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const rolesLoadedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    let sessionTimeoutId: NodeJS.Timeout | null = null;
    const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

    // Set up auth state listener BEFORE getting initial session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // TOKEN_REFRESHED fires when user returns to tab - don't refetch or show loading
        if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          if (sessionTimeoutId) {
            clearTimeout(sessionTimeoutId);
            sessionTimeoutId = null;
          }
          sessionTimeoutId = setTimeout(async () => {
            console.warn('Session expired due to inactivity');
            await supabase.auth.signOut();
            setProfile(null);
            setRoles([]);
            setIsLoadingRoles(false);
            setRolesLoaded(false);
            rolesLoadedForUserRef.current = null;
            if (window.location.pathname.startsWith('/dashboard')) {
              window.location.href = '/login?session=expired';
            }
          }, SESSION_TIMEOUT_MS);
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Clear existing timeout
        if (sessionTimeoutId) {
          clearTimeout(sessionTimeoutId);
          sessionTimeoutId = null;
        }
        
        if (newSession?.user) {
          // Defer fetching to avoid blocking auth state change; record sign-in for audit when user actually logs in
          const isSignIn = event === 'SIGNED_IN';
          setTimeout(() => {
            fetchUserData(newSession.user.id, { recordSignIn: isSignIn });
          }, 0);

          // Set up session timeout
          sessionTimeoutId = setTimeout(async () => {
            console.warn('Session expired due to inactivity');
            await supabase.auth.signOut();
            setProfile(null);
            setRoles([]);
            setIsLoadingRoles(false);
            setRolesLoaded(false);
            rolesLoadedForUserRef.current = null;
            // Optionally redirect to login
            if (window.location.pathname.startsWith('/dashboard')) {
              window.location.href = '/login?session=expired';
            }
          }, SESSION_TIMEOUT_MS);
        } else {
          setProfile(null);
          setRoles([]);
          setIsLoadingRoles(false);
          setRolesLoaded(false);
          rolesLoadedForUserRef.current = null;
        }
        
        setIsLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      
      if (initialSession?.user) {
        fetchUserData(initialSession.user.id);
        
        // Set up session timeout for initial session
        sessionTimeoutId = setTimeout(async () => {
          console.warn('Session expired due to inactivity');
          await supabase.auth.signOut();
          setProfile(null);
          setRoles([]);
          setIsLoadingRoles(false);
          setRolesLoaded(false);
          rolesLoadedForUserRef.current = null;
          if (window.location.pathname.startsWith('/dashboard')) {
            window.location.href = '/login?session=expired';
          }
        }, SESSION_TIMEOUT_MS);
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
      }
    };
  }, []);

  const fetchUserData = async (userId: string, options?: { recordSignIn?: boolean }) => {
    const isRefetch = rolesLoadedForUserRef.current === userId;
    if (!isRefetch) {
      setIsLoadingRoles(true);
      setRolesLoaded(false);
    }
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        const p = profileData as Profile;
        setProfile(p);
        // Immediate access revocation on suspension: sign out and redirect
        if (p && p.is_active === false) {
          await supabase.auth.signOut();
          setProfile(null);
          setRoles([]);
          setIsLoadingRoles(false);
          setRolesLoaded(false);
          rolesLoadedForUserRef.current = null;
          if (window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/super-admin') || window.location.pathname.startsWith('/sacco') || window.location.pathname.startsWith('/rider-owner')) {
            window.location.href = '/login?suspended=1';
          }
          return;
        }
        // Record sign-in in audit_logs for super-admin login history (only on actual sign-in, not token refresh)
        if (options?.recordSignIn && p.is_active) {
          await supabase.from('audit_logs').insert({
            user_id: userId,
            county_id: p.county_id ?? null,
            action: 'sign_in',
            entity_type: 'auth',
          });
        }
      }

      // Fetch roles with county name (join counties)
      let rolesData: UserRole[] | null = null;
      const { data: rolesDataRes, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, role, county_id, counties(name)')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        setRoles([]);
      } else {
        const rows = (rolesDataRes || []) as { id: string; role: string; county_id: string | null; counties: { name: string } | null }[];
        rolesData = rows.map((r) => ({
          id: r.id,
          role: r.role,
          county_id: r.county_id,
          county_name: r.counties?.name ?? null,
        }));
        setRoles(rolesData);
        console.log('Loaded roles:', rolesData);
      }

      // If user has no rider/owner role, try to claim an existing rider/owner record by email (link + auto-grant role)
      const hasRiderOrOwner = rolesData?.some((r) => r.role === 'rider' || r.role === 'owner');
      if (!hasRiderOrOwner && profileData) {
        const { data: claimResult } = await supabase.rpc('claim_rider_or_owner_by_email');
        const result = claimResult as { ok?: boolean } | null;
        if (result?.ok) {
          const { data: newRolesRes } = await supabase
            .from('user_roles')
            .select('id, role, county_id, counties(name)')
            .eq('user_id', userId);
          const newRows = (newRolesRes || []) as { id: string; role: string; county_id: string | null; counties: { name: string } | null }[];
          if (newRows.length) {
            setRoles(newRows.map((r) => ({
              id: r.id,
              role: r.role,
              county_id: r.county_id,
              county_name: r.counties?.name ?? null,
            })));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setRoles([]);
    } finally {
      setIsLoadingRoles(false);
      setRolesLoaded(true);
      rolesLoadedForUserRef.current = userId;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName }
      }
    });
    return { data: data?.user ? { user: data.user } : null, error };
  };

  const requestOtp = async (phone: string): Promise<{ error: string | null; retryAfterSeconds?: number }> => {
    const invoke = () =>
      supabase.functions.invoke('request-otp', {
        body: { phone: phone.trim() },
      });
    const edgeUnreachableMsg =
      'Unable to reach the server. If you just set up phone login, deploy the request-otp Edge Function (see docs/PHONE_LOGIN_SETUP.md) and try again.';
    try {
      let lastError: string | null = null;
      let retryAfter: number | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await invoke();
        const { data, error, response } = result;

        // On 502/429 the client returns { data: null, error } and the body is on the Response
        if (error && response && error instanceof FunctionsHttpError) {
          try {
            const body = await response.json();
            if (typeof body?.error === 'string') lastError = body.error;
            if (typeof body?.retryAfterSeconds === 'number') retryAfter = body.retryAfterSeconds;
          } catch {
            lastError = error?.message ?? null;
          }
        }
        if (!lastError && data?.error) {
          lastError = data.error as string;
          retryAfter = typeof data.retryAfterSeconds === 'number' ? data.retryAfterSeconds : undefined;
        }
        if (!lastError) lastError = error?.message ?? null;
        if (!error && !data?.error) return { error: null };
        if (lastError === 'SMS service not configured') {
          return { error: 'SMS service not configured. Add SMSLEOPARD_API_KEY and SMSLEOPARD_API_SECRET_KEY in Supabase Dashboard → Project Settings → Edge Functions → Secrets.' };
        }
        // Only treat as unreachable when we have no server message and error suggests network/fetch
        const hasServerMessage = lastError && lastError !== 'Edge Function returned a non-2xx status code';
        const isUnreachable =
          !hasServerMessage &&
          (lastError?.toLowerCase().includes('edge function') || lastError?.toLowerCase().includes('fetch'));
        if (isUnreachable) {
          if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
          else return { error: edgeUnreachableMsg };
        } else {
          break;
        }
      }
      return { error: lastError || 'Failed to send OTP', retryAfterSeconds: retryAfter };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send OTP';
      if (msg.toLowerCase().includes('edge function') || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
        return { error: edgeUnreachableMsg };
      }
      return { error: msg };
    }
  };

  const verifyOtp = async (phone: string, otp: string, fullName?: string): Promise<{ error: string | null }> => {
    const body: { phone: string; otp: string; full_name?: string } = { phone: phone.trim(), otp: otp.trim() };
    if (fullName?.trim()) body.full_name = fullName.trim();
    const invoke = () => supabase.functions.invoke('verify-otp', { body });
    const edgeUnreachableMsg =
      'Unable to reach the server. Ensure the verify-otp Edge Function is deployed (see docs/PHONE_LOGIN_SETUP.md) and try again.';
    try {
      let result = await invoke();
      if (result.error?.message?.toLowerCase().includes('edge function') || result.error?.message?.toLowerCase().includes('fetch')) {
        await new Promise((r) => setTimeout(r, 800));
        result = await invoke();
      }
      const { data, error } = result;
      if (error) {
        if (error.message?.toLowerCase().includes('edge function') || error.message?.toLowerCase().includes('fetch')) {
          return { error: edgeUnreachableMsg };
        }
        return { error: error.message || 'Verification failed' };
      }
      if (data?.error) return { error: data.error };
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
        return { error: null };
      }
      return { error: 'Verification failed' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Verification failed';
      if (msg.toLowerCase().includes('edge function') || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
        return { error: edgeUnreachableMsg };
      }
      return { error: msg };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setIsLoadingRoles(false);
    setRolesLoaded(false);
    rolesLoadedForUserRef.current = null;
  };

  const hasRole = (role: string) => {
    return roles.some(r => r.role === role);
  };

  const isPlatformAdmin = () => {
    return hasRole('platform_super_admin') || hasRole('platform_admin');
  };

  const isCountyAdmin = () => {
    return isPlatformAdmin() || hasRole('county_super_admin') || hasRole('county_admin');
  };

  // Effective county: prefer county portal role, then profile, then sacco role (so sacco users can load county settings e.g. revenue share rules).
  const countyPortalRoleWithCounty = roles.find(
    (r) => r.county_id && (COUNTY_PORTAL_ROLES_WITH_COUNTY as readonly string[]).includes(r.role)
  );
  const saccoRoleWithCounty = roles.find(
    (r) => r.county_id && (r.role === 'sacco_admin' || r.role === 'sacco_officer')
  );
  const countyId = countyPortalRoleWithCounty?.county_id ?? profile?.county_id ?? saccoRoleWithCounty?.county_id ?? undefined;
  const countyName = countyPortalRoleWithCounty?.county_name ?? undefined;
  const isProfileComplete = !!(profile?.full_name?.trim() && profile?.phone?.trim());

  const refreshProfile = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setProfile(data as Profile);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isProfileComplete,
      refreshProfile,
      roles,
      isLoading,
      isLoadingRoles,
      rolesLoaded,
      signIn,
      signUp,
      requestOtp,
      verifyOtp,
      signOut,
      hasRole,
      isPlatformAdmin,
      isCountyAdmin,
      countyId,
      countyName,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
