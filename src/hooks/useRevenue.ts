import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Normalize date strings for Supabase: include full start/end of day for proper filtering */
function toDateRangeBounds(startDate?: string, endDate?: string) {
  return {
    start: startDate ? `${startDate}T00:00:00.000Z` : undefined,
    end: endDate ? `${endDate}T23:59:59.999Z` : undefined,
  };
}

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

export interface RevenueShare {
  id: string;
  county_id: string;
  sacco_id: string;
  sacco_name?: string;
  payment_id: string;
  rider_id: string | null;
  permit_id: string | null;
  share_type: 'percentage' | 'fixed_per_rider' | 'none';
  base_amount: number;
  share_amount: number;
  percentage: number | null;
  fixed_amount: number | null;
  period: 'weekly' | 'monthly' | 'annual' | null;
  compliance_threshold_met: boolean;
  active_permit_required: boolean;
  had_active_permit: boolean;
  status: 'pending' | 'distributed' | 'cancelled';
  distributed_at: string | null;
  created_at: string;
}

export interface RevenueShareBySacco {
  saccoId: string;
  saccoName: string;
  totalShares: number;
  totalAmount: number;
  pendingAmount: number;
  distributedAmount: number;
  shareType: string;
}

// Fetch revenue by date range (countyId undefined = all counties for platform super admin)
export function useRevenueByDateRange(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['revenue-by-date-range', countyId, startDate, endDate],
    queryFn: async () => {
      // Permit revenue: match dashboard/permits — from permits.amount_paid, grouped by issued_at
      let permitsQuery = supabase
        .from('permits')
        .select('county_id, amount_paid, issued_at');
      if (countyId) permitsQuery = permitsQuery.eq('county_id', countyId);
      if (startDate) permitsQuery = permitsQuery.gte('issued_at', `${startDate}T00:00:00.000Z`);
      if (endDate) permitsQuery = permitsQuery.lte('issued_at', `${endDate}T23:59:59.999Z`);

      let penaltyQuery = supabase
        .from('penalties')
        .select('county_id, amount, paid_at, is_paid, created_at, description')
        .eq('is_paid', true);
      if (countyId) penaltyQuery = penaltyQuery.eq('county_id', countyId);

      const [permitsResult, penaltyPayments] = await Promise.all([
        permitsQuery,
        penaltyQuery,
      ]);

      if (permitsResult.error) throw permitsResult.error;
      if (penaltyPayments.error) throw penaltyPayments.error;

      const dateMap = new Map<string, { permit: number; penalty: number }>();

      (permitsResult.data || []).forEach((p: { amount_paid?: number; issued_at?: string }) => {
        const permitDate = p.issued_at?.split('T')[0];
        if (!permitDate) return;
        if (startDate && permitDate < startDate) return;
        if (endDate && permitDate > endDate) return;
        const current = dateMap.get(permitDate) || { permit: 0, penalty: 0 };
        dateMap.set(permitDate, { ...current, permit: current.permit + Number(p.amount_paid ?? 0) });
      });

      const isWaived = (desc: string | null | undefined) =>
        !!desc && desc.includes('[WAIVED]');
      (penaltyPayments.data || []).forEach((penalty: { county_id?: string; amount: number; paid_at?: string; created_at?: string; description?: string }) => {
        if (isWaived(penalty.description)) return;
        const penaltyDate = (penalty.paid_at || penalty.created_at)?.split('T')[0];
        if (!penaltyDate) return;
        if (startDate && penaltyDate < startDate) return;
        if (endDate && penaltyDate > endDate) return;
        const current = dateMap.get(penaltyDate) || { permit: 0, penalty: 0 };
        dateMap.set(penaltyDate, { ...current, penalty: current.penalty + Number(penalty.amount || 0) });
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
    enabled: true,
  });
}

// Fetch revenue by Sacco (countyId undefined = all counties)
export function useRevenueBySacco(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['revenue-by-sacco', countyId, startDate, endDate],
    queryFn: async () => {
      let saccosQuery = supabase.from('saccos').select('id, name');
      if (countyId) saccosQuery = saccosQuery.eq('county_id', countyId);
      const { data: saccos } = await saccosQuery;
      if (!saccos) return [];

      let ridersQuery = supabase.from('riders').select('id, sacco_id');
      if (countyId) ridersQuery = ridersQuery.eq('county_id', countyId);
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

      const { start: startBound, end: endBound } = toDateRangeBounds(startDate, endDate);
      let permitPaymentsQuery = supabase
        .from('payments')
        .select('amount, rider_id, paid_at')
        .eq('status', 'completed')
        .in('rider_id', riderIds.length > 0 ? riderIds : ['00000000-0000-0000-0000-000000000000']);
      if (countyId) permitPaymentsQuery = permitPaymentsQuery.eq('county_id', countyId);
      if (startBound) permitPaymentsQuery = permitPaymentsQuery.gte('paid_at', startBound);
      if (endBound) permitPaymentsQuery = permitPaymentsQuery.lte('paid_at', endBound);
      const { data: permitPayments } = await permitPaymentsQuery;

      let penaltyPaymentsQuery = supabase
        .from('penalties')
        .select('amount, rider_id, paid_at, is_paid, created_at')
        .eq('is_paid', true)
        .in('rider_id', riderIds.length > 0 ? riderIds : ['00000000-0000-0000-0000-000000000000']);
      if (countyId) penaltyPaymentsQuery = penaltyPaymentsQuery.eq('county_id', countyId);

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
        // Use paid_at if available, otherwise created_at for date check
        const penaltyDate = (penalty.paid_at || penalty.created_at)?.split('T')[0];
        if (!penaltyDate) return;
        
        // Check if penalty date is within range
        if (startDate && penaltyDate < startDate) return;
        if (endDate && penaltyDate > endDate) return;
        
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
    enabled: true,
  });
}

// Fetch revenue by stage (countyId undefined = all counties)
export function useRevenueByStage(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['revenue-by-stage', countyId, startDate, endDate],
    queryFn: async () => {
      let stagesQuery = supabase.from('stages').select('id, name, sacco_id, sacco:saccos(name)');
      if (countyId) stagesQuery = stagesQuery.eq('county_id', countyId);
      const { data: stages } = await stagesQuery;
      if (!stages) return [];

      let ridersQuery = supabase.from('riders').select('id, stage_id');
      if (countyId) ridersQuery = ridersQuery.eq('county_id', countyId);
      const { data: riders } = await ridersQuery;

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

      const { start: startBound, end: endBound } = toDateRangeBounds(startDate, endDate);
      let permitPaymentsQuery = supabase
        .from('payments')
        .select('amount, rider_id, paid_at')
        .eq('status', 'completed')
        .in('rider_id', riderIds.length > 0 ? riderIds : ['00000000-0000-0000-0000-000000000000']);
      if (countyId) permitPaymentsQuery = permitPaymentsQuery.eq('county_id', countyId);
      if (startBound) permitPaymentsQuery = permitPaymentsQuery.gte('paid_at', startBound);
      if (endBound) permitPaymentsQuery = permitPaymentsQuery.lte('paid_at', endBound);
      const { data: permitPayments } = await permitPaymentsQuery;

      let penaltyPaymentsQuery = supabase
        .from('penalties')
        .select('amount, rider_id, paid_at, is_paid, created_at')
        .eq('is_paid', true)
        .in('rider_id', riderIds.length > 0 ? riderIds : ['00000000-0000-0000-0000-000000000000']);
      if (countyId) penaltyPaymentsQuery = penaltyPaymentsQuery.eq('county_id', countyId);
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
        // Use paid_at if available, otherwise created_at for date check
        const penaltyDate = (penalty.paid_at || penalty.created_at)?.split('T')[0];
        if (!penaltyDate) return;
        
        // Check if penalty date is within range
        if (startDate && penaltyDate < startDate) return;
        if (endDate && penaltyDate > endDate) return;
        
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
    enabled: true,
  });
}

// Fetch revenue by permit type (countyId undefined = all counties)
export function useRevenueByPermitType(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['revenue-by-permit-type', countyId, startDate, endDate],
    queryFn: async () => {
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
        .eq('status', 'completed');
      if (countyId) paymentsQuery = paymentsQuery.eq('county_id', countyId);

      const { start: startBound, end: endBound } = toDateRangeBounds(startDate, endDate);
      if (startBound) paymentsQuery = paymentsQuery.gte('paid_at', startBound);
      if (endBound) paymentsQuery = paymentsQuery.lte('paid_at', endBound);

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
    enabled: true,
  });
}

// Fetch penalty revenue breakdown (countyId undefined = all counties)
export function usePenaltyRevenueBreakdown(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['penalty-revenue-breakdown', countyId, startDate, endDate],
    queryFn: async () => {
      let penaltiesQuery = supabase
        .from('penalties')
        .select('penalty_type, amount, is_paid, paid_at');
      if (countyId) penaltiesQuery = penaltiesQuery.eq('county_id', countyId);

      const { start: startBound, end: endBound } = toDateRangeBounds(startDate, endDate);
      if (startBound) penaltiesQuery = penaltiesQuery.gte('created_at', startBound);
      if (endBound) penaltiesQuery = penaltiesQuery.lte('created_at', endBound);

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
    enabled: true,
  });
}

// Fetch revenue shares (countyId undefined = all counties)
export function useRevenueShares(countyId?: string, saccoId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['revenue-shares', countyId, saccoId, startDate, endDate],
    queryFn: async () => {
      let sharesQuery = supabase
        .from('revenue_shares')
        .select(`
          *,
          sacco:saccos(name),
          rider:riders(full_name, phone),
          payment:payments(amount, description, paid_at)
        `)
        .order('created_at', { ascending: false });
      if (countyId) sharesQuery = sharesQuery.eq('county_id', countyId);

      if (saccoId) {
        sharesQuery = sharesQuery.eq('sacco_id', saccoId);
      }

      const { start: startBound, end: endBound } = toDateRangeBounds(startDate, endDate);
      if (startBound) {
        sharesQuery = sharesQuery.gte('created_at', startBound);
      }
      if (endBound) {
        sharesQuery = sharesQuery.lte('created_at', endBound);
      }

      const { data: shares, error } = await sharesQuery;

      if (error) throw error;

      return (shares || []).map((share: any) => ({
        ...share,
        sacco_name: share.sacco?.name || null,
      })) as RevenueShare[];
    },
    enabled: true,
  });
}

// Platform-wide revenue by county (Super Admin) with optional date filter
export interface RevenueByCounty {
  countyId: string;
  countyName: string;
  countyCode: string;
  totalRevenue: number;
  permitRevenue: number;
  penaltyRevenue: number;
}

export function useRevenueByCounty(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['revenue-by-county', startDate, endDate],
    queryFn: async () => {
      const { data: counties, error: countiesError } = await supabase
        .from('counties')
        .select('id, name, code')
        .order('name');
      if (countiesError) throw countiesError;
      if (!counties?.length) return [] as RevenueByCounty[];

      const { start: startBound, end: endBound } = toDateRangeBounds(startDate, endDate);

      // Permit revenue: match dashboard/permits — sum of permits.amount_paid (filter by issued_at in range)
      let permitsQuery = supabase
        .from('permits')
        .select('county_id, amount_paid, issued_at');
      if (startBound) permitsQuery = permitsQuery.gte('issued_at', startBound);
      if (endBound) permitsQuery = permitsQuery.lte('issued_at', endBound);
      const { data: permits, error: permError } = await permitsQuery;
      if (permError) throw permError;

      // Penalty revenue: match dashboard/penalties — sum of penalty.amount for paid, non-waived penalties
      const { data: penalties, error: penError } = await supabase
        .from('penalties')
        .select('county_id, amount, is_paid, paid_at, created_at, description')
        .eq('is_paid', true);
      if (penError) throw penError;

      const countyMap = new Map<string, { permit: number; penalty: number }>();
      counties.forEach((c: { id: string }) => countyMap.set(c.id, { permit: 0, penalty: 0 }));

      (permits || []).forEach((p: { county_id: string; amount_paid?: number; issued_at?: string }) => {
        const key = p.county_id;
        if (!key) return;
        const cur = countyMap.get(key);
        if (cur) cur.permit += Number(p.amount_paid ?? 0);
      });

      const isWaived = (desc: string | null | undefined) =>
        !!desc && desc.includes('[WAIVED]');
      (penalties || []).forEach((p: { county_id: string; amount: number; paid_at?: string; created_at?: string; description?: string }) => {
        if (isWaived(p.description)) return;
        const key = p.county_id;
        if (!key) return;
        const dateStr = (p.paid_at || p.created_at)?.split('T')[0];
        if (!dateStr) return;
        if (startDate && dateStr < startDate) return;
        if (endDate && dateStr > endDate) return;
        const cur = countyMap.get(key);
        if (cur) cur.penalty += Number(p.amount || 0);
      });

      return counties.map((c: { id: string; name: string; code: string }) => {
        const rev = countyMap.get(c.id) || { permit: 0, penalty: 0 };
        return {
          countyId: c.id,
          countyName: c.name,
          countyCode: c.code,
          totalRevenue: rev.permit + rev.penalty,
          permitRevenue: rev.permit,
          penaltyRevenue: rev.penalty,
        } as RevenueByCounty;
      });
    },
    enabled: true,
  });
}

// Monetization summary per county (Super Admin Finance View)
export interface MonetizationSummaryByCounty {
  countyId: string;
  countyName: string;
  countyCode: string;
  totalGross: number;
  platformFees: number;
  processingFees: number;
  penaltyCommission: number;
  smsCharges: number;
  totalDeductions: number;
  netToCounty: number;
}

export function useMonetizationSummary(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['monetization-summary', startDate, endDate],
    queryFn: async () => {
      const { data: counties, error: countiesError } = await supabase
        .from('counties')
        .select('id, name, code')
        .order('name');
      if (countiesError) throw countiesError;
      if (!counties?.length) return [] as MonetizationSummaryByCounty[];

      const { start: startBound, end: endBound } = toDateRangeBounds(startDate, endDate);
      // Match useRevenueByCounty/useRevenueByDateRange: paid = status completed OR paid_at set
      let paymentsQuery = supabase
        .from('payments')
        .select(
          'county_id, amount, gross_amount, total_deductions, net_to_county, paid_at, status, platform_fee, processing_fee, penalty_commission, sms_charges'
        )
        .not('paid_at', 'is', null);
      if (startBound) paymentsQuery = paymentsQuery.gte('paid_at', startBound);
      if (endBound) paymentsQuery = paymentsQuery.lte('paid_at', endBound);
      const { data: payments, error: payError } = await paymentsQuery;
      if (payError) throw payError;

      const { data: penalties, error: penError } = await supabase
        .from('penalties')
        .select('county_id, amount, payment_id, paid_at, created_at')
        .eq('is_paid', true);
      if (penError) throw penError;

      const isPaid = (p: { status?: string; paid_at?: string | null }) =>
        p.status === 'completed' || !!p.paid_at;

      const countyMap = new Map<
        string,
        {
          totalGross: number;
          platformFees: number;
          processingFees: number;
          penaltyCommission: number;
          smsCharges: number;
          totalDeductions: number;
          netToCounty: number;
        }
      >();
      counties.forEach((c: { id: string }) =>
        countyMap.set(c.id, {
          totalGross: 0,
          platformFees: 0,
          processingFees: 0,
          penaltyCommission: 0,
          smsCharges: 0,
          totalDeductions: 0,
          netToCounty: 0,
        })
      );

      (payments || []).forEach((p: any) => {
        if (!isPaid(p)) return;
        const key = p.county_id;
        if (!key) return;
        const cur = countyMap.get(key);
        if (!cur) return;
        const gross = Number(p.gross_amount ?? p.amount ?? 0);
        cur.totalGross += gross;
        cur.platformFees += Number(p.platform_fee ?? 0);
        cur.processingFees += Number(p.processing_fee ?? 0);
        cur.penaltyCommission += Number(p.penalty_commission ?? 0);
        cur.smsCharges += Number(p.sms_charges ?? 0);
        cur.totalDeductions += Number(p.total_deductions ?? 0);
        cur.netToCounty += Number(p.net_to_county ?? gross);
      });

      // Include penalties paid outside payment flow (no payment_id) to match county dashboard revenue
      const penaltyDateInRange = (dateStr: string) => {
        if (!dateStr) return false;
        if (startDate && dateStr < startDate) return false;
        if (endDate && dateStr > endDate) return false;
        return true;
      };
      (penalties || []).forEach((pen: any) => {
        if (pen.payment_id) return; // Already counted via payments table (avoids double-counting)
        const key = pen.county_id;
        if (!key) return;
        const dateStr = (pen.paid_at || pen.created_at)?.split('T')[0];
        if (!penaltyDateInRange(dateStr)) return;
        const cur = countyMap.get(key);
        if (!cur) return;
        const amount = Number(pen.amount || 0);
        cur.totalGross += amount;
        cur.netToCounty += amount;
      });

      return counties.map((c: { id: string; name: string; code: string }) => {
        const agg = countyMap.get(c.id)!;
        return {
          countyId: c.id,
          countyName: c.name,
          countyCode: c.code,
          totalGross: Math.round(agg.totalGross * 100) / 100,
          platformFees: Math.round(agg.platformFees * 100) / 100,
          processingFees: Math.round(agg.processingFees * 100) / 100,
          penaltyCommission: Math.round(agg.penaltyCommission * 100) / 100,
          smsCharges: Math.round(agg.smsCharges * 100) / 100,
          totalDeductions: Math.round(agg.totalDeductions * 100) / 100,
          netToCounty: Math.round(agg.netToCounty * 100) / 100,
        } as MonetizationSummaryByCounty;
      });
    },
    enabled: true,
  });
}

// Fetch revenue shares aggregated by Sacco (countyId undefined = all counties)
export function useRevenueSharesBySacco(countyId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['revenue-shares-by-sacco', countyId, startDate, endDate],
    queryFn: async () => {
      let sharesQuery = supabase
        .from('revenue_shares')
        .select(`
          *,
          sacco:saccos(name)
        `);
      if (countyId) sharesQuery = sharesQuery.eq('county_id', countyId);

      const { start: startBound, end: endBound } = toDateRangeBounds(startDate, endDate);
      if (startBound) {
        sharesQuery = sharesQuery.gte('created_at', startBound);
      }
      if (endBound) {
        sharesQuery = sharesQuery.lte('created_at', endBound);
      }

      const { data: shares, error } = await sharesQuery;

      if (error) throw error;

      // Aggregate by sacco
      const saccoMap = new Map<string, {
        saccoId: string;
        saccoName: string;
        totalShares: number;
        totalAmount: number;
        pendingAmount: number;
        distributedAmount: number;
        shareType: string;
      }>();

      (shares || []).forEach((share: any) => {
        const saccoId = share.sacco_id;
        const saccoName = share.sacco?.name || 'Unknown';
        
        if (!saccoMap.has(saccoId)) {
          saccoMap.set(saccoId, {
            saccoId,
            saccoName,
            totalShares: 0,
            totalAmount: 0,
            pendingAmount: 0,
            distributedAmount: 0,
            shareType: share.share_type,
          });
        }

        const stats = saccoMap.get(saccoId)!;
        stats.totalShares++;
        stats.totalAmount += Number(share.share_amount || 0);
        
        if (share.status === 'pending') {
          stats.pendingAmount += Number(share.share_amount || 0);
        } else if (share.status === 'distributed') {
          stats.distributedAmount += Number(share.share_amount || 0);
        }
      });

      return Array.from(saccoMap.values()) as RevenueShareBySacco[];
    },
    enabled: true,
  });
}
