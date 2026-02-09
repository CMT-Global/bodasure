import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SACCO_PORTAL_ROLE_KEYS } from '@/config/portalRoles';

export interface SaccoOfficial {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  roles: {
    id: string;
    role: string;
    county_id: string | null;
    sacco_id?: string | null;
    welfare_group_id?: string | null;
    granted_at: string;
    granted_by: string | null;
  }[];
}

export interface RevenueShare {
  id: string;
  sacco_id: string;
  payment_id: string;
  rider_id: string | null;
  permit_id: string | null;
  share_type: 'percentage' | 'fixed_per_rider' | 'none';
  base_amount: number;
  share_amount: number;
  percentage: number | null;
  fixed_amount: number | null;
  period: 'weekly' | 'monthly' | 'annual' | null;
  status: 'pending' | 'distributed' | 'cancelled';
  distributed_at: string | null;
  created_at: string;
  rider?: {
    full_name: string;
  } | null;
}

const SACCO_OFFICIAL_ROLES = [...SACCO_PORTAL_ROLE_KEYS, 'welfare_admin', 'welfare_officer'] as const;

// Fetch sacco officials (users with sacco roles in the county; when saccoId provided, only officials of that sacco)
export function useSaccoOfficials(countyId?: string, saccoId?: string) {
  return useQuery({
    queryKey: ['sacco-officials', countyId, saccoId],
    queryFn: async () => {
      if (!countyId) return [];

      let roleQuery = supabase
        .from('user_roles')
        .select('id, user_id, role, county_id, sacco_id, welfare_group_id, granted_at, granted_by')
        .eq('county_id', countyId)
        .in('role', SACCO_OFFICIAL_ROLES as unknown as string[])
        .order('granted_at', { ascending: false });

      if (saccoId) {
        roleQuery = roleQuery.eq('sacco_id', saccoId);
      } else {
        // Sacco settings: show only users with a sacco role (exclude welfare-only)
        roleQuery = roleQuery.not('sacco_id', 'is', null);
      }

      const { data: roles, error: rolesError } = await roleQuery;

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(roles.map(r => r.user_id))];

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      // Group roles by user_id
      const rolesByUser = new Map<string, typeof roles>();
      roles.forEach(role => {
        const existing = rolesByUser.get(role.user_id) || [];
        existing.push(role);
        rolesByUser.set(role.user_id, existing);
      });

      // Combine profiles with roles
      return profiles.map(profile => ({
        id: profile.id,
        user_id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        roles: rolesByUser.get(profile.id) || [],
      })) as SaccoOfficial[];
    },
    enabled: !!countyId,
  });
}

// Fetch single sacco with details
export function useSacco(saccoId?: string) {
  return useQuery({
    queryKey: ['sacco', saccoId],
    queryFn: async () => {
      if (!saccoId) return null;

      const { data, error } = await supabase
        .from('saccos')
        .select('*')
        .eq('id', saccoId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!saccoId,
  });
}

// Update sacco profile
export function useUpdateSaccoProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saccoId,
      updates,
    }: {
      saccoId: string;
      updates: {
        name?: string;
        registration_number?: string;
        contact_email?: string;
        contact_phone?: string;
        address?: string;
        settings?: Record<string, any>;
      };
    }) => {
      const { error } = await supabase
        .from('saccos')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', saccoId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sacco', variables.saccoId] });
      queryClient.invalidateQueries({ queryKey: ['saccos'] });
      toast.success('Sacco profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update sacco profile');
    },
  });
}

// Assign role to user for sacco or welfare (entity-scoped when saccoId or welfareGroupId provided)
export function useAssignSaccoRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
      countyId,
      saccoId,
      welfareGroupId,
    }: {
      userId: string;
      role: string;
      countyId: string;
      saccoId?: string;
      welfareGroupId?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const grantedBy = session?.user?.id;

      const insert: Record<string, unknown> = {
        user_id: userId,
        role,
        county_id: countyId,
        granted_by: grantedBy,
      };
      if (saccoId) insert.sacco_id = saccoId;
      if (welfareGroupId) insert.welfare_group_id = welfareGroupId;

      const { error } = await supabase.from('user_roles').insert(insert);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sacco-officials', variables.countyId, variables.saccoId] });
      toast.success('Role assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign role');
    },
  });
}

// Remove role from user (match sacco_id / welfare_group_id when provided for entity-scoped rows)
export function useRemoveSaccoRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
      countyId,
      saccoId,
      welfareGroupId,
    }: {
      userId: string;
      role: string;
      countyId: string;
      saccoId?: string | null;
      welfareGroupId?: string | null;
    }) => {
      let deleteQuery = supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role)
        .eq('county_id', countyId);
      if (saccoId != null) deleteQuery = deleteQuery.eq('sacco_id', saccoId);
      else deleteQuery = deleteQuery.is('sacco_id', null);
      if (welfareGroupId != null) deleteQuery = deleteQuery.eq('welfare_group_id', welfareGroupId);
      else deleteQuery = deleteQuery.is('welfare_group_id', null);

      const { error } = await deleteQuery;
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sacco-officials', variables.countyId, variables.saccoId] });
      toast.success('Role removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove role');
    },
  });
}

// Fetch revenue shares for sacco
export function useSaccoRevenueShares(saccoId?: string, countyId?: string) {
  return useQuery({
    queryKey: ['sacco-revenue-shares', saccoId, countyId],
    queryFn: async () => {
      if (!saccoId || !countyId) return [];

      const { data, error } = await supabase
        .from('revenue_shares')
        .select(`
          *,
          rider:riders(full_name)
        `)
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as RevenueShare[];
    },
    enabled: !!saccoId && !!countyId,
  });
}

// Upload document for sacco
export function useUploadSaccoDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      saccoId,
      countyId,
      documentType,
    }: {
      file: File;
      saccoId: string;
      countyId: string;
      documentType: string;
    }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${saccoId}/${documentType}-${Date.now()}.${fileExt}`;
      const filePath = `${countyId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Update sacco settings to store document reference
      const { data: sacco } = await supabase
        .from('saccos')
        .select('settings')
        .eq('id', saccoId)
        .single();

      const settings = (sacco?.settings as Record<string, any>) || {};
      const documents = settings.documents || [];
      documents.push({
        type: documentType,
        url: publicUrl,
        path: filePath,
        uploaded_at: new Date().toISOString(),
      });

      const { error: updateError } = await supabase
        .from('saccos')
        .update({
          settings: { ...settings, documents },
          updated_at: new Date().toISOString(),
        })
        .eq('id', saccoId);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sacco', variables.saccoId] });
      toast.success('Document uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload document');
    },
  });
}

// Delete sacco document (removes from settings and optionally from storage)
export function useDeleteSaccoDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      saccoId,
      documentIndex,
      path,
    }: {
      saccoId: string;
      documentIndex: number;
      path?: string;
    }) => {
      const { data: sacco, error: fetchError } = await supabase
        .from('saccos')
        .select('settings')
        .eq('id', saccoId)
        .single();

      if (fetchError) throw fetchError;

      const settings = (sacco?.settings as Record<string, any>) || {};
      const documents = [...(settings.documents || [])];
      if (documentIndex < 0 || documentIndex >= documents.length) {
        throw new Error('Document not found');
      }
      documents.splice(documentIndex, 1);

      const { error: updateError } = await supabase
        .from('saccos')
        .update({
          settings: { ...settings, documents },
          updated_at: new Date().toISOString(),
        })
        .eq('id', saccoId);

      if (updateError) throw updateError;

      if (path) {
        await supabase.storage.from('documents').remove([path]);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sacco', variables.saccoId] });
      toast.success('Document removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove document');
    },
  });
}
