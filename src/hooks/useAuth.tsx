import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
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
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  isPlatformAdmin: () => boolean;
  isCountyAdmin: () => boolean;
  /** Effective county ID for county portal: from county portal role first (source of truth), then profile. Never use hardcoded fallback. */
  countyId: string | undefined;
  /** County name from the user's county portal role (same source as countyId). Fetched with roles. */
  countyName: string | undefined;
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName }
      }
    });
    return { error };
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

  // Effective county: prefer county from county portal role (user's assigned county), then profile. Ensures county officers see their actual county, not a stale/wrong profile county.
  const countyPortalRoleWithCounty = roles.find(
    (r) => r.county_id && (COUNTY_PORTAL_ROLES_WITH_COUNTY as readonly string[]).includes(r.role)
  );
  const countyId = countyPortalRoleWithCounty?.county_id ?? profile?.county_id ?? undefined;
  const countyName = countyPortalRoleWithCounty?.county_name ?? undefined;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      roles,
      isLoading,
      isLoadingRoles,
      rolesLoaded,
      signIn,
      signUp,
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
