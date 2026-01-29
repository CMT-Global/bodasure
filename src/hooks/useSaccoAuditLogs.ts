import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SaccoAuditLog {
  id: string;
  county_id: string | null;
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
  role?: string | null;
}

// Fetch sacco audit logs
export function useSaccoAuditLogs(
  saccoId?: string,
  countyId?: string,
  filters?: {
    actionType?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  return useQuery({
    queryKey: ['sacco-audit-logs', saccoId, countyId, filters],
    queryFn: async () => {
      if (!countyId) return [];

      // Build query for audit logs
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('county_id', countyId)
        .order('created_at', { ascending: false })
        .limit(500);

      // Filter by entity type if saccoId is provided (use singular forms to match DB)
      const saccoRelatedEntityTypes = ['rider', 'sacco', 'stage', 'user_role', 'incident', 'disciplinary_action'];
      if (saccoId) {
        query = query.in('entity_type', saccoRelatedEntityTypes);
      }

      // Apply additional filters
      if (filters?.actionType) {
        const term = filters.actionType.trim();
        // Match both "approve" and "approved" (and similar -ed variants) so filter works either way
        const stem = term.replace(/ed$/i, 'e');
        if (stem && stem !== term) {
          query = query.or(`action.ilike.%${term}%,action.ilike.%${stem}%`);
        } else {
          query = query.ilike('action', `%${term}%`);
        }
      }
      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters?.startDate) {
        // Start of day (inclusive)
        query = query.gte('created_at', `${filters.startDate}T00:00:00.000Z`);
      }
      if (filters?.endDate) {
        // End of day (inclusive) so logs on the selected date are included
        query = query.lte('created_at', `${filters.endDate}T23:59:59.999Z`);
      }

      const { data: logs, error } = await query;
      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }
      if (!logs || logs.length === 0) return [];

      // Filter logs related to this sacco if saccoId is provided
      let filteredLogs = logs;
      if (saccoId) {
        filteredLogs = logs.filter(log => {
          // Check if entity_id matches saccoId or if it's a related entity
          if (log.entity_id === saccoId) return true;
          
          // For riders, stages, etc., we'd need to check if they belong to this sacco
          // This is a simplified version - in production, you might want to join with related tables
          return true; // For now, return all logs and filter client-side if needed
        });
      }

      // Fetch user profiles for logs
      const userIds = [...new Set(filteredLogs.map(log => log.user_id).filter(Boolean) as string[])];
      let profilesMap = new Map<string, { full_name: string | null; email: string }>();
      let rolesMap = new Map<string, string>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profiles) {
          profilesMap = new Map(profiles.map(p => [p.id, { full_name: p.full_name, email: p.email }]));
        }

        // Fetch roles for these users
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds)
          .eq('county_id', countyId);

        if (roles) {
          // Get the primary role for each user (prefer sacco_admin, then sacco_officer)
          roles.forEach(r => {
            const existing = rolesMap.get(r.user_id);
            if (!existing || (r.role === 'sacco_admin' && existing !== 'sacco_admin')) {
              rolesMap.set(r.user_id, r.role);
            }
          });
        }
      }

      return filteredLogs.map(log => ({
        ...log,
        user: log.user_id ? profilesMap.get(log.user_id) || null : null,
        role: log.user_id ? rolesMap.get(log.user_id) || null : null,
      })) as SaccoAuditLog[];
    },
    enabled: !!countyId,
  });
}
