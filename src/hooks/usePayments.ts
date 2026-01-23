import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export function usePermitTypes(countyId: string) {
  return useQuery({
    queryKey: ['permit_types', countyId],
    queryFn: async () => {
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

export function usePermits(countyId: string) {
  return useQuery({
    queryKey: ['permits', countyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permits')
        .select(`
          *,
          permit_types(name, amount, duration_days),
          riders(full_name, phone),
          motorbikes(registration_number, make, model)
        `)
        .eq('county_id', countyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!countyId,
  });
}

export function usePayments(countyId: string) {
  return useQuery({
    queryKey: ['payments', countyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          riders(full_name, phone),
          permits(permit_number)
        `)
        .eq('county_id', countyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!countyId,
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
}

export function useInitializePayment() {
  return useMutation({
    mutationFn: async (params: InitializePaymentParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-initialize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );

      const data = await response.json();
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
        queryClient.invalidateQueries({ queryKey: ['riders'] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to verify payment');
    },
  });
}
