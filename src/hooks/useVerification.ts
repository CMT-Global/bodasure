import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RiderWithDetails } from './useData';

// Search rider by QR code
export function useRiderByQRCode(qrCode: string, countyId?: string) {
  return useQuery({
    queryKey: ['rider-by-qr', qrCode, countyId],
    queryFn: async () => {
      if (!qrCode.trim()) return null;

      let query = supabase
        .from('riders')
        .select(`
          *,
          owner:owners(full_name),
          sacco:saccos(name),
          stage:stages(name)
        `)
        .eq('qr_code', qrCode.trim());

      if (countyId) {
        query = query.eq('county_id', countyId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;

      if (!data) return null;

      // Get motorbike and permit for this rider
      const [motorbikeResult, permitResult] = await Promise.all([
        supabase
          .from('motorbikes')
          .select('id, registration_number')
          .eq('rider_id', data.id)
          .eq('county_id', countyId || data.county_id)
          .maybeSingle(),
        supabase
          .from('permits')
          .select('id, permit_number, status, expires_at')
          .eq('rider_id', data.id)
          .eq('county_id', countyId || data.county_id)
          .in('status', ['active', 'pending'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        ...data,
        motorbike: motorbikeResult.data ? {
          id: motorbikeResult.data.id,
          registration_number: motorbikeResult.data.registration_number,
        } : null,
        permit: permitResult.data ? {
          id: permitResult.data.id,
          permit_number: permitResult.data.permit_number,
          status: permitResult.data.status as 'active' | 'expired' | 'pending' | 'suspended' | 'cancelled',
          expires_at: permitResult.data.expires_at,
        } : null,
      } as RiderWithDetails;
    },
    enabled: !!qrCode && qrCode.trim().length > 0,
  });
}

// Search rider by plate number
export function useRiderByPlate(plateNumber: string, countyId?: string) {
  return useQuery({
    queryKey: ['rider-by-plate', plateNumber, countyId],
    queryFn: async () => {
      if (!plateNumber.trim()) return null;

      // First find the motorbike by registration number
      let bikeQuery = supabase
        .from('motorbikes')
        .select('id, rider_id, registration_number')
        .ilike('registration_number', `%${plateNumber.trim()}%`);

      if (countyId) {
        bikeQuery = bikeQuery.eq('county_id', countyId);
      }

      const { data: bikes, error: bikeError } = await bikeQuery.limit(10);
      if (bikeError) throw bikeError;

      if (!bikes || bikes.length === 0) return null;

      // Get the first matching bike's rider
      const bike = bikes[0];
      if (!bike.rider_id) return null;

      // Fetch the rider with all details
      let riderQuery = supabase
        .from('riders')
        .select(`
          *,
          owner:owners(full_name),
          sacco:saccos(name),
          stage:stages(name)
        `)
        .eq('id', bike.rider_id)
        .single();

      const { data: rider, error: riderError } = await riderQuery;
      if (riderError) throw riderError;

      if (!rider) return null;

      // Get permit
      const { data: permit } = await supabase
        .from('permits')
        .select('id, permit_number, status, expires_at')
        .eq('rider_id', rider.id)
        .eq('county_id', countyId || rider.county_id)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...rider,
        motorbike: {
          id: bike.id,
          registration_number: bike.registration_number,
        },
        permit: permit ? {
          id: permit.id,
          permit_number: permit.permit_number,
          status: permit.status as 'active' | 'expired' | 'pending' | 'suspended' | 'cancelled',
          expires_at: permit.expires_at,
        } : null,
      } as RiderWithDetails;
    },
    enabled: !!plateNumber && plateNumber.trim().length > 0,
  });
}

// Search rider by name
export function useRiderByName(name: string, countyId?: string) {
  return useQuery({
    queryKey: ['rider-by-name', name, countyId],
    queryFn: async () => {
      if (!name.trim()) return null;

      let query = supabase
        .from('riders')
        .select(`
          *,
          owner:owners(full_name),
          sacco:saccos(name),
          stage:stages(name)
        `)
        .ilike('full_name', `%${name.trim()}%`)
        .limit(10);

      if (countyId) {
        query = query.eq('county_id', countyId);
      }

      const { data: riders, error } = await query;
      if (error) throw error;

      if (!riders || riders.length === 0) return null;

      // For now, return the first match. In a real app, you'd show a list
      const rider = riders[0];

      // Get motorbike and permit
      const [motorbikeResult, permitResult] = await Promise.all([
        supabase
          .from('motorbikes')
          .select('id, registration_number')
          .eq('rider_id', rider.id)
          .eq('county_id', countyId || rider.county_id)
          .maybeSingle(),
        supabase
          .from('permits')
          .select('id, permit_number, status, expires_at')
          .eq('rider_id', rider.id)
          .eq('county_id', countyId || rider.county_id)
          .in('status', ['active', 'pending'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        ...rider,
        motorbike: motorbikeResult.data ? {
          id: motorbikeResult.data.id,
          registration_number: motorbikeResult.data.registration_number,
        } : null,
        permit: permitResult.data ? {
          id: permitResult.data.id,
          permit_number: permitResult.data.permit_number,
          status: permitResult.data.status as 'active' | 'expired' | 'pending' | 'suspended' | 'cancelled',
          expires_at: permitResult.data.expires_at,
        } : null,
      } as RiderWithDetails;
    },
    enabled: !!name && name.trim().length > 0,
  });
}
