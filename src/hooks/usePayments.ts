import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/** Message shown when M-Pesa phone format is invalid. */
export const MPESA_PHONE_MESSAGE =
  'Use 5 digits (local) or 6–15 digits (with country code, no +).';

/**
 * Validates M-Pesa phone: optional; digits only; 5 (local) or 6–15 (with country code, no +).
 * @returns Error message if invalid, null if valid or empty (empty is allowed).
 */
export function validateMpesaPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return null;
  if (digits.length !== 5 && (digits.length < 6 || digits.length > 15)) {
    return MPESA_PHONE_MESSAGE;
  }
  return null;
}

export interface PermitType {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  duration_days: number;
  county_id: string;
  is_active: boolean;
}

export interface Payment {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  payment_reference: string | null;
  provider: string | null;
  provider_reference: string | null;
  payment_method: string | null;
  description: string | null;
  paid_at: string | null;
  created_at: string;
  rider_id: string | null;
  permit_id: string | null;
  county_id: string;
  metadata: Record<string, unknown> | null;
}

export interface Permit {
  id: string;
  permit_number: string;
  status: 'active' | 'expired' | 'pending' | 'suspended' | 'cancelled';
  issued_at: string | null;
  expires_at: string | null;
  amount_paid: number | null;
  rider_id: string;
  motorbike_id: string;
  permit_type_id: string;
  county_id: string;
  created_at: string;
}

export function usePermitTypes(countyId?: string) {
  return useQuery({
    queryKey: ['permit_types', countyId],
    queryFn: async () => {
      if (!countyId) return [];
      const { data, error } = await supabase
        .from('permit_types')
        .select('*')
        .eq('county_id', countyId)
        .eq('is_active', true)
        .order('amount', { ascending: true });
      
      if (error) throw error;
      return data as PermitType[];
    },
    enabled: !!countyId,
  });
}

/** Permit types for the current county, or all counties when countyId is undefined (e.g. super admin). Use on payments page to resolve permit_type_id to name for every payment. */
export function usePermitTypesForPayments(countyId: string | undefined) {
  return useQuery({
    queryKey: ['permit_types_for_payments', countyId],
    queryFn: async () => {
      let query = supabase
        .from('permit_types')
        .select('id, name, county_id')
        .eq('is_active', true)
        .order('amount', { ascending: true });
      if (countyId) {
        query = query.eq('county_id', countyId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Array<Pick<PermitType, 'id' | 'name' | 'county_id'>>;
    },
    enabled: true,
  });
}

export function usePermits(countyId: string | undefined) {
  return useQuery({
    queryKey: ['permits', countyId],
    queryFn: async () => {
      let query = supabase
        .from('permits')
        .select(`
          *,
          permit_types(name, amount, duration_days),
          riders(full_name, phone),
          motorbikes(registration_number, make, model)
        `)
        .order('created_at', { ascending: false });
      if (countyId) {
        query = query.eq('county_id', countyId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true,
  });
}

/** Single permit by id with permit_types (for PermitPaymentsDialog) */
export function usePermit(permitId: string | null) {
  return useQuery({
    queryKey: ['permit', permitId],
    queryFn: async () => {
      if (!permitId) return null;
      const { data, error } = await supabase
        .from('permits')
        .select(`
          id,
          permit_number,
          status,
          issued_at,
          expires_at,
          amount_paid,
          permit_types(name, amount, duration_days)
        `)
        .eq('id', permitId)
        .single();
      if (error) throw error;
      return data as {
        id: string;
        permit_number: string;
        status: string;
        issued_at: string | null;
        expires_at: string | null;
        amount_paid: number | null;
        permit_types: { name: string; amount: number; duration_days: number } | null;
      } | null;
    },
    enabled: !!permitId,
  });
}

/** Rider's permits with type and bike for duplicate-purchase check and expiry display */
export interface RiderPermitRow {
  id: string;
  permit_number: string;
  status: string;
  expires_at: string | null;
  permit_type_id: string;
  motorbike_id: string;
  permit_types: { name: string; duration_days: number } | null;
}

export function useRiderPermits(riderId: string | undefined) {
  return useQuery({
    queryKey: ['rider-permits', riderId],
    queryFn: async () => {
      if (!riderId) return [];
      const { data, error } = await supabase
        .from('permits')
        .select('id, permit_number, status, expires_at, permit_type_id, motorbike_id, permit_types(name, duration_days)')
        .eq('rider_id', riderId)
        .order('expires_at', { ascending: false });
      if (error) throw error;
      return (data || []) as RiderPermitRow[];
    },
    enabled: !!riderId,
  });
}

// Fetch payments for a specific permit
export function usePermitPayments(permitId: string) {
  return useQuery({
    queryKey: ['permit-payments', permitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          riders(full_name, phone)
        `)
        .eq('permit_id', permitId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Array<Payment & {
        riders: {
          full_name: string;
          phone: string;
        } | null;
      }>;
    },
    enabled: !!permitId,
  });
}

export function usePayments(countyId: string | undefined) {
  return useQuery({
    queryKey: ['payments', countyId],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          *,
          riders(id, full_name, phone),
          permits(permit_number, permit_type_id, permit_types(name))
        `)
        .order('created_at', { ascending: false });
      if (countyId) {
        query = query.eq('county_id', countyId);
      }
      const { data, error } = await query;
      if (error) throw error;
      type PaymentWithRelations = Payment & {
        riders: { id: string; full_name: string; phone: string } | null;
        permits: { permit_number: string; permit_type_id?: string; permit_types: { name: string } | null } | null;
      };
      // Normalize: PostgREST may return permits as object or single-element array in some edge cases
      const rows = (data || []) as unknown[];
      return rows.map((row: unknown) => {
        const r = row as Record<string, unknown>;
        const permits = r.permits;
        if (Array.isArray(permits) && permits.length === 1) {
          return { ...r, permits: permits[0] } as PaymentWithRelations;
        }
        return row as PaymentWithRelations;
      }) as PaymentWithRelations[];
    },
    enabled: true,
  });
}

// Fetch payment history for a specific rider
export function useRiderPaymentHistory(riderId: string, countyId?: string) {
  return useQuery({
    queryKey: ['rider-payment-history', riderId, countyId],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          *,
          permits(
            id,
            permit_number,
            status,
            issued_at,
            expires_at,
            permit_types(name, duration_days, amount)
          )
        `)
        .eq('rider_id', riderId)
        .order('created_at', { ascending: false });

      if (countyId) {
        query = query.eq('county_id', countyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Array<Payment & {
        permits: {
          id: string;
          permit_number: string;
          status: string;
          issued_at: string | null;
          expires_at: string | null;
          permit_types: {
            name: string;
            duration_days: number;
            amount: number;
          } | null;
        } | null;
      }>;
    },
    enabled: !!riderId,
    // When there are pending payments, poll so we pick up webhook updates (county shows paid; rider should too)
    refetchInterval: (query) => {
      const list = (query.state.data ?? []) as Payment[];
      const hasPending = list.some(
        (p) => p.status !== 'completed' && !p.paid_at
      );
      return hasPending ? 5000 : false;
    },
  });
}

interface InitializePaymentParams {
  amount: number;
  email: string;
  phone?: string;
  permit_type_id: string;
  rider_id: string;
  motorbike_id: string;
  county_id: string;
  /** Return path after payment (e.g. /dashboard/payments). Omit for rider-owner defaults. */
  return_path?: string;
}

export interface InitializePenaltyPaymentParams {
  penalty_id: string;
  amount: number;
  email: string;
  phone?: string;
  rider_id: string;
  county_id: string;
  /** Return path after payment (e.g. /dashboard/payments). Omit for rider-owner defaults. */
  return_path?: string;
}

export function useInitializePayment() {
  return useMutation({
    mutationFn: async (params: InitializePaymentParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-initialize`;
      const body = {
        ...params,
        app_origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      let data: { error?: string; data?: { authorization_url?: string }; success?: boolean };
      try {
        data = await response.json();
      } catch {
        const msg = response.status === 404
          ? 'Payment service unavailable. Deploy the paystack-initialize function to your Supabase project.'
          : response.status === 502 || response.status === 503
            ? 'Payment service temporarily unavailable. Try again in a moment.'
            : `Failed to initialize payment (${response.status})`;
        throw new Error(msg);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }
      return data;
    },
    onSuccess: (data) => {
      if (data.data?.authorization_url) {
        // Redirect to Paystack checkout
        window.open(data.data.authorization_url, '_blank');
        toast.success('Payment initiated. Complete the payment in the new tab.');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to initialize payment');
    },
  });
}

export function useInitializePenaltyPayment() {
  return useMutation({
    mutationFn: async (params: InitializePenaltyPaymentParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-initialize`;
      const body = {
        ...params,
        app_origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      let data: { error?: string; data?: { authorization_url?: string }; success?: boolean };
      try {
        data = await response.json();
      } catch {
        const msg = response.status === 404
          ? 'Payment service unavailable. Deploy the paystack-initialize function to your Supabase project.'
          : response.status === 502 || response.status === 503
            ? 'Payment service temporarily unavailable. Try again in a moment.'
            : `Failed to initialize payment (${response.status})`;
        throw new Error(msg);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }
      return data;
    },
    onSuccess: (data) => {
      if (data.data?.authorization_url) {
        window.open(data.data.authorization_url, '_blank');
        toast.success('Payment initiated. Complete the payment in the new tab.');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to initialize payment');
    },
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reference: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-verify?reference=${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify payment');
      }
      return data;
    },
    onSuccess: (data) => {
      if (data.data?.status === 'success') {
        toast.success('Payment verified successfully!');
        queryClient.invalidateQueries({ queryKey: ['payments'] });
        queryClient.invalidateQueries({ queryKey: ['permits'] });
        queryClient.invalidateQueries({ queryKey: ['rider-permits'] });
        queryClient.invalidateQueries({ queryKey: ['riders'] });
        queryClient.invalidateQueries({ queryKey: ['rider-payment-history'] });
        queryClient.invalidateQueries({ queryKey: ['rider-owner-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['monthly-revenue'] });
        queryClient.invalidateQueries({ queryKey: ['revenue-by-date-range'] });
        queryClient.invalidateQueries({ queryKey: ['revenue-by-county'] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to verify payment');
    },
  });
}
