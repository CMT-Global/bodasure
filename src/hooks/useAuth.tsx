import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
          // Defer fetching to avoid blocking auth state change
          setTimeout(() => {
            fetchUserData(newSession.user.id);
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

  const fetchUserData = async (userId: string) => {
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
      }

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, role, county_id')
        .eq('user_id', userId);
      
      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        setRoles([]);
      } else {
        setRoles(rolesData || []);
        console.log('Loaded roles:', rolesData);
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
