import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Rider {
  id: string;
  county_id: string;
  owner_id: string | null;
  sacco_id: string | null;
  welfare_group_id: string | null;
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
  welfare_group?: { name: string } | null;
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
  // Enriched fields
  member_count?: number;
  stages_count?: number;
  compliance_rate?: number;
  penalties_count?: number;
  non_compliant_count?: number;
}

/** Welfare Group — first-class entity with profile, officials, members, stages, compliance (parallel to Sacco). */
export interface WelfareGroup {
  id: string;
  county_id: string;
  name: string;
  registration_number: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  settings?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Enriched fields
  member_count?: number;
  stages_count?: number;
  compliance_rate?: number;
  penalties_count?: number;
  non_compliant_count?: number;
}

export interface Stage {
  id: string;
  county_id: string;
  sacco_id: string | null;
  welfare_group_id: string | null;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  capacity: number | null;
  created_at: string;
  sacco?: { name: string } | null;
  welfare_group?: { name: string } | null;
  // Enriched fields
  member_count?: number;
  compliance_rate?: number;
  penalties_count?: number;
  non_compliant_count?: number;
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
  logo_url?: string | null;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  settings?: Record<string, unknown> | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  created_at?: string;
  updated_at?: string;
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
          welfare_group:welfare_groups(name),
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

/** Dashboard data for rider/owner portal: rider by user_id + bikes, permits, penalties, last payment */
export interface RiderOwnerDashboardData {
  rider: Rider | null;
  owner: Owner | null;
  motorbikes: Array<{ id: string; registration_number: string }>;
  ownedBikesCount: number;
  permits: Array<{
    id: string;
    permit_number: string;
    status: 'active' | 'expired' | 'pending' | 'suspended' | 'cancelled';
    expires_at: string | null;
  }>;
  outstandingPenalties: Array<{ id: string; amount: number; penalty_type: string; description: string | null }>;
  outstandingPenaltiesTotal: number;
  lastPayment: { paid_at: string | null; amount: number } | null;
}

/** Rider snippet for owned-bike cards and rider-details popup (owner view). */
export interface RiderOwnerProfileBikeRider {
  full_name: string;
  phone?: string | null;
  qr_code?: string | null;
  id_number?: string | null;
}

/** Profile & Registration: rider + county, bikes with make/model, owner + owned bikes when applicable */
export interface RiderOwnerProfileBike {
  id: string;
  registration_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  chassis_number: string | null;
  engine_number: string | null;
  rider?: RiderOwnerProfileBikeRider | null;
}

export interface RiderOwnerProfileData {
  rider: (Rider & { county?: { name: string } | null }) | null;
  motorbikes: RiderOwnerProfileBike[];
  owner: (Owner & {}) | null;
  ownedBikes: RiderOwnerProfileBike[];
}

const EXPIRING_SOON_DAYS = 30;

/** Escape % and _ for use in ilike so they match literally (case-insensitive email match). */
function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function useRiderOwnerDashboard(userId: string | undefined) {
  return useQuery({
    queryKey: ['rider-owner-dashboard', userId],
    queryFn: async (): Promise<RiderOwnerDashboardData> => {
      if (!userId) {
        return {
          rider: null,
          owner: null,
          motorbikes: [],
          ownedBikesCount: 0,
          permits: [],
          outstandingPenalties: [],
          outstandingPenaltiesTotal: 0,
          lastPayment: null,
        };
      }

      const riderSelect = `
          *,
          owner:owners(full_name),
          sacco:saccos(name),
          welfare_group:welfare_groups(name),
          stage:stages(name)
        `;

      let riderRow = await supabase
        .from('riders')
        .select(riderSelect)
        .eq('user_id', userId)
        .maybeSingle();
      if (riderRow.error) throw riderRow.error;
      let rider = riderRow.data as Rider | null;

      // If no rider, check for owner so owner-only users see dashboard content
      let owner: Owner | null = null;
      let ownedBikesCount = 0;
      if (!rider) {
        const { data: ownerRow, error: ownerError } = await supabase
          .from('owners')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (!ownerError) owner = ownerRow as Owner | null;
        if (owner) {
          const { count } = await supabase
            .from('motorbikes')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', owner.id);
          ownedBikesCount = count ?? 0;
        }
        if (owner) {
          return {
            rider: null,
            owner,
            motorbikes: [],
            ownedBikesCount,
            permits: [],
            outstandingPenalties: [],
            outstandingPenaltiesTotal: 0,
            lastPayment: null,
          };
        }

        // Fallback: link by email when user_id is not set (e.g. existing rider/owner records)
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const userEmail = authUser?.email?.trim().toLowerCase();
        if (userEmail) {
          // Case-insensitive match so rider created with different email casing still links
          const { data: ridersByEmail, error: riderEmailErr } = await supabase
            .from('riders')
            .select('id')
            .ilike('email', escapeIlike(userEmail))
            .limit(1);
          const riderByEmail = !riderEmailErr && ridersByEmail?.length ? ridersByEmail[0] : null;
          if (riderByEmail) {
            const { error: updateErr } = await supabase.from('riders').update({ user_id: userId }).eq('id', riderByEmail.id);
            if (!updateErr) {
              const { data: linkedRider, error: linkedErr } = await supabase
                .from('riders')
                .select(riderSelect)
                .eq('id', riderByEmail.id)
                .single();
              if (!linkedErr) rider = linkedRider as Rider;
            }
          }
          if (!rider) {
            const { data: ownersByEmail, error: ownerEmailErr } = await supabase
              .from('owners')
              .select('*')
              .ilike('email', escapeIlike(userEmail))
              .limit(1);
            const ownerByEmail = !ownerEmailErr && ownersByEmail?.length ? ownersByEmail[0] : null;
            if (ownerByEmail) {
              const { error: ownerUpdateErr } = await supabase.from('owners').update({ user_id: userId }).eq('id', ownerByEmail.id);
              if (!ownerUpdateErr) {
                owner = ownerByEmail as Owner;
                const { count } = await supabase
                  .from('motorbikes')
                  .select('id', { count: 'exact', head: true })
                  .eq('owner_id', owner.id);
                ownedBikesCount = count ?? 0;
                return {
                  rider: null,
                  owner,
                  motorbikes: [],
                  ownedBikesCount,
                  permits: [],
                  outstandingPenalties: [],
                  outstandingPenaltiesTotal: 0,
                  lastPayment: null,
                };
              }
            }
          }
        }

        if (!rider) {
          return {
            rider: null,
            owner: null,
            motorbikes: [],
            ownedBikesCount: 0,
            permits: [],
            outstandingPenalties: [],
            outstandingPenaltiesTotal: 0,
            lastPayment: null,
          };
        }
      }

      const [motorbikesRes, permitsRes, penaltiesRes, lastPaymentRes] = await Promise.all([
        supabase
          .from('motorbikes')
          .select('id, registration_number')
          .eq('rider_id', rider.id),
        supabase
          .from('permits')
          .select('id, permit_number, status, expires_at')
          .eq('rider_id', rider.id)
          .order('expires_at', { ascending: false }),
        supabase
          .from('penalties')
          .select('id, amount, penalty_type, description')
          .eq('rider_id', rider.id)
          .eq('is_paid', false),
        supabase
          .from('payments')
          .select('paid_at, amount')
          .eq('rider_id', rider.id)
          .order('paid_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const motorbikes = (motorbikesRes.data || []).map((m) => ({
        id: m.id,
        registration_number: m.registration_number,
      }));
      const permits = (permitsRes.data || []).map((p) => ({
        id: p.id,
        permit_number: p.permit_number,
        status: p.status as 'active' | 'expired' | 'pending' | 'suspended' | 'cancelled',
        expires_at: p.expires_at,
      }));
      const outstandingPenalties = (penaltiesRes.data || []).map((p) => ({
        id: p.id,
        amount: p.amount,
        penalty_type: p.penalty_type,
        description: p.description,
      }));
      const outstandingPenaltiesTotal = outstandingPenalties.reduce((sum, p) => sum + p.amount, 0);
      const lastPayment = lastPaymentRes.data
        ? {
            paid_at: lastPaymentRes.data.paid_at,
            amount: lastPaymentRes.data.amount,
          }
        : null;

      return {
        rider,
        owner: null,
        motorbikes,
        ownedBikesCount: 0,
        permits,
        outstandingPenalties,
        outstandingPenaltiesTotal,
        lastPayment,
      };
    },
    enabled: !!userId,
  });
}

const riderProfileSelect = `
          *,
          owner:owners(full_name),
          sacco:saccos(name),
          welfare_group:welfare_groups(name),
          stage:stages(name),
          county:counties(name)
        `;

export function useRiderOwnerProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['rider-owner-profile', userId],
    queryFn: async (): Promise<RiderOwnerProfileData> => {
      if (!userId) {
        return { rider: null, motorbikes: [], owner: null, ownedBikes: [] };
      }

      const { data: riderRow, error: riderError } = await supabase
        .from('riders')
        .select(riderProfileSelect)
        .eq('user_id', userId)
        .maybeSingle();

      if (riderError) throw riderError;
      let rider = riderRow as (Rider & { county?: { name: string } | null }) | null;

      const { data: ownerRow, error: ownerError } = await supabase
        .from('owners')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (ownerError) throw ownerError;
      let owner = ownerRow as Owner | null;

      // Fallback: link by email when user_id is not set (e.g. existing rider/owner records)
      if (!rider && !owner) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const userEmail = authUser?.email?.trim().toLowerCase();
        if (userEmail) {
          const { data: ridersByEmail, error: riderEmailErr } = await supabase
            .from('riders')
            .select('id')
            .ilike('email', escapeIlike(userEmail))
            .limit(1);
          const riderByEmail = !riderEmailErr && ridersByEmail?.length ? ridersByEmail[0] : null;
          if (riderByEmail) {
            const { error: updateErr } = await supabase.from('riders').update({ user_id: userId }).eq('id', riderByEmail.id);
            if (!updateErr) {
              const { data: linkedRider, error: linkedErr } = await supabase
                .from('riders')
                .select(riderProfileSelect)
                .eq('id', riderByEmail.id)
                .single();
              if (!linkedErr) rider = linkedRider as (Rider & { county?: { name: string } | null }) | null;
            }
          }
          if (!rider) {
            const { data: ownersByEmail, error: ownerEmailErr } = await supabase
              .from('owners')
              .select('*')
              .ilike('email', escapeIlike(userEmail))
              .limit(1);
            const ownerByEmail = !ownerEmailErr && ownersByEmail?.length ? ownersByEmail[0] : null;
            if (ownerByEmail) {
              const { error: ownerUpdateErr } = await supabase.from('owners').update({ user_id: userId }).eq('id', ownerByEmail.id);
              if (!ownerUpdateErr) owner = ownerByEmail as Owner | null;
            }
          }
        }
      }

      let motorbikes: RiderOwnerProfileBike[] = [];
      if (rider) {
        const { data: bikes } = await supabase
          .from('motorbikes')
          .select('id, registration_number, make, model, year, color, chassis_number, engine_number, rider:riders(full_name)')
          .eq('rider_id', rider.id);
        motorbikes = (bikes || []).map((m: Record<string, unknown>) => ({
          id: m.id as string,
          registration_number: m.registration_number as string,
          make: (m.make as string | null) ?? null,
          model: (m.model as string | null) ?? null,
          year: (m.year as number | null) ?? null,
          color: (m.color as string | null) ?? null,
          chassis_number: (m.chassis_number as string | null) ?? null,
          engine_number: (m.engine_number as string | null) ?? null,
          rider: (m.rider as { full_name: string } | null) ?? null,
        }));
      }

      let ownedBikes: RiderOwnerProfileBike[] = [];
      if (owner) {
        const { data: bikes } = await supabase
          .from('motorbikes')
          .select('id, registration_number, make, model, year, color, chassis_number, engine_number, rider:riders(full_name, phone, qr_code, id_number)')
          .eq('owner_id', owner.id);
        ownedBikes = (bikes || []).map((m: Record<string, unknown>) => {
          const r = m.rider as { full_name: string; phone?: string | null; qr_code?: string | null; id_number?: string | null } | null;
          return {
            id: m.id as string,
            registration_number: m.registration_number as string,
            make: (m.make as string | null) ?? null,
            model: (m.model as string | null) ?? null,
            year: (m.year as number | null) ?? null,
            color: (m.color as string | null) ?? null,
            chassis_number: (m.chassis_number as string | null) ?? null,
            engine_number: (m.engine_number as string | null) ?? null,
            rider: r ? { full_name: r.full_name, phone: r.phone ?? null, qr_code: r.qr_code ?? null, id_number: r.id_number ?? null } : null,
          };
        });
      }

      return { rider, motorbikes, owner, ownedBikes };
    },
    enabled: !!userId,
  });
}

export { EXPIRING_SOON_DAYS };

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
          welfare_group:welfare_groups(name),
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

// Fetch sacco members (riders) with permit and motorbike details
export function useSaccoMembers(saccoId: string | undefined, countyId: string | undefined) {
  return useQuery({
    queryKey: ['sacco-members', saccoId, countyId],
    queryFn: async () => {
      if (!saccoId || !countyId) return [] as RiderWithDetails[];

      const { data: riders, error } = await supabase
        .from('riders')
        .select(`
          *,
          owner:owners(full_name),
          sacco:saccos(name),
          welfare_group:welfare_groups(name),
          stage:stages(name)
        `)
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!riders || riders.length === 0) return [] as RiderWithDetails[];

      const riderIds = riders.map((r) => r.id);

      const { data: motorbikes } = await supabase
        .from('motorbikes')
        .select('id, registration_number, rider_id')
        .in('rider_id', riderIds);

      const { data: permits } = await supabase
        .from('permits')
        .select('id, permit_number, status, expires_at, rider_id')
        .in('rider_id', riderIds)
        .order('created_at', { ascending: false });

      const motorbikeMap = new Map(
        (motorbikes || []).map((m) => [m.rider_id, { id: m.id, registration_number: m.registration_number }])
      );
      const permitMap = new Map<string, (typeof permits)[0]>();
      (permits || []).forEach((p) => {
        if (!permitMap.has(p.rider_id)) permitMap.set(p.rider_id, p);
      });

      return (riders as Rider[]).map((rider) => {
        const motorbike = motorbikeMap.get(rider.id);
        const permitData = permitMap.get(rider.id);
        return {
          ...rider,
          motorbike: motorbike
            ? { id: motorbike.id, registration_number: motorbike.registration_number }
            : null,
          permit: permitData
            ? {
                id: permitData.id,
                permit_number: permitData.permit_number,
                status: permitData.status as 'active' | 'expired' | 'pending' | 'suspended' | 'cancelled',
                expires_at: permitData.expires_at,
              }
            : null,
        } as RiderWithDetails;
      });
    },
    enabled: !!saccoId && !!countyId,
  });
}

// Fetch welfare group members (riders) with permit and motorbike details
export function useWelfareGroupMembers(welfareGroupId: string | undefined, countyId: string | undefined) {
  return useQuery({
    queryKey: ['welfare-group-members', welfareGroupId, countyId],
    queryFn: async () => {
      if (!welfareGroupId || !countyId) return [] as RiderWithDetails[];

      const { data: riders, error } = await supabase
        .from('riders')
        .select(`
          *,
          owner:owners(full_name),
          sacco:saccos(name),
          welfare_group:welfare_groups(name),
          stage:stages(name)
        `)
        .eq('welfare_group_id', welfareGroupId)
        .eq('county_id', countyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!riders || riders.length === 0) return [] as RiderWithDetails[];

      const riderIds = riders.map((r) => r.id);
      const { data: motorbikes } = await supabase
        .from('motorbikes')
        .select('id, registration_number, rider_id')
        .in('rider_id', riderIds);
      const { data: permits } = await supabase
        .from('permits')
        .select('id, permit_number, status, expires_at, rider_id')
        .in('rider_id', riderIds)
        .order('created_at', { ascending: false });

      const motorbikeMap = new Map(
        (motorbikes || []).map((m) => [m.rider_id, { id: m.id, registration_number: m.registration_number }])
      );
      const permitMap = new Map<string, (typeof permits)[0]>();
      (permits || []).forEach((p) => {
        if (!permitMap.has(p.rider_id)) permitMap.set(p.rider_id, p);
      });

      return (riders as Rider[]).map((rider) => {
        const motorbike = motorbikeMap.get(rider.id);
        const permitData = permitMap.get(rider.id);
        return {
          ...rider,
          motorbike: motorbike ? { id: motorbike.id, registration_number: motorbike.registration_number } : null,
          permit: permitData
            ? {
                id: permitData.id,
                permit_number: permitData.permit_number,
                status: permitData.status as 'active' | 'expired' | 'pending' | 'suspended' | 'cancelled',
                expires_at: permitData.expires_at,
              }
            : null,
        } as RiderWithDetails;
      });
    },
    enabled: !!welfareGroupId && !!countyId,
  });
}

export type DisciplineIncidentType = 'warning' | 'disciplinary_action' | 'incident_report';
export type DisciplineIncidentStatus = 'pending' | 'acknowledged' | 'resolved' | 'escalated' | 'dismissed';

export interface DisciplineIncidentRow {
  id: string;
  type: DisciplineIncidentType;
  member_id: string;
  member_name: string;
  member_phone: string;
  title: string;
  description: string;
  status: DisciplineIncidentStatus;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  submitted_to_county: boolean;
  county_submission_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  attachments?: string[];
}

// Table sacco_discipline_incidents is not in generated Supabase types; use typed from() assertion.
type SaccoDisciplineIncidentsClient = typeof supabase & {
  from(table: 'sacco_discipline_incidents'): ReturnType<typeof supabase.from>;
};

const SACCO_DISCIPLINE_INCIDENTS_BASE_SELECT = `
  id,
  type,
  rider_id,
  title,
  description,
  notes,
  status,
  severity,
  submitted_to_county,
  county_submission_date,
  created_by,
  created_at,
  updated_at
`.trim();

async function fetchDisciplineIncidentsFromDb(
  db: SaccoDisciplineIncidentsClient,
  options: { saccoId: string; countyId: string } | { countyId: string; forCountyView: true }
) {
  const isCountyView = 'forCountyView' in options && options.forCountyView;
  const countyId = options.countyId;
  const select = isCountyView
    ? `${SACCO_DISCIPLINE_INCIDENTS_BASE_SELECT},
  sacco_id,
  riders(full_name, phone),
  sacco:saccos(name)`
    : `${SACCO_DISCIPLINE_INCIDENTS_BASE_SELECT},
  riders(full_name, phone)`;

  let query = db
    .from('sacco_discipline_incidents')
    .select(select)
    .eq('county_id', countyId)
    .order('created_at', { ascending: false });

  if ('saccoId' in options) {
    query = query.eq('sacco_id', options.saccoId);
  } else {
    query = query.eq('submitted_to_county', true);
  }

  return query;
}

// Fetch discipline incidents for a sacco (persisted in DB)
export function useDisciplineIncidents(saccoId: string | undefined, countyId: string | undefined) {
  return useQuery({
    queryKey: ['discipline-incidents', saccoId, countyId],
    queryFn: async () => {
      if (!saccoId || !countyId) return [] as DisciplineIncidentRow[];

      type RiderRef = { full_name: string; phone: string } | null;
      type Row = {
        id: string;
        type: string;
        rider_id: string;
        title: string;
        description: string;
        notes: string | null;
        status: string;
        severity: string | null;
        submitted_to_county: boolean;
        county_submission_date: string | null;
        created_by: string;
        created_at: string;
        updated_at: string;
        riders?: RiderRef;
        rider?: RiderRef;
      };
      const db = supabase as SaccoDisciplineIncidentsClient;
      const { data, error } = await fetchDisciplineIncidentsFromDb(db, { saccoId, countyId });

      if (error) throw error;
      if (!data || data.length === 0) return [] as DisciplineIncidentRow[];

      return (data as unknown as Row[]).map((row) => {
        const riderData = row.riders ?? row.rider ?? null;
        return {
        id: row.id,
        type: row.type as DisciplineIncidentType,
        member_id: row.rider_id,
        member_name: riderData?.full_name ?? '',
        member_phone: riderData?.phone ?? '',
        title: row.title,
        description: row.description,
        notes: row.notes ?? undefined,
        status: row.status as DisciplineIncidentStatus,
        severity: (row.severity as 'low' | 'medium' | 'high' | 'critical') ?? undefined,
        submitted_to_county: row.submitted_to_county,
        county_submission_date: row.county_submission_date ?? undefined,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
      }) as DisciplineIncidentRow[];
    },
    enabled: !!saccoId && !!countyId,
  });
}

// County view: discipline incidents escalated to this county (all saccos)
export interface CountyDisciplineIncidentRow extends DisciplineIncidentRow {
  sacco_name: string;
}

export function useCountyDisciplineIncidents(countyId: string | undefined) {
  return useQuery({
    queryKey: ['county-discipline-incidents', countyId],
    queryFn: async () => {
      if (!countyId) return [] as CountyDisciplineIncidentRow[];

      type RiderRef = { full_name: string; phone: string } | null;
      type SaccoRef = { name: string } | null;
      type Row = {
        id: string;
        type: string;
        rider_id: string;
        sacco_id: string;
        title: string;
        description: string;
        notes: string | null;
        status: string;
        severity: string | null;
        submitted_to_county: boolean;
        county_submission_date: string | null;
        created_by: string;
        created_at: string;
        updated_at: string;
        riders?: RiderRef;
        rider?: RiderRef;
        sacco?: SaccoRef;
      };
      const db = supabase as SaccoDisciplineIncidentsClient;
      const { data, error } = await fetchDisciplineIncidentsFromDb(db, { countyId, forCountyView: true });

      if (error) throw error;
      if (!data || data.length === 0) return [] as CountyDisciplineIncidentRow[];

      return (data as unknown as Row[]).map((row) => {
        const riderData = row.riders ?? row.rider ?? null;
        const saccoData = row.sacco ?? null;
        return {
          id: row.id,
          type: row.type as DisciplineIncidentType,
          member_id: row.rider_id,
          member_name: riderData?.full_name ?? '',
          member_phone: riderData?.phone ?? '',
          sacco_name: saccoData?.name ?? '',
          title: row.title,
          description: row.description,
          notes: row.notes ?? undefined,
          status: row.status as DisciplineIncidentStatus,
          severity: (row.severity as 'low' | 'medium' | 'high' | 'critical') ?? undefined,
          submitted_to_county: row.submitted_to_county,
          county_submission_date: row.county_submission_date ?? undefined,
          created_by: row.created_by,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      }) as CountyDisciplineIncidentRow[];
    },
    enabled: !!countyId,
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
          welfare_group:welfare_groups(name),
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

// Fetch saccos with statistics
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

      const { data: saccos, error } = await query;
      if (error) {
        console.error('Error fetching saccos:', error);
        throw error;
      }
      if (!saccos || saccos.length === 0) return [] as Sacco[];

      const saccoIds = saccos.map(s => s.id);

      // Fetch member counts (riders per sacco)
      const { data: riders } = await supabase
        .from('riders')
        .select('id, sacco_id, compliance_status')
        .in('sacco_id', saccoIds);

      // Fetch stages counts
      const { data: stages } = await supabase
        .from('stages')
        .select('id, sacco_id')
        .in('sacco_id', saccoIds);

      // Fetch penalties counts (via riders)
      const riderIds = riders?.map(r => r.id) || [];
      let penalties: any[] = [];
      if (riderIds.length > 0) {
        const { data: penaltiesData } = await supabase
          .from('penalties')
          .select('id, rider_id')
          .in('rider_id', riderIds);
        penalties = penaltiesData || [];
      }

      // Calculate statistics per sacco
      const saccoStats = new Map<string, {
        member_count: number;
        stages_count: number;
        compliant_count: number;
        non_compliant_count: number;
        penalties_count: number;
      }>();

      saccos.forEach(sacco => {
        saccoStats.set(sacco.id, {
          member_count: 0,
          stages_count: 0,
          compliant_count: 0,
          non_compliant_count: 0,
          penalties_count: 0,
        });
      });

      // Count members and compliance
      riders?.forEach(rider => {
        if (rider.sacco_id) {
          const stats = saccoStats.get(rider.sacco_id);
          if (stats) {
            stats.member_count++;
            if (rider.compliance_status === 'compliant') {
              stats.compliant_count++;
            } else if (rider.compliance_status === 'non_compliant' || rider.compliance_status === 'blacklisted') {
              stats.non_compliant_count++;
            }
          }
        }
      });

      // Count stages
      stages?.forEach(stage => {
        if (stage.sacco_id) {
          const stats = saccoStats.get(stage.sacco_id);
          if (stats) {
            stats.stages_count++;
          }
        }
      });

      // Count penalties (need to map rider_id to sacco_id)
      const riderToSacco = new Map<string, string>();
      riders?.forEach(rider => {
        if (rider.sacco_id) {
          riderToSacco.set(rider.id, rider.sacco_id);
        }
      });

      penalties?.forEach(penalty => {
        const saccoId = riderToSacco.get(penalty.rider_id);
        if (saccoId) {
          const stats = saccoStats.get(saccoId);
          if (stats) {
            stats.penalties_count++;
          }
        }
      });

      // Enrich saccos with statistics
      return saccos.map(sacco => {
        const stats = saccoStats.get(sacco.id) || {
          member_count: 0,
          stages_count: 0,
          compliant_count: 0,
          non_compliant_count: 0,
          penalties_count: 0,
        };
        const totalMembers = stats.member_count;
        const complianceRate = totalMembers > 0
          ? Math.round((stats.compliant_count / totalMembers) * 100)
          : 100;

        return {
          ...sacco,
          member_count: stats.member_count,
          stages_count: stats.stages_count,
          compliance_rate: complianceRate,
          penalties_count: stats.penalties_count,
          non_compliant_count: stats.non_compliant_count,
        } as Sacco;
      });
    },
  });
}

// Fetch welfare groups with statistics (first-class entity: profile, officials, members, stages, compliance)
export function useWelfareGroups(countyId?: string) {
  return useQuery({
    queryKey: ['welfare-groups', countyId],
    queryFn: async () => {
      let query = supabase
        .from('welfare_groups')
        .select('*')
        .order('name');

      if (countyId) {
        query = query.eq('county_id', countyId);
      }

      const { data: groups, error } = await query;
      if (error) throw error;
      if (!groups || groups.length === 0) return [] as WelfareGroup[];

      const groupIds = groups.map((g) => g.id);

      const { data: riders } = await supabase
        .from('riders')
        .select('id, welfare_group_id, compliance_status')
        .in('welfare_group_id', groupIds);

      const { data: stages } = await supabase
        .from('stages')
        .select('id, welfare_group_id')
        .in('welfare_group_id', groupIds);

      const riderIds = riders?.map((r) => r.id) || [];
      let penalties: { rider_id: string }[] = [];
      if (riderIds.length > 0) {
        const { data: penaltiesData } = await supabase
          .from('penalties')
          .select('id, rider_id')
          .in('rider_id', riderIds);
        penalties = penaltiesData || [];
      }

      const stats = new Map<
        string,
        { member_count: number; stages_count: number; compliant_count: number; non_compliant_count: number; penalties_count: number }
      >();
      groups.forEach((g) => {
        stats.set(g.id, {
          member_count: 0,
          stages_count: 0,
          compliant_count: 0,
          non_compliant_count: 0,
          penalties_count: 0,
        });
      });
      riders?.forEach((r) => {
        if (r.welfare_group_id) {
          const s = stats.get(r.welfare_group_id);
          if (s) {
            s.member_count++;
            if (r.compliance_status === 'compliant') s.compliant_count++;
            else if (r.compliance_status === 'non_compliant' || r.compliance_status === 'blacklisted') s.non_compliant_count++;
          }
        }
      });
      stages?.forEach((st) => {
        if (st.welfare_group_id) {
          const s = stats.get(st.welfare_group_id);
          if (s) s.stages_count++;
        }
      });
      const riderToGroup = new Map<string, string>();
      riders?.forEach((r) => {
        if (r.welfare_group_id) riderToGroup.set(r.id, r.welfare_group_id);
      });
      penalties.forEach((p) => {
        const gid = riderToGroup.get(p.rider_id);
        if (gid) {
          const s = stats.get(gid);
          if (s) s.penalties_count++;
        }
      });

      return groups.map((g) => {
        const s = stats.get(g.id) || {
          member_count: 0,
          stages_count: 0,
          compliant_count: 0,
          non_compliant_count: 0,
          penalties_count: 0,
        };
        const total = s.member_count;
        const compliance_rate = total > 0 ? Math.round((s.compliant_count / total) * 100) : 100;
        return {
          ...g,
          member_count: s.member_count,
          stages_count: s.stages_count,
          compliance_rate,
          penalties_count: s.penalties_count,
          non_compliant_count: s.non_compliant_count,
        } as WelfareGroup;
      });
    },
    enabled: true,
  });
}

// Fetch stages with statistics
export function useStages(countyId?: string, saccoId?: string, welfareGroupId?: string) {
  return useQuery({
    queryKey: ['stages', countyId, saccoId, welfareGroupId],
    queryFn: async () => {
      let query = supabase
        .from('stages')
        .select(`*, sacco:saccos(name), welfare_group:welfare_groups(name)`)
        .order('name');

      if (countyId) {
        query = query.eq('county_id', countyId);
      }
      if (saccoId) {
        query = query.eq('sacco_id', saccoId);
      }
      if (welfareGroupId) {
        query = query.eq('welfare_group_id', welfareGroupId);
      }

      const { data: stages, error } = await query;
      if (error) {
        console.error('Error fetching stages:', error);
        throw error;
      }
      if (!stages || stages.length === 0) return [] as Stage[];

      const stageIds = stages.map(s => s.id);

      // Fetch member counts (riders per stage)
      const { data: riders } = await supabase
        .from('riders')
        .select('id, stage_id, compliance_status')
        .in('stage_id', stageIds);

      // Fetch penalties counts (via riders)
      const riderIds = riders?.map(r => r.id) || [];
      let penalties: any[] = [];
      if (riderIds.length > 0) {
        const { data: penaltiesData } = await supabase
          .from('penalties')
          .select('id, rider_id')
          .in('rider_id', riderIds);
        penalties = penaltiesData || [];
      }

      // Calculate statistics per stage
      const stageStats = new Map<string, {
        member_count: number;
        compliant_count: number;
        non_compliant_count: number;
        penalties_count: number;
      }>();

      stages.forEach(stage => {
        stageStats.set(stage.id, {
          member_count: 0,
          compliant_count: 0,
          non_compliant_count: 0,
          penalties_count: 0,
        });
      });

      // Count members and compliance
      riders?.forEach(rider => {
        if (rider.stage_id) {
          const stats = stageStats.get(rider.stage_id);
          if (stats) {
            stats.member_count++;
            if (rider.compliance_status === 'compliant') {
              stats.compliant_count++;
            } else if (rider.compliance_status === 'non_compliant' || rider.compliance_status === 'blacklisted') {
              stats.non_compliant_count++;
            }
          }
        }
      });

      // Count penalties (need to map rider_id to stage_id)
      const riderToStage = new Map<string, string>();
      riders?.forEach(rider => {
        if (rider.stage_id) {
          riderToStage.set(rider.id, rider.stage_id);
        }
      });

      penalties?.forEach(penalty => {
        const stageId = riderToStage.get(penalty.rider_id);
        if (stageId) {
          const stats = stageStats.get(stageId);
          if (stats) {
            stats.penalties_count++;
          }
        }
      });

      // Enrich stages with statistics
      return stages.map(stage => {
        const stats = stageStats.get(stage.id) || {
          member_count: 0,
          compliant_count: 0,
          non_compliant_count: 0,
          penalties_count: 0,
        };
        const totalMembers = stats.member_count;
        const complianceRate = totalMembers > 0
          ? Math.round((stats.compliant_count / totalMembers) * 100)
          : 100;

        return {
          ...stage,
          member_count: stats.member_count,
          compliance_rate: complianceRate,
          penalties_count: stats.penalties_count,
          non_compliant_count: stats.non_compliant_count,
        } as Stage;
      });
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

// Fetch counties (active only — for dropdowns / county-scoped views)
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

// Fetch all counties (no status filter — for Super Admin multi-county management)
export function useAllCounties() {
  return useQuery({
    queryKey: ['counties', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('counties')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as County[];
    },
  });
}

// Stats for a single county (used by Super Admin county list)
export async function fetchDashboardStatsForCounty(countyId: string): Promise<DashboardStats & { complianceRate: number }> {
  const now = new Date().toISOString();
  let ridersQuery = supabase.from('riders').select('id', { count: 'exact', head: true }).eq('county_id', countyId);
  let activePermitsQuery = supabase.from('permits').select('id', { count: 'exact', head: true }).eq('county_id', countyId).eq('status', 'active');
  let nonCompliantRidersQuery = supabase.from('riders').select('id', { count: 'exact', head: true }).eq('county_id', countyId).eq('compliance_status', 'non_compliant');
  let paymentsQuery = supabase.from('payments').select('amount').eq('status', 'completed').eq('county_id', countyId);

  const [riders, activePermits, nonCompliantRiders, payments] = await Promise.all([
    ridersQuery,
    activePermitsQuery,
    nonCompliantRidersQuery,
    paymentsQuery,
  ]);

  const totalRiders = riders.count ?? 0;
  const totalRevenue = payments.data?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const complianceRate = totalRiders > 0 ? Math.round(((totalRiders - (nonCompliantRiders.count ?? 0)) / totalRiders) * 100) : 100;

  return {
    totalRiders,
    activePermits: activePermits.count ?? 0,
    expiredPermits: 0,
    nonCompliantRiders: nonCompliantRiders.count ?? 0,
    penaltiesIssued: 0,
    penaltiesUnpaid: 0,
    penaltiesPaid: 0,
    totalRevenue,
    complianceRate,
  };
}

// County mutations (Super Admin)
export type CountyInsert = Pick<County, 'name' | 'code' | 'status'> & Partial<Pick<County, 'logo_url' | 'contact_email' | 'contact_phone' | 'address' | 'settings'>>;
export type CountyUpdate = Partial<Omit<County, 'id'>>;

export function useCreateCounty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CountyInsert) => {
      const row = { ...payload, settings: payload.settings ?? null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.from('counties').insert(row as any).select('id').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counties'] });
      queryClient.invalidateQueries({ queryKey: ['counties', 'all'] });
      toast.success('County created successfully');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to create county'),
  });
}

export function useUpdateCounty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CountyUpdate }) => {
      const row = payload.settings !== undefined ? { ...payload, settings: payload.settings ?? null } : payload;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('counties').update(row as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counties'] });
      queryClient.invalidateQueries({ queryKey: ['counties', 'all'] });
      toast.success('County updated successfully');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update county'),
  });
}

export function useDeleteCounty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('counties').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counties'] });
      queryClient.invalidateQueries({ queryKey: ['counties', 'all'] });
      toast.success('County data deleted');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete county'),
  });
}

export function useSetCountyLocked() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, locked }: { id: string; locked: boolean }) => {
      const { data: row } = await supabase.from('counties').select('settings').eq('id', id).single();
      const settings = (row?.settings as Record<string, unknown>) ?? {};
      const { error } = await supabase.from('counties').update({ settings: { ...settings, locked } }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counties'] });
      queryClient.invalidateQueries({ queryKey: ['counties', 'all'] });
      toast.success('County lock status updated');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update lock status'),
  });
}

// County-specific configuration (permit, penalty, compliance) — stored in county.settings
export interface PermitTypeConfig {
  id: string;
  name: string;
  type: 'weekly' | 'monthly' | 'annual' | 'custom';
  feeCents: number;
  validityDays: number;
  description?: string;
}
export interface CountyPermitConfig {
  permitTypes: PermitTypeConfig[];
  gracePeriodDays: number;
  autoRenewEnabled: boolean;
  validityRulesNote?: string;
}
export interface PenaltyCategoryConfig {
  id: string;
  name: string;
  amountCents: number;
  description?: string;
}
export interface EscalationRule {
  repeatCount: number;
  multiplier: number;
  maxAmountCents?: number;
}
export interface WaiverRule {
  roles: string[];
  maxWaiverAmountCents?: number;
  requireApproval: boolean;
}
export interface CountyPenaltyConfig {
  categories: PenaltyCategoryConfig[];
  autoPenaltyEnabled: boolean;
  autoPenaltyRulesNote?: string;
  escalationLogic: EscalationRule[];
  waiverRules: WaiverRule;
}
export interface CountyComplianceRules {
  nonCompliantDefinition: string;
  suspensionThresholdPenalties: number;
  blacklistThresholdPenalties: number;
  suspensionThresholdUnpaidDays?: number;
  blacklistThresholdUnpaidDays?: number;
  complianceScoringEnabled: boolean;
  complianceScoringLogic?: string;
}

// Revenue & Commercial Configuration (platform-critical, per county)
export interface CountyRevenueModelConfig {
  chargeAmountCents: number;
  frequency: 'weekly' | 'monthly';
  effectiveFrom: string; // ISO date
  effectiveTo?: string; // ISO date, optional
  description?: string;
}
export interface PlatformFeeModelConfig {
  modelType: 'fixed' | 'percentage' | 'hybrid';
  fixedFeeCentsPerRider?: number;
  percentageFee?: number;
  hybridFixedCents?: number;
  hybridPercentage?: number;
  feeReviewDate?: string; // ISO date
  notes?: string;
}
export interface RevenueSharingRuleConfig {
  applyBy: 'sacco' | 'welfare_group';
  shareType: 'percentage' | 'fixed_per_rider';
  percentageShare?: number;
  fixedAmountCents?: number;
  activePermitsOnly: boolean;
  complianceThresholdRequired: boolean;
  complianceThresholdPercent?: number;
}
export interface RevenueSharingVisibilityConfig {
  saccosSeeAmounts: boolean;
  saccosSeeBreakdown: boolean;
  countiesSeeAmounts: boolean;
  countiesSeeBreakdown: boolean;
  ridersNeverSeeRevenueShare: boolean; // always true in UI, configurable for audit
}
export interface SaccoWelfareRevenueSharingConfig {
  enabled: boolean;
  rules: RevenueSharingRuleConfig[];
  visibility: RevenueSharingVisibilityConfig;
}
export interface CountyRevenueCommercialConfig {
  countyRevenueModel: CountyRevenueModelConfig;
  platformFeeModel: PlatformFeeModelConfig;
  saccoWelfareRevenueSharing: SaccoWelfareRevenueSharingConfig;
}

// ——— County Monetization Settings (Super Admin, per county) ———
export type SubscriptionPeriodKey = 'weekly' | 'monthly' | 'three_months' | 'six_months' | 'annual';

export interface PlatformServiceFeeConfig {
  feeType: 'fixed' | 'percentage';
  fixedFeeCents?: number;
  percentageFee?: number;
  applyScope: 'permit_payments_only';
  basis: 'per_subscription_period';
  periods: { period: SubscriptionPeriodKey; enabled: boolean }[];
  proportionalByWeeks: boolean;
  periodDiscounts: { period: SubscriptionPeriodKey; discountCents?: number; discountPercent?: number }[];
}

export interface PaymentConvenienceFeeConfig {
  includedInPlatformFee: boolean;
  feeType: 'fixed' | 'percentage';
  fixedFeeCents?: number;
  percentageFee?: number;
  applyScope: 'all_transactions';
  purposeLabel: string;
}

export interface PenaltyCommissionConfig {
  feeType: 'fixed' | 'percentage';
  fixedFeeCents?: number;
  percentageFee?: number;
  applyScope: 'penalty_payments_only';
  chargedOnSuccessOnly: boolean;
}

export interface SmsMessageCategoryToggles {
  paymentConfirmation: boolean;
  permitExpiryReminders: boolean;
  penaltyAlerts: boolean;
  enforcementNotices: boolean;
}

export interface BulkSmsCostRecoveryConfig {
  costPerSmsCents: number;
  markupPerSmsCents?: number;
  markupPercent?: number;
  messageCategories: SmsMessageCategoryToggles;
  applyScope: 'periodic_deduction' | 'per_transaction';
}

export interface SubscriptionPeriodControlsConfig {
  enabledDurations: Record<SubscriptionPeriodKey, boolean>;
  basePermitPriceCentsPerPeriod: Partial<Record<SubscriptionPeriodKey, number>>;
}

export interface CountyMonetizationSettings {
  platformServiceFee: PlatformServiceFeeConfig;
  paymentConvenienceFee: PaymentConvenienceFeeConfig;
  penaltyCommission: PenaltyCommissionConfig;
  bulkSmsCostRecovery: BulkSmsCostRecoveryConfig;
  subscriptionPeriodControls: SubscriptionPeriodControlsConfig;
}

export interface CountyConfig {
  permitConfig: CountyPermitConfig;
  penaltyConfig: CountyPenaltyConfig;
  complianceRules: CountyComplianceRules;
  revenueCommercialConfig?: CountyRevenueCommercialConfig;
  monetizationSettings?: CountyMonetizationSettings;
}

const DEFAULT_PERMIT_CONFIG: CountyPermitConfig = {
  permitTypes: [
    { id: 'weekly', name: 'Weekly', type: 'weekly', feeCents: 50000, validityDays: 7, description: '7-day permit' },
    { id: 'monthly', name: 'Monthly', type: 'monthly', feeCents: 150000, validityDays: 30, description: '30-day permit' },
    { id: 'annual', name: 'Annual', type: 'annual', feeCents: 1200000, validityDays: 365, description: 'Annual permit' },
  ],
  gracePeriodDays: 7,
  autoRenewEnabled: false,
  validityRulesNote: 'Applied prospectively to new and renewed permits.',
};
const DEFAULT_PENALTY_CONFIG: CountyPenaltyConfig = {
  categories: [
    { id: 'no-permit', name: 'Operating without valid permit', amountCents: 500000, description: 'Default penalty' },
    { id: 'expired-permit', name: 'Expired permit', amountCents: 250000 },
  ],
  autoPenaltyEnabled: false,
  autoPenaltyRulesNote: 'Configure when to apply penalties automatically.',
  escalationLogic: [
    { repeatCount: 2, multiplier: 1.5, maxAmountCents: 1000000 },
    { repeatCount: 3, multiplier: 2, maxAmountCents: 2000000 },
  ],
  waiverRules: { roles: ['county_super_admin', 'county_admin'], maxWaiverAmountCents: 500000, requireApproval: true },
};
const DEFAULT_COMPLIANCE_RULES: CountyComplianceRules = {
  nonCompliantDefinition: 'Rider with expired permit, unpaid penalty, or suspended status.',
  suspensionThresholdPenalties: 3,
  blacklistThresholdPenalties: 5,
  suspensionThresholdUnpaidDays: 30,
  blacklistThresholdUnpaidDays: 90,
  complianceScoringEnabled: false,
  complianceScoringLogic: 'Optional: score 0–100 based on permit validity, penalty history, and payments.',
};

const DEFAULT_COUNTY_REVENUE_MODEL: CountyRevenueModelConfig = {
  chargeAmountCents: 0,
  frequency: 'monthly',
  effectiveFrom: new Date().toISOString().slice(0, 10),
  description: '',
};
const DEFAULT_PLATFORM_FEE_MODEL: PlatformFeeModelConfig = {
  modelType: 'fixed',
  fixedFeeCentsPerRider: 0,
  feeReviewDate: undefined,
  notes: '',
};
const DEFAULT_REVENUE_SHARING_VISIBILITY: RevenueSharingVisibilityConfig = {
  saccosSeeAmounts: true,
  saccosSeeBreakdown: false,
  countiesSeeAmounts: true,
  countiesSeeBreakdown: true,
  ridersNeverSeeRevenueShare: true,
};
const DEFAULT_SACCO_WELFARE_REVENUE_SHARING: SaccoWelfareRevenueSharingConfig = {
  enabled: false,
  rules: [],
  visibility: { ...DEFAULT_REVENUE_SHARING_VISIBILITY },
};
const DEFAULT_REVENUE_COMMERCIAL_CONFIG: CountyRevenueCommercialConfig = {
  countyRevenueModel: { ...DEFAULT_COUNTY_REVENUE_MODEL },
  platformFeeModel: { ...DEFAULT_PLATFORM_FEE_MODEL },
  saccoWelfareRevenueSharing: {
    ...DEFAULT_SACCO_WELFARE_REVENUE_SHARING,
    visibility: { ...DEFAULT_REVENUE_SHARING_VISIBILITY },
  },
};

const SUBSCRIPTION_PERIODS: SubscriptionPeriodKey[] = ['weekly', 'monthly', 'three_months', 'six_months', 'annual'];

const DEFAULT_PLATFORM_SERVICE_FEE: PlatformServiceFeeConfig = {
  feeType: 'fixed',
  fixedFeeCents: 0,
  applyScope: 'permit_payments_only',
  basis: 'per_subscription_period',
  periods: SUBSCRIPTION_PERIODS.map(p => ({ period: p, enabled: true })),
  proportionalByWeeks: true,
  periodDiscounts: [],
};

const DEFAULT_PAYMENT_CONVENIENCE_FEE: PaymentConvenienceFeeConfig = {
  includedInPlatformFee: true,
  feeType: 'fixed',
  fixedFeeCents: 0,
  applyScope: 'all_transactions',
  purposeLabel: 'processing/convenience fee',
};

const DEFAULT_PENALTY_COMMISSION: PenaltyCommissionConfig = {
  feeType: 'percentage',
  fixedFeeCents: 0,
  percentageFee: 0,
  applyScope: 'penalty_payments_only',
  chargedOnSuccessOnly: true,
};

const DEFAULT_SMS_MESSAGE_CATEGORIES: SmsMessageCategoryToggles = {
  paymentConfirmation: true,
  permitExpiryReminders: true,
  penaltyAlerts: true,
  enforcementNotices: true,
};

const DEFAULT_BULK_SMS_COST_RECOVERY: BulkSmsCostRecoveryConfig = {
  costPerSmsCents: 0,
  messageCategories: { ...DEFAULT_SMS_MESSAGE_CATEGORIES },
  applyScope: 'periodic_deduction',
};

const DEFAULT_SUBSCRIPTION_PERIOD_CONTROLS: SubscriptionPeriodControlsConfig = {
  enabledDurations: {
    weekly: true,
    monthly: true,
    three_months: true,
    six_months: true,
    annual: true,
  },
  basePermitPriceCentsPerPeriod: {},
};

const DEFAULT_MONETIZATION_SETTINGS: CountyMonetizationSettings = {
  platformServiceFee: { ...DEFAULT_PLATFORM_SERVICE_FEE, periods: SUBSCRIPTION_PERIODS.map(p => ({ period: p, enabled: true })) },
  paymentConvenienceFee: { ...DEFAULT_PAYMENT_CONVENIENCE_FEE },
  penaltyCommission: { ...DEFAULT_PENALTY_COMMISSION },
  bulkSmsCostRecovery: { ...DEFAULT_BULK_SMS_COST_RECOVERY, messageCategories: { ...DEFAULT_SMS_MESSAGE_CATEGORIES } },
  subscriptionPeriodControls: {
    enabledDurations: { ...DEFAULT_SUBSCRIPTION_PERIOD_CONTROLS.enabledDurations },
    basePermitPriceCentsPerPeriod: { ...DEFAULT_SUBSCRIPTION_PERIOD_CONTROLS.basePermitPriceCentsPerPeriod },
  },
};

export function getDefaultCountyConfig(): CountyConfig {
  return {
    permitConfig: { ...DEFAULT_PERMIT_CONFIG, permitTypes: DEFAULT_PERMIT_CONFIG.permitTypes.map(t => ({ ...t })) },
    penaltyConfig: {
      ...DEFAULT_PENALTY_CONFIG,
      categories: DEFAULT_PENALTY_CONFIG.categories.map(c => ({ ...c })),
      escalationLogic: DEFAULT_PENALTY_CONFIG.escalationLogic.map(e => ({ ...e })),
    },
    complianceRules: { ...DEFAULT_COMPLIANCE_RULES },
    revenueCommercialConfig: {
      countyRevenueModel: { ...DEFAULT_COUNTY_REVENUE_MODEL },
      platformFeeModel: { ...DEFAULT_PLATFORM_FEE_MODEL },
      saccoWelfareRevenueSharing: {
        enabled: DEFAULT_SACCO_WELFARE_REVENUE_SHARING.enabled,
        rules: [],
        visibility: { ...DEFAULT_REVENUE_SHARING_VISIBILITY },
      },
    },
    monetizationSettings: {
      platformServiceFee: { ...DEFAULT_PLATFORM_SERVICE_FEE, periods: SUBSCRIPTION_PERIODS.map(p => ({ period: p, enabled: true })) },
      paymentConvenienceFee: { ...DEFAULT_PAYMENT_CONVENIENCE_FEE },
      penaltyCommission: { ...DEFAULT_PENALTY_COMMISSION },
      bulkSmsCostRecovery: { ...DEFAULT_BULK_SMS_COST_RECOVERY, messageCategories: { ...DEFAULT_SMS_MESSAGE_CATEGORIES } },
      subscriptionPeriodControls: {
        enabledDurations: { ...DEFAULT_SUBSCRIPTION_PERIOD_CONTROLS.enabledDurations },
        basePermitPriceCentsPerPeriod: {},
      },
    },
  };
}

export function getCountyConfigFromSettings(settings: Record<string, unknown> | null | undefined): CountyConfig {
  const defaultConfig = getDefaultCountyConfig();
  if (!settings) return defaultConfig;
  const permit = settings.permitConfig as Partial<CountyPermitConfig> | undefined;
  const penalty = settings.penaltyConfig as Partial<CountyPenaltyConfig> | undefined;
  const compliance = settings.complianceRules as Partial<CountyComplianceRules> | undefined;
  const revenue = settings.revenueCommercialConfig as Partial<CountyRevenueCommercialConfig> | undefined;
  const monetization = settings.monetizationSettings as Partial<CountyMonetizationSettings> | undefined;
  const defRev = defaultConfig.revenueCommercialConfig!;
  const defMon = defaultConfig.monetizationSettings!;
  return {
    permitConfig: {
      permitTypes: permit?.permitTypes ?? defaultConfig.permitConfig.permitTypes,
      gracePeriodDays: permit?.gracePeriodDays ?? defaultConfig.permitConfig.gracePeriodDays,
      autoRenewEnabled: permit?.autoRenewEnabled ?? defaultConfig.permitConfig.autoRenewEnabled,
      validityRulesNote: permit?.validityRulesNote ?? defaultConfig.permitConfig.validityRulesNote,
    },
    penaltyConfig: {
      categories: penalty?.categories ?? defaultConfig.penaltyConfig.categories,
      autoPenaltyEnabled: penalty?.autoPenaltyEnabled ?? defaultConfig.penaltyConfig.autoPenaltyEnabled,
      autoPenaltyRulesNote: penalty?.autoPenaltyRulesNote ?? defaultConfig.penaltyConfig.autoPenaltyRulesNote,
      escalationLogic: penalty?.escalationLogic ?? defaultConfig.penaltyConfig.escalationLogic,
      waiverRules: penalty?.waiverRules ?? defaultConfig.penaltyConfig.waiverRules,
    },
    complianceRules: {
      nonCompliantDefinition: compliance?.nonCompliantDefinition ?? defaultConfig.complianceRules.nonCompliantDefinition,
      suspensionThresholdPenalties: compliance?.suspensionThresholdPenalties ?? defaultConfig.complianceRules.suspensionThresholdPenalties,
      blacklistThresholdPenalties: compliance?.blacklistThresholdPenalties ?? defaultConfig.complianceRules.blacklistThresholdPenalties,
      suspensionThresholdUnpaidDays: compliance?.suspensionThresholdUnpaidDays ?? defaultConfig.complianceRules.suspensionThresholdUnpaidDays,
      blacklistThresholdUnpaidDays: compliance?.blacklistThresholdUnpaidDays ?? defaultConfig.complianceRules.blacklistThresholdUnpaidDays,
      complianceScoringEnabled: compliance?.complianceScoringEnabled ?? defaultConfig.complianceRules.complianceScoringEnabled,
      complianceScoringLogic: compliance?.complianceScoringLogic ?? defaultConfig.complianceRules.complianceScoringLogic,
    },
    revenueCommercialConfig: {
      countyRevenueModel: {
        chargeAmountCents: revenue?.countyRevenueModel?.chargeAmountCents ?? defRev.countyRevenueModel.chargeAmountCents,
        frequency: revenue?.countyRevenueModel?.frequency ?? defRev.countyRevenueModel.frequency,
        effectiveFrom: revenue?.countyRevenueModel?.effectiveFrom ?? defRev.countyRevenueModel.effectiveFrom,
        effectiveTo: revenue?.countyRevenueModel?.effectiveTo ?? defRev.countyRevenueModel.effectiveTo,
        description: revenue?.countyRevenueModel?.description ?? defRev.countyRevenueModel.description,
      },
      platformFeeModel: {
        modelType: revenue?.platformFeeModel?.modelType ?? defRev.platformFeeModel.modelType,
        fixedFeeCentsPerRider: revenue?.platformFeeModel?.fixedFeeCentsPerRider ?? defRev.platformFeeModel.fixedFeeCentsPerRider,
        percentageFee: revenue?.platformFeeModel?.percentageFee ?? defRev.platformFeeModel.percentageFee,
        hybridFixedCents: revenue?.platformFeeModel?.hybridFixedCents ?? defRev.platformFeeModel.hybridFixedCents,
        hybridPercentage: revenue?.platformFeeModel?.hybridPercentage ?? defRev.platformFeeModel.hybridPercentage,
        feeReviewDate: revenue?.platformFeeModel?.feeReviewDate ?? defRev.platformFeeModel.feeReviewDate,
        notes: revenue?.platformFeeModel?.notes ?? defRev.platformFeeModel.notes,
      },
      saccoWelfareRevenueSharing: {
        enabled: revenue?.saccoWelfareRevenueSharing?.enabled ?? defRev.saccoWelfareRevenueSharing.enabled,
        rules: revenue?.saccoWelfareRevenueSharing?.rules?.length
          ? revenue.saccoWelfareRevenueSharing.rules
          : defRev.saccoWelfareRevenueSharing.rules,
        visibility: {
          saccosSeeAmounts: revenue?.saccoWelfareRevenueSharing?.visibility?.saccosSeeAmounts ?? defRev.saccoWelfareRevenueSharing.visibility.saccosSeeAmounts,
          saccosSeeBreakdown: revenue?.saccoWelfareRevenueSharing?.visibility?.saccosSeeBreakdown ?? defRev.saccoWelfareRevenueSharing.visibility.saccosSeeBreakdown,
          countiesSeeAmounts: revenue?.saccoWelfareRevenueSharing?.visibility?.countiesSeeAmounts ?? defRev.saccoWelfareRevenueSharing.visibility.countiesSeeAmounts,
          countiesSeeBreakdown: revenue?.saccoWelfareRevenueSharing?.visibility?.countiesSeeBreakdown ?? defRev.saccoWelfareRevenueSharing.visibility.countiesSeeBreakdown,
          ridersNeverSeeRevenueShare: revenue?.saccoWelfareRevenueSharing?.visibility?.ridersNeverSeeRevenueShare ?? defRev.saccoWelfareRevenueSharing.visibility.ridersNeverSeeRevenueShare,
        },
      },
    },
    monetizationSettings: {
      platformServiceFee: {
        feeType: monetization?.platformServiceFee?.feeType ?? defMon.platformServiceFee.feeType,
        fixedFeeCents: monetization?.platformServiceFee?.fixedFeeCents ?? defMon.platformServiceFee.fixedFeeCents,
        percentageFee: monetization?.platformServiceFee?.percentageFee ?? defMon.platformServiceFee.percentageFee,
        applyScope: 'permit_payments_only',
        basis: 'per_subscription_period',
        periods: monetization?.platformServiceFee?.periods?.length ? monetization.platformServiceFee.periods : defMon.platformServiceFee.periods,
        proportionalByWeeks: monetization?.platformServiceFee?.proportionalByWeeks ?? defMon.platformServiceFee.proportionalByWeeks,
        periodDiscounts: monetization?.platformServiceFee?.periodDiscounts ?? defMon.platformServiceFee.periodDiscounts,
      },
      paymentConvenienceFee: {
        includedInPlatformFee: monetization?.paymentConvenienceFee?.includedInPlatformFee ?? defMon.paymentConvenienceFee.includedInPlatformFee,
        feeType: monetization?.paymentConvenienceFee?.feeType ?? defMon.paymentConvenienceFee.feeType,
        fixedFeeCents: monetization?.paymentConvenienceFee?.fixedFeeCents ?? defMon.paymentConvenienceFee.fixedFeeCents,
        percentageFee: monetization?.paymentConvenienceFee?.percentageFee ?? defMon.paymentConvenienceFee.percentageFee,
        applyScope: 'all_transactions',
        purposeLabel: monetization?.paymentConvenienceFee?.purposeLabel ?? defMon.paymentConvenienceFee.purposeLabel,
      },
      penaltyCommission: {
        feeType: monetization?.penaltyCommission?.feeType ?? defMon.penaltyCommission.feeType,
        fixedFeeCents: monetization?.penaltyCommission?.fixedFeeCents ?? defMon.penaltyCommission.fixedFeeCents,
        percentageFee: monetization?.penaltyCommission?.percentageFee ?? defMon.penaltyCommission.percentageFee,
        applyScope: 'penalty_payments_only',
        chargedOnSuccessOnly: monetization?.penaltyCommission?.chargedOnSuccessOnly ?? defMon.penaltyCommission.chargedOnSuccessOnly,
      },
      bulkSmsCostRecovery: {
        costPerSmsCents: monetization?.bulkSmsCostRecovery?.costPerSmsCents ?? defMon.bulkSmsCostRecovery.costPerSmsCents,
        markupPerSmsCents: monetization?.bulkSmsCostRecovery?.markupPerSmsCents ?? defMon.bulkSmsCostRecovery.markupPerSmsCents,
        markupPercent: monetization?.bulkSmsCostRecovery?.markupPercent ?? defMon.bulkSmsCostRecovery.markupPercent,
        messageCategories: {
          paymentConfirmation: monetization?.bulkSmsCostRecovery?.messageCategories?.paymentConfirmation ?? defMon.bulkSmsCostRecovery.messageCategories.paymentConfirmation,
          permitExpiryReminders: monetization?.bulkSmsCostRecovery?.messageCategories?.permitExpiryReminders ?? defMon.bulkSmsCostRecovery.messageCategories.permitExpiryReminders,
          penaltyAlerts: monetization?.bulkSmsCostRecovery?.messageCategories?.penaltyAlerts ?? defMon.bulkSmsCostRecovery.messageCategories.penaltyAlerts,
          enforcementNotices: monetization?.bulkSmsCostRecovery?.messageCategories?.enforcementNotices ?? defMon.bulkSmsCostRecovery.messageCategories.enforcementNotices,
        },
        applyScope: monetization?.bulkSmsCostRecovery?.applyScope ?? defMon.bulkSmsCostRecovery.applyScope,
      },
      subscriptionPeriodControls: {
        enabledDurations: {
          weekly: monetization?.subscriptionPeriodControls?.enabledDurations?.weekly ?? defMon.subscriptionPeriodControls.enabledDurations.weekly,
          monthly: monetization?.subscriptionPeriodControls?.enabledDurations?.monthly ?? defMon.subscriptionPeriodControls.enabledDurations.monthly,
          three_months: monetization?.subscriptionPeriodControls?.enabledDurations?.three_months ?? defMon.subscriptionPeriodControls.enabledDurations.three_months,
          six_months: monetization?.subscriptionPeriodControls?.enabledDurations?.six_months ?? defMon.subscriptionPeriodControls.enabledDurations.six_months,
          annual: monetization?.subscriptionPeriodControls?.enabledDurations?.annual ?? defMon.subscriptionPeriodControls.enabledDurations.annual,
        },
        basePermitPriceCentsPerPeriod: monetization?.subscriptionPeriodControls?.basePermitPriceCentsPerPeriod ?? defMon.subscriptionPeriodControls.basePermitPriceCentsPerPeriod,
      },
    },
  };
}

export function useUpdateCountyConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      countyId,
      config,
      section,
      effectiveFrom,
    }: {
      countyId: string;
      config: Partial<CountyConfig>;
      section: 'permitConfig' | 'penaltyConfig' | 'complianceRules' | 'revenueCommercialConfig' | 'monetizationSettings';
      /** Optional: effective date for this change (ISO date string). Stored in audit log for versioning; changes still apply immediately unless deferred logic is added later. */
      effectiveFrom?: string;
    }) => {
      const { data: row } = await supabase.from('counties').select('settings').eq('id', countyId).single();
      const settings = (row?.settings as Record<string, unknown>) ?? {};
      const oldConfig = { [section]: settings[section] ?? null };
      const newSettings = { ...settings, ...config };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await supabase.from('counties').update({ settings: newSettings } as any).eq('id', countyId);
      if (updateError) throw updateError;
      const { data: { user } } = await supabase.auth.getUser();
      const newValuesForAudit = effectiveFrom ? { ...config, effective_from: effectiveFrom } : config;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('audit_logs').insert({
        county_id: countyId,
        user_id: user?.id ?? null,
        action: 'update',
        entity_type: 'county_config',
        entity_id: null,
        old_values: oldConfig,
        new_values: newValuesForAudit,
      } as any);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['counties'] });
      queryClient.invalidateQueries({ queryKey: ['counties', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['county-config-history', variables.countyId] });
      queryClient.invalidateQueries({ queryKey: ['monetization-settings-history', variables.countyId] });
      toast.success('County configuration saved. Changes apply prospectively.');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save configuration'),
  });
}

export function useCountyConfigHistory(countyId: string | null) {
  return useQuery({
    queryKey: ['county-config-history', countyId],
    queryFn: async () => {
      if (!countyId) return [];
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, entity_type, old_values, new_values, created_at, user_id')
        .eq('county_id', countyId)
        .eq('entity_type', 'county_config')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        action: string;
        entity_type: string;
        old_values: Record<string, unknown> | null;
        new_values: Record<string, unknown> | null;
        created_at: string;
        user_id: string | null;
      }>;
    },
    enabled: !!countyId,
  });
}

/** Monetization settings version history: who changed, when, previous vs new values, optional effective date. */
export function useMonetizationSettingsHistory(countyId: string | null) {
  return useQuery({
    queryKey: ['monetization-settings-history', countyId],
    queryFn: async () => {
      if (!countyId) return [];
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, entity_type, old_values, new_values, created_at, user_id, actor_role')
        .eq('county_id', countyId)
        .eq('entity_type', 'county_config')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        id: string;
        action: string;
        entity_type: string;
        old_values: Record<string, unknown> | null;
        new_values: Record<string, unknown> | null;
        created_at: string;
        user_id: string | null;
        actor_role: string | null;
      }>;
      const monetizationOnly = rows.filter(
        (r) =>
          (r.new_values && 'monetizationSettings' in (r.new_values ?? {})) ||
          (r.old_values && 'monetizationSettings' in (r.old_values ?? {}))
      );
      const userIds = [...new Set(monetizationOnly.map((r) => r.user_id).filter(Boolean))] as string[];
      let profilesMap = new Map<string, { full_name: string | null; email: string }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        if (profiles) profilesMap = new Map(profiles.map((p) => [p.id, { full_name: p.full_name, email: p.email }]));
      }
      return monetizationOnly.map((r) => ({
        id: r.id,
        action: r.action,
        created_at: r.created_at,
        user_id: r.user_id,
        actor_role: r.actor_role ?? null,
        who: r.user_id ? (profilesMap.get(r.user_id)?.full_name || profilesMap.get(r.user_id)?.email || r.user_id) : 'System',
        old_monetization: (r.old_values as Record<string, unknown> | null)?.monetizationSettings ?? null,
        new_monetization: (r.new_values as Record<string, unknown> | null)?.monetizationSettings ?? null,
        effective_from: (r.new_values as Record<string, unknown> | null)?.effective_from as string | undefined,
      }));
    },
    enabled: !!countyId,
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

// Recent activity interface
export interface RecentActivityItem {
  id: string;
  type: 'registration' | 'payment' | 'permit' | 'penalty' | 'verification';
  title: string;
  description: string;
  time: string;
  status?: 'success' | 'pending' | 'warning' | 'error';
}

// Fetch recent activity for dashboard (countyId undefined = platform-wide for super admin)
export function useRecentActivity(countyId?: string, limit: number = 10) {
  return useQuery({
    queryKey: ['recent-activity', countyId, limit],
    queryFn: async () => {
      const activities: RecentActivityItem[] = [];
      const now = new Date();

      // Helper to format time ago
      const formatTimeAgo = (date: Date): string => {
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      };

      // Fetch recent registrations
      let ridersQuery = supabase
        .from('riders')
        .select('id, full_name, id_number, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (countyId) ridersQuery = ridersQuery.eq('county_id', countyId);
      const { data: recentRiders } = await ridersQuery;

      recentRiders?.forEach((rider) => {
        activities.push({
          id: `rider-${rider.id}`,
          type: 'registration',
          title: 'New Rider Registered',
          description: `${rider.full_name} (ID: ${rider.id_number}) registered`,
          time: formatTimeAgo(new Date(rider.created_at)),
          status: 'success',
        });
      });

      // Fetch recent payments
      let paymentsQuery = supabase
        .from('payments')
        .select('id, amount, paid_at, rider_id, riders!inner(full_name, id_number)')
        .eq('status', 'completed')
        .not('paid_at', 'is', null)
        .order('paid_at', { ascending: false })
        .limit(5);
      if (countyId) paymentsQuery = paymentsQuery.eq('county_id', countyId);
      const { data: recentPayments } = await paymentsQuery;

      recentPayments?.forEach((payment: any) => {
        const rider = payment.riders;
        activities.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          title: 'Permit Payment Received',
          description: `KES ${Number(payment.amount).toLocaleString()} received from ${rider?.full_name || 'Unknown'}`,
          time: payment.paid_at ? formatTimeAgo(new Date(payment.paid_at)) : 'Unknown',
          status: 'success',
        });
      });

      // Fetch recent penalties
      let penaltiesQuery = supabase
        .from('penalties')
        .select('id, penalty_type, amount, created_at, rider_id, riders!inner(full_name)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (countyId) penaltiesQuery = penaltiesQuery.eq('county_id', countyId);
      const { data: recentPenalties } = await penaltiesQuery;

      recentPenalties?.forEach((penalty: any) => {
        const rider = penalty.riders;
        activities.push({
          id: `penalty-${penalty.id}`,
          type: 'penalty',
          title: 'Penalty Issued',
          description: `${penalty.penalty_type} penalty issued to ${rider?.full_name || 'Unknown'}`,
          time: formatTimeAgo(new Date(penalty.created_at)),
          status: penalty.is_paid ? 'success' : 'warning',
        });
      });

      // Fetch permits expiring soon (next 7 days)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      let expiringQuery = supabase
        .from('permits')
        .select('id, expires_at, status')
        .eq('status', 'active')
        .lte('expires_at', sevenDaysFromNow.toISOString())
        .gte('expires_at', now.toISOString())
        .order('expires_at', { ascending: true })
        .limit(1);
      if (countyId) expiringQuery = expiringQuery.eq('county_id', countyId);
      const { data: expiringPermits } = await expiringQuery;

      if (expiringPermits && expiringPermits.length > 0) {
        const count = expiringPermits.length;
        activities.push({
          id: 'permits-expiring',
          type: 'permit',
          title: 'Permits Expiring Soon',
          description: `${count} permit${count > 1 ? 's' : ''} expiring in the next 7 days`,
          time: formatTimeAgo(new Date(expiringPermits[0].expires_at)),
          status: 'pending',
        });
      }

      // Sort by time (most recent first) and limit
      return activities
        .sort((a, b) => {
          // Simple sort - in production, parse actual dates
          return 0;
        })
        .slice(0, limit) as RecentActivityItem[];
    },
    enabled: true,
  });
}

// Monthly revenue data interface
export interface MonthlyRevenueData {
  date: string;
  amount: number;
}

// Fetch monthly revenue for chart (countyId undefined = platform-wide for super admin)
export function useMonthlyRevenue(countyId?: string, months: number = 6) {
  return useQuery({
    queryKey: ['monthly-revenue', countyId, months],
    queryFn: async () => {
      const now = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      let paymentsQuery = supabase
        .from('payments')
        .select('amount, paid_at')
        .eq('status', 'completed')
        .gte('paid_at', startDate.toISOString())
        .lte('paid_at', now.toISOString());
      if (countyId) paymentsQuery = paymentsQuery.eq('county_id', countyId);
      const { data: payments } = await paymentsQuery;

      // Group by month
      const monthMap = new Map<string, number>();

      // Initialize all months with 0
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        monthMap.set(monthKey, 0);
      }

      // Sum payments by month
      payments?.forEach((payment: any) => {
        if (payment.paid_at) {
          const date = new Date(payment.paid_at);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
          const current = monthMap.get(monthKey) || 0;
          monthMap.set(monthKey, current + Number(payment.amount || 0));
        }
      });

      // Convert to array format
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const result: MonthlyRevenueData[] = [];
      
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        result.push({
          date: monthKey,
          amount: monthMap.get(monthKey) || 0,
        });
      }

      return result;
    },
    enabled: true,
  });
}

// Compliance overview item interface
export interface ComplianceOverviewItem {
  id: string;
  name: string;
  type: 'sacco' | 'stage';
  complianceRate: number;
  status: 'compliant' | 'at_risk' | 'non_compliant';
}

// Fetch compliance overview for dashboard
export function useComplianceOverview(countyId?: string, limit: number = 4) {
  return useQuery({
    queryKey: ['compliance-overview', countyId, limit],
    queryFn: async () => {
      if (!countyId) return [] as ComplianceOverviewItem[];

      const items: ComplianceOverviewItem[] = [];

      // Fetch top saccos by compliance
      const { data: saccos } = await supabase
        .from('saccos')
        .select('id, name')
        .eq('county_id', countyId)
        .eq('status', 'approved')
        .limit(10);

      if (saccos && saccos.length > 0) {
        const saccoIds = saccos.map(s => s.id);
        const { data: riders } = await supabase
          .from('riders')
          .select('id, sacco_id, compliance_status')
          .in('sacco_id', saccoIds)
          .eq('county_id', countyId);

        // Calculate compliance per sacco
        const saccoStats = new Map<string, { total: number; compliant: number }>();
        saccos.forEach(s => saccoStats.set(s.id, { total: 0, compliant: 0 }));
        
        riders?.forEach(rider => {
          if (rider.sacco_id) {
            const stats = saccoStats.get(rider.sacco_id);
            if (stats) {
              stats.total++;
              if (rider.compliance_status === 'compliant') {
                stats.compliant++;
              }
            }
          }
        });

        saccos.forEach(sacco => {
          const stats = saccoStats.get(sacco.id) || { total: 0, compliant: 0 };
          if (stats.total > 0) {
            const complianceRate = Math.round((stats.compliant / stats.total) * 100);
            items.push({
              id: `sacco-${sacco.id}`,
              name: sacco.name,
              type: 'sacco',
              complianceRate,
              status: complianceRate >= 80 ? 'compliant' : complianceRate >= 50 ? 'at_risk' : 'non_compliant',
            });
          }
        });
      }

      // Fetch top stages by compliance
      const { data: stages } = await supabase
        .from('stages')
        .select('id, name')
        .eq('county_id', countyId)
        .eq('status', 'approved')
        .limit(10);

      if (stages && stages.length > 0) {
        const stageIds = stages.map(s => s.id);
        const { data: riders } = await supabase
          .from('riders')
          .select('id, stage_id, compliance_status')
          .in('stage_id', stageIds)
          .eq('county_id', countyId);

        // Calculate compliance per stage
        const stageStats = new Map<string, { total: number; compliant: number }>();
        stages.forEach(s => stageStats.set(s.id, { total: 0, compliant: 0 }));
        
        riders?.forEach(rider => {
          if (rider.stage_id) {
            const stats = stageStats.get(rider.stage_id);
            if (stats) {
              stats.total++;
              if (rider.compliance_status === 'compliant') {
                stats.compliant++;
              }
            }
          }
        });

        stages.forEach(stage => {
          const stats = stageStats.get(stage.id) || { total: 0, compliant: 0 };
          if (stats.total > 0) {
            const complianceRate = Math.round((stats.compliant / stats.total) * 100);
            items.push({
              id: `stage-${stage.id}`,
              name: stage.name,
              type: 'stage',
              complianceRate,
              status: complianceRate >= 80 ? 'compliant' : complianceRate >= 50 ? 'at_risk' : 'non_compliant',
            });
          }
        });
      }

      // Sort by compliance rate (lowest first to show non-compliant items)
      return items
        .sort((a, b) => a.complianceRate - b.complianceRate)
        .slice(0, limit) as ComplianceOverviewItem[];
    },
    enabled: !!countyId,
  });
}

// --- Sacco Dashboard ---

export interface SaccoDashboardStats {
  totalMembers: number;
  compliantCount: number;
  nonCompliantCount: number;
  expiredPermitsCount: number;
  unpaidPenaltiesCount: number;
}

export function useSaccoDashboardStats(saccoId: string | undefined, countyId: string | undefined) {
  return useQuery({
    queryKey: ['sacco-dashboard-stats', saccoId, countyId],
    queryFn: async (): Promise<SaccoDashboardStats> => {
      if (!saccoId || !countyId) {
        return {
          totalMembers: 0,
          compliantCount: 0,
          nonCompliantCount: 0,
          expiredPermitsCount: 0,
          unpaidPenaltiesCount: 0,
        };
      }
      const now = new Date().toISOString();

      const { data: riders, error: ridersError } = await supabase
        .from('riders')
        .select('id, compliance_status')
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId);

      if (ridersError) throw ridersError;
      const memberIds = (riders ?? []).map((r) => r.id);
      const totalMembers = memberIds.length;

      let compliantCount = 0;
      let nonCompliantCount = 0;
      (riders ?? []).forEach((r) => {
        if (r.compliance_status === 'compliant') compliantCount++;
        else if (r.compliance_status === 'non_compliant' || r.compliance_status === 'blacklisted') nonCompliantCount++;
      });

      let expiredPermitsCount = 0;
      let unpaidPenaltiesCount = 0;

      if (memberIds.length > 0) {
        const [permitsRes, penaltiesRes] = await Promise.all([
          supabase
            .from('permits')
            .select('id, status, expires_at, rider_id')
            .eq('county_id', countyId)
            .in('rider_id', memberIds),
          supabase
            .from('penalties')
            .select('id, rider_id, is_paid')
            .eq('county_id', countyId)
            .in('rider_id', memberIds)
            .eq('is_paid', false),
        ]);

        const permits = permitsRes.data ?? [];
        expiredPermitsCount = permits.filter(
          (p) => p.status === 'expired' || (p.expires_at != null && new Date(p.expires_at) < new Date(now))
        ).length;
        unpaidPenaltiesCount = (penaltiesRes.data ?? []).length;
      }

      return {
        totalMembers,
        compliantCount,
        nonCompliantCount,
        expiredPermitsCount,
        unpaidPenaltiesCount,
      };
    },
    enabled: !!saccoId && !!countyId,
    staleTime: 60_000,
  });
}

export interface SaccoAlertItem {
  id: string;
  type: 'penalty' | 'expired_permit';
  title: string;
  description: string;
  time: string;
  timestamp: number;
  severity: 'error' | 'warning' | 'info';
}

export function useSaccoAlerts(saccoId: string | undefined, countyId: string | undefined, limit: number = 10) {
  return useQuery({
    queryKey: ['sacco-alerts', saccoId, countyId, limit],
    queryFn: async (): Promise<SaccoAlertItem[]> => {
      if (!saccoId || !countyId) return [];
      const alerts: SaccoAlertItem[] = [];
      const now = new Date();

      const formatTimeAgo = (date: Date): string => {
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      };

      const { data: members } = await supabase
        .from('riders')
        .select('id, full_name')
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId);
      const memberIds = (members ?? []).map((m) => m.id);
      const memberMap = new Map((members ?? []).map((m) => [m.id, m.full_name]));

      if (memberIds.length === 0) return [];

      const [penaltiesRes, permitsRes] = await Promise.all([
        supabase
          .from('penalties')
          .select('id, penalty_type, amount, created_at, rider_id, is_paid')
          .eq('county_id', countyId)
          .in('rider_id', memberIds)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('permits')
          .select('id, permit_number, expires_at, rider_id')
          .eq('county_id', countyId)
          .in('rider_id', memberIds),
      ]);

      const penalties = (penaltiesRes.data ?? []).filter((p) => !p.is_paid);
      const expiredPermits = (permitsRes.data ?? []).filter(
        (p) => p.expires_at != null && new Date(p.expires_at) < now
      );

      penalties.forEach((p) => {
        const d = new Date(p.created_at);
        alerts.push({
          id: `penalty-${p.id}`,
          type: 'penalty',
          title: 'Unpaid penalty',
          description: `${p.penalty_type} (KES ${Number(p.amount).toLocaleString()}) — ${memberMap.get(p.rider_id) ?? 'Member'}`,
          time: formatTimeAgo(d),
          timestamp: d.getTime(),
          severity: 'error',
        });
      });
      expiredPermits
        .sort((a, b) => new Date(b.expires_at!).getTime() - new Date(a.expires_at!).getTime())
        .slice(0, limit)
        .forEach((p) => {
          const d = new Date(p.expires_at!);
          alerts.push({
            id: `expired-${p.id}`,
            type: 'expired_permit',
            title: 'Expired permit',
            description: `${p.permit_number ?? 'Permit'} — ${memberMap.get(p.rider_id) ?? 'Member'}`,
            time: formatTimeAgo(d),
            timestamp: d.getTime(),
            severity: 'warning',
          });
        });

      return alerts.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    },
    enabled: !!saccoId && !!countyId,
    staleTime: 60_000,
  });
}

// Fetch permit expiry alerts for sacco members
export interface PermitExpiryAlert {
  id: string;
  permit_number: string;
  rider_id: string;
  rider_name: string;
  expires_at: string;
  daysUntilExpiry: number;
  isExpired: boolean;
}

export function useSaccoPermitExpiryAlerts(saccoId: string | undefined, countyId: string | undefined) {
  return useQuery({
    queryKey: ['sacco-permit-expiry-alerts', saccoId, countyId],
    queryFn: async (): Promise<PermitExpiryAlert[]> => {
      if (!saccoId || !countyId) return [];

      // Get all member IDs for this sacco
      const { data: members, error: membersError } = await supabase
        .from('riders')
        .select('id, full_name')
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const memberIds = members.map(m => m.id);
      const memberMap = new Map(members.map(m => [m.id, m.full_name]));

      // Fetch active permits for these members
      const { data: permits, error: permitsError } = await supabase
        .from('permits')
        .select('id, permit_number, expires_at, rider_id')
        .eq('county_id', countyId)
        .in('rider_id', memberIds)
        .eq('status', 'active')
        .not('expires_at', 'is', null);

      if (permitsError) throw permitsError;
      if (!permits || permits.length === 0) return [];

      const now = new Date();
      const alerts: PermitExpiryAlert[] = [];

      permits.forEach(permit => {
        if (!permit.expires_at) return;
        const expiryDate = new Date(permit.expires_at);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isExpired = expiryDate < now;

        // Include expired permits and permits expiring within 30 days
        if (isExpired || daysUntilExpiry <= 30) {
          alerts.push({
            id: permit.id,
            permit_number: permit.permit_number,
            rider_id: permit.rider_id,
            rider_name: memberMap.get(permit.rider_id) || 'Unknown',
            expires_at: permit.expires_at,
            daysUntilExpiry,
            isExpired,
          });
        }
      });

      // Sort by expiry date (expired first, then by days until expiry)
      return alerts.sort((a, b) => {
        if (a.isExpired && !b.isExpired) return -1;
        if (!a.isExpired && b.isExpired) return 1;
        return a.daysUntilExpiry - b.daysUntilExpiry;
      });
    },
    enabled: !!saccoId && !!countyId,
    staleTime: 60_000,
  });
}

// Fetch monthly revenue for SACCO
export function useSaccoMonthlyRevenue(saccoId: string | undefined, countyId: string | undefined, months: number = 6) {
  return useQuery({
    queryKey: ['sacco-monthly-revenue', saccoId, countyId, months],
    queryFn: async () => {
      if (!saccoId || !countyId) return [] as MonthlyRevenueData[];

      const now = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Get member IDs for this SACCO
      const { data: members } = await supabase
        .from('riders')
        .select('id')
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId);

      const memberIds = (members ?? []).map(m => m.id);
      if (memberIds.length === 0) return [] as MonthlyRevenueData[];

      // Fetch payments for members in this SACCO
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, paid_at')
        .eq('county_id', countyId)
        .eq('status', 'completed')
        .in('rider_id', memberIds)
        .gte('paid_at', startDate.toISOString())
        .lte('paid_at', now.toISOString());

      // Group by month
      const monthMap = new Map<string, number>();

      // Initialize all months with 0
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        monthMap.set(monthKey, 0);
      }

      // Sum payments by month
      payments?.forEach((payment: any) => {
        if (payment.paid_at) {
          const date = new Date(payment.paid_at);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
          const current = monthMap.get(monthKey) || 0;
          monthMap.set(monthKey, current + Number(payment.amount || 0));
        }
      });

      // Convert to array format
      const result: MonthlyRevenueData[] = [];
      
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        result.push({
          date: monthKey,
          amount: monthMap.get(monthKey) || 0,
        });
      }

      return result;
    },
    enabled: !!saccoId && !!countyId,
    staleTime: 60_000,
  });
}

// Recent activity interface for SACCO
export interface SaccoRecentActivityItem {
  id: string;
  type: 'registration' | 'payment' | 'permit' | 'penalty' | 'verification';
  title: string;
  description: string;
  time: string;
  status?: 'success' | 'pending' | 'warning' | 'error';
}

// Fetch recent activity for SACCO
export function useSaccoRecentActivity(saccoId: string | undefined, countyId: string | undefined, limit: number = 5) {
  return useQuery({
    queryKey: ['sacco-recent-activity', saccoId, countyId, limit],
    queryFn: async (): Promise<SaccoRecentActivityItem[]> => {
      if (!saccoId || !countyId) return [];

      const activities: SaccoRecentActivityItem[] = [];
      const now = new Date();

      const formatTimeAgo = (date: Date): string => {
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      };

      // Get member IDs for this SACCO
      const { data: members } = await supabase
        .from('riders')
        .select('id, full_name')
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId);

      const memberIds = (members ?? []).map(m => m.id);
      const memberMap = new Map((members ?? []).map(m => [m.id, m.full_name]));
      if (memberIds.length === 0) return [];

      // Fetch recent registrations
      const { data: recentRegistrations } = await supabase
        .from('riders')
        .select('id, full_name, created_at')
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      recentRegistrations?.forEach((rider) => {
        activities.push({
          id: `registration-${rider.id}`,
          type: 'registration',
          title: 'New Member Registration',
          description: `${rider.full_name} registered`,
          time: formatTimeAgo(new Date(rider.created_at)),
          status: 'success',
        });
      });

      // Fetch recent payments
      const { data: recentPayments } = await supabase
        .from('payments')
        .select('id, amount, paid_at, rider_id, riders!inner(full_name)')
        .eq('county_id', countyId)
        .eq('status', 'completed')
        .in('rider_id', memberIds)
        .not('paid_at', 'is', null)
        .order('paid_at', { ascending: false })
        .limit(limit);

      recentPayments?.forEach((payment: any) => {
        const rider = payment.riders;
        activities.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          title: 'Permit Payment Received',
          description: `KES ${Number(payment.amount).toLocaleString()} from ${rider?.full_name || 'Member'}`,
          time: payment.paid_at ? formatTimeAgo(new Date(payment.paid_at)) : 'Unknown',
          status: 'success',
        });
      });

      // Fetch recent penalties
      const { data: recentPenalties } = await supabase
        .from('penalties')
        .select('id, penalty_type, amount, created_at, rider_id, riders!inner(full_name)')
        .eq('county_id', countyId)
        .in('rider_id', memberIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      recentPenalties?.forEach((penalty: any) => {
        const rider = penalty.riders;
        activities.push({
          id: `penalty-${penalty.id}`,
          type: 'penalty',
          title: 'Penalty Issued',
          description: `${penalty.penalty_type} to ${rider?.full_name || 'Member'}`,
          time: formatTimeAgo(new Date(penalty.created_at)),
          status: penalty.is_paid ? 'success' : 'warning',
        });
      });

      // Sort by time (most recent first) and limit
      return activities
        .sort((a, b) => {
          // Simple sort - in production, parse actual dates
          return 0;
        })
        .slice(0, limit) as SaccoRecentActivityItem[];
    },
    enabled: !!saccoId && !!countyId,
    staleTime: 60_000,
  });
}

// Fetch compliance overview for SACCO (by stages)
export function useSaccoComplianceOverview(saccoId: string | undefined, countyId: string | undefined, limit: number = 4) {
  return useQuery({
    queryKey: ['sacco-compliance-overview', saccoId, countyId, limit],
    queryFn: async () => {
      if (!saccoId || !countyId) return [] as ComplianceOverviewItem[];

      // Fetch stages for this SACCO
      const { data: stages } = await supabase
        .from('stages')
        .select('id, name')
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId)
        .eq('status', 'approved')
        .limit(10);

      if (!stages || stages.length === 0) return [] as ComplianceOverviewItem[];

      const stageIds = stages.map(s => s.id);
      const { data: riders } = await supabase
        .from('riders')
        .select('id, stage_id, compliance_status')
        .in('stage_id', stageIds)
        .eq('county_id', countyId)
        .eq('sacco_id', saccoId);

      // Calculate compliance per stage
      const stageStats = new Map<string, { total: number; compliant: number }>();
      stages.forEach(s => stageStats.set(s.id, { total: 0, compliant: 0 }));
      
      riders?.forEach(rider => {
        if (rider.stage_id) {
          const stats = stageStats.get(rider.stage_id);
          if (stats) {
            stats.total++;
            if (rider.compliance_status === 'compliant') {
              stats.compliant++;
            }
          }
        }
      });

      const items: ComplianceOverviewItem[] = [];
      stages.forEach(stage => {
        const stats = stageStats.get(stage.id) || { total: 0, compliant: 0 };
        if (stats.total > 0) {
          const complianceRate = Math.round((stats.compliant / stats.total) * 100);
          items.push({
            id: `stage-${stage.id}`,
            name: stage.name,
            type: 'stage',
            complianceRate,
            status: complianceRate >= 80 ? 'compliant' : complianceRate >= 50 ? 'at_risk' : 'non_compliant',
          });
        }
      });

      // Sort by compliance rate (lowest first to show non-compliant items)
      return items
        .sort((a, b) => a.complianceRate - b.complianceRate)
        .slice(0, limit) as ComplianceOverviewItem[];
    },
    enabled: !!saccoId && !!countyId,
    staleTime: 60_000,
  });
}
