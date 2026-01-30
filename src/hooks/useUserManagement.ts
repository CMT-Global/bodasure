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

// Fetch all users in a county (or all users when countyId is undefined, e.g. platform admin)
export function useCountyUsers(countyId?: string) {
  return useQuery({
    queryKey: ['county-users', countyId],
    queryFn: async () => {
      // Fetch profiles: filter by county when countyId provided, otherwise all
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (countyId) {
        query = query.eq('county_id', countyId);
      }

      const { data: profiles, error: profilesError } = await query;

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      // Fetch roles for all users (include county roles and platform-level roles where county_id is null)
      const userIds = profiles.map(p => p.id);
      let rolesQuery = supabase
        .from('user_roles')
        .select('id, user_id, role, county_id, granted_at')
        .in('user_id', userIds);

      if (countyId) {
        // Include both county-specific roles and platform roles (county_id IS NULL)
        rolesQuery = rolesQuery.or(`county_id.eq.${countyId},county_id.is.null`);
      }

      const { data: roles, error: rolesError } = await rolesQuery;

      if (rolesError) throw rolesError;

      // Group roles by user_id
      const rolesByUser = new Map<string, typeof roles>();
      (roles || []).forEach(role => {
        const existing = rolesByUser.get(role.user_id) || [];
        existing.push(role);
        rolesByUser.set(role.user_id, existing);
      });

      // Combine profiles with roles
      return profiles.map(profile => ({
        ...profile,
        roles: rolesByUser.get(profile.id) || [],
      })) as CountyUser[];
    },
    enabled: true,
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
