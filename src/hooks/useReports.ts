import { useQuery } from '@tanstack/react-query';
import { addDays, format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface RegistrationReport {
  date: string;
  totalRegistrations: number;
  approved: number;
  pending: number;
  rejected: number;
  suspended: number;
}

export interface PaymentReport {
  date: string;
  totalPayments: number;
  completed: number;
  failed: number;
  pending: number;
  totalAmount: number;
}

export interface PenaltyReport {
  date: string;
  totalPenalties: number;
  paid: number;
  unpaid: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

export interface ComplianceReport {
  saccoId: string;
  saccoName: string;
  totalRiders: number;
  compliant: number;
  nonCompliant: number;
  pendingReview: number;
  blacklisted: number;
  complianceRate: number;
}

export interface SaccoPerformanceReport {
  saccoId: string;
  saccoName: string;
  totalRiders: number;
  activePermits: number;
  expiredPermits: number;
  totalPenalties: number;
  paidPenalties: number;
  unpaidPenalties: number;
  complianceRate: number;
  revenue: number;
}

// Fetch registration report (countyId undefined = all counties)
export function useRegistrationReport(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['registration-report', countyId, startDate, endDate],
    queryFn: async () => {
      let query = supabase.from('riders').select('id, status, created_at');
      if (countyId) query = query.eq('county_id', countyId);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) {
        const endExclusive = format(addDays(parseISO(endDate), 1), 'yyyy-MM-dd');
        query = query.lt('created_at', endExclusive);
      }

      const { data: riders, error } = await query;
      if (error) throw error;
      if (!riders) return [];

      // Group by date
      const dateMap = new Map<string, { total: number; approved: number; pending: number; rejected: number; suspended: number }>();

      riders.forEach((rider: any) => {
        const date = rider.created_at.split('T')[0];
        const current = dateMap.get(date) || { total: 0, approved: 0, pending: 0, rejected: 0, suspended: 0 };
        current.total++;
        if (rider.status === 'approved') current.approved++;
        else if (rider.status === 'pending') current.pending++;
        else if (rider.status === 'rejected') current.rejected++;
        else if (rider.status === 'suspended') current.suspended++;
        dateMap.set(date, current);
      });

      return Array.from(dateMap.entries())
        .map(([date, stats]) => ({
          date,
          totalRegistrations: stats.total,
          approved: stats.approved,
          pending: stats.pending,
          rejected: stats.rejected,
          suspended: stats.suspended,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)) as RegistrationReport[];
    },
    enabled: true,
  });
}

// Fetch payment report (countyId undefined = all counties)
export function usePaymentReport(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['payment-report', countyId, startDate, endDate],
    queryFn: async () => {
      let query = supabase.from('payments').select('id, status, amount, created_at, paid_at');
      if (countyId) query = query.eq('county_id', countyId);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) {
        const endExclusive = format(addDays(parseISO(endDate), 1), 'yyyy-MM-dd');
        query = query.lt('created_at', endExclusive);
      }

      const { data: payments, error } = await query;
      if (error) throw error;
      if (!payments) return [];

      // Group by date (using created_at for grouping, but paid_at for amount calculation)
      const dateMap = new Map<string, { total: number; completed: number; failed: number; pending: number; totalAmount: number }>();

      payments.forEach((payment: any) => {
        const date = payment.created_at.split('T')[0];
        const current = dateMap.get(date) || { total: 0, completed: 0, failed: 0, pending: 0, totalAmount: 0 };
        current.total++;
        
        // Only count amount for completed payments (matching revenue calculations)
        if (payment.status === 'completed') {
          current.completed++;
          // Only add to totalAmount if payment was actually paid (has paid_at)
          if (payment.paid_at) {
            current.totalAmount += Number(payment.amount || 0);
          }
        } else if (payment.status === 'failed') {
          current.failed++;
        } else if (payment.status === 'pending') {
          current.pending++;
        }
        dateMap.set(date, current);
      });

      return Array.from(dateMap.entries())
        .map(([date, stats]) => ({
          date,
          totalPayments: stats.total,
          completed: stats.completed,
          failed: stats.failed,
          pending: stats.pending,
          totalAmount: stats.totalAmount,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)) as PaymentReport[];
    },
    enabled: true,
  });
}

// Fetch penalty report (countyId undefined = all counties)
export function usePenaltyReport(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['penalty-report', countyId, startDate, endDate],
    queryFn: async () => {
      let query = supabase.from('penalties').select('id, is_paid, amount, created_at');
      if (countyId) query = query.eq('county_id', countyId);
      if (startDate) query = query.gte('created_at', startDate);
      // Use exclusive upper bound (start of next day) so we include the full end date
      if (endDate) {
        const endExclusive = format(addDays(parseISO(endDate), 1), 'yyyy-MM-dd');
        query = query.lt('created_at', endExclusive);
      }

      const { data: penalties, error } = await query;
      if (error) throw error;
      if (!penalties) return [];

      // Group by date
      const dateMap = new Map<string, { total: number; paid: number; unpaid: number; totalAmount: number; paidAmount: number; unpaidAmount: number }>();

      penalties.forEach((penalty: any) => {
        const date = penalty.created_at.split('T')[0];
        const current = dateMap.get(date) || { total: 0, paid: 0, unpaid: 0, totalAmount: 0, paidAmount: 0, unpaidAmount: 0 };
        current.total++;
        const amount = Number(penalty.amount || 0);
        current.totalAmount += amount;
        if (penalty.is_paid) {
          current.paid++;
          current.paidAmount += amount;
        } else {
          current.unpaid++;
          current.unpaidAmount += amount;
        }
        dateMap.set(date, current);
      });

      return Array.from(dateMap.entries())
        .map(([date, stats]) => ({
          date,
          totalPenalties: stats.total,
          paid: stats.paid,
          unpaid: stats.unpaid,
          totalAmount: stats.totalAmount,
          paidAmount: stats.paidAmount,
          unpaidAmount: stats.unpaidAmount,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)) as PenaltyReport[];
    },
    enabled: true,
  });
}

// Fetch compliance report (countyId undefined = all counties)
export function useComplianceReport(countyId?: string) {
  return useQuery({
    queryKey: ['compliance-report', countyId],
    queryFn: async () => {
      let saccosQuery = supabase.from('saccos').select('id, name');
      if (countyId) saccosQuery = saccosQuery.eq('county_id', countyId);
      const { data: saccos } = await saccosQuery;
      if (!saccos) return [];

      let ridersQuery = supabase.from('riders').select('id, sacco_id, compliance_status');
      if (countyId) ridersQuery = ridersQuery.eq('county_id', countyId);
      const { data: riders } = await ridersQuery;

      if (!riders) return [];

      // Calculate compliance per sacco
      const saccoStats = new Map<string, { total: number; compliant: number; nonCompliant: number; pendingReview: number; blacklisted: number }>();

      saccos.forEach(sacco => {
        saccoStats.set(sacco.id, { total: 0, compliant: 0, nonCompliant: 0, pendingReview: 0, blacklisted: 0 });
      });

      riders.forEach((rider: any) => {
        if (rider.sacco_id) {
          const stats = saccoStats.get(rider.sacco_id);
          if (stats) {
            stats.total++;
            if (rider.compliance_status === 'compliant') stats.compliant++;
            else if (rider.compliance_status === 'non_compliant') stats.nonCompliant++;
            else if (rider.compliance_status === 'pending_review') stats.pendingReview++;
            else if (rider.compliance_status === 'blacklisted') stats.blacklisted++;
          }
        }
      });

      return saccos.map(sacco => {
        const stats = saccoStats.get(sacco.id) || { total: 0, compliant: 0, nonCompliant: 0, pendingReview: 0, blacklisted: 0 };
        const complianceRate = stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 100;
        return {
          saccoId: sacco.id,
          saccoName: sacco.name,
          totalRiders: stats.total,
          compliant: stats.compliant,
          nonCompliant: stats.nonCompliant,
          pendingReview: stats.pendingReview,
          blacklisted: stats.blacklisted,
          complianceRate,
        };
      }).filter(r => r.totalRiders > 0) as ComplianceReport[];
    },
    enabled: true,
  });
}

// Fetch Sacco performance report (countyId undefined = all counties)
export function useSaccoPerformanceReport(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['sacco-performance-report', countyId, startDate, endDate],
    queryFn: async () => {
      try {
        let saccosQuery = supabase.from('saccos').select('id, name');
        if (countyId) saccosQuery = saccosQuery.eq('county_id', countyId);
        const { data: saccos, error: saccosError } = await saccosQuery;

        if (saccosError) {
          console.error('Error fetching saccos:', saccosError);
          throw saccosError;
        }
        if (!saccos || saccos.length === 0) return [];

        const saccoIds = saccos.map(s => s.id);

        let ridersQuery = supabase
          .from('riders')
          .select('id, sacco_id, compliance_status')
          .in('sacco_id', saccoIds);
        if (countyId) ridersQuery = ridersQuery.eq('county_id', countyId);
        const { data: riders, error: ridersError } = await ridersQuery;

        if (ridersError) {
          console.error('Error fetching riders:', ridersError);
          throw ridersError;
        }

        const riderIds = riders?.map(r => r.id) || [];

        let permitsQuery = supabase
          .from('permits')
          .select('id, rider_id, status, expires_at');
        if (countyId) permitsQuery = permitsQuery.eq('county_id', countyId);
        if (riderIds.length > 0) {
          permitsQuery = permitsQuery.in('rider_id', riderIds);
        } else {
          permitsQuery = permitsQuery.eq('rider_id', '00000000-0000-0000-0000-000000000000');
        }
        const { data: permits, error: permitsError } = await permitsQuery;

        if (permitsError) {
          console.error('Error fetching permits:', permitsError);
          throw permitsError;
        }

        let penaltiesQuery = supabase
          .from('penalties')
          .select('id, rider_id, is_paid, amount');
        if (countyId) penaltiesQuery = penaltiesQuery.eq('county_id', countyId);
        if (riderIds.length > 0) {
          penaltiesQuery = penaltiesQuery.in('rider_id', riderIds);
        } else {
          penaltiesQuery = penaltiesQuery.eq('rider_id', '00000000-0000-0000-0000-000000000000');
        }

        if (startDate) penaltiesQuery = penaltiesQuery.gte('created_at', startDate);
        if (endDate) {
          const endExclusive = format(addDays(parseISO(endDate), 1), 'yyyy-MM-dd');
          penaltiesQuery = penaltiesQuery.lt('created_at', endExclusive);
        }

        const { data: penalties, error: penaltiesError } = await penaltiesQuery;

        if (penaltiesError) {
          console.error('Error fetching penalties:', penaltiesError);
          throw penaltiesError;
        }

        let paymentsQuery = supabase
          .from('payments')
          .select('amount, rider_id')
          .eq('status', 'completed');
        if (countyId) paymentsQuery = paymentsQuery.eq('county_id', countyId);
        if (riderIds.length > 0) {
          paymentsQuery = paymentsQuery.in('rider_id', riderIds);
        } else {
          paymentsQuery = paymentsQuery.eq('rider_id', '00000000-0000-0000-0000-000000000000');
        }

        if (startDate) paymentsQuery = paymentsQuery.gte('paid_at', startDate);
        if (endDate) {
          const endExclusive = format(addDays(parseISO(endDate), 1), 'yyyy-MM-dd');
          paymentsQuery = paymentsQuery.lt('paid_at', endExclusive);
        }

        const { data: payments, error: paymentsError } = await paymentsQuery;

        if (paymentsError) {
          console.error('Error fetching payments:', paymentsError);
          throw paymentsError;
        }

        // Map riders to saccos
        const riderToSacco = new Map<string, string>();
        riders?.forEach(rider => {
          if (rider.sacco_id) {
            riderToSacco.set(rider.id, rider.sacco_id);
          }
        });

        // Calculate stats per sacco
        const saccoPerformance = new Map<string, {
          totalRiders: number;
          compliant: number;
          activePermits: number;
          expiredPermits: number;
          totalPenalties: number;
          paidPenalties: number;
          unpaidPenalties: number;
          revenue: number;
        }>();

        saccos.forEach(sacco => {
          saccoPerformance.set(sacco.id, {
            totalRiders: 0,
            compliant: 0,
            activePermits: 0,
            expiredPermits: 0,
            totalPenalties: 0,
            paidPenalties: 0,
            unpaidPenalties: 0,
            revenue: 0,
          });
        });

        // Count riders and compliance
        riders?.forEach((rider: any) => {
          if (rider.sacco_id) {
            const perf = saccoPerformance.get(rider.sacco_id);
            if (perf) {
              perf.totalRiders++;
              if (rider.compliance_status === 'compliant') perf.compliant++;
            }
          }
        });

        // Count permits - check current status
        const now = new Date().toISOString();
        permits?.forEach((permit: any) => {
          const saccoId = riderToSacco.get(permit.rider_id);
          if (saccoId) {
            const perf = saccoPerformance.get(saccoId);
            if (perf) {
              // Check if permit is currently active
              if (permit.status === 'active' && permit.expires_at && permit.expires_at > now) {
                perf.activePermits++;
              }
              // Check if permit is expired
              if (permit.status === 'expired' || (permit.expires_at && permit.expires_at < now)) {
                perf.expiredPermits++;
              }
            }
          }
        });

        // Count penalties
        penalties?.forEach((penalty: any) => {
          const saccoId = riderToSacco.get(penalty.rider_id);
          if (saccoId) {
            const perf = saccoPerformance.get(saccoId);
            if (perf) {
              perf.totalPenalties++;
              if (penalty.is_paid) perf.paidPenalties++;
              else perf.unpaidPenalties++;
            }
          }
        });

        // Calculate revenue
        payments?.forEach((payment: any) => {
          const saccoId = riderToSacco.get(payment.rider_id);
          if (saccoId) {
            const perf = saccoPerformance.get(saccoId);
            if (perf) {
              perf.revenue += Number(payment.amount || 0);
            }
          }
        });

        // Return all saccos with their performance data (don't filter out empty ones)
        return saccos.map(sacco => {
          const perf = saccoPerformance.get(sacco.id) || {
            totalRiders: 0,
            compliant: 0,
            activePermits: 0,
            expiredPermits: 0,
            totalPenalties: 0,
            paidPenalties: 0,
            unpaidPenalties: 0,
            revenue: 0,
          };
          const complianceRate = perf.totalRiders > 0 ? Math.round((perf.compliant / perf.totalRiders) * 100) : 0;
          return {
            saccoId: sacco.id,
            saccoName: sacco.name,
            totalRiders: perf.totalRiders,
            activePermits: perf.activePermits,
            expiredPermits: perf.expiredPermits,
            totalPenalties: perf.totalPenalties,
            paidPenalties: perf.paidPenalties,
            unpaidPenalties: perf.unpaidPenalties,
            complianceRate,
            revenue: perf.revenue,
          };
        }) as SaccoPerformanceReport[];
      } catch (error) {
        console.error('Error in useSaccoPerformanceReport:', error);
        return [];
      }
    },
    enabled: true,
  });
}

// --- Sacco-specific Reports ---

export interface SaccoMemberListReport {
  id: string;
  fullName: string;
  phone: string;
  idNumber: string;
  email: string | null;
  status: string;
  complianceStatus: string;
  stageName: string | null;
  permitNumber: string | null;
  permitStatus: string | null;
  permitExpiresAt: string | null;
  motorbikeRegistration: string | null;
  createdAt: string;
}

export interface SaccoComplianceReport {
  totalMembers: number;
  compliant: number;
  nonCompliant: number;
  pendingReview: number;
  blacklisted: number;
  complianceRate: number;
}

export interface SaccoPenaltyReport {
  date: string;
  totalPenalties: number;
  paid: number;
  unpaid: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

export interface SaccoStagePerformanceReport {
  stageId: string;
  stageName: string;
  totalMembers: number;
  compliant: number;
  nonCompliant: number;
  activePermits: number;
  expiredPermits: number;
  totalPenalties: number;
  paidPenalties: number;
  unpaidPenalties: number;
  complianceRate: number;
}

// Fetch sacco member list report
export function useSaccoMemberListReport(saccoId?: string, countyId?: string) {
  return useQuery({
    queryKey: ['sacco-member-list-report', saccoId, countyId],
    queryFn: async () => {
      if (!saccoId || !countyId) return [];

      const { data: riders, error } = await supabase
        .from('riders')
        .select(`
          id,
          full_name,
          phone,
          id_number,
          email,
          status,
          compliance_status,
          created_at,
          stage:stages(name),
          motorbikes(registration_number),
          permits(permit_number, status, expires_at)
        `)
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!riders) return [];

      return riders.map((rider: any) => {
        const motorbike = Array.isArray(rider.motorbikes) && rider.motorbikes.length > 0 
          ? rider.motorbikes[0] 
          : null;
        const permit = Array.isArray(rider.permits) && rider.permits.length > 0
          ? rider.permits[0]
          : null;

        return {
          id: rider.id,
          fullName: rider.full_name || '',
          phone: rider.phone || '',
          idNumber: rider.id_number || '',
          email: rider.email || null,
          status: rider.status || '',
          complianceStatus: rider.compliance_status || '',
          stageName: rider.stage?.name || null,
          permitNumber: permit?.permit_number || null,
          permitStatus: permit?.status || null,
          permitExpiresAt: permit?.expires_at || null,
          motorbikeRegistration: motorbike?.registration_number || null,
          createdAt: rider.created_at,
        };
      }) as SaccoMemberListReport[];
    },
    enabled: !!saccoId && !!countyId,
  });
}

// Fetch sacco compliance report
export function useSaccoComplianceReport(saccoId?: string, countyId?: string) {
  return useQuery({
    queryKey: ['sacco-compliance-report', saccoId, countyId],
    queryFn: async (): Promise<SaccoComplianceReport | null> => {
      if (!saccoId || !countyId) return null;

      const { data: riders, error } = await supabase
        .from('riders')
        .select('id, compliance_status')
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId);

      if (error) throw error;
      if (!riders) return null;

      let compliant = 0;
      let nonCompliant = 0;
      let pendingReview = 0;
      let blacklisted = 0;

      riders.forEach((rider: any) => {
        if (rider.compliance_status === 'compliant') compliant++;
        else if (rider.compliance_status === 'non_compliant') nonCompliant++;
        else if (rider.compliance_status === 'pending_review') pendingReview++;
        else if (rider.compliance_status === 'blacklisted') blacklisted++;
      });

      const totalMembers = riders.length;
      const complianceRate = totalMembers > 0 
        ? Math.round((compliant / totalMembers) * 100) 
        : 0;

      return {
        totalMembers,
        compliant,
        nonCompliant,
        pendingReview,
        blacklisted,
        complianceRate,
      };
    },
    enabled: !!saccoId && !!countyId,
  });
}

// Fetch sacco penalty report
export function useSaccoPenaltyReport(saccoId?: string, countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['sacco-penalty-report', saccoId, countyId, startDate, endDate],
    queryFn: async () => {
      if (!saccoId || !countyId) return [];

      // Get member IDs for this sacco
      const { data: members, error: membersError } = await supabase
        .from('riders')
        .select('id')
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const memberIds = members.map(m => m.id);

      let query = supabase
        .from('penalties')
        .select('id, is_paid, amount, created_at')
        .eq('county_id', countyId)
        .in('rider_id', memberIds);

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) {
        const endExclusive = format(addDays(parseISO(endDate), 1), 'yyyy-MM-dd');
        query = query.lt('created_at', endExclusive);
      }

      const { data: penalties, error } = await query;
      if (error) throw error;
      if (!penalties) return [];

      // Group by date
      const dateMap = new Map<string, { total: number; paid: number; unpaid: number; totalAmount: number; paidAmount: number; unpaidAmount: number }>();

      penalties.forEach((penalty: any) => {
        const date = penalty.created_at.split('T')[0];
        const current = dateMap.get(date) || { total: 0, paid: 0, unpaid: 0, totalAmount: 0, paidAmount: 0, unpaidAmount: 0 };
        current.total++;
        const amount = Number(penalty.amount || 0);
        current.totalAmount += amount;
        if (penalty.is_paid) {
          current.paid++;
          current.paidAmount += amount;
        } else {
          current.unpaid++;
          current.unpaidAmount += amount;
        }
        dateMap.set(date, current);
      });

      return Array.from(dateMap.entries())
        .map(([date, stats]) => ({
          date,
          totalPenalties: stats.total,
          paid: stats.paid,
          unpaid: stats.unpaid,
          totalAmount: stats.totalAmount,
          paidAmount: stats.paidAmount,
          unpaidAmount: stats.unpaidAmount,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)) as SaccoPenaltyReport[];
    },
    enabled: !!saccoId && !!countyId,
  });
}

// Fetch sacco stage performance report
export function useSaccoStagePerformanceReport(saccoId?: string, countyId?: string) {
  return useQuery({
    queryKey: ['sacco-stage-performance-report', saccoId, countyId],
    queryFn: async () => {
      if (!saccoId || !countyId) return [];

      // Get stages for this sacco
      const { data: stages, error: stagesError } = await supabase
        .from('stages')
        .select('id, name')
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId);

      if (stagesError) throw stagesError;
      if (!stages || stages.length === 0) return [];

      const stageIds = stages.map(s => s.id);

      // Get riders for these stages
      const { data: riders, error: ridersError } = await supabase
        .from('riders')
        .select('id, stage_id, compliance_status')
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId)
        .in('stage_id', stageIds);

      if (ridersError) throw ridersError;

      const riderIds = riders?.map(r => r.id) || [];

      // Get permits
      let permits: any[] = [];
      if (riderIds.length > 0) {
        const { data: permitsData } = await supabase
          .from('permits')
          .select('id, rider_id, status, expires_at')
          .eq('county_id', countyId)
          .in('rider_id', riderIds);
        permits = permitsData || [];
      }

      // Get penalties
      let penalties: any[] = [];
      if (riderIds.length > 0) {
        const { data: penaltiesData } = await supabase
          .from('penalties')
          .select('id, rider_id, is_paid')
          .eq('county_id', countyId)
          .in('rider_id', riderIds);
        penalties = penaltiesData || [];
      }

      // Map riders to stages
      const riderToStage = new Map<string, string>();
      riders?.forEach(rider => {
        if (rider.stage_id) {
          riderToStage.set(rider.id, rider.stage_id);
        }
      });

      // Calculate stats per stage
      const stageStats = new Map<string, {
        totalMembers: number;
        compliant: number;
        nonCompliant: number;
        activePermits: number;
        expiredPermits: number;
        totalPenalties: number;
        paidPenalties: number;
        unpaidPenalties: number;
      }>();

      stages.forEach(stage => {
        stageStats.set(stage.id, {
          totalMembers: 0,
          compliant: 0,
          nonCompliant: 0,
          activePermits: 0,
          expiredPermits: 0,
          totalPenalties: 0,
          paidPenalties: 0,
          unpaidPenalties: 0,
        });
      });

      // Count members and compliance
      riders?.forEach((rider: any) => {
        if (rider.stage_id) {
          const stats = stageStats.get(rider.stage_id);
          if (stats) {
            stats.totalMembers++;
            if (rider.compliance_status === 'compliant') stats.compliant++;
            else if (rider.compliance_status === 'non_compliant' || rider.compliance_status === 'blacklisted') stats.nonCompliant++;
          }
        }
      });

      // Count permits
      const now = new Date().toISOString();
      permits.forEach((permit: any) => {
        const stageId = riderToStage.get(permit.rider_id);
        if (stageId) {
          const stats = stageStats.get(stageId);
          if (stats) {
            if (permit.status === 'active' && permit.expires_at && permit.expires_at > now) {
              stats.activePermits++;
            }
            if (permit.status === 'expired' || (permit.expires_at && permit.expires_at < now)) {
              stats.expiredPermits++;
            }
          }
        }
      });

      // Count penalties
      penalties.forEach((penalty: any) => {
        const stageId = riderToStage.get(penalty.rider_id);
        if (stageId) {
          const stats = stageStats.get(stageId);
          if (stats) {
            stats.totalPenalties++;
            if (penalty.is_paid) stats.paidPenalties++;
            else stats.unpaidPenalties++;
          }
        }
      });

      return stages.map(stage => {
        const stats = stageStats.get(stage.id) || {
          totalMembers: 0,
          compliant: 0,
          nonCompliant: 0,
          activePermits: 0,
          expiredPermits: 0,
          totalPenalties: 0,
          paidPenalties: 0,
          unpaidPenalties: 0,
        };
        const complianceRate = stats.totalMembers > 0 
          ? Math.round((stats.compliant / stats.totalMembers) * 100) 
          : 0;

        return {
          stageId: stage.id,
          stageName: stage.name,
          totalMembers: stats.totalMembers,
          compliant: stats.compliant,
          nonCompliant: stats.nonCompliant,
          activePermits: stats.activePermits,
          expiredPermits: stats.expiredPermits,
          totalPenalties: stats.totalPenalties,
          paidPenalties: stats.paidPenalties,
          unpaidPenalties: stats.unpaidPenalties,
          complianceRate,
        };
      }) as SaccoStagePerformanceReport[];
    },
    enabled: !!saccoId && !!countyId,
  });
}
