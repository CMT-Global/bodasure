import { useMemo, useState, useEffect } from 'react';
import { SaccoPortalLayout } from '@/components/layout/SaccoPortalLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ComplianceOverview } from '@/components/dashboard/ComplianceOverview';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { SaccoDashboardStats } from '@/components/sacco/SaccoDashboardStats';
import {
  useSaccos,
  useSaccoDashboardStats,
  useSaccoAlerts,
  useSaccoMonthlyRevenue,
  useSaccoRecentActivity,
  useSaccoComplianceOverview,
} from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, CheckCircle2, AlertTriangle, FileX, Banknote } from 'lucide-react';

export default function SaccoPortal() {
  const { profile, roles } = useAuth();
  const countyId = useMemo(
    () => profile?.county_id ?? roles.find((r) => r.county_id)?.county_id ?? undefined,
    [profile, roles]
  );

  const { data: saccos = [], isLoading: saccosLoading } = useSaccos(countyId);
  const [saccoId, setSaccoId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (saccos.length > 0 && !saccoId) {
      setSaccoId(saccos[0].id);
    }
    if (saccos.length === 0) {
      setSaccoId(undefined);
    }
  }, [saccos, saccoId]);

  const { data: stats, isLoading: statsLoading } = useSaccoDashboardStats(saccoId, countyId);
  const { data: monthlyRevenue = [], isLoading: isLoadingRevenue } = useSaccoMonthlyRevenue(saccoId, countyId, 6);
  const { data: recentActivities = [], isLoading: isLoadingActivities } = useSaccoRecentActivity(saccoId, countyId, 5);
  const { data: complianceOverview = [], isLoading: isLoadingCompliance } = useSaccoComplianceOverview(saccoId, countyId, 4);
  const { data: alerts = [], isLoading: alertsLoading } = useSaccoAlerts(saccoId, countyId, 10);

  // Determine status colors based on values
  const getStatusColor = (value: number, thresholds: { amber: number; red: number }) => {
    if (value >= thresholds.red) return 'red';
    if (value >= thresholds.amber) return 'amber';
    return 'green';
  };

  // Convert SACCO alerts to recent activity format
  const alertsAsActivities = alerts.map(alert => ({
    id: alert.id,
    type: (alert.type === 'penalty' ? 'penalty' : 'permit') as 'penalty' | 'permit',
    title: alert.title,
    description: alert.description,
    time: alert.time,
    status: (alert.severity === 'error' ? 'error' : alert.severity === 'warning' ? 'warning' : 'pending') as 'success' | 'pending' | 'warning' | 'error',
  }));

  // Combine recent activities with alerts (use recentActivities if available, otherwise use alerts)
  const allRecentActivities = recentActivities.length > 0 
    ? recentActivities 
    : alertsAsActivities.slice(0, 5);

  return (
    <SaccoPortalLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Sacco Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's what's happening in your sacco.</p>
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={saccoId ?? ''}
              onValueChange={(v) => setSaccoId(v || undefined)}
              disabled={saccosLoading || saccos.length === 0}
            >
              <SelectTrigger className="min-h-[44px] touch-target">
                <SelectValue placeholder={saccosLoading ? 'Loading…' : 'Select sacco'} />
              </SelectTrigger>
              <SelectContent>
                {saccos.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="min-h-[44px]">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!countyId ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No county linked to your account. Contact an administrator.
          </div>
        ) : saccos.length === 0 && !saccosLoading ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No saccos in your county.
          </div>
        ) : !saccoId ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            Select a sacco to view the dashboard.
          </div>
        ) : (
          <>
            {/* Stats grid - Mobile-first responsive layout */}
            {statsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-6 animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : stats ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <StatCard
                  title="Total Members"
                  value={stats.totalMembers.toLocaleString()}
                  icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
                  statusColor="default"
                />
                <StatCard
                  title="Compliant Members"
                  value={stats.compliantCount.toLocaleString()}
                  icon={<CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />}
                  statusColor="green"
                  description="In good standing"
                />
                <StatCard
                  title="Non-Compliant Members"
                  value={stats.nonCompliantCount.toLocaleString()}
                  icon={<AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />}
                  statusColor={getStatusColor(stats.nonCompliantCount, { amber: 5, red: 20 })}
                  description="Action required"
                />
                <StatCard
                  title="Expired Permits"
                  value={stats.expiredPermitsCount.toLocaleString()}
                  icon={<FileX className="h-5 w-5 sm:h-6 sm:w-6" />}
                  statusColor={getStatusColor(stats.expiredPermitsCount, { amber: 5, red: 20 })}
                  description="Need renewal"
                />
                <StatCard
                  title="Unpaid Penalties"
                  value={stats.unpaidPenaltiesCount.toLocaleString()}
                  icon={<Banknote className="h-5 w-5 sm:h-6 sm:w-6" />}
                  statusColor={getStatusColor(stats.unpaidPenaltiesCount, { amber: 5, red: 20 })}
                  description="Outstanding"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
                No data available
              </div>
            )}

            {/* Compliant vs Non-Compliant Comparison */}
            <SaccoDashboardStats stats={stats} isLoading={statsLoading} />

            {/* Charts and activity */}
            <div className="grid gap-6 lg:grid-cols-2">
              {isLoadingRevenue ? (
                <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
                  <div className="h-[300px] bg-muted rounded"></div>
                </div>
              ) : monthlyRevenue.length > 0 ? (
                <RevenueChart 
                  data={monthlyRevenue} 
                  title="Revenue Overview"
                  description="Monthly revenue from member payments"
                />
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
              ) : allRecentActivities.length > 0 ? (
                <RecentActivity activities={allRecentActivities} />
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
          </>
        )}
      </div>
    </SaccoPortalLayout>
  );
}
