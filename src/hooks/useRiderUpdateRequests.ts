import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Table may be missing from generated types; use type assertion for from() and cast results.
const fromRiderUpdateRequests = () =>
  (supabase as { from: (table: string) => ReturnType<typeof supabase.from> }).from('rider_update_requests');

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

/** Request with joined rider/owner name and requester name for county list. */
export interface RiderUpdateRequestWithNames extends RiderUpdateRequest {
  riders?: { full_name: string } | null;
  owners?: { full_name: string } | null;
  requested_by_name?: string | null;
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
      const { data, error } = await fromRiderUpdateRequests()
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
      const { data, error } = await fromRiderUpdateRequests()
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
      qc.invalidateQueries({ queryKey: ['rider-owner-dashboard'] });
    },
  });
}

/** County admins: fetch rider update requests for their county (or all counties when countyId undefined), with rider/owner and requester names. */
export function useRiderUpdateRequestsByCounty(
  countyId: string | undefined,
  statusFilter?: 'pending' | 'approved' | 'rejected'
) {
  return useQuery({
    queryKey: ['rider-update-requests-by-county', countyId, statusFilter],
    queryFn: async (): Promise<RiderUpdateRequestWithNames[]> => {
      let q = fromRiderUpdateRequests()
        .select('*, riders(full_name), owners(full_name)')
        .order('created_at', { ascending: false });
      if (countyId) q = q.eq('county_id', countyId);
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      const requests = (data ?? []) as RiderUpdateRequestWithNames[];
      const requestedByIds = [...new Set(requests.map((r) => r.requested_by).filter(Boolean))];
      if (requestedByIds.length === 0) return requests;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', requestedByIds);
      const nameByUserId = new Map(
        (profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? null])
      );
      return requests.map((r) => ({
        ...r,
        requested_by_name: nameByUserId.get(r.requested_by) ?? null,
      }));
    },
    enabled: true,
  });
}

/** Sacco portal: fetch rider update requests for riders in the user's sacco (RLS filters). With rider/owner and requester names. */
export function useRiderUpdateRequestsForSacco(
  statusFilter?: 'pending' | 'approved' | 'rejected'
) {
  return useQuery({
    queryKey: ['rider-update-requests-for-sacco', statusFilter],
    queryFn: async (): Promise<RiderUpdateRequestWithNames[]> => {
      let q = fromRiderUpdateRequests()
        .select('*, riders(full_name), owners(full_name)')
        .order('created_at', { ascending: false });
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      const requests = (data ?? []) as RiderUpdateRequestWithNames[];
      const requestedByIds = [...new Set(requests.map((r) => r.requested_by).filter(Boolean))];
      if (requestedByIds.length === 0) return requests;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', requestedByIds);
      const nameByUserId = new Map(
        (profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? null])
      );
      return requests.map((r) => ({
        ...r,
        requested_by_name: nameByUserId.get(r.requested_by) ?? null,
      }));
    },
    enabled: true,
  });
}

export interface ReviewRiderUpdateRequestInput {
  requestId: string;
  action: 'approve' | 'reject';
  notes?: string | null;
  reviewedBy: string;
}

/** County admins: approve or reject a rider update request; on approve, apply payload where supported. */
export function useReviewRiderUpdateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReviewRiderUpdateRequestInput) => {
      const { data: rawReq, error: fetchErr } = await fromRiderUpdateRequests()
        .select('*')
        .eq('id', input.requestId)
        .single();
      if (fetchErr || !rawReq) throw new Error(fetchErr?.message ?? 'Request not found');
      const req = rawReq as RiderUpdateRequest;
      const status = input.action === 'approve' ? 'approved' : 'rejected';
      const { error: updateErr } = await fromRiderUpdateRequests()
        .update({
          status,
          reviewed_by: input.reviewedBy,
          reviewed_at: new Date().toISOString(),
          notes: input.notes ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.requestId);
      if (updateErr) throw updateErr;
      if (input.action === 'approve' && req.payload) {
        const payload = req.payload as Record<string, unknown>;
        if (req.request_type === 'phone') {
          const newPhone = payload.new_phone as string | undefined;
          if (newPhone != null && newPhone !== '') {
            if (req.rider_id) {
              const { error: riderErr } = await supabase
                .from('riders')
                .update({ phone: newPhone, updated_at: new Date().toISOString() })
                .eq('id', req.rider_id);
              if (riderErr) throw riderErr;
            }
            if (req.owner_id) {
              const { error: ownerErr } = await supabase
                .from('owners')
                .update({ phone: newPhone, updated_at: new Date().toISOString() })
                .eq('id', req.owner_id);
              if (ownerErr) throw ownerErr;
            }
          }
        }
        if (req.request_type === 'sacco_stage_transfer' && req.rider_id) {
          const newSaccoId = payload.new_sacco_id as string | undefined;
          const newStageId = payload.new_stage_id as string | undefined;
          const updates: { sacco_id?: string; stage_id?: string; updated_at: string } = {
            updated_at: new Date().toISOString(),
          };
          if (newSaccoId != null) updates.sacco_id = newSaccoId;
          if (newStageId != null) updates.stage_id = newStageId;
          if (Object.keys(updates).length > 1) {
            const { error: riderErr } = await supabase
              .from('riders')
              .update(updates)
              .eq('id', req.rider_id);
            if (riderErr) throw riderErr;
          }
        }
        if (req.request_type === 'owner_rider_reassignment' && payload.motorbike_id && req.owner_id) {
          const motorbikeId = payload.motorbike_id as string;
          const riderId = payload.rider_id as string | undefined;
          const { error: bikeErr } = await supabase
            .from('motorbikes')
            .update({
              rider_id: riderId ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', motorbikeId)
            .eq('owner_id', req.owner_id);
          if (bikeErr) throw bikeErr;
        }
      }
      return { id: input.requestId, status };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rider-update-requests-by-county'] });
      qc.invalidateQueries({ queryKey: ['rider-update-requests-for-sacco'] });
      qc.invalidateQueries({ queryKey: ['rider-update-requests'] });
      qc.invalidateQueries({ queryKey: ['rider-owner-profile'] });
      qc.invalidateQueries({ queryKey: ['rider-owner-dashboard'] });
      qc.invalidateQueries({ queryKey: ['riders'] });
      qc.invalidateQueries({ queryKey: ['owners'] });
    },
  });
}
