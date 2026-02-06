import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SupportTicketCategory =
  | 'payment_issue'
  | 'wrong_details'
  | 'penalty_dispute'
  | 'sacco_stage_issue'
  | 'technical_issue';

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  user_id: string;
  county_id: string | null;
  category: SupportTicketCategory;
  subject: string;
  description: string;
  penalty_id: string | null;
  status: SupportTicketStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  // Optional joins
  penalty?: { id: string; penalty_type: string; amount: number; description: string | null } | null;
  creator?: { email?: string; full_name?: string } | null;
}

export const SUPPORT_CATEGORIES: { value: SupportTicketCategory; label: string }[] = [
  { value: 'payment_issue', label: 'Payment issue' },
  { value: 'wrong_details', label: 'Wrong details' },
  { value: 'penalty_dispute', label: 'Penalty dispute' },
  { value: 'sacco_stage_issue', label: 'Sacco/stage issue' },
  { value: 'technical_issue', label: 'Technical issue' },
];

export const SUPPORT_TICKET_STATUS_STYLES: Record<SupportTicketStatus, string> = {
  open: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  in_progress: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  resolved: 'bg-green-500/15 text-green-700 dark:text-green-400',
  closed: 'bg-muted text-muted-foreground',
};

export function useMySupportTickets(enabled = true) {
  return useQuery({
    queryKey: ['support-tickets', 'mine'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, user_id, county_id, category, subject, description, penalty_id, status, admin_notes, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as SupportTicket[];
    },
    enabled,
    refetchOnWindowFocus: true,
  });
}

export function useSupportTicketsForCounty(countyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['support-tickets', 'county', countyId],
    queryFn: async () => {
      let query = supabase
        .from('support_tickets')
        .select('id, user_id, county_id, category, subject, description, penalty_id, status, admin_notes, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (countyId) {
        query = query.eq('county_id', countyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as SupportTicket[];
    },
    enabled: enabled,
    refetchOnWindowFocus: true,
  });
}

export interface CreateSupportTicketInput {
  county_id: string | null;
  category: SupportTicketCategory;
  subject: string;
  description: string;
  penalty_id?: string | null;
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSupportTicketInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          county_id: input.county_id || null,
          category: input.category,
          subject: input.subject.trim(),
          description: input.description.trim(),
          penalty_id: input.penalty_id || null,
          status: 'open',
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}

export interface UpdateSupportTicketInput {
  status?: SupportTicketStatus;
  admin_notes?: string | null;
  county_id?: string | null;
}

export function useUpdateSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateSupportTicketInput & { id: string }) => {
      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}
