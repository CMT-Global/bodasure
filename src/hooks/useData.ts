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

// Enhanced rider interface with permit and motorbike info
export interface RiderWithDetails extends Rider {
  motorbike?: {
    id: string;
    registration_number: string;
  } | null;
  permit?: {
    id: string;
    permit_number: string;
    status: 'active' | 'expired' | 'pending' | 'suspended' | 'cancelled';
    expires_at: string | null;
  } | null;
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

// Fetch riders with permit and motorbike details for registration management
export function useRidersWithDetails(countyId?: string) {
  return useQuery({
    queryKey: ['riders-with-details', countyId],
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

      const { data: riders, error } = await query;
      if (error) throw error;

      if (!riders || riders.length === 0) {
        return [] as RiderWithDetails[];
      }

      const riderIds = riders.map(r => r.id);

      // Fetch all motorbikes for these riders in one query
      const { data: motorbikes } = await supabase
        .from('motorbikes')
        .select('id, registration_number, rider_id')
        .in('rider_id', riderIds);

      // Fetch all active/pending permits for these riders in one query
      const { data: permits } = await supabase
        .from('permits')
        .select('id, permit_number, status, expires_at, rider_id')
        .in('rider_id', riderIds)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });

      // Create maps for quick lookup
      const motorbikeMap = new Map(
        (motorbikes || []).map(m => [m.rider_id, { id: m.id, registration_number: m.registration_number }])
      );

      // For permits, get the most recent one per rider
      const permitMap = new Map<string, typeof permits[0]>();
      (permits || []).forEach(p => {
        if (!permitMap.has(p.rider_id)) {
          permitMap.set(p.rider_id, p);
        }
      });

      // Combine data
      const ridersWithDetails = (riders as Rider[]).map((rider) => {
        const motorbike = motorbikeMap.get(rider.id);
        const permitData = permitMap.get(rider.id);
        
        return {
          ...rider,
          motorbike: motorbike ? {
            id: motorbike.id,
            registration_number: motorbike.registration_number,
          } : null,
          permit: permitData ? {
            id: permitData.id,
            permit_number: permitData.permit_number,
            status: permitData.status as 'active' | 'expired' | 'pending' | 'suspended' | 'cancelled',
            expires_at: permitData.expires_at,
          } : null,
        } as RiderWithDetails;
      });

      return ridersWithDetails;
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
export interface DashboardStats {
  totalRiders: number;
  activePermits: number;
  expiredPermits: number;
  nonCompliantRiders: number;
  penaltiesIssued: number;
  penaltiesUnpaid: number;
  penaltiesPaid: number;
  totalRevenue: number;
}

export function useDashboardStats(countyId?: string) {
  return useQuery({
    queryKey: ['dashboard-stats', countyId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const baseQuery = countyId ? { county_id: countyId } : {};

      // Build queries
      let ridersQuery = supabase.from('riders').select('id', { count: 'exact', head: true });
      let activePermitsQuery = supabase.from('permits').select('id', { count: 'exact', head: true }).eq('status', 'active');
      let permitsForExpiryQuery = supabase.from('permits').select('id, status, expires_at');
      let nonCompliantRidersQuery = supabase.from('riders').select('id', { count: 'exact', head: true }).eq('compliance_status', 'non_compliant');
      let penaltiesTotalQuery = supabase.from('penalties').select('id', { count: 'exact', head: true });
      let penaltiesUnpaidQuery = supabase.from('penalties').select('id', { count: 'exact', head: true }).eq('is_paid', false);
      let penaltiesPaidQuery = supabase.from('penalties').select('id', { count: 'exact', head: true }).eq('is_paid', true);
      let paymentsQuery = supabase.from('payments').select('amount').eq('status', 'completed');

      // Apply county filter if provided
      if (countyId) {
        ridersQuery = ridersQuery.eq('county_id', countyId);
        activePermitsQuery = activePermitsQuery.eq('county_id', countyId);
        permitsForExpiryQuery = permitsForExpiryQuery.eq('county_id', countyId);
        nonCompliantRidersQuery = nonCompliantRidersQuery.eq('county_id', countyId);
        penaltiesTotalQuery = penaltiesTotalQuery.eq('county_id', countyId);
        penaltiesUnpaidQuery = penaltiesUnpaidQuery.eq('county_id', countyId);
        penaltiesPaidQuery = penaltiesPaidQuery.eq('county_id', countyId);
        paymentsQuery = paymentsQuery.eq('county_id', countyId);
      }

      // Execute all queries in parallel
      const [
        riders,
        activePermits,
        permitsData,
        nonCompliantRiders,
        penaltiesTotal,
        penaltiesUnpaid,
        penaltiesPaid,
        payments,
      ] = await Promise.all([
        ridersQuery,
        activePermitsQuery,
        permitsForExpiryQuery,
        nonCompliantRidersQuery,
        penaltiesTotalQuery,
        penaltiesUnpaidQuery,
        penaltiesPaidQuery,
        paymentsQuery,
      ]);

      // Calculate expired permits (status='expired' OR expires_at < now)
      const expiredPermitsCount = permitsData.data?.filter(
        (p) => p.status === 'expired' || (p.expires_at && new Date(p.expires_at) < new Date(now))
      ).length || 0;

      const totalRevenue = payments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      return {
        totalRiders: riders.count || 0,
        activePermits: activePermits.count || 0,
        expiredPermits: expiredPermitsCount,
        nonCompliantRiders: nonCompliantRiders.count || 0,
        penaltiesIssued: penaltiesTotal.count || 0,
        penaltiesUnpaid: penaltiesUnpaid.count || 0,
        penaltiesPaid: penaltiesPaid.count || 0,
        totalRevenue,
      } as DashboardStats;
    },
  });
}
