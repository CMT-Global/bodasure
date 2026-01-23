import { useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ComplianceOverview } from '@/components/dashboard/ComplianceOverview';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { Users, FileCheck, AlertTriangle, CreditCard, XCircle, CheckCircle2 } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';

const demoRevenueData = [
  { date: 'Jan', amount: 3200000 },
  { date: 'Feb', amount: 3800000 },
  { date: 'Mar', amount: 3500000 },
  { date: 'Apr', amount: 4100000 },
  { date: 'May', amount: 4350000 },
  { date: 'Jun', amount: 4520000 },
];

const demoActivities = [
  {
    id: '1',
    type: 'registration' as const,
    title: 'New Rider Registered',
    description: 'John Mwangi (ID: 32456789) registered in Kisumu County',
    time: '2 min ago',
    status: 'success' as const,
  },
  {
    id: '2',
    type: 'payment' as const,
    title: 'Permit Payment Received',
    description: 'KES 2,500 received from James Ochieng for annual permit',
    time: '15 min ago',
    status: 'success' as const,
  },
  {
    id: '3',
    type: 'penalty' as const,
    title: 'Penalty Issued',
    description: 'Expired permit penalty issued to Peter Wafula',
    time: '1 hour ago',
    status: 'warning' as const,
  },
  {
    id: '4',
    type: 'verification' as const,
    title: 'QR Verification',
    description: 'Rider verified by enforcement officer at CBD Stage',
    time: '2 hours ago',
    status: 'success' as const,
  },
  {
    id: '5',
    type: 'permit' as const,
    title: 'Permit Expiring Soon',
    description: '45 permits expiring in the next 7 days',
    time: '3 hours ago',
    status: 'pending' as const,
  },
];

const demoCompliance = [
  { id: '1', name: 'Boda Boda Sacco Ltd', type: 'sacco' as const, complianceRate: 94, status: 'compliant' as const },
  { id: '2', name: 'CBD Central Stage', type: 'stage' as const, complianceRate: 87, status: 'compliant' as const },
  { id: '3', name: 'Mama Mboga Welfare', type: 'sacco' as const, complianceRate: 72, status: 'at_risk' as const },
  { id: '4', name: 'Kondele Junction', type: 'stage' as const, complianceRate: 45, status: 'non_compliant' as const },
];

export default function Dashboard() {
  const { profile, roles } = useAuth();
  
  // Get county_id from profile or first role
  const countyId = useMemo(() => {
    return profile?.county_id || roles.find(r => r.county_id)?.county_id || undefined;
  }, [profile, roles]);

  const { data: stats, isLoading } = useDashboardStats(countyId);

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
          <RevenueChart data={demoRevenueData} />
          <RecentActivity activities={demoActivities} />
        </div>

        {/* Compliance overview */}
        <ComplianceOverview items={demoCompliance} />
      </div>
    </DashboardLayout>
  );
}
