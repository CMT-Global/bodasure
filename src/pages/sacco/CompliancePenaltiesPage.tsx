import { useState, useMemo, useEffect } from 'react';
import { SaccoPortalLayout } from '@/components/layout/SaccoPortalLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  FileX,
  Download,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useSaccos, useSaccoPermitExpiryAlerts, useSaccoMembers } from '@/hooks/useData';
import { useSaccoPenalties, PenaltyWithRepeatInfo } from '@/hooks/usePenalties';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
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
import { toast } from 'sonner';

// Helper to get penalty status
function getPenaltyStatus(penalty: PenaltyWithRepeatInfo): 'unpaid' | 'paid' | 'waived' {
  if (penalty.is_paid) {
    if (penalty.payment_id) {
      return 'paid';
    }
    if (penalty.description && penalty.description.includes('[WAIVED]')) {
      return 'waived';
    }
    return 'paid';
  }
  return 'unpaid';
}

const getPenaltyStatusBadge = (penalty: PenaltyWithRepeatInfo) => {
  const status = getPenaltyStatus(penalty);
  return <StatusBadge status={status} />;
};

export default function CompliancePenaltiesPage() {
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

  const { data: penalties = [], isLoading: penaltiesLoading } = useSaccoPenalties(saccoId, countyId);
  const { data: permitAlerts = [], isLoading: alertsLoading } = useSaccoPermitExpiryAlerts(saccoId, countyId);
  const { data: members = [], isLoading: membersLoading } = useSaccoMembers(saccoId, countyId);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [repeatOffenderFilter, setRepeatOffenderFilter] = useState<string>('all');
  const [selectedPenalty, setSelectedPenalty] = useState<PenaltyWithRepeatInfo | null>(null);
  const [isEscalateOpen, setIsEscalateOpen] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    const unpaid = penalties.filter(p => !p.is_paid).length;
    const paid = penalties.filter(p => {
      if (!p.is_paid) return false;
      if (p.payment_id) return true;
      return !(p.description && p.description.includes('[WAIVED]'));
    }).length;
    const waived = penalties.filter(p => {
      return p.is_paid && p.description && p.description.includes('[WAIVED]');
    }).length;
    const repeatOffenders = new Set(
      penalties.filter(p => p.repeat_offender).map(p => p.rider_id)
    ).size;
    const totalAmount = penalties.filter(p => !p.is_paid).reduce((sum, p) => sum + Number(p.amount), 0);
    const expiredPermits = permitAlerts.filter(a => a.isExpired).length;
    const expiringSoon = permitAlerts.filter(a => !a.isExpired && a.daysUntilExpiry <= 7).length;

    return {
      unpaid,
      paid,
      waived,
      repeatOffenders,
      totalAmount,
      expiredPermits,
      expiringSoon,
    };
  }, [penalties, permitAlerts]);

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

  // Get unique penalty types for filter
  const penaltyTypes = useMemo(() => {
    const types = new Set(penalties.map(p => p.penalty_type));
    return Array.from(types).sort();
  }, [penalties]);

  // Calculate compliance scores for members
  const memberComplianceScores = useMemo(() => {
    if (!members.length) return [];

    // Create maps for quick lookup
    const penaltiesByRider = new Map<string, PenaltyWithRepeatInfo[]>();
    penalties.forEach(p => {
      if (!penaltiesByRider.has(p.rider_id)) {
        penaltiesByRider.set(p.rider_id, []);
      }
      penaltiesByRider.get(p.rider_id)!.push(p);
    });

    const expiredPermitsByRider = new Set(
      permitAlerts.filter(a => a.isExpired).map(a => a.rider_id)
    );

    return members.map(member => {
      const memberPenalties = penaltiesByRider.get(member.id) || [];
      const unpaidPenalties = memberPenalties.filter(p => !p.is_paid);
      const isRepeatOffender = memberPenalties.some(p => p.repeat_offender);
      const hasExpiredPermit = expiredPermitsByRider.has(member.id);
      const hasActivePermit = member.permit?.status === 'active' && 
        member.permit.expires_at && 
        new Date(member.permit.expires_at) > new Date();

      // Calculate compliance score (0-100)
      let score = 100;
      
      // Deduct for unpaid penalties
      score -= unpaidPenalties.length * 10;
      
      // Deduct for expired permit
      if (hasExpiredPermit === false || (member.permit && member.permit.status === 'expired')) {
        score -= 20;
      }
      
      // Deduct for repeat offender
      if (isRepeatOffender) {
        score -= 15;
      }
      
      // Adjust based on compliance_status
      if (member.compliance_status === 'blacklisted') {
        score = 0;
      } else if (member.compliance_status === 'non_compliant') {
        score = Math.min(score, 40);
      } else if (member.compliance_status === 'pending_review') {
        score = Math.min(score, 60);
      }
      
      // Ensure score is between 0 and 100
      score = Math.max(0, Math.min(100, score));

      return {
        member,
        score,
        unpaidPenalties: unpaidPenalties.length,
        totalPenalties: memberPenalties.length,
        isRepeatOffender,
        hasExpiredPermit,
        hasActivePermit,
      };
    }).sort((a, b) => a.score - b.score); // Sort by score (lowest first)
  }, [members, penalties, permitAlerts]);

  const handleEscalate = () => {
    if (selectedPenalty) {
      // In a real app, this would send an escalation request to county officials
      toast.info('Escalation request sent to county officials');
      setIsEscalateOpen(false);
      setSelectedPenalty(null);
    }
  };

  const columns: ColumnDef<PenaltyWithRepeatInfo>[] = useMemo(() => [
    {
      accessorKey: 'riders.full_name',
      header: 'Member',
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
        
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedPenalty(penalty);
              setIsEscalateOpen(true);
            }}
            className="h-8"
          >
            <Eye className="h-4 w-4 mr-2" />
            Escalate
          </Button>
        );
      },
    },
  ], []);

  return (
    <SaccoPortalLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Compliance & Penalties</h1>
            <p className="text-muted-foreground">
              View penalties, permit alerts, and compliance status for your members
            </p>
            <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-md border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Sacco officials cannot issue county penalties, only view and escalate.</span>
            </div>
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
            Select a sacco to view compliance and penalties.
          </div>
        ) : (
          <>
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
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">settled</p>
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

            {/* Permit Expiry Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileX className="h-5 w-5" />
                  Permit Expiry Alerts
                </CardTitle>
                <CardDescription>
                  {stats.expiredPermits} expired, {stats.expiringSoon} expiring within 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading alerts...</div>
                ) : permitAlerts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No permit expiry alerts</div>
                ) : (
                  <div className="space-y-2">
                    {permitAlerts.slice(0, 10).map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">{alert.rider_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{alert.permit_number}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(alert.expires_at), 'PP')}
                          </p>
                        </div>
                        <div className="text-right">
                          {alert.isExpired ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <Badge variant={alert.daysUntilExpiry <= 7 ? 'destructive' : 'outline'}>
                              {alert.daysUntilExpiry} day{alert.daysUntilExpiry !== 1 ? 's' : ''} left
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {permitAlerts.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{permitAlerts.length - 10} more alerts
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Member Compliance Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Member Compliance Scores
                </CardTitle>
                <CardDescription>
                  Compliance scores calculated based on penalties, permits, and status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="text-sm text-muted-foreground">Loading compliance scores...</div>
                ) : memberComplianceScores.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No members found</div>
                ) : (
                  <div className="space-y-2">
                    {memberComplianceScores.slice(0, 15).map((item) => {
                      const scoreColor = item.score >= 80 ? 'text-green-600' : item.score >= 50 ? 'text-yellow-600' : 'text-red-600';
                      const scoreBg = item.score >= 80 ? 'bg-green-50 dark:bg-green-950/20' : item.score >= 50 ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-red-50 dark:bg-red-950/20';
                      
                      return (
                        <div
                          key={item.member.id}
                          className={`flex items-center justify-between rounded-lg border border-border p-3 text-sm ${scoreBg}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{item.member.full_name}</p>
                              {item.isRepeatOffender && (
                                <Badge variant="destructive" className="text-xs">Repeat</Badge>
                              )}
                              {item.hasExpiredPermit && (
                                <Badge variant="destructive" className="text-xs">Expired Permit</Badge>
                              )}
                              {!item.hasActivePermit && !item.hasExpiredPermit && (
                                <Badge variant="outline" className="text-xs">No Permit</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{item.member.phone}</p>
                            <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{item.unpaidPenalties} unpaid penalty{item.unpaidPenalties !== 1 ? 'ies' : ''}</span>
                              {item.totalPenalties > 0 && (
                                <span>• {item.totalPenalties} total</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className={`text-2xl font-bold ${scoreColor}`}>
                              {Math.round(item.score)}
                            </div>
                            <p className="text-xs text-muted-foreground">score</p>
                          </div>
                        </div>
                      );
                    })}
                    {memberComplianceScores.length > 15 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{memberComplianceScores.length - 15} more members
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Penalties Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Penalties</CardTitle>
                <CardDescription>
                  View all penalties issued to your members • {filteredPenalties.length} penalties
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="space-y-4 mb-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by member name, phone, ID, penalty type..."
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
                        {penaltyTypes.map((type) => (
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
                  isLoading={penaltiesLoading}
                />
              </CardContent>
            </Card>

            {/* Escalate Confirmation */}
            <AlertDialog open={isEscalateOpen} onOpenChange={setIsEscalateOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Escalate Penalty</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to escalate this penalty to county officials? This will notify them about the issue.
                    {selectedPenalty?.riders && (
                      <div className="mt-2 p-2 bg-muted rounded">
                        <p className="font-medium">{selectedPenalty.riders.full_name}</p>
                        <p className="text-xs text-muted-foreground">{selectedPenalty.penalty_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Intl.NumberFormat('en-KE', {
                            style: 'currency',
                            currency: 'KES',
                          }).format(selectedPenalty.amount)}
                        </p>
                      </div>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEscalate}>
                    Escalate to County
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </SaccoPortalLayout>
  );
}
