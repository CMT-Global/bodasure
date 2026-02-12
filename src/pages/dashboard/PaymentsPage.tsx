import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Download, CheckCircle, XCircle, Clock, RefreshCw, Search, Filter, History, TrendingUp } from 'lucide-react';
import { usePayments, usePermitTypesForPayments, useVerifyPayment } from '@/hooks/usePayments';
import { usePenalties } from '@/hooks/usePenalties';
import { PaymentDialog } from '@/components/payments/PaymentDialog';
import { PaymentHistoryDialog } from '@/components/payments/PaymentHistoryDialog';
import { Badge } from '@/components/ui/badge';
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
import { useQueryClient } from '@tanstack/react-query';
import { CountyFilterBar } from '@/components/shared/CountyFilterBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { exportToCSV } from '@/utils/exportCsv';
import { cn } from '@/lib/utils';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: string) => {
  // Map completed to "Paid" for display; disable hover color change so status stays the same on hover
  if (status === 'completed') {
    return (
      <Badge variant="default" className="flex items-center gap-1 w-fit bg-success/20 text-success border-success/30 hover:bg-success/20 hover:text-success">
        <CheckCircle className="h-3 w-3" />
        Paid
      </Badge>
    );
  }

  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    failed: 'destructive',
    refunded: 'outline',
    cancelled: 'outline',
  };
  const variant = variants[status] || 'secondary';
  const hoverFix =
    variant === 'secondary'
      ? 'hover:bg-secondary hover:text-secondary-foreground'
      : variant === 'destructive'
        ? 'hover:bg-destructive hover:text-destructive-foreground'
        : 'hover:bg-muted hover:text-muted-foreground';
  return (
    <Badge variant={variant} className={cn('flex items-center gap-1 w-fit', hoverFix)}>
      {getStatusIcon(status)}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

type PaymentRow = {
  id: string;
  amount: number;
  status: string;
  payment_reference: string | null;
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
  riders: { id: string; full_name: string; phone: string } | null;
  permits: { permit_number: string; permit_type_id?: string; permit_types: { name: string } | null } | null;
  metadata: Record<string, unknown> | null;
};

type PermitTypeRow = { id: string; name: string };

export type PermitPenaltyInfo = { kind: 'permit' | 'penalty' | null; name: string };

function resolvePermitPenaltyInfo(
  payment: PaymentRow,
  permitTypes: PermitTypeRow[],
  penaltyIdToName: Map<string, string>
): PermitPenaltyInfo {
  const meta = payment.metadata as Record<string, unknown> | null | undefined;
  const isPenalty = meta?.payment_type === 'penalty';
  const penaltyId = meta?.penalty_id as string | undefined;
  if (isPenalty && penaltyId) {
    const name = penaltyIdToName.get(penaltyId) ?? 'Penalty';
    return { kind: 'penalty', name };
  }
  const fromPermitType = payment.permits?.permit_types?.name;
  if (fromPermitType) return { kind: 'permit', name: fromPermitType };
  const typeId = payment.permits?.permit_type_id ?? (meta?.permit_type_id as string | undefined);
  if (typeId) {
    const name = permitTypes.find((pt) => pt.id === typeId)?.name;
    if (name) return { kind: 'permit', name };
  }
  return { kind: null, name: '—' };
}

/** Full label for search/export: "Permit: Monthly Permit" or "Penalty: Operating without valid permit" or "—" */
function resolvePermitPenaltyLabel(
  payment: PaymentRow,
  permitTypes: PermitTypeRow[],
  penaltyIdToName: Map<string, string>
): string {
  const info = resolvePermitPenaltyInfo(payment, permitTypes, penaltyIdToName);
  if (info.kind === null || info.name === '—') return '—';
  return `${info.kind === 'penalty' ? 'Penalty' : 'Permit'}: ${info.name}`;
}

export default function PaymentsPage() {
  const { profile, roles } = useAuth();
  const countyId = useEffectiveCountyId();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [selectedRiderName, setSelectedRiderName] = useState<string>('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: payments = [], isLoading } = usePayments(countyId);
  const { data: permitTypes = [] } = usePermitTypesForPayments(countyId);
  const { data: penalties = [] } = usePenalties(countyId ?? undefined);
  const verifyPayment = useVerifyPayment();
  const verifiedRef = useRef<string | null>(null);

  // When returning from Paystack with ?payment_reference=..., verify and refresh so status shows Complete/Paid
  const paymentReference = searchParams.get('payment_reference');
  useEffect(() => {
    if (!paymentReference || verifiedRef.current === paymentReference) return;
    verifiedRef.current = paymentReference;
    verifyPayment.mutate(paymentReference, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['payments'] });
        queryClient.invalidateQueries({ queryKey: ['permits'] });
        queryClient.invalidateQueries({ queryKey: ['rider-payment-history'] });
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ['payments'] }), 500);
        const next = new URLSearchParams(searchParams);
        next.delete('payment_reference');
        setSearchParams(next, { replace: true });
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when payment_reference appears
  }, [paymentReference]);

  const penaltyIdToName = useMemo(() => new Map(penalties.map((p) => [p.id, p.penalty_type])), [penalties]);

  // Treat as paid if status is completed OR paid_at is set (webhook/verify may set paid_at before status)
  const isPaid = (p: { status: string; paid_at?: string | null }) =>
    p.status === 'completed' || !!p.paid_at;

  // Calculate revenue totals
  const revenueStats = useMemo(() => {
    const completed = payments.filter(isPaid);
    const totalRevenue = completed.reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingPayments = payments.filter(p => !isPaid(p) && p.status !== 'failed').length;
    const failedPayments = payments.filter(p => p.status === 'failed').length;

    return {
      total: totalRevenue,
      paid: completed.length,
      pending: pendingPayments,
      failed: failedPayments,
    };
  }, [payments]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'paid' && payment.status !== 'completed') return false;
        if (statusFilter !== 'paid' && payment.status !== statusFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesRider = payment.riders?.full_name.toLowerCase().includes(query) ||
                            payment.riders?.phone.toLowerCase().includes(query);
        const meta = payment.metadata as Record<string, unknown> | null | undefined;
        const permitNum = payment.permits?.permit_number ?? (meta?.permit_number as string | undefined);
        const permitPenaltyLabel = resolvePermitPenaltyLabel(payment as PaymentRow, permitTypes, penaltyIdToName);
        const matchesPermit = permitNum?.toLowerCase().includes(query) || permitPenaltyLabel?.toLowerCase().includes(query);
        const matchesReference = payment.payment_reference?.toLowerCase().includes(query);

        if (!matchesRider && !matchesPermit && !matchesReference) {
          return false;
        }
      }

      return true;
    });
  }, [payments, searchQuery, statusFilter, permitTypes, penaltyIdToName]);

  const handleViewHistory = (riderId: string, riderName: string) => {
    setSelectedRiderId(riderId);
    setSelectedRiderName(riderName);
    setIsHistoryOpen(true);
  };

  const handleExport = () => {
    if (!filteredPayments.length) return;
    const rows = filteredPayments.map((p) => ({
      payment_reference: p.payment_reference ?? '',
      rider_name: p.riders?.full_name ?? '',
      rider_phone: p.riders?.phone ?? '',
      amount: p.amount ?? '',
      payment_method: p.payment_method ?? '',
      status: isPaid(p) ? 'completed' : (p.status ?? ''),
      permit_penalty: resolvePermitPenaltyLabel(p as PaymentRow, permitTypes, penaltyIdToName),
      created_at: p.created_at ?? '',
      paid_at: p.paid_at ?? '',
    }));
    exportToCSV(rows, 'payments_export');
  };

  const columns: ColumnDef<PaymentRow>[] = useMemo(() => [
    {
      accessorKey: 'payment_reference',
      header: 'Reference',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.payment_reference || 'N/A'}</span>
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
      accessorKey: 'payment_method',
      header: 'Method',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.payment_method === 'mobile_money' ? 'M-Pesa' : row.original.payment_method || 'N/A'}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Payment Status',
      cell: ({ row }) => getStatusBadge(row.original.paid_at ? 'completed' : row.original.status),
    },
    {
      accessorKey: 'permits.permit_types.name',
      header: 'Type',
      cell: ({ row }) => {
        const info = resolvePermitPenaltyInfo(row.original, permitTypes, penaltyIdToName);
        if (info.kind === null || info.name === '—') {
          return <span className="text-muted-foreground">—</span>;
        }
        const isPermit = info.kind === 'permit';
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                isPermit
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25'
              )}
            >
              {isPermit ? 'Permit' : 'Penalty'}
            </span>
            {/* Show specific type name (e.g. "Monthly Permit", penalty type) — uncomment for future use
            <span className="text-sm text-foreground truncate" title={info.name}>
              {info.name}
            </span>
            */}
          </div>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, yyyy HH:mm'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const rider = row.original.riders;
        if (!rider) return null;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewHistory(rider.id, rider.full_name)}
          >
            <History className="mr-2 h-4 w-4" />
            History
          </Button>
        );
      },
    },
  ], [permitTypes, penaltyIdToName]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Payments</h1>
            <p className="text-muted-foreground">
              Track revenue and payment transactions • {payments.length} total
            </p>
          </div>
          <div className="flex gap-2">
            <CountyFilterBar />
            <Button variant="outline" onClick={handleExport} disabled={isLoading || filteredPayments.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setIsPaymentOpen(true)} className="glow-primary">
              <Plus className="mr-2 h-4 w-4" />
              New Payment
            </Button>
          </div>
        </div>

        {/* Revenue Totals */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {new Intl.NumberFormat('en-KE', {
                  style: 'currency',
                  currency: 'KES',
                }).format(revenueStats.total)}
              </div>
              <p className="text-xs text-muted-foreground">{revenueStats.paid} paid payments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{revenueStats.paid}</div>
              <p className="text-xs text-muted-foreground">completed payments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{revenueStats.pending}</div>
              <p className="text-xs text-muted-foreground">awaiting confirmation</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{revenueStats.failed}</div>
              <p className="text-xs text-muted-foreground">require attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by rider name, phone, permit number, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredPayments as PaymentRow[]}
          searchPlaceholder="Search payments..."
          isLoading={isLoading}
        />

        {/* Payment Dialog: validation from @/lib/zod (permitPaymentFormSchema) */}
        <PaymentDialog
          open={isPaymentOpen}
          onOpenChange={setIsPaymentOpen}
          countyId={countyId}
        />

        {/* Payment History Dialog */}
        <PaymentHistoryDialog
          open={isHistoryOpen}
          onOpenChange={setIsHistoryOpen}
          riderId={selectedRiderId}
          riderName={selectedRiderName}
          countyId={countyId}
        />
      </div>
    </DashboardLayout>
  );
}
