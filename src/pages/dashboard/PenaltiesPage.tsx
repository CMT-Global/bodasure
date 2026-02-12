import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Download,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  UserX,
  Shield,
  RefreshCw,
} from 'lucide-react';
import {
  usePenalties,
  useUpdatePenaltyStatus,
  useWaivePenalty,
  useUpdateRiderStatus,
  useCheckExpiredPermits,
  PenaltyWithRepeatInfo,
} from '@/hooks/usePenalties';
import { PenaltyIssuanceDialog } from '@/components/penalties/PenaltyIssuanceDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CountyFilterBar } from '@/components/shared/CountyFilterBar';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveCountyId } from '@/contexts/PlatformSuperAdminCountyContext';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { exportToCSV } from '@/utils/exportCsv';

// Helper to get penalty status
function getPenaltyStatus(penalty: PenaltyWithRepeatInfo): 'unpaid' | 'paid' | 'waived' {
  if (penalty.is_paid) {
    // If there's a payment_id, it's a real payment
    if (penalty.payment_id) {
      return 'paid';
    }
    // If payment_id is null, check if it was waived (marked in description)
    // Waived penalties have "[WAIVED]" marker in description
    if (penalty.description && penalty.description.includes('[WAIVED]')) {
      return 'waived';
    }
    // Otherwise, it's admin-marked as complete/paid
    return 'paid';
  }
  return 'unpaid';
}

const getPenaltyStatusBadge = (penalty: PenaltyWithRepeatInfo) => {
  const status = getPenaltyStatus(penalty);
  const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    unpaid: { label: 'Unpaid', variant: 'destructive' },
    paid: { label: 'Paid', variant: 'default' },
    waived: { label: 'Waived', variant: 'outline' },
  };
  const config = variants[status] || variants.unpaid;
  return <StatusBadge status={status} />;
};

// Predefined penalty types - always show these in the filter
const PENALTY_TYPES = [
  'Expired permit',
  'No permit',
  'Other county-defined violations',
];

export default function PenaltiesPage() {
  const { profile, roles, hasRole } = useAuth();
  const [isIssuanceOpen, setIsIssuanceOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [repeatOffenderFilter, setRepeatOffenderFilter] = useState<string>('all');
  const [selectedPenalty, setSelectedPenalty] = useState<PenaltyWithRepeatInfo | null>(null);
  const [isWaiveOpen, setIsWaiveOpen] = useState(false);
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);

  const updatePenaltyStatus = useUpdatePenaltyStatus();
  const waivePenalty = useWaivePenalty();
  const updateRiderStatus = useUpdateRiderStatus();

  const countyId = useEffectiveCountyId();

  const checkExpiredPermits = useCheckExpiredPermits(countyId);

  const { data: penalties = [], isLoading } = usePenalties(countyId);

  // Platform/county super admins have full rights; enforcement officer and county admin can also issue
  const canIssuePenalties = hasRole('platform_super_admin') || hasRole('county_super_admin') || hasRole('county_enforcement_officer') || hasRole('county_admin');
  const isAdmin = hasRole('platform_super_admin') || hasRole('county_super_admin') || hasRole('county_admin');

  // Calculate stats
  const stats = useMemo(() => {
    const unpaid = penalties.filter(p => !p.is_paid).length;
    // Paid: has payment_id OR is_paid without [WAIVED] marker
    const paid = penalties.filter(p => {
      if (!p.is_paid) return false;
      if (p.payment_id) return true; // Real payment
      // Admin-completed (no payment_id but not waived)
      return !(p.description && p.description.includes('[WAIVED]'));
    }).length;
    // Waived: is_paid with [WAIVED] marker in description
    const waived = penalties.filter(p => {
      return p.is_paid && p.description && p.description.includes('[WAIVED]');
    }).length;
    const repeatOffenders = new Set(
      penalties.filter(p => p.repeat_offender).map(p => p.rider_id)
    ).size;
    const totalAmount = penalties.filter(p => !p.is_paid).reduce((sum, p) => sum + Number(p.amount), 0);
    const paidPenalties = penalties.filter(p => {
      if (!p.is_paid) return false;
      if (p.payment_id) return true;
      return !(p.description && p.description.includes('[WAIVED]'));
    });
    const paidAmount = paidPenalties.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      unpaid,
      paid,
      waived,
      repeatOffenders,
      totalAmount,
      paidAmount,
    };
  }, [penalties]);

  // Filter penalties
  const filteredPenalties = useMemo(() => {
    return penalties.filter((penalty) => {
      // Status filter
      if (statusFilter !== 'all') {
        const status = getPenaltyStatus(penalty);
        if (status !== statusFilter) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && penalty.penalty_type !== typeFilter) {
        return false;
      }

      // Repeat offender filter
      if (repeatOffenderFilter === 'repeat' && !penalty.repeat_offender) {
        return false;
      }
      if (repeatOffenderFilter === 'first' && penalty.repeat_offender) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesRider = penalty.riders?.full_name.toLowerCase().includes(query) ||
                            penalty.riders?.phone.toLowerCase().includes(query) ||
                            penalty.riders?.id_number.toLowerCase().includes(query);
        const matchesType = penalty.penalty_type.toLowerCase().includes(query);
        const matchesDescription = penalty.description?.toLowerCase().includes(query);
        
        if (!matchesRider && !matchesType && !matchesDescription) {
          return false;
        }
      }

      return true;
    });
  }, [penalties, searchQuery, statusFilter, typeFilter, repeatOffenderFilter]);

  const handleExport = () => {
    if (!filteredPenalties.length) return;
    const rows = filteredPenalties.map((p) => ({
      rider_name: p.riders?.full_name ?? '',
      rider_phone: p.riders?.phone ?? '',
      rider_id_number: p.riders?.id_number ?? '',
      penalty_type: p.penalty_type ?? '',
      description: p.description ?? '',
      amount: p.amount ?? '',
      status: getPenaltyStatus(p),
      due_date: p.due_date ?? '',
      created_at: p.created_at ?? '',
      repeat_offender: p.repeat_offender ? 'Yes' : 'No',
    }));
    exportToCSV(rows, 'penalties_export');
  };

  const handleMarkPaid = async (penalty: PenaltyWithRepeatInfo) => {
    await updatePenaltyStatus.mutateAsync({
      penaltyId: penalty.id,
      isPaid: true,
      paymentId: null, // In real app, this would come from payment
    });
  };

  const handleWaive = async () => {
    if (selectedPenalty) {
      await waivePenalty.mutateAsync(selectedPenalty.id);
      setIsWaiveOpen(false);
      setSelectedPenalty(null);
    }
  };

  const handleSuspend = async () => {
    if (selectedPenalty?.riders) {
      await updateRiderStatus.mutateAsync({
        riderId: selectedPenalty.riders.id,
        status: 'suspended',
        complianceStatus: 'non_compliant',
      });
      setIsSuspendOpen(false);
      setSelectedPenalty(null);
    }
  };

  const handleBlacklist = async () => {
    if (selectedPenalty?.riders) {
      await updateRiderStatus.mutateAsync({
        riderId: selectedPenalty.riders.id,
        complianceStatus: 'blacklisted',
        status: 'suspended',
      });
      setIsBlacklistOpen(false);
      setSelectedPenalty(null);
    }
  };

  const handleCheckExpired = async () => {
    await checkExpiredPermits.mutateAsync();
  };

  const columns: ColumnDef<PenaltyWithRepeatInfo>[] = useMemo(() => [
    {
      accessorKey: 'riders.full_name',
      header: 'Rider',
      cell: ({ row }) => {
        const rider = row.original.riders;
        if (!rider) return <span className="text-sm text-muted-foreground">N/A</span>;
        
        return (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{rider.full_name}</p>
              {row.original.repeat_offender && (
                <Badge variant="destructive" className="text-xs">
                  Repeat ({row.original.penalty_count})
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{rider.phone}</p>
            <p className="text-xs text-muted-foreground font-mono">{rider.id_number}</p>
            <div className="flex gap-1 mt-1">
              {rider.compliance_status === 'blacklisted' && (
                <Badge variant="destructive" className="text-xs">Blacklisted</Badge>
              )}
              {rider.status === 'suspended' && (
                <Badge variant="outline" className="text-xs">Suspended</Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'penalty_type',
      header: 'Penalty Type',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.penalty_type}</Badge>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-semibold">
          {new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
          }).format(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getPenaltyStatusBadge(row.original),
    },
    {
      accessorKey: 'due_date',
      header: 'Due Date',
      cell: ({ row }) => (
        row.original.due_date
          ? format(new Date(row.original.due_date), 'MMM d, yyyy')
          : '-'
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Issued',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, yyyy'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const penalty = row.original;
        const status = getPenaltyStatus(penalty);
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {status === 'unpaid' && (
                <DropdownMenuItem onClick={() => handleMarkPaid(penalty)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Paid
                </DropdownMenuItem>
              )}
              {status === 'unpaid' && isAdmin && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedPenalty(penalty);
                    setIsWaiveOpen(true);
                  }}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Waive Penalty
                </DropdownMenuItem>
              )}
              {penalty.riders && (
                <>
                  <DropdownMenuSeparator />
                  {penalty.riders.status !== 'suspended' && (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedPenalty(penalty);
                        setIsSuspendOpen(true);
                      }}
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Suspend Rider
                    </DropdownMenuItem>
                  )}
                  {penalty.riders.compliance_status !== 'blacklisted' && (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedPenalty(penalty);
                        setIsBlacklistOpen(true);
                      }}
                      className="text-destructive"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Blacklist Rider
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [isAdmin]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Penalties</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage fines and violations • {filteredPenalties.length} penalties
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <CountyFilterBar />
            <Button variant="outline" onClick={handleCheckExpired} className="min-h-[44px] flex-1 sm:flex-initial" disabled={!countyId} title={!countyId ? 'Select a county to check expired permits' : undefined}>
              <RefreshCw className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Check Expired Permits</span>
              <span className="sm:hidden">Check Expired</span>
            </Button>
            <Button variant="outline" className="min-h-[44px] flex-1 sm:flex-initial" onClick={handleExport} disabled={isLoading || filteredPenalties.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            {canIssuePenalties && (
              <Button onClick={() => setIsIssuanceOpen(true)} className="glow-primary min-h-[44px] flex-1 sm:flex-initial" disabled={!countyId} title={!countyId ? 'Select a county to issue a penalty' : undefined}>
                <Plus className="mr-2 h-4 w-4" />
                Issue Penalty
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Unpaid</CardTitle>
              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold text-red-500">{stats.unpaid}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                {new Intl.NumberFormat('en-KE', {
                  style: 'currency',
                  currency: 'KES',
                  maximumFractionDigits: 0,
                }).format(stats.totalAmount)} outstanding
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold text-green-500">{stats.paid}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                {new Intl.NumberFormat('en-KE', {
                  style: 'currency',
                  currency: 'KES',
                  maximumFractionDigits: 0,
                }).format(stats.paidAmount)} collected
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Waived</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.waived}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">admin waived</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Repeat Offenders</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold text-yellow-500">{stats.repeatOffenders}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">multiple violations</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Outstanding</CardTitle>
              <Clock className="h-4 w-4 text-primary shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-lg sm:text-2xl font-bold text-primary">
                {new Intl.NumberFormat('en-KE', {
                  style: 'currency',
                  currency: 'KES',
                  maximumFractionDigits: 0,
                }).format(stats.totalAmount)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">unpaid amount</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by rider name, phone, ID, penalty type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 min-h-[44px] text-base sm:text-sm"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px] min-h-[44px]">
                <Filter className="mr-2 h-4 w-4 shrink-0" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="waived">Waived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[265px] min-h-[44px]">
                <SelectValue placeholder="Penalty Type" />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="all">All Types</SelectItem>
                {PENALTY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={repeatOffenderFilter} onValueChange={setRepeatOffenderFilter}>
              <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
                <SelectValue placeholder="Offender Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Offenders</SelectItem>
                <SelectItem value="repeat">Repeat Offenders</SelectItem>
                <SelectItem value="first">First Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredPenalties}
          searchPlaceholder="Search penalties..."
          isLoading={isLoading}
        />

        {/* Penalty Issuance Dialog */}
        {canIssuePenalties && countyId && (
          <PenaltyIssuanceDialog
            open={isIssuanceOpen}
            onOpenChange={setIsIssuanceOpen}
            countyId={countyId}
          />
        )}

        {/* Waive Confirmation */}
        <AlertDialog open={isWaiveOpen} onOpenChange={setIsWaiveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Waive Penalty</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to waive this penalty? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleWaive}>
                Waive Penalty
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Suspend Confirmation */}
        <AlertDialog open={isSuspendOpen} onOpenChange={setIsSuspendOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Suspend Rider</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to suspend {selectedPenalty?.riders?.full_name}? This will mark them as non-compliant.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSuspend}>
                Suspend Rider
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Blacklist Confirmation */}
        <AlertDialog open={isBlacklistOpen} onOpenChange={setIsBlacklistOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Blacklist Rider</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to blacklist {selectedPenalty?.riders?.full_name}? This is a serious action that will suspend the rider and mark them as blacklisted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBlacklist} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Blacklist Rider
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
