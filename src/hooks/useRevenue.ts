import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RevenueByDateRange {
  date: string;
  permitRevenue: number;
  penaltyRevenue: number;
  totalRevenue: number;
}

export interface RevenueBySacco {
  saccoId: string;
  saccoName: string;
  permitRevenue: number;
  penaltyRevenue: number;
  totalRevenue: number;
  riderCount: number;
}

export interface RevenueByStage {
  stageId: string;
  stageName: string;
  saccoName: string | null;
  permitRevenue: number;
  penaltyRevenue: number;
  totalRevenue: number;
  riderCount: number;
}

export interface RevenueByPermitType {
  permitTypeId: string;
  permitTypeName: string;
  count: number;
  totalRevenue: number;
  averageAmount: number;
}

export interface PenaltyRevenueBreakdown {
  penaltyType: string;
  count: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  paidCount: number;
  unpaidCount: number;
}

// Fetch revenue by date range
export function useRevenueByDateRange(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['revenue-by-date-range', countyId, startDate, endDate],
    queryFn: async () => {
      if (!countyId) return [];

      // Build date filter
      let permitQuery = supabase
        .from('payments')
        .select('amount, paid_at, permit_id')
        .eq('county_id', countyId)
        .eq('status', 'completed');

      let penaltyQuery = supabase
        .from('penalties')
        .select('amount, paid_at, is_paid')
        .eq('county_id', countyId);

      if (startDate) {
        permitQuery = permitQuery.gte('paid_at', startDate);
        penaltyQuery = penaltyQuery.gte('paid_at', startDate);
      }
      if (endDate) {
        permitQuery = permitQuery.lte('paid_at', endDate);
        penaltyQuery = penaltyQuery.lte('paid_at', endDate);
      }

      const [permitPayments, penaltyPayments] = await Promise.all([
        permitQuery,
        penaltyQuery,
      ]);

      if (permitPayments.error) throw permitPayments.error;
      if (penaltyPayments.error) throw penaltyPayments.error;

      // Group by date
      const dateMap = new Map<string, { permit: number; penalty: number }>();

      (permitPayments.data || []).forEach((payment: any) => {
        if (payment.paid_at) {
          const date = payment.paid_at.split('T')[0];
          const current = dateMap.get(date) || { permit: 0, penalty: 0 };
          dateMap.set(date, { ...current, permit: current.permit + Number(payment.amount || 0) });
        }
      });

      (penaltyPayments.data || []).forEach((penalty: any) => {
        if (penalty.paid_at && penalty.is_paid) {
          const date = penalty.paid_at.split('T')[0];
          const current = dateMap.get(date) || { permit: 0, penalty: 0 };
          dateMap.set(date, { ...current, penalty: current.penalty + Number(penalty.amount || 0) });
        }
      });

      return Array.from(dateMap.entries())
        .map(([date, amounts]) => ({
          date,
          permitRevenue: amounts.permit,
          penaltyRevenue: amounts.penalty,
          totalRevenue: amounts.permit + amounts.penalty,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)) as RevenueByDateRange[];
    },
    enabled: !!countyId,
  });
}

// Fetch revenue by Sacco
export function useRevenueBySacco(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['revenue-by-sacco', countyId, startDate, endDate],
    queryFn: async () => {
      if (!countyId) return [];

      // Get all saccos
      const { data: saccos } = await supabase
        .from('saccos')
        .select('id, name')
        .eq('county_id', countyId);

      if (!saccos) return [];

      // Get riders by sacco
      let ridersQuery = supabase
        .from('riders')
        .select('id, sacco_id')
        .eq('county_id', countyId);

      const { data: riders } = await ridersQuery;
      if (!riders) return [];

      const riderIds = riders.map(r => r.id);
      const saccoToRiders = new Map<string, string[]>();
      riders.forEach(rider => {
        if (rider.sacco_id) {
          const existing = saccoToRiders.get(rider.sacco_id) || [];
          existing.push(rider.id);
          saccoToRiders.set(rider.sacco_id, existing);
        }
      });

      // Get permit payments
      let permitPaymentsQuery = supabase
        .from('payments')
        .select('amount, rider_id, paid_at')
        .eq('county_id', countyId)
        .eq('status', 'completed')
        .in('rider_id', riderIds.length > 0 ? riderIds : ['00000000-0000-0000-0000-000000000000']);

      if (startDate) permitPaymentsQuery = permitPaymentsQuery.gte('paid_at', startDate);
      if (endDate) permitPaymentsQuery = permitPaymentsQuery.lte('paid_at', endDate);

      const { data: permitPayments } = await permitPaymentsQuery;

      // Get penalty payments
      let penaltyPaymentsQuery = supabase
        .from('penalties')
        .select('amount, rider_id, paid_at, is_paid')
        .eq('county_id', countyId)
        .eq('is_paid', true)
        .in('rider_id', riderIds.length > 0 ? riderIds : ['00000000-0000-0000-0000-000000000000']);

      if (startDate) penaltyPaymentsQuery = penaltyPaymentsQuery.gte('paid_at', startDate);
      if (endDate) penaltyPaymentsQuery = penaltyPaymentsQuery.lte('paid_at', endDate);

      const { data: penaltyPayments } = await penaltyPaymentsQuery;

      // Calculate revenue per sacco
      const saccoRevenue = new Map<string, { permit: number; penalty: number; riders: Set<string> }>();

      saccos.forEach(sacco => {
        saccoRevenue.set(sacco.id, { permit: 0, penalty: 0, riders: new Set() });
      });

      (permitPayments || []).forEach((payment: any) => {
        for (const [saccoId, riderIds] of saccoToRiders.entries()) {
          if (riderIds.includes(payment.rider_id)) {
            const current = saccoRevenue.get(saccoId);
            if (current) {
              current.permit += Number(payment.amount || 0);
              current.riders.add(payment.rider_id);
            }
          }
        }
      });

      (penaltyPayments || []).forEach((penalty: any) => {
        for (const [saccoId, riderIds] of saccoToRiders.entries()) {
          if (riderIds.includes(penalty.rider_id)) {
            const current = saccoRevenue.get(saccoId);
            if (current) {
              current.penalty += Number(penalty.amount || 0);
              current.riders.add(penalty.rider_id);
            }
          }
        }
      });

      return saccos.map(sacco => {
        const revenue = saccoRevenue.get(sacco.id) || { permit: 0, penalty: 0, riders: new Set() };
        return {
          saccoId: sacco.id,
          saccoName: sacco.name,
          permitRevenue: revenue.permit,
          penaltyRevenue: revenue.penalty,
          totalRevenue: revenue.permit + revenue.penalty,
          riderCount: revenue.riders.size,
        };
      }).filter(r => r.totalRevenue > 0 || r.riderCount > 0) as RevenueBySacco[];
    },
    enabled: !!countyId,
  });
}

// Fetch revenue by stage
export function useRevenueByStage(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['revenue-by-stage', countyId, startDate, endDate],
    queryFn: async () => {
      if (!countyId) return [];

      // Get all stages with sacco info
      const { data: stages } = await supabase
        .from('stages')
        .select('id, name, sacco_id, sacco:saccos(name)')
        .eq('county_id', countyId);

      if (!stages) return [];

      // Get riders by stage
      const { data: riders } = await supabase
        .from('riders')
        .select('id, stage_id')
        .eq('county_id', countyId);

      if (!riders) return [];

      const riderIds = riders.map(r => r.id);
      const stageToRiders = new Map<string, string[]>();
      riders.forEach(rider => {
        if (rider.stage_id) {
          const existing = stageToRiders.get(rider.stage_id) || [];
          existing.push(rider.id);
          stageToRiders.set(rider.stage_id, existing);
        }
      });

      // Get payments
      let permitPaymentsQuery = supabase
        .from('payments')
        .select('amount, rider_id, paid_at')
        .eq('county_id', countyId)
        .eq('status', 'completed')
        .in('rider_id', riderIds.length > 0 ? riderIds : ['00000000-0000-0000-0000-000000000000']);

      if (startDate) permitPaymentsQuery = permitPaymentsQuery.gte('paid_at', startDate);
      if (endDate) permitPaymentsQuery = permitPaymentsQuery.lte('paid_at', endDate);

      const { data: permitPayments } = await permitPaymentsQuery;

      let penaltyPaymentsQuery = supabase
        .from('penalties')
        .select('amount, rider_id, paid_at, is_paid')
        .eq('county_id', countyId)
        .eq('is_paid', true)
        .in('rider_id', riderIds.length > 0 ? riderIds : ['00000000-0000-0000-0000-000000000000']);

      if (startDate) penaltyPaymentsQuery = penaltyPaymentsQuery.gte('paid_at', startDate);
      if (endDate) penaltyPaymentsQuery = penaltyPaymentsQuery.lte('paid_at', endDate);

      const { data: penaltyPayments } = await penaltyPaymentsQuery;

      // Calculate revenue per stage
      const stageRevenue = new Map<string, { permit: number; penalty: number; riders: Set<string> }>();

      stages.forEach(stage => {
        stageRevenue.set(stage.id, { permit: 0, penalty: 0, riders: new Set() });
      });

      (permitPayments || []).forEach((payment: any) => {
        for (const [stageId, riderIds] of stageToRiders.entries()) {
          if (riderIds.includes(payment.rider_id)) {
            const current = stageRevenue.get(stageId);
            if (current) {
              current.permit += Number(payment.amount || 0);
              current.riders.add(payment.rider_id);
            }
          }
        }
      });

      (penaltyPayments || []).forEach((penalty: any) => {
        for (const [stageId, riderIds] of stageToRiders.entries()) {
          if (riderIds.includes(penalty.rider_id)) {
            const current = stageRevenue.get(stageId);
            if (current) {
              current.penalty += Number(penalty.amount || 0);
              current.riders.add(penalty.rider_id);
            }
          }
        }
      });

      return stages.map(stage => {
        const revenue = stageRevenue.get(stage.id) || { permit: 0, penalty: 0, riders: new Set() };
        return {
          stageId: stage.id,
          stageName: stage.name,
          saccoName: (stage.sacco as any)?.name || null,
          permitRevenue: revenue.permit,
          penaltyRevenue: revenue.penalty,
          totalRevenue: revenue.permit + revenue.penalty,
          riderCount: revenue.riders.size,
        };
      }).filter(r => r.totalRevenue > 0 || r.riderCount > 0) as RevenueByStage[];
    },
    enabled: !!countyId,
  });
}

// Fetch revenue by permit type
export function useRevenueByPermitType(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['revenue-by-permit-type', countyId, startDate, endDate],
    queryFn: async () => {
      if (!countyId) return [];

      let paymentsQuery = supabase
        .from('payments')
        .select(`
          amount,
          paid_at,
          permits!inner(
            permit_type_id,
            permit_types!inner(id, name, amount)
          )
        `)
        .eq('county_id', countyId)
        .eq('status', 'completed');

      if (startDate) paymentsQuery = paymentsQuery.gte('paid_at', startDate);
      if (endDate) paymentsQuery = paymentsQuery.lte('paid_at', endDate);

      const { data: payments } = await paymentsQuery;
      if (!payments) return [];

      // Group by permit type
      const typeMap = new Map<string, { name: string; amounts: number[] }>();

      (payments as any[]).forEach((payment: any) => {
        const permitType = payment.permits?.permit_types;
        if (permitType) {
          const existing = typeMap.get(permitType.id) || { name: permitType.name, amounts: [] };
          existing.amounts.push(Number(payment.amount || 0));
          typeMap.set(permitType.id, existing);
        }
      });

      return Array.from(typeMap.entries()).map(([id, data]) => ({
        permitTypeId: id,
        permitTypeName: data.name,
        count: data.amounts.length,
        totalRevenue: data.amounts.reduce((sum, amt) => sum + amt, 0),
        averageAmount: data.amounts.reduce((sum, amt) => sum + amt, 0) / data.amounts.length,
      })) as RevenueByPermitType[];
    },
    enabled: !!countyId,
  });
}

// Fetch penalty revenue breakdown
export function usePenaltyRevenueBreakdown(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['penalty-revenue-breakdown', countyId, startDate, endDate],
    queryFn: async () => {
      if (!countyId) return [];

      let penaltiesQuery = supabase
        .from('penalties')
        .select('penalty_type, amount, is_paid, paid_at')
        .eq('county_id', countyId);

      if (startDate) penaltiesQuery = penaltiesQuery.gte('created_at', startDate);
      if (endDate) penaltiesQuery = penaltiesQuery.lte('created_at', endDate);

      const { data: penalties } = await penaltiesQuery;
      if (!penalties) return [];

      // Group by penalty type
      const typeMap = new Map<string, { amounts: number[]; paid: boolean[] }>();

      penalties.forEach((penalty: any) => {
        const type = penalty.penalty_type || 'Unknown';
        const existing = typeMap.get(type) || { amounts: [], paid: [] };
        existing.amounts.push(Number(penalty.amount || 0));
        existing.paid.push(penalty.is_paid || false);
        typeMap.set(type, existing);
      });

      return Array.from(typeMap.entries()).map(([type, data]) => {
        const totalAmount = data.amounts.reduce((sum, amt) => sum + amt, 0);
        const paidCount = data.paid.filter(p => p).length;
        const unpaidCount = data.paid.length - paidCount;
        const paidAmount = data.amounts
          .filter((_, i) => data.paid[i])
          .reduce((sum, amt) => sum + amt, 0);
        const unpaidAmount = totalAmount - paidAmount;

        return {
          penaltyType: type,
          count: data.amounts.length,
          totalAmount,
          paidAmount,
          unpaidAmount,
          paidCount,
          unpaidCount,
        };
      }) as PenaltyRevenueBreakdown[];
    },
    enabled: !!countyId,
  });
}
