import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ComplianceOverview } from '@/components/dashboard/ComplianceOverview';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { Users, Bike, CreditCard, AlertTriangle, FileCheck, Building2 } from 'lucide-react';

// Demo data for the dashboard
const demoStats = {
  totalRiders: 12458,
  activePermits: 9234,
  monthlyRevenue: 4520000,
  pendingPenalties: 342,
  registeredBikes: 11892,
  activeSaccos: 48,
};

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
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening in your county.</p>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            title="Total Riders"
            value={demoStats.totalRiders.toLocaleString()}
            icon={<Users className="h-6 w-6" />}
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatCard
            title="Registered Bikes"
            value={demoStats.registeredBikes.toLocaleString()}
            icon={<Bike className="h-6 w-6" />}
            trend={{ value: 8.3, isPositive: true }}
          />
          <StatCard
            title="Active Permits"
            value={demoStats.activePermits.toLocaleString()}
            icon={<FileCheck className="h-6 w-6" />}
            trend={{ value: 5.2, isPositive: true }}
          />
          <StatCard
            title="Monthly Revenue"
            value={`KES ${(demoStats.monthlyRevenue / 1000000).toFixed(1)}M`}
            icon={<CreditCard className="h-6 w-6" />}
            trend={{ value: 18.7, isPositive: true }}
          />
          <StatCard
            title="Pending Penalties"
            value={demoStats.pendingPenalties.toLocaleString()}
            icon={<AlertTriangle className="h-6 w-6" />}
            trend={{ value: 3.2, isPositive: false }}
          />
          <StatCard
            title="Active Saccos"
            value={demoStats.activeSaccos.toLocaleString()}
            icon={<Building2 className="h-6 w-6" />}
            trend={{ value: 2.1, isPositive: true }}
          />
        </div>

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
