import { useState, useMemo, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { SUPER_ADMIN_PORTAL } from '@/config/portalRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ShieldCheck,
  Map,
  Users,
  FileCheck,
  CreditCard,
  TrendingUp,
  Activity,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Server,
  Database,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import {
  useAllCounties,
  useDashboardStats,
  useMonthlyRevenue,
  fetchDashboardStatsForCounty,
} from '@/hooks/useData';
import { useRevenueByCounty, useRevenueByDateRange } from '@/hooks/useRevenue';
import { useQueries } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const COUNTY_ALL = '_all';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);
}

function exportToCSV<T extends Record<string, unknown>>(data: T[], filename: string) {
  if (!data?.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const v = row[h];
          if (v == null) return '';
          const s = String(v);
          return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function SuperAdminDashboard() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [countyFilter, setCountyFilter] = useState<string>(COUNTY_ALL);

  const { data: counties = [], isLoading: countiesLoading } = useAllCounties();
  const countyIds = useMemo(() => counties.map((c) => c.id), [counties]);
  const selectedCountyId = countyFilter === COUNTY_ALL ? undefined : countyFilter;

  const { data: platformStats, isLoading: statsLoading } = useDashboardStats(selectedCountyId);
  const { data: revenueByCounty = [], isLoading: revenueByCountyLoading } = useRevenueByCounty(
    startDate,
    endDate
  );
  const { data: revenueByDateRange = [] } = useRevenueByDateRange(
    selectedCountyId || undefined,
    startDate,
    endDate
  );
  const { data: monthlyRevenue = [], isLoading: monthlyLoading } = useMonthlyRevenue(
    selectedCountyId,
    12
  );

  const statsQueries = useQueries({
    queries: countyIds.map((id) => ({
      queryKey: ['county-stats-dashboard', id],
      queryFn: () => fetchDashboardStatsForCounty(id),
      enabled: !!id,
    })),
  });

  const complianceByCounty = useMemo(() => {
    return countyIds
      .map((id, i) => {
        const county = counties.find((c) => c.id === id);
        const stats = statsQueries[i]?.data;
        if (!county || !stats) return null;
        return { countyName: county.name, countyCode: county.code, complianceRate: stats.complianceRate };
      })
      .filter(Boolean) as { countyName: string; countyCode: string; complianceRate: number }[];
  }, [countyIds, counties, statsQueries]);

  const revenueByCountyFiltered = useMemo(() => {
    if (!selectedCountyId) return revenueByCounty;
    return revenueByCounty.filter((r) => r.countyId === selectedCountyId);
  }, [revenueByCounty, selectedCountyId]);

  const totalRevenueInRange = useMemo(() => {
    if (selectedCountyId) {
      return revenueByDateRange.reduce((s, r) => s + r.totalRevenue, 0);
    }
    return revenueByCounty.reduce((s, r) => s + r.totalRevenue, 0);
  }, [selectedCountyId, revenueByDateRange, revenueByCounty]);

  const totalCounties = counties.length;
  const totalRiders = platformStats?.totalRiders ?? 0;
  const totalActivePermits = platformStats?.activePermits ?? 0;

  const chartData = useMemo(
    () => monthlyRevenue.map((r) => ({ date: r.date, amount: r.amount })),
    [monthlyRevenue]
  );

  const [healthStatus, setHealthStatus] = useState<'checking' | 'ok' | 'degraded'>('checking');
  useEffect(() => {
    supabase
      .from('counties')
      .select('id', { count: 'exact', head: true })
      .limit(1)
      .then(
        ({ error }) => setHealthStatus(error ? 'degraded' : 'ok'),
        () => setHealthStatus('degraded')
      );
  }, []);

  const handleExport = () => {
    const summary = [
      { metric: 'Total Counties', value: totalCounties },
      { metric: 'Total Riders', value: totalRiders },
      { metric: 'Total Active Permits', value: totalActivePermits },
      { metric: 'Total Revenue (filtered period)', value: formatCurrency(totalRevenueInRange) },
      { metric: 'Date range', value: `${startDate} to ${endDate}` },
      { metric: 'County filter', value: countyFilter === COUNTY_ALL ? 'All' : counties.find((c) => c.id === countyFilter)?.name ?? countyFilter },
    ];
    exportToCSV(summary, 'super_admin_summary');

    const revenueExport: Record<string, unknown>[] = revenueByCountyFiltered.map((r) => ({
      County: r.countyName,
      Code: r.countyCode,
      'Total Revenue': r.totalRevenue,
      'Permit Revenue': r.permitRevenue,
      'Penalty Revenue': r.penaltyRevenue,
    }));
    if (revenueExport.length) exportToCSV(revenueExport, 'revenue_by_county');

    const complianceExport = complianceByCounty.map((c) => ({
      County: c.countyName,
      Code: c.countyCode,
      'Compliance Rate %': c.complianceRate,
    }));
    if (complianceExport.length) exportToCSV(complianceExport, 'compliance_by_county');
  };

  const isLoading = statsLoading || countiesLoading;

  return (
    <SuperAdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Dashboard</h1>
            <p className="text-muted-foreground">
              {SUPER_ADMIN_PORTAL.description} — platform-wide metrics, revenue, compliance, and system health.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Apply date range and county to all metrics and tables below.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row flex-wrap gap-4">
            <div className="flex flex-col gap-2 min-w-0">
              <Label>Date range</Label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="min-h-[44px]"
                />
                <span className="text-muted-foreground hidden sm:inline shrink-0">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <Label>County</Label>
              <Select value={countyFilter} onValueChange={setCountyFilter}>
                <SelectTrigger className="w-full sm:w-[200px] min-h-[44px]">
                  <SelectValue placeholder="All counties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={COUNTY_ALL}>All counties</SelectItem>
                  {counties.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="h-4 bg-muted rounded w-2/3 mb-2 animate-pulse" />
                <div className="h-8 bg-muted rounded w-1/2 animate-pulse" />
              </Card>
            ))
          ) : (
            <>
              <StatCard
                title="Total counties"
                value={totalCounties}
                icon={<Map className="h-5 w-5 sm:h-6 sm:w-6" />}
                statusColor="default"
              />
              <StatCard
                title="Total riders"
                value={totalRiders.toLocaleString()}
                icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
                description={selectedCountyId ? 'In selected county' : 'Platform-wide'}
                statusColor="default"
              />
              <StatCard
                title="Total active permits"
                value={totalActivePermits.toLocaleString()}
                icon={<FileCheck className="h-5 w-5 sm:h-6 sm:w-6" />}
                description={selectedCountyId ? 'In selected county' : 'Platform-wide'}
                statusColor="green"
              />
              <StatCard
                title="Total revenue processed"
                value={formatCurrency(totalRevenueInRange)}
                icon={<CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />}
                description={`${startDate} – ${endDate}`}
                statusColor="green"
              />
            </>
          )}
        </div>

        {/* Growth trends */}
        {monthlyLoading ? (
          <Card className="p-6">
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </Card>
        ) : chartData.length > 0 ? (
          <RevenueChart
            data={chartData}
            title="Growth trends"
            description={`Revenue over the last 12 months ${selectedCountyId ? '(selected county)' : '(platform-wide)'}.`}
          />
        ) : (
          <Card className="p-6">
            <p className="text-muted-foreground text-center py-12">No revenue data for this period.</p>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue by county */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Revenue by county
              </CardTitle>
              <CardDescription>
                Revenue in selected date range {selectedCountyId ? '(filtered county)' : '(all counties)'}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {revenueByCountyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : revenueByCountyFiltered.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No revenue data.</p>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-auto">
                  {revenueByCountyFiltered.map((r) => (
                    <div
                      key={r.countyId}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{r.countyName}</span>
                      <span className="text-muted-foreground">{formatCurrency(r.totalRevenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance rates by county */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" /> Compliance rates by county
              </CardTitle>
              <CardDescription>Current compliance rate per county.</CardDescription>
            </CardHeader>
            <CardContent>
              {complianceByCounty.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No compliance data.</p>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-auto">
                  {complianceByCounty.map((c) => (
                    <div
                      key={c.countyCode}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{c.countyName}</span>
                      <span
                        className={
                          c.complianceRate >= 80
                            ? 'text-green-600 font-medium'
                            : c.complianceRate >= 50
                              ? 'text-amber-600 font-medium'
                              : 'text-red-600 font-medium'
                        }
                      >
                        {c.complianceRate}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> System health
            </CardTitle>
            <CardDescription>Platform connectivity and data availability.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    healthStatus === 'ok'
                      ? 'bg-green-500/10 text-green-600'
                      : healthStatus === 'degraded'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {healthStatus === 'checking' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : healthStatus === 'ok' ? (
                    <Database className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Database</p>
                  <p className="text-sm text-muted-foreground">
                    {healthStatus === 'checking'
                      ? 'Checking…'
                      : healthStatus === 'ok'
                        ? 'Connected'
                        : 'Connection issue'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">API</p>
                  <p className="text-sm text-muted-foreground">Supabase backend</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role & access scope (collapsed) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">Role & access scope</CardTitle>
              <Badge variant="secondary">{SUPER_ADMIN_PORTAL.role}</Badge>
            </div>
            <CardDescription>
              {SUPER_ADMIN_PORTAL.accessScope.summary}. {SUPER_ADMIN_PORTAL.accessScope.note}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
