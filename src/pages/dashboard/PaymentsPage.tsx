import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus, Download, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { PaymentDialog } from '@/components/payments/PaymentDialog';
import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DEMO_COUNTY_ID = '550e8400-e29b-41d4-a716-446655440001';

type PaymentRow = {
  id: string;
  amount: number;
  status: string;
  payment_reference: string | null;
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
  riders: { full_name: string; phone: string } | null;
  permits: { permit_number: string } | null;
};

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
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    completed: 'default',
    pending: 'secondary',
    failed: 'destructive',
    refunded: 'outline',
    cancelled: 'outline',
  };
  return (
    <Badge variant={variants[status] || 'secondary'} className="flex items-center gap-1 w-fit">
      {getStatusIcon(status)}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const columns: ColumnDef<PaymentRow>[] = [
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
    header: 'Status',
    cell: ({ row }) => getStatusBadge(row.original.status),
  },
  {
    accessorKey: 'permits.permit_number',
    header: 'Permit',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.permits?.permit_number || '-'}</span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, yyyy HH:mm'),
  },
];

export default function PaymentsPage() {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const { data: payments = [], isLoading } = usePayments(DEMO_COUNTY_ID);

  const completedPayments = payments.filter(p => p.status === 'completed');
  const totalRevenue = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const failedPayments = payments.filter(p => p.status === 'failed').length;

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
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setIsPaymentOpen(true)} className="glow-primary">
              <Plus className="mr-2 h-4 w-4" />
              New Payment
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {new Intl.NumberFormat('en-KE', {
                  style: 'currency',
                  currency: 'KES',
                }).format(totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">{completedPayments.length} completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingPayments}</div>
              <p className="text-xs text-muted-foreground">awaiting confirmation</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{failedPayments}</div>
              <p className="text-xs text-muted-foreground">require attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payments.filter(p => 
                  new Date(p.created_at).toDateString() === new Date().toDateString()
                ).length}
              </div>
              <p className="text-xs text-muted-foreground">transactions today</p>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={payments as PaymentRow[]}
          searchPlaceholder="Search by reference, rider..."
          isLoading={isLoading}
        />

        {/* Payment Dialog */}
        <PaymentDialog
          open={isPaymentOpen}
          onOpenChange={setIsPaymentOpen}
          countyId={DEMO_COUNTY_ID}
        />
      </div>
    </DashboardLayout>
  );
}
