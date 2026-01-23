import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '@/hooks/useAuth';
import {
  useRevenueByDateRange,
  useRevenueBySacco,
  useRevenueByStage,
  useRevenueByPermitType,
  usePenaltyRevenueBreakdown,
  RevenueByDateRange,
  RevenueBySacco,
  RevenueByStage,
  RevenueByPermitType,
  PenaltyRevenueBreakdown,
} from '@/hooks/useRevenue';
import { Download, Calendar, DollarSign, Building2, MapPin, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function ReportsPage() {
  const { profile, roles } = useAuth();
  
  // Get county_id from profile or first role
  const countyId = useMemo(() => {
    return profile?.county_id || roles.find(r => r.county_id)?.county_id || undefined;
  }, [profile, roles]);

  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return format(date, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Fetch all revenue data
  const { data: revenueByDate = [], isLoading: loadingDate } = useRevenueByDateRange(countyId, startDate, endDate);
  const { data: revenueBySacco = [], isLoading: loadingSacco } = useRevenueBySacco(countyId, startDate, endDate);
  const { data: revenueByStage = [], isLoading: loadingStage } = useRevenueByStage(countyId, startDate, endDate);
  const { data: revenueByPermitType = [], isLoading: loadingPermitType } = useRevenueByPermitType(countyId, startDate, endDate);
  const { data: penaltyBreakdown = [], isLoading: loadingPenalty } = usePenaltyRevenueBreakdown(countyId, startDate, endDate);

  // Calculate totals
  const totalRevenue = useMemo(() => {
    return revenueByDate.reduce((sum, r) => sum + r.totalRevenue, 0);
  }, [revenueByDate]);

  const totalPermitRevenue = useMemo(() => {
    return revenueByDate.reduce((sum, r) => sum + r.permitRevenue, 0);
  }, [revenueByDate]);

  const totalPenaltyRevenue = useMemo(() => {
    return revenueByDate.reduce((sum, r) => sum + r.penaltyRevenue, 0);
  }, [revenueByDate]);

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Revenue by Date Range columns
  const dateRangeColumns: ColumnDef<RevenueByDateRange>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.date), 'MMM dd, yyyy'),
    },
    {
      accessorKey: 'permitRevenue',
      header: 'Permit Revenue',
      cell: ({ row }) => `KES ${row.original.permitRevenue.toLocaleString()}`,
    },
    {
      accessorKey: 'penaltyRevenue',
      header: 'Penalty Revenue',
      cell: ({ row }) => `KES ${row.original.penaltyRevenue.toLocaleString()}`,
    },
    {
      accessorKey: 'totalRevenue',
      header: 'Total Revenue',
      cell: ({ row }) => (
        <span className="font-semibold">KES {row.original.totalRevenue.toLocaleString()}</span>
      ),
    },
  ];

  // Revenue by Sacco columns
  const saccoColumns: ColumnDef<RevenueBySacco>[] = [
    {
      accessorKey: 'saccoName',
      header: 'Sacco',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.saccoName}</span>
        </div>
      ),
    },
    {
      accessorKey: 'riderCount',
      header: 'Riders',
      cell: ({ row }) => row.original.riderCount,
    },
    {
      accessorKey: 'permitRevenue',
      header: 'Permit Revenue',
      cell: ({ row }) => `KES ${row.original.permitRevenue.toLocaleString()}`,
    },
    {
      accessorKey: 'penaltyRevenue',
      header: 'Penalty Revenue',
      cell: ({ row }) => `KES ${row.original.penaltyRevenue.toLocaleString()}`,
    },
    {
      accessorKey: 'totalRevenue',
      header: 'Total Revenue',
      cell: ({ row }) => (
        <span className="font-semibold">KES {row.original.totalRevenue.toLocaleString()}</span>
      ),
    },
  ];

  // Revenue by Stage columns
  const stageColumns: ColumnDef<RevenueByStage>[] = [
    {
      accessorKey: 'stageName',
      header: 'Stage',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.stageName}</span>
        </div>
      ),
    },
    {
      accessorKey: 'saccoName',
      header: 'Sacco',
      cell: ({ row }) => row.original.saccoName || '-',
    },
    {
      accessorKey: 'riderCount',
      header: 'Riders',
      cell: ({ row }) => row.original.riderCount,
    },
    {
      accessorKey: 'permitRevenue',
      header: 'Permit Revenue',
      cell: ({ row }) => `KES ${row.original.permitRevenue.toLocaleString()}`,
    },
    {
      accessorKey: 'penaltyRevenue',
      header: 'Penalty Revenue',
      cell: ({ row }) => `KES ${row.original.penaltyRevenue.toLocaleString()}`,
    },
    {
      accessorKey: 'totalRevenue',
      header: 'Total Revenue',
      cell: ({ row }) => (
        <span className="font-semibold">KES {row.original.totalRevenue.toLocaleString()}</span>
      ),
    },
  ];

  // Revenue by Permit Type columns
  const permitTypeColumns: ColumnDef<RevenueByPermitType>[] = [
    {
      accessorKey: 'permitTypeName',
      header: 'Permit Type',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.permitTypeName}</span>
        </div>
      ),
    },
    {
      accessorKey: 'count',
      header: 'Count',
      cell: ({ row }) => row.original.count,
    },
    {
      accessorKey: 'averageAmount',
      header: 'Average Amount',
      cell: ({ row }) => `KES ${row.original.averageAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    },
    {
      accessorKey: 'totalRevenue',
      header: 'Total Revenue',
      cell: ({ row }) => (
        <span className="font-semibold">KES {row.original.totalRevenue.toLocaleString()}</span>
      ),
    },
  ];

  // Penalty Breakdown columns
  const penaltyColumns: ColumnDef<PenaltyRevenueBreakdown>[] = [
    {
      accessorKey: 'penaltyType',
      header: 'Penalty Type',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.penaltyType}</span>
        </div>
      ),
    },
    {
      accessorKey: 'count',
      header: 'Total Count',
      cell: ({ row }) => row.original.count,
    },
    {
      accessorKey: 'paidCount',
      header: 'Paid',
      cell: ({ row }) => (
        <Badge variant="default" className="bg-green-600">
          {row.original.paidCount}
        </Badge>
      ),
    },
    {
      accessorKey: 'unpaidCount',
      header: 'Unpaid',
      cell: ({ row }) => (
        <Badge variant="destructive">
          {row.original.unpaidCount}
        </Badge>
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total Amount',
      cell: ({ row }) => `KES ${row.original.totalAmount.toLocaleString()}`,
    },
    {
      accessorKey: 'paidAmount',
      header: 'Paid Amount',
      cell: ({ row }) => (
        <span className="text-green-600 font-medium">KES {row.original.paidAmount.toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'unpaidAmount',
      header: 'Unpaid Amount',
      cell: ({ row }) => (
        <span className="text-red-600 font-medium">KES {row.original.unpaidAmount.toLocaleString()}</span>
      ),
    },
  ];

  const isLoading = loadingDate || loadingSacco || loadingStage || loadingPermitType || loadingPenalty;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Revenue & Finance Reports</h1>
            <p className="text-muted-foreground">Comprehensive revenue analysis and financial summaries</p>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Date Range Filter</CardTitle>
            <CardDescription>Select the date range for revenue analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="space-y-2 flex-1">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Apply Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(startDate), 'MMM dd')} - {format(new Date(endDate), 'MMM dd, yyyy')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Permit Revenue</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {totalPermitRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalPermitRevenue > 0 ? ((totalPermitRevenue / totalRevenue) * 100).toFixed(1) : 0}% of total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Penalty Revenue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {totalPenaltyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalPenaltyRevenue > 0 ? ((totalPenaltyRevenue / totalRevenue) * 100).toFixed(1) : 0}% of total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Views Tabs */}
        <Tabs defaultValue="date-range" className="space-y-6">
          <TabsList>
            <TabsTrigger value="date-range">
              <Calendar className="mr-2 h-4 w-4" />
              By Date Range
            </TabsTrigger>
            <TabsTrigger value="sacco">
              <Building2 className="mr-2 h-4 w-4" />
              By Sacco
            </TabsTrigger>
            <TabsTrigger value="stage">
              <MapPin className="mr-2 h-4 w-4" />
              By Stage
            </TabsTrigger>
            <TabsTrigger value="permit-type">
              <FileText className="mr-2 h-4 w-4" />
              By Permit Type
            </TabsTrigger>
            <TabsTrigger value="penalty">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Penalty Breakdown
            </TabsTrigger>
          </TabsList>

          {/* Revenue by Date Range */}
          <TabsContent value="date-range">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Revenue by Date Range</CardTitle>
                    <CardDescription>Daily revenue breakdown for the selected period</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(revenueByDate, 'revenue_by_date_range')}
                    disabled={revenueByDate.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={dateRangeColumns}
                  data={revenueByDate}
                  isLoading={loadingDate}
                  searchPlaceholder="Search dates..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue by Sacco */}
          <TabsContent value="sacco">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Revenue by Sacco</CardTitle>
                    <CardDescription>Revenue breakdown by Sacco organization</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(revenueBySacco, 'revenue_by_sacco')}
                    disabled={revenueBySacco.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={saccoColumns}
                  data={revenueBySacco}
                  isLoading={loadingSacco}
                  searchPlaceholder="Search saccos..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue by Stage */}
          <TabsContent value="stage">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Revenue by Stage</CardTitle>
                    <CardDescription>Revenue breakdown by stage location</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(revenueByStage, 'revenue_by_stage')}
                    disabled={revenueByStage.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={stageColumns}
                  data={revenueByStage}
                  isLoading={loadingStage}
                  searchPlaceholder="Search stages..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue by Permit Type */}
          <TabsContent value="permit-type">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Revenue by Permit Type</CardTitle>
                    <CardDescription>Revenue breakdown by permit type</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(revenueByPermitType, 'revenue_by_permit_type')}
                    disabled={revenueByPermitType.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={permitTypeColumns}
                  data={revenueByPermitType}
                  isLoading={loadingPermitType}
                  searchPlaceholder="Search permit types..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Penalty Revenue Breakdown */}
          <TabsContent value="penalty">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Penalty Revenue Breakdown</CardTitle>
                    <CardDescription>Detailed breakdown of penalty revenue by type</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(penaltyBreakdown, 'penalty_revenue_breakdown')}
                    disabled={penaltyBreakdown.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={penaltyColumns}
                  data={penaltyBreakdown}
                  isLoading={loadingPenalty}
                  searchPlaceholder="Search penalty types..."
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Export All Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Export All Summaries</CardTitle>
            <CardDescription>Download comprehensive revenue reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => exportToCSV(revenueByDate, 'revenue_by_date_range')}
                disabled={revenueByDate.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Date Range
              </Button>
              <Button
                variant="outline"
                onClick={() => exportToCSV(revenueBySacco, 'revenue_by_sacco')}
                disabled={revenueBySacco.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export by Sacco
              </Button>
              <Button
                variant="outline"
                onClick={() => exportToCSV(revenueByStage, 'revenue_by_stage')}
                disabled={revenueByStage.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export by Stage
              </Button>
              <Button
                variant="outline"
                onClick={() => exportToCSV(revenueByPermitType, 'revenue_by_permit_type')}
                disabled={revenueByPermitType.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export by Permit Type
              </Button>
              <Button
                variant="outline"
                onClick={() => exportToCSV(penaltyBreakdown, 'penalty_revenue_breakdown')}
                disabled={penaltyBreakdown.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Penalty Breakdown
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
