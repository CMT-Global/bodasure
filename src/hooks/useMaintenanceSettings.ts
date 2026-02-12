import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MAINTENANCE_KEY = 'maintenance';

export type MaintenanceSettings = {
  global: boolean;
  countyIds: string[];
};

const DEFAULT_MAINTENANCE: MaintenanceSettings = {
  global: false,
  countyIds: [],
};

const QUERY_KEY = ['system_settings', MAINTENANCE_KEY] as const;

function parseMaintenanceValue(value: unknown): MaintenanceSettings {
  if (value && typeof value === 'object' && 'global' in value && 'countyIds' in value) {
    const v = value as { global?: boolean; countyIds?: unknown };
    return {
      global: Boolean(v.global),
      countyIds: Array.isArray(v.countyIds)
        ? (v.countyIds as unknown[]).filter((id): id is string => typeof id === 'string')
        : [],
    };
  }
  return DEFAULT_MAINTENANCE;
}

/** Fetch and persist maintenance mode settings. Used by Super Admin system settings and by maintenance gate. */
export function useMaintenanceSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<MaintenanceSettings> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', MAINTENANCE_KEY)
        .maybeSingle();
      if (error) throw error;
      return parseMaintenanceValue(data?.value ?? null);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: MaintenanceSettings) => {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          {
            key: MAINTENANCE_KEY,
            value: {
              global: payload.global,
              countyIds: payload.countyIds,
            },
          },
          { onConflict: 'key' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Maintenance mode settings saved');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save maintenance settings');
    },
  });

  return {
    data: query.data ?? DEFAULT_MAINTENANCE,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}

/**
 * Returns true if the user should see the maintenance screen.
 * Platform admins (platform_super_admin, platform_admin) are never under maintenance.
 */
export function isUserUnderMaintenance(
  settings: MaintenanceSettings,
  options: { countyId: string | null | undefined; isPlatformAdmin: boolean }
): boolean {
  if (options.isPlatformAdmin) return false;
  if (settings.global) return true;
  if (options.countyId && settings.countyIds.includes(options.countyId)) return true;
  return false;
}