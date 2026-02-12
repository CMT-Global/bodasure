import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RiderWithDetails } from './useData';

type PublicMotorbikePayload = {
  id: string;
  registration_number: string;
  make: string | null;
  model: string | null;
  color: string | null;
  year: number | null;
  chassis_number: string | null;
  engine_number: string | null;
} | null;

type PublicRiderPayload = {
  id: string;
  county_id: string;
  full_name: string;
  photo_url: string | null;
  compliance_status: string;
  county_name: string | null;
  sacco_name: string | null;
  stage_name: string | null;
  owner: null;
  sacco: { name: string } | null;
  stage: { name: string } | null;
  permit: { id: string; permit_number: string; status: string; expires_at: string | null } | null;
  motorbike: PublicMotorbikePayload;
};

function mapPublicRiderPayload(
  p: PublicRiderPayload,
  opts?: { qrCode?: string }
): RiderWithDetails & { countyName?: string | null } {
  return {
    id: p.id,
    county_id: p.county_id,
    full_name: p.full_name,
    photo_url: p.photo_url ?? null,
    owner: p.owner ?? null,
    sacco: p.sacco ?? (p.sacco_name ? { name: p.sacco_name } : null),
    stage: p.stage ?? (p.stage_name ? { name: p.stage_name } : null),
    permit: p.permit
      ? {
          id: p.permit.id,
          permit_number: p.permit.permit_number,
          status: p.permit.status as 'active' | 'expired' | 'pending' | 'suspended' | 'cancelled',
          expires_at: p.permit.expires_at,
        }
      : null,
    motorbike: p.motorbike
      ? {
          id: p.motorbike.id,
          registration_number: p.motorbike.registration_number,
          make: p.motorbike.make ?? null,
          model: p.motorbike.model ?? null,
          color: p.motorbike.color ?? null,
          year: p.motorbike.year ?? null,
          chassis_number: p.motorbike.chassis_number ?? null,
          engine_number: p.motorbike.engine_number ?? null,
        }
      : null,
    countyName: p.county_name ?? null,
    compliance_status: (p.compliance_status ?? 'pending_review') as 'compliant' | 'non_compliant' | 'pending_review' | 'blacklisted',
    owner_id: null,
    sacco_id: null,
    stage_id: null,
    user_id: null,
    id_number: '',
    phone: '',
    email: null,
    date_of_birth: null,
    address: null,
    license_number: null,
    license_expiry: null,
    status: 'approved',
    qr_code: opts?.qrCode ?? '',
    created_at: '',
    updated_at: '',
  };
}

// Extract verification ID from scanned value: full URL (e.g. http://localhost:8080/verify/BS75D043E210D2) -> hex only
function normalizeQrScannedValue(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/\/verify\/([^/?#]+)/i);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return trimmed;
}

// Search rider by QR code (uses RPC for public/anon when countyId is undefined; direct query when county-scoped)
export function useRiderByQRCode(qrCode: string, countyId?: string) {
  return useQuery({
    queryKey: ['rider-by-qr', qrCode, countyId],
    queryFn: async () => {
      if (!qrCode.trim()) return null;

      const trimmed = normalizeQrScannedValue(qrCode);

      // Public verification (no countyId): anon cannot read riders table due to RLS; use SECURITY DEFINER RPC
      if (countyId === undefined) {
        const { data: payload, error } = await supabase.rpc('get_public_rider_by_qr', { qr: trimmed });
        if (error) throw error;
        if (payload == null) return null;
        return mapPublicRiderPayload(payload as PublicRiderPayload, { qrCode: trimmed });
      }

      // County-scoped (logged-in user): use direct table query
      let query = supabase
        .from('riders')
        .select(`
          *,
          owner:owners(full_name),
          sacco:saccos(name),
          stage:stages(name)
        `)
        .eq('qr_code', trimmed);

      if (countyId) {
        query = query.eq('county_id', countyId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;

      if (!data) return null;

      const [motorbikeResult, permitResult] = await Promise.all([
        supabase
          .from('motorbikes')
          .select('id, registration_number, make, model, color, year, chassis_number, engine_number')
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
          make: motorbikeResult.data.make ?? null,
          model: motorbikeResult.data.model ?? null,
          color: motorbikeResult.data.color ?? null,
          year: motorbikeResult.data.year ?? null,
          chassis_number: motorbikeResult.data.chassis_number ?? null,
          engine_number: motorbikeResult.data.engine_number ?? null,
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

// Search rider by plate number (uses RPC for public/anon when countyId is undefined; direct query when county-scoped)
export function useRiderByPlate(plateNumber: string, countyId?: string) {
  return useQuery({
    queryKey: ['rider-by-plate', plateNumber, countyId],
    queryFn: async () => {
      if (!plateNumber.trim()) return null;

      const trimmed = plateNumber.trim();

      // Public verification (no countyId): anon cannot read motorbikes/riders due to RLS; use SECURITY DEFINER RPC
      if (countyId === undefined) {
        const { data: payload, error } = await supabase.rpc('get_public_rider_by_plate', { plate_number: trimmed });
        if (error) throw error;
        if (payload == null) return null;
        return mapPublicRiderPayload(payload as PublicRiderPayload);
      }

      // County-scoped (logged-in user): use direct table queries
      let bikeQuery = supabase
        .from('motorbikes')
        .select('id, rider_id, registration_number, make, model, color, year, chassis_number, engine_number')
        .ilike('registration_number', `%${trimmed}%`);

      if (countyId) {
        bikeQuery = bikeQuery.eq('county_id', countyId);
      }

      const { data: bikes, error: bikeError } = await bikeQuery.limit(10);
      if (bikeError) throw bikeError;

      if (!bikes || bikes.length === 0) return null;

      const bike = bikes[0];
      if (!bike.rider_id) return null;

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
          make: bike.make ?? null,
          model: bike.model ?? null,
          color: bike.color ?? null,
          year: bike.year ?? null,
          chassis_number: bike.chassis_number ?? null,
          engine_number: bike.engine_number ?? null,
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
          .select('id, registration_number, make, model, color, year, chassis_number, engine_number')
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
          make: motorbikeResult.data.make ?? null,
          model: motorbikeResult.data.model ?? null,
          color: motorbikeResult.data.color ?? null,
          year: motorbikeResult.data.year ?? null,
          chassis_number: motorbikeResult.data.chassis_number ?? null,
          engine_number: motorbikeResult.data.engine_number ?? null,
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
