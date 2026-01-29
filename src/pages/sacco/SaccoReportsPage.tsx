import { useMemo, useState, useEffect } from 'react';
import { SaccoPortalLayout } from '@/components/layout/SaccoPortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '@/hooks/useAuth';
import { useSaccos } from '@/hooks/useData';
import {
  useSaccoMemberListReport,
  useSaccoComplianceReport,
  useSaccoPenaltyReport,
  useSaccoStagePerformanceReport,
  SaccoMemberListReport,
  SaccoComplianceReport,
  SaccoPenaltyReport,
  SaccoStagePerformanceReport,
} from '@/hooks/useReports';
import { Download, Calendar, FileText, Users, Shield, AlertTriangle, MapPin, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SaccoReportsPage() {
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

  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return format(date, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Fetch reports
  const { data: memberListReport = [], isLoading: loadingMemberList } = useSaccoMemberListReport(saccoId, countyId);
  const { data: complianceReport, isLoading: loadingCompliance } = useSaccoComplianceReport(saccoId, countyId);
  const { data: penaltyReport = [], isLoading: loadingPenalty } = useSaccoPenaltyReport(saccoId, countyId, startDate, endDate);
  const { data: stagePerformanceReport = [], isLoading: loadingStagePerformance } = useSaccoStagePerformanceReport(saccoId, countyId);

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    try {
      if (!data || data.length === 0) {
        alert('No data to export. The report is empty.');
        return;
      }

      const headers = Object.keys(data[0]);
      if (headers.length === 0) {
        alert('No data columns found to export.');
        return;
      }

      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          const stringValue = String(value);
          return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') 
            ? `"${stringValue.replace(/"/g, '""')}"` 
            : stringValue;
        }).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 200);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const exportToExcel = (data: any[], filename: string) => {
    try {
      if (!data || data.length === 0) {
        alert('No data to export. The report is empty.');
        return;
      }

      const headers = Object.keys(data[0]);
      if (headers.length === 0) {
        alert('No data columns found to export.');
        return;
      }

      let html = '<table><tr>';
      headers.forEach(header => {
        html += `<th>${header}</th>`;
      });
      html += '</tr>';

      data.forEach(row => {
        html += '<tr>';
        headers.forEach(header => {
          const value = row[header];
          html += `<td>${value !== null && value !== undefined ? String(value) : ''}</td>`;
        });
        html += '</tr>';
      });
      html += '</table>';

      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xls`);
      link.style.visibility = 'hidden';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 200);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const exportToPDF = (data: any[], filename: string, title: string) => {
    try {
      if (!data || data.length === 0) {
        alert('No data to export. The report is empty.');
        return;
      }

      const headers = Object.keys(data[0]);
      if (headers.length === 0) {
        alert('No data columns found to export.');
        return;
      }

      let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated on: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
        <table>
          <thead><tr>`;

      headers.forEach(header => {
        html += `<th>${header}</th>`;
      });

      html += '</tr></thead><tbody>';

      data.forEach(row => {
        html += '<tr>';
        headers.forEach(header => {
          const value = row[header];
          html += `<td>${value !== null && value !== undefined ? String(value) : ''}</td>`;
        });
        html += '</tr>';
      });

      html += '</tbody></table></body></html>';

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      } else {
        alert('Please allow popups to export PDF. Check your browser popup blocker settings.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper function to create export buttons
  const ExportButtons = ({ data, filename, title, disabled = false }: { data: any[], filename: string, title?: string, disabled?: boolean }) => {
    return (
      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => exportToCSV(data || [], filename)}
          disabled={disabled}
          className="flex-1 sm:flex-initial min-h-[44px] touch-manipulation"
        >
          <FileDown className="mr-2 h-4 w-4" />
          CSV
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => exportToExcel(data || [], filename)}
          disabled={disabled}
          className="flex-1 sm:flex-initial min-h-[44px] touch-manipulation"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => exportToPDF(data || [], filename, title || filename)}
          disabled={disabled}
          className="flex-1 sm:flex-initial min-h-[44px] touch-manipulation"
        >
          <FileText className="mr-2 h-4 w-4" />
          PDF
        </Button>
      </div>
    );
  };

  // Member List Report columns
  const memberListColumns: ColumnDef<SaccoMemberListReport>[] = [
    {
      accessorKey: 'fullName',
      header: 'Full Name',
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
    },
    {
      accessorKey: 'idNumber',
      header: 'ID Number',
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.email || '-',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'approved' ? 'default' : 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'complianceStatus',
      header: 'Compliance',
      cell: ({ row }) => {
        const status = row.original.complianceStatus;
        const variant = status === 'compliant' ? 'default' : status === 'non_compliant' ? 'destructive' : 'secondary';
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      accessorKey: 'stageName',
      header: 'Stage',
      cell: ({ row }) => row.original.stageName || '-',
    },
    {
      accessorKey: 'permitNumber',
      header: 'Permit Number',
      cell: ({ row }) => row.original.permitNumber || '-',
    },
    {
      accessorKey: 'permitStatus',
      header: 'Permit Status',
      cell: ({ row }) => row.original.permitStatus ? (
        <Badge variant={row.original.permitStatus === 'active' ? 'default' : 'destructive'}>
          {row.original.permitStatus}
        </Badge>
      ) : '-',
    },
    {
      accessorKey: 'motorbikeRegistration',
      header: 'Motorbike Registration',
      cell: ({ row }) => row.original.motorbikeRegistration || '-',
    },
  ];

  // Penalty Report columns
  const penaltyReportColumns: ColumnDef<SaccoPenaltyReport>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.date), 'MMM dd, yyyy'),
    },
    {
      accessorKey: 'totalPenalties',
      header: 'Total Penalties',
    },
    {
      accessorKey: 'paid',
      header: 'Paid',
    },
    {
      accessorKey: 'unpaid',
      header: 'Unpaid',
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total Amount',
      cell: ({ row }) => `KES ${row.original.totalAmount.toLocaleString()}`,
    },
    {
      accessorKey: 'paidAmount',
      header: 'Paid Amount',
      cell: ({ row }) => `KES ${row.original.paidAmount.toLocaleString()}`,
    },
    {
      accessorKey: 'unpaidAmount',
      header: 'Unpaid Amount',
      cell: ({ row }) => `KES ${row.original.unpaidAmount.toLocaleString()}`,
    },
  ];

  // Stage Performance Report columns
  const stagePerformanceColumns: ColumnDef<SaccoStagePerformanceReport>[] = [
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
      accessorKey: 'totalMembers',
      header: 'Total Members',
    },
    {
      accessorKey: 'compliant',
      header: 'Compliant',
    },
    {
      accessorKey: 'nonCompliant',
      header: 'Non-Compliant',
    },
    {
      accessorKey: 'complianceRate',
      header: 'Compliance Rate',
      cell: ({ row }) => (
        <Badge variant={row.original.complianceRate >= 80 ? 'default' : row.original.complianceRate >= 50 ? 'secondary' : 'destructive'}>
          {row.original.complianceRate}%
        </Badge>
      ),
    },
    {
      accessorKey: 'activePermits',
      header: 'Active Permits',
    },
    {
      accessorKey: 'expiredPermits',
      header: 'Expired Permits',
    },
    {
      accessorKey: 'totalPenalties',
      header: 'Total Penalties',
    },
    {
      accessorKey: 'paidPenalties',
      header: 'Paid Penalties',
    },
    {
      accessorKey: 'unpaidPenalties',
      header: 'Unpaid Penalties',
    },
  ];

  const isLoading = loadingMemberList || loadingCompliance || loadingPenalty || loadingStagePerformance;

  return (
    <SaccoPortalLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Reports & Exports</h1>
            <p className="text-muted-foreground">Generate and export comprehensive reports for your sacco</p>
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
            Select a sacco to view reports.
          </div>
        ) : (
          <>
            {/* Date Range Filter */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Date Range Filter</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Select the date range for penalty reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
                  <div className="space-y-2 flex-1 w-full">
                    <Label className="text-sm">Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="min-h-[44px] text-base"
                    />
                  </div>
                  <div className="space-y-2 flex-1 w-full">
                    <Label className="text-sm">End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="min-h-[44px] text-base"
                    />
                  </div>
                  <Button variant="outline" className="w-full sm:w-auto min-h-[44px]">
                    <Calendar className="mr-2 h-4 w-4" />
                    Apply Filter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Reports Tabs */}
            <Tabs defaultValue="member-list" className="space-y-4 sm:space-y-6">
              <TabsList className="flex w-full flex-wrap gap-1 sm:gap-2 h-auto p-1">
                <TabsTrigger value="member-list" className="flex-1 min-w-[80px] sm:flex-initial min-h-[44px] text-xs sm:text-sm">
                  <Users className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Member List</span>
                  <span className="sm:hidden">Members</span>
                </TabsTrigger>
                <TabsTrigger value="compliance" className="flex-1 min-w-[80px] sm:flex-initial min-h-[44px] text-xs sm:text-sm">
                  <Shield className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Compliance</span>
                  <span className="sm:hidden">Comp</span>
                </TabsTrigger>
                <TabsTrigger value="penalty" className="flex-1 min-w-[80px] sm:flex-initial min-h-[44px] text-xs sm:text-sm">
                  <AlertTriangle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Penalty</span>
                  <span className="sm:hidden">Penalty</span>
                </TabsTrigger>
                <TabsTrigger value="stage-performance" className="flex-1 min-w-[80px] sm:flex-initial min-h-[44px] text-xs sm:text-sm">
                  <MapPin className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Stage Performance</span>
                  <span className="sm:hidden">Stages</span>
                </TabsTrigger>
              </TabsList>

              {/* Member List Report */}
              <TabsContent value="member-list" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3 sm:pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div>
                        <CardTitle className="text-base sm:text-lg">Member List Report</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Complete list of all sacco members with their details</CardDescription>
                      </div>
                      <ExportButtons 
                        data={memberListReport} 
                        filename="member_list_report"
                        title="Member List Report"
                        disabled={loadingMemberList || memberListReport.length === 0}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingMemberList ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : memberListReport.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No members found for this sacco.
                      </div>
                    ) : (
                      <DataTable columns={memberListColumns} data={memberListReport} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Compliance Report */}
              <TabsContent value="compliance" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3 sm:pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div>
                        <CardTitle className="text-base sm:text-lg">Compliance Report</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Overview of member compliance status</CardDescription>
                      </div>
                      {complianceReport && (
                        <ExportButtons 
                          data={[complianceReport]} 
                          filename="compliance_report"
                          title="Compliance Report"
                          disabled={loadingCompliance}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingCompliance ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : !complianceReport ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No compliance data available.
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{complianceReport.totalMembers}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Compliant</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-green-600">{complianceReport.compliant}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {complianceReport.totalMembers > 0 
                                ? `${Math.round((complianceReport.compliant / complianceReport.totalMembers) * 100)}% of total`
                                : '0%'}
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-red-600">{complianceReport.nonCompliant}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {complianceReport.totalMembers > 0 
                                ? `${Math.round((complianceReport.nonCompliant / complianceReport.totalMembers) * 100)}% of total`
                                : '0%'}
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{complianceReport.pendingReview}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Blacklisted</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-red-800">{complianceReport.blacklisted}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{complianceReport.complianceRate}%</div>
                            <Badge 
                              variant={complianceReport.complianceRate >= 80 ? 'default' : complianceReport.complianceRate >= 50 ? 'secondary' : 'destructive'}
                              className="mt-2"
                            >
                              {complianceReport.complianceRate >= 80 ? 'Excellent' : complianceReport.complianceRate >= 50 ? 'Good' : 'Needs Improvement'}
                            </Badge>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Penalty Report */}
              <TabsContent value="penalty" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3 sm:pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div>
                        <CardTitle className="text-base sm:text-lg">Penalty Report</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Penalty statistics by date range</CardDescription>
                      </div>
                      <ExportButtons 
                        data={penaltyReport} 
                        filename="penalty_report"
                        title="Penalty Report"
                        disabled={loadingPenalty || penaltyReport.length === 0}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingPenalty ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : penaltyReport.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No penalty data found for the selected date range.
                      </div>
                    ) : (
                      <DataTable columns={penaltyReportColumns} data={penaltyReport} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Stage Performance Report */}
              <TabsContent value="stage-performance" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3 sm:pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div>
                        <CardTitle className="text-base sm:text-lg">Stage Performance Report</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Performance metrics for each stage</CardDescription>
                      </div>
                      <ExportButtons 
                        data={stagePerformanceReport} 
                        filename="stage_performance_report"
                        title="Stage Performance Report"
                        disabled={loadingStagePerformance || stagePerformanceReport.length === 0}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingStagePerformance ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : stagePerformanceReport.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No stage performance data available.
                      </div>
                    ) : (
                      <DataTable columns={stagePerformanceColumns} data={stagePerformanceReport} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </SaccoPortalLayout>
  );
}
