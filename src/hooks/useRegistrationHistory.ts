import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RegistrationHistoryEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  user_id: string | null;
  profiles?: {
    full_name: string | null;
  } | null;
}

export function useRegistrationHistory(riderId: string) {
  return useQuery({
    queryKey: ['registration-history', riderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', 'rider')
        .eq('entity_id', riderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for users who made the changes
      const userIds = [...new Set((data || []).map(entry => entry.user_id).filter(Boolean))];
      let profilesMap = new Map<string, { full_name: string | null }>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (profiles) {
          profilesMap = new Map(profiles.map(p => [p.id, { full_name: p.full_name }]));
        }
      }

      // Combine audit logs with profile data
      return (data || []).map(entry => ({
        ...entry,
        profiles: entry.user_id ? profilesMap.get(entry.user_id) || null : null,
      })) as RegistrationHistoryEntry[];
    },
    enabled: !!riderId,
  });
}
