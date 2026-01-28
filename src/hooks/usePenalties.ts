import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EscalationRule } from './useCountySettings';

export interface Penalty {
  id: string;
  county_id: string;
  rider_id: string;
  issued_by: string | null;
  penalty_type: string;
  description: string | null;
  amount: number;
  is_paid: boolean;
  payment_id: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  riders?: {
    id: string;
    full_name: string;
    phone: string;
    id_number: string;
    compliance_status: string;
    status: string;
  } | null;
  issued_by_user?: {
    full_name: string | null;
  } | null;
}

export interface PenaltyWithRepeatInfo extends Penalty {
  repeat_offender: boolean;
  penalty_count: number;
}

// Helper function to calculate escalated penalty amount
async function calculateEscalatedPenalty(
  baseAmount: number,
  riderId: string,
  countyId: string,
  escalationRules: EscalationRule[]
): Promise<{ amount: number; multiplier: number; ruleDescription?: string }> {
  // Count previous penalties for this rider
  const { data: previousPenalties, error } = await supabase
    .from('penalties')
    .select('id')
    .eq('rider_id', riderId)
    .eq('county_id', countyId);

  if (error) {
    console.error('Error fetching previous penalties:', error);
    return { amount: baseAmount, multiplier: 1 };
  }

  const offenseCount = (previousPenalties?.length || 0) + 1; // +1 for the current penalty being created

  // Find the highest applicable escalation rule
  let applicableRule: EscalationRule | null = null;
  for (const rule of escalationRules.sort((a, b) => b.offenseCount - a.offenseCount)) {
    if (offenseCount >= rule.offenseCount) {
      applicableRule = rule;
      break;
    }
  }

  if (applicableRule) {
    const escalatedAmount = Math.round(baseAmount * applicableRule.multiplier);
    return {
      amount: escalatedAmount,
      multiplier: applicableRule.multiplier,
      ruleDescription: applicableRule.description,
    };
  }

  return { amount: baseAmount, multiplier: 1 };
}

// Fetch penalties with rider info
export function usePenalties(countyId?: string) {
  return useQuery({
    queryKey: ['penalties', countyId],
    queryFn: async () => {
      if (!countyId) return [];

      const { data, error } = await supabase
        .from('penalties')
        .select(`
          *,
          riders(id, full_name, phone, id_number, compliance_status, status)
        `)
        .eq('county_id', countyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get penalty counts per rider to identify repeat offenders
      const penaltyCounts = new Map<string, number>();
      (data || []).forEach((penalty: any) => {
        const count = penaltyCounts.get(penalty.rider_id) || 0;
        penaltyCounts.set(penalty.rider_id, count + 1);
      });

      // Enrich with repeat offender info
      return (data || []).map((penalty: any) => ({
        ...penalty,
        repeat_offender: (penaltyCounts.get(penalty.rider_id) || 0) > 1,
        penalty_count: penaltyCounts.get(penalty.rider_id) || 1,
      })) as PenaltyWithRepeatInfo[];
    },
    enabled: !!countyId,
  });
}

// Fetch penalties for a specific rider
export function useRiderPenalties(riderId: string, countyId?: string) {
  return useQuery({
    queryKey: ['rider-penalties', riderId, countyId],
    queryFn: async () => {
      let query = supabase
        .from('penalties')
        .select('*')
        .eq('rider_id', riderId)
        .order('created_at', { ascending: false });

      if (countyId) {
        query = query.eq('county_id', countyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Penalty[];
    },
    enabled: !!riderId,
  });
}

// Create penalty
export function useCreatePenalty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (penalty: {
      county_id: string;
      rider_id: string;
      penalty_type: string;
      description?: string;
      amount: number;
      due_date?: string;
      applyEscalation?: boolean; // Optional flag to apply escalation
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Check for duplicate penalty (same rider, same type, within last 1 hour)
      // This prevents accidental duplicate submissions
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentPenalty } = await supabase
        .from('penalties')
        .select('id')
        .eq('rider_id', penalty.rider_id)
        .eq('penalty_type', penalty.penalty_type)
        .eq('county_id', penalty.county_id)
        .eq('issued_by', session.user.id)
        .gte('created_at', oneHourAgo)
        .single();

      if (recentPenalty) {
        throw new Error('A similar penalty was recently issued for this rider. Please wait before issuing another.');
      }

      let finalAmount = penalty.amount;
      let escalationDescription = '';

      // Apply escalation if enabled (default: true)
      if (penalty.applyEscalation !== false) {
        // Fetch county settings for escalation rules
        const { data: county } = await supabase
          .from('counties')
          .select('settings')
          .eq('id', penalty.county_id)
          .single();

        if (county?.settings) {
          const settings = county.settings as any;
          const escalationRules = settings.penaltySettings?.escalationRules || [];
          
          if (escalationRules.length > 0) {
            const escalated = await calculateEscalatedPenalty(
              penalty.amount,
              penalty.rider_id,
              penalty.county_id,
              escalationRules
            );
            finalAmount = escalated.amount;
            if (escalated.ruleDescription) {
              escalationDescription = ` (${escalated.ruleDescription})`;
            }
          }
        }
      }

      const { data, error } = await supabase
        .from('penalties')
        .insert({
          ...penalty,
          amount: finalAmount,
          description: penalty.description ? `${penalty.description}${escalationDescription}` : escalationDescription.trim() || null,
          issued_by: session.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penalties'] });
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      toast.success('Penalty issued successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to issue penalty');
    },
  });
}

// Update penalty status (mark as paid, waived, etc.)
export function useUpdatePenaltyStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      penaltyId,
      isPaid,
      paymentId,
    }: {
      penaltyId: string;
      isPaid: boolean;
      paymentId?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('penalties')
        .update({
          is_paid: isPaid,
          payment_id: paymentId,
          paid_at: isPaid ? new Date().toISOString() : null,
        })
        .eq('id', penaltyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penalties'] });
      toast.success('Penalty status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update penalty status');
    },
  });
}

// Waive penalty (admin only)
export function useWaivePenalty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (penaltyId: string) => {
      // First, get the current penalty to preserve its description
      const { data: currentPenalty, error: fetchError } = await supabase
        .from('penalties')
        .select('description')
        .eq('id', penaltyId)
        .single();

      if (fetchError) throw fetchError;

      // Add [WAIVED] marker to description to distinguish from admin-completed
      const updatedDescription = currentPenalty?.description 
        ? `${currentPenalty.description} [WAIVED]`
        : '[WAIVED]';

      const { data, error } = await supabase
        .from('penalties')
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          description: updatedDescription,
          payment_id: null, // Ensure payment_id is null for waived penalties
        })
        .eq('id', penaltyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penalties'] });
      toast.success('Penalty waived successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to waive penalty');
    },
  });
}

// Update rider compliance status (for automatic non-compliance)
export function useUpdateRiderCompliance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      riderId,
      complianceStatus,
    }: {
      riderId: string;
      complianceStatus: 'compliant' | 'non_compliant' | 'pending_review' | 'blacklisted';
    }) => {
      const { data, error } = await supabase
        .from('riders')
        .update({ compliance_status: complianceStatus })
        .eq('id', riderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      queryClient.invalidateQueries({ queryKey: ['penalties'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update compliance status');
    },
  });
}

// Update rider status (suspend/blacklist)
export function useUpdateRiderStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      riderId,
      status,
      complianceStatus,
    }: {
      riderId: string;
      status?: 'pending' | 'approved' | 'rejected' | 'suspended';
      complianceStatus?: 'compliant' | 'non_compliant' | 'pending_review' | 'blacklisted';
    }) => {
      const updates: Record<string, any> = {};
      if (status) updates.status = status;
      if (complianceStatus) updates.compliance_status = complianceStatus;

      const { data, error } = await supabase
        .from('riders')
        .update(updates)
        .eq('id', riderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      queryClient.invalidateQueries({ queryKey: ['penalties'] });
      toast.success('Rider status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update rider status');
    },
  });
}

// Check for expired permits and create automatic penalties
export function useCheckExpiredPermits(countyId?: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      if (!countyId) throw new Error('County ID required');

      // Fetch county settings
      const { data: county, error: settingsError } = await supabase
        .from('counties')
        .select('settings')
        .eq('id', countyId)
        .single();

      if (settingsError) throw settingsError;

      const settings = (county?.settings as any) || {};
      const permitSettings = settings.permitSettings || { gracePeriodDays: 7 };
      const penaltySettings = settings.penaltySettings || {
        autoPenaltyEnabled: true,
        penaltyTypes: [],
        escalationRules: [],
      };

      // Check if auto-penalty is enabled
      if (!penaltySettings.autoPenaltyEnabled) {
        return { created: 0, updated: 0, skipped: 0, message: 'Auto-penalty is disabled in settings' };
      }

      // Get grace period
      const gracePeriodDays = permitSettings.gracePeriodDays || 7;
      const gracePeriodMs = gracePeriodDays * 24 * 60 * 60 * 1000;

      // Calculate cutoff date (permits expired before this date are past grace period)
      const now = new Date();
      const gracePeriodCutoff = new Date(now.getTime() - gracePeriodMs);

      // Get all active permits that have expired past the grace period
      const { data: expiredPermits, error: permitsError } = await supabase
        .from('permits')
        .select('id, rider_id, expires_at, county_id')
        .eq('county_id', countyId)
        .eq('status', 'active')
        .lt('expires_at', gracePeriodCutoff.toISOString());

      if (permitsError) throw permitsError;

      if (!expiredPermits || expiredPermits.length === 0) {
        return { created: 0, updated: 0, skipped: 0 };
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Find the "Expired Permit" penalty type from settings
      const expiredPermitType = penaltySettings.penaltyTypes?.find(
        (pt: any) => pt.name === 'Expired Permit' || pt.name === 'Expired permit'
      );
      const basePenaltyAmount = expiredPermitType?.amount || 5000; // Default fallback
      const escalationRules = penaltySettings.escalationRules || [];

      let created = 0;
      let updated = 0;
      let skipped = 0;

      // For each expired permit, check if penalty already exists and create if not
      for (const permit of expiredPermits) {
        // Check if penalty already exists for this permit expiry (within last 30 days to avoid duplicates)
        const { data: existingPenalty } = await supabase
          .from('penalties')
          .select('id')
          .eq('rider_id', permit.rider_id)
          .eq('penalty_type', 'Expired permit')
          .eq('county_id', countyId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (existingPenalty) {
          skipped++;
          continue;
        }

        // Calculate escalated penalty amount
        const escalated = await calculateEscalatedPenalty(
          basePenaltyAmount,
          permit.rider_id,
          countyId,
          escalationRules
        );

        // Create penalty for expired permit
        const description = `Automatic penalty for expired permit${escalated.ruleDescription ? ` (${escalated.ruleDescription})` : ''}`;
        
        const { error: penaltyError } = await supabase
          .from('penalties')
          .insert({
            county_id: permit.county_id,
            rider_id: permit.rider_id,
            issued_by: session.user.id,
            penalty_type: 'Expired permit',
            description: description,
            amount: escalated.amount,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          });

        if (!penaltyError) {
          created++;

          // Update rider compliance status to non_compliant
          await supabase
            .from('riders')
            .update({ compliance_status: 'non_compliant' })
            .eq('id', permit.rider_id);
          
          updated++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['penalties'] });
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      queryClient.invalidateQueries({ queryKey: ['permits'] });

      return { created, updated, skipped };
    },
    onSuccess: (result) => {
      const message = `Processed ${result.created} new penalties, updated ${result.updated} riders${result.skipped > 0 ? `, skipped ${result.skipped} (already penalized)` : ''}`;
      toast.success(message);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to check expired permits');
    },
  });
}
