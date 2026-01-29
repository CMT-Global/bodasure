import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type RiderUpdateRequestType =
  | 'phone'
  | 'photo'
  | 'sacco_stage_transfer'
  | 'owner_rider_reassignment';

export interface RiderUpdateRequest {
  id: string;
  county_id: string;
  rider_id: string | null;
  owner_id: string | null;
  requested_by: string;
  request_type: RiderUpdateRequestType;
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitRiderUpdateRequestInput {
  county_id: string;
  rider_id?: string;
  owner_id?: string;
  request_type: RiderUpdateRequestType;
  payload: Record<string, unknown>;
}

export function useRiderUpdateRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ['rider-update-requests', userId],
    queryFn: async (): Promise<RiderUpdateRequest[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('rider_update_requests')
        .select('*')
        .eq('requested_by', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RiderUpdateRequest[];
    },
    enabled: !!userId,
  });
}

export function useSubmitRiderUpdateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: SubmitRiderUpdateRequestInput & { requested_by: string }
    ) => {
      const { data, error } = await supabase
        .from('rider_update_requests')
        .insert({
          county_id: input.county_id,
          rider_id: input.rider_id ?? null,
          owner_id: input.owner_id ?? null,
          requested_by: input.requested_by,
          request_type: input.request_type,
          payload: input.payload ?? {},
        })
        .select('id')
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rider-update-requests'] });
      qc.invalidateQueries({ queryKey: ['rider-owner-profile'] });
    },
  });
}
