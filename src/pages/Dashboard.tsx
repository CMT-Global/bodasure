import { useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ComplianceOverview } from '@/components/dashboard/ComplianceOverview';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { Users, FileCheck, AlertTriangle, CreditCard, XCircle, CheckCircle2 } from 'lucide-react';
import { useDashboardStats, useRecentActivity, useMonthlyRevenue, useComplianceOverview } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { profile, roles } = useAuth();
  
  // Get county_id from profile or first role
  const countyId = useMemo(() => {
    return profile?.county_id || roles.find(r => r.county_id)?.county_id || undefined;
  }, [profile, roles]);

  const { data: stats, isLoading } = useDashboardStats(countyId);
  const { data: recentActivities = [], isLoading: isLoadingActivities } = useRecentActivity(countyId, 5);
  const { data: monthlyRevenue = [], isLoading: isLoadingRevenue } = useMonthlyRevenue(countyId, 6);
  const { data: complianceOverview = [], isLoading: isLoadingCompliance } = useComplianceOverview(countyId, 4);

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

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening in your county.</p>
        </div>

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
          {isLoadingRevenue ? (
            <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
              <div className="h-[300px] bg-muted rounded"></div>
            </div>
          ) : monthlyRevenue.length > 0 ? (
            <RevenueChart data={monthlyRevenue} />
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
