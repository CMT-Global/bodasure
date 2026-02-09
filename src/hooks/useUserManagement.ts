import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CountyUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  county_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  roles: {
    id: string;
    role: string;
    county_id: string | null;
    granted_at: string;
  }[];
}

export interface UserActivityLog {
  id: string;
  user_id: string | null;
  actor_role: string | null;
  county_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    full_name: string | null;
    email: string;
  } | null;
}

// County portal role values — users with any of these for a county are shown when that county is selected (even if profile.county_id is not set).
const COUNTY_PORTAL_ROLES_FOR_FETCH = [
  'county_super_admin',
  'county_admin',
  'county_finance_officer',
  'county_enforcement_officer',
  'county_registration_agent',
  'county_analyst',
] as const;

// Order for picking "display county": prefer the county from the user's highest county role (county_super_admin = that county, etc.).
function getDisplayCountyFromRoles(roles: { role: string; county_id: string | null }[]): string | null {
  for (const roleName of COUNTY_PORTAL_ROLES_FOR_FETCH) {
    const r = roles.find((x) => x.role === roleName && x.county_id);
    if (r?.county_id) return r.county_id;
  }
  const anyCounty = roles.find((r) => r.county_id)?.county_id ?? null;
  return anyCounty;
}

// Fetch all users in a county (or all users when countyId is undefined, e.g. platform admin).
// When countyId is set: include (1) profiles with profile.county_id = countyId and (2) users who have a county portal role for this county in user_roles (so staff show even if profile.county_id is unset).
// When countyId is undefined (super admin), we fetch via user_roles first so we include every user who has any role.
export function useCountyUsers(countyId?: string) {
  return useQuery({
    queryKey: ['county-users', countyId],
    queryFn: async () => {
      if (countyId) {
        // 1) Profiles with profile.county_id = countyId
        const { data: profilesByCounty, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('county_id', countyId)
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;

        // 2) Users who have a county portal role for this county (so they show even if profile.county_id is not set)
        const { data: countyPortalRoles, error: rolesErr } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('county_id', countyId)
          .in('role', [...COUNTY_PORTAL_ROLES_FOR_FETCH]);

        if (rolesErr) throw rolesErr;
        const userIdsFromRoles = [...new Set((countyPortalRoles ?? []).map((r) => r.user_id))];

        const allUserIds = [...new Set([...(profilesByCounty ?? []).map((p) => p.id), ...userIdsFromRoles])];
        if (allUserIds.length === 0) return [];

        // 3) Fetch profiles for any user we don't already have (from step 2 only)
        const idsWeHave = new Set((profilesByCounty ?? []).map((p) => p.id));
        const idsToFetch = userIdsFromRoles.filter((id) => !idsWeHave.has(id));
        let extraProfiles: (typeof profilesByCounty) = [];
        if (idsToFetch.length > 0) {
          const { data: fetched, error: fetchErr } = await supabase
            .from('profiles')
            .select('*')
            .in('id', idsToFetch);
          if (!fetchErr) extraProfiles = fetched ?? [];
        }

        const allProfiles = [...(profilesByCounty ?? []), ...extraProfiles];
        const userIds = allProfiles.map((p) => p.id);

        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('id, user_id, role, county_id, granted_at')
          .in('user_id', userIds);

        if (rolesError) throw rolesError;
        type RoleRow = (typeof roles)[number];
        const rolesByUser = new Map<string, RoleRow[]>();
        (roles ?? []).forEach((role) => {
          const existing = rolesByUser.get(role.user_id) ?? [];
          existing.push(role);
          rolesByUser.set(role.user_id, existing);
        });
        return allProfiles.map((profile) => ({
          ...profile,
          roles: rolesByUser.get(profile.id) ?? [],
        })) as CountyUser[];
      }

      // Super admin: fetch user_roles + riders + owners (with details) so role filter and display work
      const [rolesRes, ridersRes, ownersRes] = await Promise.all([
        supabase.from('user_roles').select('id, user_id, role, county_id, granted_at').order('granted_at', { ascending: false }),
        supabase.from('riders').select('user_id, county_id, full_name, email, phone').not('user_id', 'is', null),
        supabase.from('owners').select('user_id, county_id, full_name, email, phone').not('user_id', 'is', null),
      ]);

      const { data: allRoles, error: rolesError } = rolesRes;
      if (rolesError) throw rolesError;

      // Use data even if one of riders/owners fails (e.g. RLS not yet applied); log errors
      const ridersList = ridersRes.data ?? [];
      const ownersList = ownersRes.data ?? [];
      if (ridersRes.error) console.warn('useCountyUsers: riders fetch failed', ridersRes.error);
      if (ownersRes.error) console.warn('useCountyUsers: owners fetch failed', ownersRes.error);

      type RoleRow = { id: string; user_id: string; role: string; county_id: string | null; granted_at: string };
      const rolesByUser = new Map<string, RoleRow[]>();
      type EntityDetails = { full_name: string | null; email: string | null; phone: string | null; county_id: string | null };
      const riderDetailsByUser = new Map<string, EntityDetails>();
      const ownerDetailsByUser = new Map<string, EntityDetails>();

      // Add roles from user_roles
      (allRoles ?? []).forEach(role => {
        const existing = rolesByUser.get(role.user_id) ?? [];
        existing.push(role);
        rolesByUser.set(role.user_id, existing);
      });

      // Add synthetic 'rider' role and store rider details for display
      ridersList.forEach((r: { user_id: string; county_id: string; full_name?: string; email?: string | null; phone?: string }) => {
        const uid = r.user_id;
        if (!riderDetailsByUser.has(uid)) {
          riderDetailsByUser.set(uid, {
            full_name: r.full_name ?? null,
            email: r.email ?? null,
            phone: r.phone ?? null,
            county_id: r.county_id ?? null,
          });
        }
        const existing = rolesByUser.get(uid) ?? [];
        if (!existing.some(e => e.role === 'rider')) {
          existing.push({
            id: `rider-${uid}`,
            user_id: uid,
            role: 'rider',
            county_id: r.county_id ?? null,
            granted_at: '',
          });
          rolesByUser.set(uid, existing);
        }
      });

      // Add synthetic 'owner' role and store owner details for display
      ownersList.forEach((o: { user_id: string; county_id: string; full_name?: string; email?: string | null; phone?: string }) => {
        const uid = o.user_id;
        if (!ownerDetailsByUser.has(uid)) {
          ownerDetailsByUser.set(uid, {
            full_name: o.full_name ?? null,
            email: o.email ?? null,
            phone: o.phone ?? null,
            county_id: o.county_id ?? null,
          });
        }
        const existing = rolesByUser.get(uid) ?? [];
        if (!existing.some(e => e.role === 'owner')) {
          existing.push({
            id: `owner-${uid}`,
            user_id: uid,
            role: 'owner',
            county_id: o.county_id ?? null,
            granted_at: '',
          });
          rolesByUser.set(uid, existing);
        }
      });

      const userIds = [...new Set(rolesByUser.keys())];
      if (userIds.length === 0) return [];

      // Fetch profiles for all users (RLS allows platform admin to see all)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

      const combined: CountyUser[] = userIds.map(uid => {
        const profile = profileMap.get(uid);
        const userRoles = rolesByUser.get(uid) ?? [];
        const ownerDetails = ownerDetailsByUser.get(uid);
        const riderDetails = riderDetailsByUser.get(uid);
        // Display county: prefer county from county portal roles (e.g. county_super_admin of Nairobi → show Nairobi), then profile, then rider/owner
        const fallback = ownerDetails ?? riderDetails;
        const countyFromRole = getDisplayCountyFromRoles(userRoles);
        const effectiveCountyId = countyFromRole || profile?.county_id || fallback?.county_id || null;
        if (profile) {
          const merged = {
            ...profile,
            roles: userRoles,
            full_name: profile.full_name || fallback?.full_name || null,
            email: profile.email || fallback?.email || '',
            phone: profile.phone || fallback?.phone || null,
            county_id: effectiveCountyId,
          };
          return merged as CountyUser;
        }
        return {
          id: uid,
          email: fallback?.email ?? '',
          full_name: fallback?.full_name ?? null,
          phone: fallback?.phone ?? null,
          avatar_url: null,
          county_id: effectiveCountyId,
          is_active: true,
          created_at: '',
          updated_at: '',
          roles: userRoles,
        } as CountyUser;
      });

      // Sort by most recent activity (role granted_at or profile created_at)
      combined.sort((a, b) => {
        const aTime = a.roles[0]?.granted_at || a.created_at || '';
        const bTime = b.roles[0]?.granted_at || b.created_at || '';
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      return combined;
    },
    enabled: true,
  });
}

/** Fetches the user who has county_super_admin role for a county (by user_roles, not profile.county_id). */
export function useCountySuperAdmin(countyId: string | undefined) {
  return useQuery({
    queryKey: ['county-super-admin', countyId],
    queryFn: async (): Promise<{ id: string; email: string; full_name: string | null } | null> => {
      if (!countyId) return null;
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('county_id', countyId)
        .eq('role', 'county_super_admin')
        .limit(1);

      if (rolesError || !roles?.length) return null;
      const userId = roles[0].user_id;
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', userId)
        .single();

      if (profileError || !profile) return null;
      return {
        id: profile.id,
        email: profile.email ?? '',
        full_name: profile.full_name ?? null,
      };
    },
    enabled: !!countyId,
  });
}

// Fetch user activity logs
export function useUserActivityLogs(countyId?: string, userId?: string) {
  return useQuery({
    queryKey: ['user-activity-logs', countyId, userId],
    queryFn: async () => {
      if (!countyId) return [];

      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('county_id', countyId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: logs, error } = await query;
      if (error) {
        console.error('Error fetching activity logs:', error);
        return [];
      }
      if (!logs || logs.length === 0) return [];

      // Fetch user profiles for logs
      const userIds = [...new Set(logs.map(log => log.user_id).filter(Boolean) as string[])];
      let profilesMap = new Map<string, { full_name: string | null; email: string }>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profiles) {
          profilesMap = new Map(profiles.map(p => [p.id, { full_name: p.full_name, email: p.email }]));
        }
      }

      return logs.map(log => ({
        ...log,
        user: log.user_id ? profilesMap.get(log.user_id) || null : null,
      })) as UserActivityLog[];
    },
    enabled: !!countyId,
  });
}

// Fetch all audit logs (no county filter) — for Super Admin only (RLS allows platform admins to view all)
export function useAllAuditLogs(userId?: string) {
  return useQuery({
    queryKey: ['all-audit-logs', userId],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: logs, error } = await query;
      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }
      if (!logs || logs.length === 0) return [];

      const userIds = [...new Set(logs.map(log => log.user_id).filter(Boolean) as string[])];
      let profilesMap = new Map<string, { full_name: string | null; email: string }>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profiles) {
          profilesMap = new Map(profiles.map(p => [p.id, { full_name: p.full_name, email: p.email }]));
        }
      }

      return logs.map(log => ({
        ...log,
        user: log.user_id ? profilesMap.get(log.user_id) || null : null,
      })) as UserActivityLog[];
    },
    enabled: true,
  });
}

// Create a new county user
export function useCreateCountyUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      fullName,
      phone,
      countyId,
      roles,
    }: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      countyId: string;
      roles: string[];
    }) => {
      // Try to create user using admin API (if available)
      let userId: string;
      let createdUser: { id: string };

      try {
        // @ts-ignore - admin API may not be available in client
        const { data: authData, error: authError } = await supabase.auth.admin?.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

        if (authError) throw authError;
        if (!authData?.user) throw new Error('Failed to create user');
        userId = authData.user.id;
        createdUser = authData.user;
      } catch (error: any) {
        // Fallback: Use regular signup (user will need to confirm email)
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });

        if (signupError) throw signupError;
        if (!signupData.user) throw new Error('Failed to create user');
        userId = signupData.user.id;
        createdUser = signupData.user;
      }

      // Update profile with county_id and phone
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          county_id: countyId,
          full_name: fullName,
          phone: phone || null,
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Assign roles
      if (roles.length > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        const grantedBy = session?.user?.id;

        const roleInserts = roles.map(role => ({
          user_id: userId,
          role,
          county_id: countyId,
          granted_by: grantedBy,
        }));

        const { error: rolesError } = await supabase
          .from('user_roles')
          .insert(roleInserts);

        if (rolesError) throw rolesError;
      }

      return createdUser;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['county-users', variables.countyId] });
      toast.success('User created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create user');
    },
  });
}

// Update user profile
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      fullName,
      phone,
      isActive,
    }: {
      userId: string;
      fullName?: string;
      phone?: string;
      isActive?: boolean;
    }) => {
      const updates: Record<string, any> = {};
      if (fullName !== undefined) updates.full_name = fullName;
      if (phone !== undefined) updates.phone = phone;
      if (isActive !== undefined) updates.is_active = isActive;

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['county-users'] });
      toast.success('User updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user');
    },
  });
}

// Assign roles to user
export function useAssignUserRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      roles,
      countyId,
    }: {
      userId: string;
      roles: string[];
      countyId: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const grantedBy = session?.user?.id;

      // Remove existing roles for this county
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('county_id', countyId);

      if (deleteError) throw deleteError;

      // Add new roles
      if (roles.length > 0) {
        const roleInserts = roles.map(role => ({
          user_id: userId,
          role,
          county_id: countyId,
          granted_by: grantedBy,
        }));

        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(roleInserts);

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['county-users', variables.countyId] });
      queryClient.invalidateQueries({ queryKey: ['county-super-admin', variables.countyId] });
      toast.success('Roles updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update roles');
    },
  });
}

// Reset user password
export function useResetUserPassword() {
  return useMutation({
    mutationFn: async ({ userId, email, newPassword }: { userId: string; email: string; newPassword: string }) => {
      // Try admin API first
      try {
        // @ts-ignore - admin API may not be available in client
        const { error } = await supabase.auth.admin?.updateUserById(userId, {
          password: newPassword,
        });

        if (error) throw error;
        return;
      } catch (error: any) {
        // Fallback: Send password reset email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        throw new Error('Password reset email sent. Please check your email.');
      }
    },
    onSuccess: (_, variables) => {
      toast.success('Password reset successfully');
    },
    onError: (error: Error) => {
      if (error.message.includes('email sent')) {
        toast.success(error.message);
      } else {
        toast.error(error.message || 'Failed to reset password');
      }
    },
  });
}

// Disable/Suspend user
export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['county-users'] });
      toast.success(`User ${isActive ? 'activated' : 'suspended'} successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user status');
    },
  });
}
