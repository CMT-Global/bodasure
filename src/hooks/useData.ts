import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Rider {
  id: string;
  county_id: string;
  owner_id: string | null;
  sacco_id: string | null;
  stage_id: string | null;
  user_id: string | null;
  full_name: string;
  id_number: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  address: string | null;
  photo_url: string | null;
  license_number: string | null;
  license_expiry: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  compliance_status: 'compliant' | 'non_compliant' | 'pending_review' | 'blacklisted';
  qr_code: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  owner?: { full_name: string } | null;
  sacco?: { name: string } | null;
  stage?: { name: string } | null;
}

export interface Sacco {
  id: string;
  county_id: string;
  name: string;
  registration_number: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  created_at: string;
}

export interface Stage {
  id: string;
  county_id: string;
  sacco_id: string | null;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  capacity: number | null;
  created_at: string;
  sacco?: { name: string } | null;
}

export interface Owner {
  id: string;
  county_id: string;
  user_id: string | null;
  full_name: string;
  id_number: string;
  phone: string;
  email: string | null;
  address: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  created_at: string;
}

export interface County {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
}

export interface Motorbike {
  id: string;
  county_id: string;
  owner_id: string;
  rider_id: string | null;
  registration_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  chassis_number: string | null;
  engine_number: string | null;
  photo_url: string | null;
  qr_code: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  created_at: string;
  owner?: { full_name: string } | null;
  rider?: { full_name: string } | null;
}

// Fetch riders with joined data
export function useRiders(countyId?: string) {
  return useQuery({
    queryKey: ['riders', countyId],
    queryFn: async () => {
      let query = supabase
        .from('riders')
        .select(`
          *,
          owner:owners(full_name),
          sacco:saccos(name),
          stage:stages(name)
        `)
        .order('created_at', { ascending: false });

      if (countyId) {
        query = query.eq('county_id', countyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Rider[];
    },
  });
}

// Fetch single rider
export function useRider(riderId: string) {
  return useQuery({
    queryKey: ['rider', riderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('riders')
        .select(`
          *,
          owner:owners(full_name),
          sacco:saccos(name),
          stage:stages(name)
        `)
        .eq('id', riderId)
        .single();

      if (error) throw error;
      return data as Rider;
    },
    enabled: !!riderId,
  });
}

// Fetch saccos
export function useSaccos(countyId?: string) {
  return useQuery({
    queryKey: ['saccos', countyId],
    queryFn: async () => {
      let query = supabase
        .from('saccos')
        .select('*')
        .order('name');

      if (countyId) {
        query = query.eq('county_id', countyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Sacco[];
    },
  });
}

// Fetch stages
export function useStages(countyId?: string, saccoId?: string) {
  return useQuery({
    queryKey: ['stages', countyId, saccoId],
    queryFn: async () => {
      let query = supabase
        .from('stages')
        .select(`*, sacco:saccos(name)`)
        .order('name');

      if (countyId) {
        query = query.eq('county_id', countyId);
      }
      if (saccoId) {
        query = query.eq('sacco_id', saccoId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Stage[];
    },
  });
}

// Fetch owners
export function useOwners(countyId?: string) {
  return useQuery({
    queryKey: ['owners', countyId],
    queryFn: async () => {
      let query = supabase
        .from('owners')
        .select('*')
        .order('full_name');

      if (countyId) {
        query = query.eq('county_id', countyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Owner[];
    },
  });
}

// Fetch motorbikes
export function useMotorbikes(countyId?: string) {
  return useQuery({
    queryKey: ['motorbikes', countyId],
    queryFn: async () => {
      let query = supabase
        .from('motorbikes')
        .select(`
          *,
          owner:owners(full_name),
          rider:riders(full_name)
        `)
        .order('created_at', { ascending: false });

      if (countyId) {
        query = query.eq('county_id', countyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Motorbike[];
    },
  });
}

// Fetch counties
export function useCounties() {
  return useQuery({
    queryKey: ['counties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('counties')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data as County[];
    },
  });
}

// Stats queries
export function useDashboardStats(countyId?: string) {
  return useQuery({
    queryKey: ['dashboard-stats', countyId],
    queryFn: async () => {
      const baseQuery = countyId ? { county_id: countyId } : {};

      const [riders, motorbikes, permits, payments, penalties, saccos] = await Promise.all([
        supabase.from('riders').select('id', { count: 'exact', head: true }).match(baseQuery),
        supabase.from('motorbikes').select('id', { count: 'exact', head: true }).match(baseQuery),
        supabase.from('permits').select('id', { count: 'exact', head: true }).match({ ...baseQuery, status: 'active' }),
        supabase.from('payments').select('amount').match({ ...baseQuery, status: 'completed' }),
        supabase.from('penalties').select('id', { count: 'exact', head: true }).match({ ...baseQuery, is_paid: false }),
        supabase.from('saccos').select('id', { count: 'exact', head: true }).match({ ...baseQuery, status: 'approved' }),
      ]);

      const totalRevenue = payments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      return {
        totalRiders: riders.count || 0,
        totalMotorbikes: motorbikes.count || 0,
        activePermits: permits.count || 0,
        totalRevenue,
        pendingPenalties: penalties.count || 0,
        activeSaccos: saccos.count || 0,
      };
    },
  });
}
