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
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  capacity: number | null;
  created_at: string;
  sacco?: { name: string } | null;
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

// Fetch discipline incidents for a sacco (persisted in DB)
export function useDisciplineIncidents(saccoId: string | undefined, countyId: string | undefined) {
  return useQuery({
    queryKey: ['discipline-incidents', saccoId, countyId],
    queryFn: async () => {
      if (!saccoId || !countyId) return [] as DisciplineIncidentRow[];

      const { data, error } = await supabase
        .from('sacco_discipline_incidents')
        .select(`
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
          updated_at,
          riders(full_name, phone)
        `)
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [] as DisciplineIncidentRow[];

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
      return (data as Row[]).map((row) => {
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

// Fetch stages with statistics
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

// Recent activity interface
export interface RecentActivityItem {
  id: string;
  type: 'registration' | 'payment' | 'permit' | 'penalty' | 'verification';
  title: string;
  description: string;
  time: string;
  status?: 'success' | 'pending' | 'warning' | 'error';
}

// Fetch recent activity for dashboard
export function useRecentActivity(countyId?: string, limit: number = 10) {
  return useQuery({
    queryKey: ['recent-activity', countyId, limit],
    queryFn: async () => {
      if (!countyId) return [] as RecentActivityItem[];

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
      const { data: recentRiders } = await supabase
        .from('riders')
        .select('id, full_name, id_number, created_at')
        .eq('county_id', countyId)
        .order('created_at', { ascending: false })
        .limit(5);

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
      const { data: recentPayments } = await supabase
        .from('payments')
        .select('id, amount, paid_at, rider_id, riders!inner(full_name, id_number)')
        .eq('county_id', countyId)
        .eq('status', 'completed')
        .not('paid_at', 'is', null)
        .order('paid_at', { ascending: false })
        .limit(5);

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
      const { data: recentPenalties } = await supabase
        .from('penalties')
        .select('id, penalty_type, amount, created_at, rider_id, riders!inner(full_name)')
        .eq('county_id', countyId)
        .order('created_at', { ascending: false })
        .limit(5);

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
      const { data: expiringPermits } = await supabase
        .from('permits')
        .select('id, expires_at, status')
        .eq('county_id', countyId)
        .eq('status', 'active')
        .lte('expires_at', sevenDaysFromNow.toISOString())
        .gte('expires_at', now.toISOString())
        .order('expires_at', { ascending: true })
        .limit(1);

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
    enabled: !!countyId,
  });
}

// Monthly revenue data interface
export interface MonthlyRevenueData {
  date: string;
  amount: number;
}

// Fetch monthly revenue for chart
export function useMonthlyRevenue(countyId?: string, months: number = 6) {
  return useQuery({
    queryKey: ['monthly-revenue', countyId, months],
    queryFn: async () => {
      if (!countyId) return [] as MonthlyRevenueData[];

      const now = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Fetch payments for the last N months
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, paid_at')
        .eq('county_id', countyId)
        .eq('status', 'completed')
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
    enabled: !!countyId,
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
