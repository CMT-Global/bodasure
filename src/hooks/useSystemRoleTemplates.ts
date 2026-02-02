import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SystemRole = {
  id: string;
  name: string;
  category: string;
  locked: boolean;
};

type DbRow = {
  id: string;
  role_key: string;
  name: string;
  category: string;
  locked: boolean;
};

function mapRow(r: DbRow): SystemRole {
  return { id: r.id, name: r.name, category: r.category, locked: r.locked };
}

const QUERY_KEY = ['system_role_templates'] as const;

export function useSystemRoleTemplates() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<SystemRole[]> => {
      const { data, error } = await supabase
        .from('system_role_templates')
        .select('id, role_key, name, category, locked')
        .order('category')
        .order('name');
      if (error) throw error;
      return (data as DbRow[]).map(mapRow);
    },
  });

  const addMutation = useMutation({
    mutationFn: async (payload: { name: string; category: string }) => {
      const roleKey = `custom_${crypto.randomUUID().slice(0, 8)}`;
      const { data, error } = await supabase
        .from('system_role_templates')
        .insert({ role_key: roleKey, name: payload.name.trim(), category: payload.category, locked: false })
        .select('id, role_key, name, category, locked')
        .single();
      if (error) throw error;
      return mapRow(data as DbRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Role added');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add role');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      name,
      category,
      locked,
    }: {
      id: string;
      name?: string;
      category?: string;
      locked?: boolean;
    }) => {
      const updates: Partial<DbRow> = {};
      if (name !== undefined) updates.name = name;
      if (category !== undefined) updates.category = category;
      if (locked !== undefined) updates.locked = locked;
      const { data, error } = await supabase
        .from('system_role_templates')
        .update(updates)
        .eq('id', id)
        .select('id, role_key, name, category, locked')
        .single();
      if (error) throw error;
      return mapRow(data as DbRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Role updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update role');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('system_role_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Role deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete role');
    },
  });

  return {
    roles: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addRole: addMutation.mutateAsync,
    updateRole: updateMutation.mutateAsync,
    deleteRole: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
