import { useQuery } from '@tanstack/react-query';
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

// Fetch registration report
export function useRegistrationReport(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['registration-report', countyId, startDate, endDate],
    queryFn: async () => {
      if (!countyId) return [];

      let query = supabase
        .from('riders')
        .select('id, status, created_at')
        .eq('county_id', countyId);

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

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
    enabled: !!countyId,
  });
}

// Fetch payment report
export function usePaymentReport(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['payment-report', countyId, startDate, endDate],
    queryFn: async () => {
      if (!countyId) return [];

      let query = supabase
        .from('payments')
        .select('id, status, amount, created_at')
        .eq('county_id', countyId);

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data: payments, error } = await query;
      if (error) throw error;
      if (!payments) return [];

      // Group by date
      const dateMap = new Map<string, { total: number; completed: number; failed: number; pending: number; totalAmount: number }>();

      payments.forEach((payment: any) => {
        const date = payment.created_at.split('T')[0];
        const current = dateMap.get(date) || { total: 0, completed: 0, failed: 0, pending: 0, totalAmount: 0 };
        current.total++;
        current.totalAmount += Number(payment.amount || 0);
        if (payment.status === 'completed') current.completed++;
        else if (payment.status === 'failed') current.failed++;
        else if (payment.status === 'pending') current.pending++;
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
    enabled: !!countyId,
  });
}

// Fetch penalty report
export function usePenaltyReport(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['penalty-report', countyId, startDate, endDate],
    queryFn: async () => {
      if (!countyId) return [];

      let query = supabase
        .from('penalties')
        .select('id, is_paid, amount, created_at')
        .eq('county_id', countyId);

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

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
    enabled: !!countyId,
  });
}

// Fetch compliance report
export function useComplianceReport(countyId?: string) {
  return useQuery({
    queryKey: ['compliance-report', countyId],
    queryFn: async () => {
      if (!countyId) return [];

      // Get all saccos
      const { data: saccos } = await supabase
        .from('saccos')
        .select('id, name')
        .eq('county_id', countyId);

      if (!saccos) return [];

      // Get riders by sacco
      const { data: riders } = await supabase
        .from('riders')
        .select('id, sacco_id, compliance_status')
        .eq('county_id', countyId);

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
    enabled: !!countyId,
  });
}

// Fetch Sacco performance report
export function useSaccoPerformanceReport(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['sacco-performance-report', countyId, startDate, endDate],
    queryFn: async () => {
      if (!countyId) return [];

      // Get all saccos
      const { data: saccos } = await supabase
        .from('saccos')
        .select('id, name')
        .eq('county_id', countyId);

      if (!saccos) return [];

      const saccoIds = saccos.map(s => s.id);

      // Get riders by sacco
      const { data: riders } = await supabase
        .from('riders')
        .select('id, sacco_id, compliance_status')
        .eq('county_id', countyId)
        .in('sacco_id', saccoIds.length > 0 ? saccoIds : ['00000000-0000-0000-0000-000000000000']);

      // Get permits
      const riderIds = riders?.map(r => r.id) || [];
      let permitsQuery = supabase
        .from('permits')
        .select('id, rider_id, status, expires_at')
        .eq('county_id', countyId)
        .in('rider_id', riderIds.length > 0 ? riderIds : ['00000000-0000-0000-0000-000000000000']);

      if (startDate) permitsQuery = permitsQuery.gte('created_at', startDate);
      if (endDate) permitsQuery = permitsQuery.lte('created_at', endDate);

      const { data: permits } = await permitsQuery;

      // Get penalties
      let penaltiesQuery = supabase
        .from('penalties')
        .select('id, rider_id, is_paid, amount')
        .eq('county_id', countyId)
        .in('rider_id', riderIds.length > 0 ? riderIds : ['00000000-0000-0000-0000-000000000000']);

      if (startDate) penaltiesQuery = penaltiesQuery.gte('created_at', startDate);
      if (endDate) penaltiesQuery = penaltiesQuery.lte('created_at', endDate);

      const { data: penalties } = await penaltiesQuery;

      // Get payments (revenue)
      let paymentsQuery = supabase
        .from('payments')
        .select('amount, rider_id')
        .eq('county_id', countyId)
        .eq('status', 'completed')
        .in('rider_id', riderIds.length > 0 ? riderIds : ['00000000-0000-0000-0000-000000000000']);

      if (startDate) paymentsQuery = paymentsQuery.gte('paid_at', startDate);
      if (endDate) paymentsQuery = paymentsQuery.lte('paid_at', endDate);

      const { data: payments } = await paymentsQuery;

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

      // Count permits
      const now = new Date().toISOString();
      permits?.forEach((permit: any) => {
        const saccoId = riderToSacco.get(permit.rider_id);
        if (saccoId) {
          const perf = saccoPerformance.get(saccoId);
          if (perf) {
            if (permit.status === 'active') perf.activePermits++;
            if (permit.status === 'expired' || (permit.expires_at && permit.expires_at < now)) perf.expiredPermits++;
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
        const complianceRate = perf.totalRiders > 0 ? Math.round((perf.compliant / perf.totalRiders) * 100) : 100;
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
      }).filter(r => r.totalRiders > 0 || r.revenue > 0) as SaccoPerformanceReport[];
    },
    enabled: !!countyId,
  });
}
