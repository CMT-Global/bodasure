import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ComplianceOverview } from '@/components/dashboard/ComplianceOverview';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, FileCheck, AlertTriangle, CreditCard, XCircle, CheckCircle2, Download } from 'lucide-react';
import { useDashboardStats, useRecentActivity, useMonthlyRevenue, useComplianceOverview, useAllCounties } from '@/hooks/useData';
import { useRevenueByDateRange } from '@/hooks/useRevenue';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

const COUNTY_PROFILE = '_profile';

function exportDashboardCSV(rows: Record<string, string | number>[], filename: string) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => String(r[h] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Dashboard() {
  const { profile, roles, hasRole } = useAuth();
  const isPlatformAdmin = hasRole('platform_super_admin') || hasRole('platform_admin');
  const { data: allCounties = [] } = useAllCounties();

  const [countyFilter, setCountyFilter] = useState(COUNTY_PROFILE);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const profileCountyId = useMemo(
    () => profile?.county_id || roles.find((r) => r.county_id)?.county_id || undefined,
    [profile, roles]
  );

  const countyId = useMemo(() => {
    if (!isPlatformAdmin || countyFilter === COUNTY_PROFILE) return profileCountyId;
    return countyFilter;
  }, [isPlatformAdmin, countyFilter, profileCountyId]);

  const { data: stats, isLoading } = useDashboardStats(countyId);
  const { data: recentActivities = [], isLoading: isLoadingActivities } = useRecentActivity(countyId, 5);
  const { data: monthlyRevenue = [], isLoading: isLoadingRevenue } = useMonthlyRevenue(countyId, 6);
  const { data: complianceOverview = [], isLoading: isLoadingCompliance } = useComplianceOverview(countyId, 4);
  const { data: revenueByDateRange = [] } = useRevenueByDateRange(countyId || undefined, startDate, endDate);

  const chartData = useMemo(() => {
    if (revenueByDateRange.length > 0) {
      return revenueByDateRange.map((r) => ({ date: r.date, amount: r.totalRevenue }));
    }
    return monthlyRevenue.map((r) => ({ date: r.date, amount: r.amount }));
  }, [revenueByDateRange, monthlyRevenue]);
  const revenueInRange = useMemo(
    () => revenueByDateRange.reduce((s, r) => s + r.totalRevenue, 0),
    [revenueByDateRange]
  );

  // Format revenue for display
  const formatRevenue = (amount: number) => {
    if (amount >= 1000000) {
      return `KES ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `KES ${(amount / 1000).toFixed(1)}K`;
    }
    return `KES ${amount.toLocaleString()}`;
  };

  // Determine status colors based on values
  const getStatusColor = (value: number, thresholds: { amber: number; red: number }) => {
    if (value >= thresholds.red) return 'red';
    if (value >= thresholds.amber) return 'amber';
    return 'green';
  };

  const handleExport = () => {
    const summary: Record<string, string | number>[] = [
      { Metric: 'Total Riders', Value: stats?.totalRiders ?? 0 },
      { Metric: 'Active Permits', Value: stats?.activePermits ?? 0 },
      { Metric: 'Expired Permits', Value: stats?.expiredPermits ?? 0 },
      { Metric: 'Non-Compliant Riders', Value: stats?.nonCompliantRiders ?? 0 },
      { Metric: 'Total Revenue (all time)', Value: stats?.totalRevenue ?? 0 },
      { Metric: 'Revenue in selected period', Value: revenueInRange },
      { Metric: 'Date range', Value: `${startDate} to ${endDate}` },
    ];
    exportDashboardCSV(summary, 'county_dashboard_summary');
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's what's happening in your county.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>

        {/* Date & county filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Apply date range and county to revenue and export.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <Label>Date range</Label>
              <div className="flex items-center gap-2">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <span className="text-muted-foreground">to</span>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            {isPlatformAdmin && allCounties.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>County</Label>
                <Select value={countyFilter} onValueChange={setCountyFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="My county" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={COUNTY_PROFILE}>My county</SelectItem>
                    {allCounties.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats grid - Mobile-first responsive layout */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Total Registered Riders */}
            <StatCard
              title="Total Registered Riders"
              value={stats.totalRiders.toLocaleString()}
              icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
              statusColor="default"
            />

            {/* Active Permits */}
            <StatCard
              title="Active Permits"
              value={stats.activePermits.toLocaleString()}
              icon={<FileCheck className="h-5 w-5 sm:h-6 sm:w-6" />}
              statusColor="green"
              description="Currently valid"
            />

            {/* Expired Permits */}
            <StatCard
              title="Expired Permits"
              value={stats.expiredPermits.toLocaleString()}
              icon={<XCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
              statusColor={getStatusColor(stats.expiredPermits, { amber: 10, red: 50 })}
              description="Require renewal"
            />

            {/* Non-Compliant Riders */}
            <StatCard
              title="Non-Compliant Riders"
              value={stats.nonCompliantRiders.toLocaleString()}
              icon={<AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />}
              statusColor={getStatusColor(stats.nonCompliantRiders, { amber: 5, red: 20 })}
              description="Action required"
            />

            {/* Penalties Issued */}
            <StatCard
              title="Penalties Issued"
              value={stats.penaltiesIssued.toLocaleString()}
              icon={<AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />}
              statusColor="default"
              description="Total penalties"
            />

            {/* Penalties Unpaid */}
            <StatCard
              title="Unpaid Penalties"
              value={stats.penaltiesUnpaid.toLocaleString()}
              icon={<XCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
              statusColor={getStatusColor(stats.penaltiesUnpaid, { amber: 10, red: 50 })}
              description="Outstanding"
            />

            {/* Penalties Paid */}
            <StatCard
              title="Paid Penalties"
              value={stats.penaltiesPaid.toLocaleString()}
              icon={<CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />}
              statusColor="green"
              description="Settled"
            />

            {/* Total Revenue Collected */}
            <StatCard
              title="Total Revenue Collected"
              value={formatRevenue(stats.totalRevenue)}
              icon={<CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />}
              statusColor="green"
              description="All time"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No data available
          </div>
        )}

        {/* Charts and activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {isLoadingRevenue && revenueByDateRange.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
              <div className="h-[300px] bg-muted rounded"></div>
            </div>
          ) : chartData.length > 0 ? (
            <RevenueChart data={chartData} description={revenueByDateRange.length > 0 ? `Revenue ${startDate} – ${endDate}` : 'Last 6 months'} />
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
              No revenue data available
            </div>
          )}
          
          {isLoadingActivities ? (
            <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          ) : recentActivities.length > 0 ? (
            <RecentActivity activities={recentActivities} />
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
              No recent activity
            </div>
          )}
        </div>

        {/* Compliance overview */}
        {isLoadingCompliance ? (
          <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        ) : complianceOverview.length > 0 ? (
          <ComplianceOverview items={complianceOverview} />
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No compliance data available
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
