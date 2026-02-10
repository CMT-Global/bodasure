import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus, Download, Shield, AlertTriangle, Clock, Ban, Receipt } from 'lucide-react';
import { usePermits } from '@/hooks/usePayments';
import { PaymentDialog } from '@/components/payments/PaymentDialog';
import { PermitPaymentsDialog } from '@/components/permits/PermitPaymentsDialog';
import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import { format, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveCountyId } from '@/contexts/PlatformSuperAdminCountyContext';
import { CountyFilterBar } from '@/components/shared/CountyFilterBar';
import { exportToCSV } from '@/utils/exportCsv';

// Helper to determine permit type from duration
function getPermitType(durationDays: number): string {
  if (durationDays <= 7) return 'Weekly';
  if (durationDays <= 31) return 'Monthly';
  if (durationDays <= 93) return 'Quarterly';
  return 'Annual';
}

// Helper to get permit type badge variant
function getPermitTypeBadge(type: string) {
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    Weekly: 'secondary',
    Monthly: 'default',
    Quarterly: 'outline',
    Annual: 'default',
  };
  return variants[type] || 'outline';
}

type PermitRow = {
  id: string;
  permit_number: string;
  status: string;
  issued_at: string | null;
  expires_at: string | null;
  amount_paid: number | null;
  riders: { full_name: string; phone: string } | null;
  motorbikes: { registration_number: string; make: string | null; model: string | null } | null;
  permit_types: { name: string; amount: number; duration_days: number } | null;
};

const getStatusBadge = (status: string, expiresAt: string | null) => {
  const isExpiringSoon = expiresAt && differenceInDays(new Date(expiresAt), new Date()) <= 30;
  
  if (status === 'active' && isExpiringSoon) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1 w-fit bg-yellow-500/20 text-yellow-600">
        <AlertTriangle className="h-3 w-3" />
        Expiring Soon
      </Badge>
    );
  }
  
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    active: { variant: 'default', icon: <Shield className="h-3 w-3" /> },
    pending: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
    expired: { variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" /> },
    suspended: { variant: 'outline', icon: <Ban className="h-3 w-3" /> },
    cancelled: { variant: 'outline', icon: <Ban className="h-3 w-3" /> },
  };
  
  const config = variants[status] || variants.pending;
  return (
    <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
      {config.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const getColumns = (onViewPayments: (permitId: string, permitNumber: string) => void): ColumnDef<PermitRow>[] => [
  {
    accessorKey: 'permit_number',
    header: 'Permit #',
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">{row.original.permit_number}</span>
    ),
  },
  {
    accessorKey: 'riders.full_name',
    header: 'Rider',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.riders?.full_name || 'N/A'}</p>
        <p className="text-xs text-muted-foreground">{row.original.riders?.phone || ''}</p>
      </div>
    ),
  },
  {
    accessorKey: 'motorbikes.registration_number',
    header: 'Motorbike',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.motorbikes?.registration_number || 'N/A'}</p>
        <p className="text-xs text-muted-foreground">
          {[row.original.motorbikes?.make, row.original.motorbikes?.model].filter(Boolean).join(' ')}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'permit_types',
    header: 'Permit Type',
    cell: ({ row }) => {
      const permitType = row.original.permit_types;
      if (!permitType) return <span className="text-sm text-muted-foreground">-</span>;
      const type = getPermitType(permitType.duration_days);
      return (
        <div>
          <Badge variant={getPermitTypeBadge(type)} className="mb-1">
            {type}
          </Badge>
          <p className="text-xs text-muted-foreground">{permitType.name}</p>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => getStatusBadge(row.original.status, row.original.expires_at),
  },
  {
    accessorKey: 'issued_at',
    header: 'Start Date',
    cell: ({ row }) => (
      row.original.issued_at ? format(new Date(row.original.issued_at), 'MMM d, yyyy') : '-'
    ),
  },
  {
    accessorKey: 'expires_at',
    header: 'Expiry Date',
    cell: ({ row }) => {
      if (!row.original.expires_at) return '-';
      const expiresDate = new Date(row.original.expires_at);
      const daysLeft = differenceInDays(expiresDate, new Date());
      return (
        <div>
          <p>{format(expiresDate, 'MMM d, yyyy')}</p>
          <p className={`text-xs ${daysLeft <= 30 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
            {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: 'amount_paid',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="font-semibold">
        {row.original.amount_paid
          ? new Intl.NumberFormat('en-KE', {
              style: 'currency',
              currency: 'KES',
            }).format(row.original.amount_paid)
          : '-'}
      </span>
    ),
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewPayments(row.original.id, row.original.permit_number)}
      >
        <Receipt className="mr-2 h-4 w-4" />
        Payments
      </Button>
    ),
  },
];

export default function PermitsPage() {
  const { profile, roles, hasRole } = useAuth();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPermitId, setSelectedPermitId] = useState<string | null>(null);
  const [selectedPermitNumber, setSelectedPermitNumber] = useState<string>('');
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(false);

  // Check if user is platform super admin
  const isPlatformSuperAdmin = hasRole('platform_super_admin') || hasRole('platform_admin');

  const countyId = useEffectiveCountyId();

  // Only fetch permits if we have a countyId (for non-super-admins or super-admins with selected county)
  const { data: permits = [], isLoading } = usePermits(countyId || '');
  
  // Show message for super admins without county selection
  const showCountySelectionMessage = isPlatformSuperAdmin && !countyId;

  const handleViewPayments = (permitId: string, permitNumber: string) => {
    setSelectedPermitId(permitId);
    setSelectedPermitNumber(permitNumber);
    setIsPaymentsOpen(true);
  };

  const handleExport = () => {
    if (!permits.length) return;
    const rows = permits.map((p) => ({
      permit_number: p.permit_number ?? '',
      rider_name: p.riders?.full_name ?? '',
      rider_phone: p.riders?.phone ?? '',
      registration_number: p.motorbikes?.registration_number ?? '',
      make: p.motorbikes?.make ?? '',
      model: p.motorbikes?.model ?? '',
      permit_type: p.permit_types?.name ?? '',
      status: p.status ?? '',
      issued_at: p.issued_at ?? '',
      expires_at: p.expires_at ?? '',
      amount_paid: p.amount_paid ?? '',
    }));
    exportToCSV(rows, 'permits_export');
  };

  const activePermits = permits.filter(p => p.status === 'active').length;
  const expiringSoon = permits.filter(p => {
    if (p.status !== 'active' || !p.expires_at) return false;
    return differenceInDays(new Date(p.expires_at), new Date()) <= 30;
  }).length;
  const expiredPermits = permits.filter(p => p.status === 'expired').length;
  const pendingPermits = permits.filter(p => p.status === 'pending').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Permits</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Manage permits and licenses • {permits.length} total
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <CountyFilterBar />
              <Button variant="outline" className="min-h-[44px] flex-1 sm:flex-initial" onClick={handleExport} disabled={isLoading || permits.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={() => setIsPaymentOpen(true)} className="glow-primary min-h-[44px] flex-1 sm:flex-initial">
                <Plus className="mr-2 h-4 w-4" />
                Issue Permit
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
              <Shield className="h-4 w-4 text-green-500 shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold text-green-500">{activePermits}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">valid permits</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Expiring Soon</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold text-yellow-500">{expiringSoon}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">within 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Expired</CardTitle>
              <Ban className="h-4 w-4 text-red-500 shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold text-red-500">{expiredPermits}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">need renewal</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingPermits}</div>
              <p className="text-xs text-muted-foreground">awaiting payment</p>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        {showCountySelectionMessage ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Select a county when creating a permit to view permits for that county.
                </p>
                <Button onClick={() => setIsPaymentOpen(true)} className="glow-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  Issue Permit
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <DataTable
            columns={getColumns(handleViewPayments)}
            data={permits as PermitRow[]}
            searchPlaceholder="Search by permit number, rider..."
            isLoading={isLoading}
          />
        )}

        {/* Payment Dialog for new permits */}
        <PaymentDialog
          open={isPaymentOpen}
          onOpenChange={setIsPaymentOpen}
          countyId={countyId}
        />

        {/* Permit Payments Dialog */}
        <PermitPaymentsDialog
          open={isPaymentsOpen}
          onOpenChange={setIsPaymentsOpen}
          permitId={selectedPermitId}
          permitNumber={selectedPermitNumber}
        />
      </div>
    </DashboardLayout>
  );
}
