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
  useRevenueShares,
  useRevenueSharesBySacco,
  RevenueByDateRange,
  RevenueBySacco,
  RevenueByStage,
  RevenueByPermitType,
  PenaltyRevenueBreakdown,
  RevenueShare,
  RevenueShareBySacco,
} from '@/hooks/useRevenue';
import { Download, Calendar, DollarSign, Building2, MapPin, FileText, AlertTriangle, Loader2, Users, CheckCircle, FileSpreadsheet, FileDown, Activity, Shield, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  useRegistrationReport,
  usePaymentReport,
  usePenaltyReport,
  useComplianceReport,
  useSaccoPerformanceReport,
  RegistrationReport,
  PaymentReport,
  PenaltyReport,
  ComplianceReport,
  SaccoPerformanceReport,
} from '@/hooks/useReports';
import { useUserActivityLogs, UserActivityLog } from '@/hooks/useUserManagement';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const { data: revenueShares = [], isLoading: loadingRevenueShares } = useRevenueShares(countyId, undefined, startDate, endDate);
  const { data: revenueSharesBySacco = [], isLoading: loadingRevenueSharesBySacco } = useRevenueSharesBySacco(countyId, startDate, endDate);

  // Fetch additional reports
  const { data: registrationReport = [], isLoading: loadingRegistration } = useRegistrationReport(countyId, startDate, endDate);
  const { data: paymentReport = [], isLoading: loadingPayment } = usePaymentReport(countyId, startDate, endDate);
  const { data: penaltyReport = [], isLoading: loadingPenaltyReport } = usePenaltyReport(countyId, startDate, endDate);
  const { data: complianceReport = [], isLoading: loadingCompliance } = useComplianceReport(countyId);
  const { data: saccoPerformanceReport = [], isLoading: loadingSaccoPerformance } = useSaccoPerformanceReport(countyId, startDate, endDate);

  // Audit logs
  const [auditLogFilter, setAuditLogFilter] = useState<string>('all');
  const { data: allAuditLogs = [] } = useUserActivityLogs(countyId);
  
  const filteredAuditLogs = useMemo(() => {
    return allAuditLogs.filter((log) => {
      if (auditLogFilter === 'all') return true;
      if (auditLogFilter === 'user_actions' && (log.entity_type === 'user' || log.entity_type === 'profile' || log.entity_type === 'user_role')) return true;
      if (auditLogFilter === 'enforcement_actions' && (log.entity_type === 'penalty' || log.entity_type === 'rider' || log.action.includes('penalty'))) return true;
      if (auditLogFilter === 'payment_changes' && (log.entity_type === 'payment' || log.action.includes('payment'))) return true;
      return false;
    });
  }, [allAuditLogs, auditLogFilter]);

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
    console.log('exportToCSV called', { dataLength: data?.length, filename, data });
    try {
      if (!data || data.length === 0) {
        alert('No data to export. The report is empty.');
        return;
      }

      // Get headers from first row
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

      console.log('CSV content generated', { length: csvContent.length, headers });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      link.style.display = 'none';
      document.body.appendChild(link);
      
      console.log('Triggering download', { url, filename });
      link.click();
      
      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
        console.log('Download completed');
      }, 200);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const exportToExcel = (data: any[], filename: string) => {
    console.log('exportToExcel called', { dataLength: data?.length, filename });
    try {
      if (!data || data.length === 0) {
        alert('No data to export. The report is empty.');
        return;
      }

      // Create HTML table for Excel
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

      console.log('Excel HTML generated', { htmlLength: html.length });

      // Create blob with Excel MIME type
      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xls`);
      link.style.visibility = 'hidden';
      link.style.display = 'none';
      document.body.appendChild(link);
      
      console.log('Triggering Excel download', { url, filename });
      link.click();
      
      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
        console.log('Excel download completed');
      }, 200);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const exportToPDF = (data: any[], filename: string, title: string) => {
    console.log('exportToPDF called', { dataLength: data?.length, filename, title });
    try {
      if (!data || data.length === 0) {
        alert('No data to export. The report is empty.');
        return;
      }

      // Create HTML content for PDF
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

      console.log('PDF HTML generated', { htmlLength: html.length });

      // Open print dialog for PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
          console.log('PDF print dialog opened');
        }, 250);
      } else {
        alert('Please allow popups to export PDF. Check your browser popup blocker settings.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  // Registration Report columns
  const registrationColumns: ColumnDef<RegistrationReport>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.date), 'MMM dd, yyyy'),
    },
    {
      accessorKey: 'totalRegistrations',
      header: 'Total',
      cell: ({ row }) => row.original.totalRegistrations,
    },
    {
      accessorKey: 'approved',
      header: 'Approved',
      cell: ({ row }) => <Badge variant="default" className="bg-green-600">{row.original.approved}</Badge>,
    },
    {
      accessorKey: 'pending',
      header: 'Pending',
      cell: ({ row }) => <Badge variant="secondary">{row.original.pending}</Badge>,
    },
    {
      accessorKey: 'rejected',
      header: 'Rejected',
      cell: ({ row }) => <Badge variant="destructive">{row.original.rejected}</Badge>,
    },
    {
      accessorKey: 'suspended',
      header: 'Suspended',
      cell: ({ row }) => <Badge variant="outline">{row.original.suspended}</Badge>,
    },
  ];

  // Payment Report columns
  const paymentReportColumns: ColumnDef<PaymentReport>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.date), 'MMM dd, yyyy'),
    },
    {
      accessorKey: 'totalPayments',
      header: 'Total Payments',
      cell: ({ row }) => row.original.totalPayments,
    },
    {
      accessorKey: 'completed',
      header: 'Completed',
      cell: ({ row }) => <Badge variant="default" className="bg-green-600">{row.original.completed}</Badge>,
    },
    {
      accessorKey: 'failed',
      header: 'Failed',
      cell: ({ row }) => <Badge variant="destructive">{row.original.failed}</Badge>,
    },
    {
      accessorKey: 'pending',
      header: 'Pending',
      cell: ({ row }) => <Badge variant="secondary">{row.original.pending}</Badge>,
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total Amount',
      cell: ({ row }) => <span className="font-semibold">KES {row.original.totalAmount.toLocaleString()}</span>,
    },
  ];

  // Penalty Report columns
  const penaltyReportColumns: ColumnDef<PenaltyReport>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.date), 'MMM dd, yyyy'),
    },
    {
      accessorKey: 'totalPenalties',
      header: 'Total',
      cell: ({ row }) => row.original.totalPenalties,
    },
    {
      accessorKey: 'paid',
      header: 'Paid',
      cell: ({ row }) => <Badge variant="default" className="bg-green-600">{row.original.paid}</Badge>,
    },
    {
      accessorKey: 'unpaid',
      header: 'Unpaid',
      cell: ({ row }) => <Badge variant="destructive">{row.original.unpaid}</Badge>,
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total Amount',
      cell: ({ row }) => `KES ${row.original.totalAmount.toLocaleString()}`,
    },
    {
      accessorKey: 'paidAmount',
      header: 'Paid Amount',
      cell: ({ row }) => <span className="text-green-600 font-medium">KES {row.original.paidAmount.toLocaleString()}</span>,
    },
    {
      accessorKey: 'unpaidAmount',
      header: 'Unpaid Amount',
      cell: ({ row }) => <span className="text-red-600 font-medium">KES {row.original.unpaidAmount.toLocaleString()}</span>,
    },
  ];

  // Compliance Report columns
  const complianceColumns: ColumnDef<ComplianceReport>[] = [
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
      accessorKey: 'totalRiders',
      header: 'Total Riders',
      cell: ({ row }) => row.original.totalRiders,
    },
    {
      accessorKey: 'compliant',
      header: 'Compliant',
      cell: ({ row }) => <Badge variant="default" className="bg-green-600">{row.original.compliant}</Badge>,
    },
    {
      accessorKey: 'nonCompliant',
      header: 'Non-Compliant',
      cell: ({ row }) => <Badge variant="destructive">{row.original.nonCompliant}</Badge>,
    },
    {
      accessorKey: 'pendingReview',
      header: 'Pending Review',
      cell: ({ row }) => <Badge variant="secondary">{row.original.pendingReview}</Badge>,
    },
    {
      accessorKey: 'blacklisted',
      header: 'Blacklisted',
      cell: ({ row }) => <Badge variant="outline">{row.original.blacklisted}</Badge>,
    },
    {
      accessorKey: 'complianceRate',
      header: 'Compliance Rate',
      cell: ({ row }) => {
        const rate = row.original.complianceRate;
        return (
          <span className={`font-semibold ${rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
            {rate}%
          </span>
        );
      },
    },
  ];

  // Sacco Performance Report columns
  const saccoPerformanceColumns: ColumnDef<SaccoPerformanceReport>[] = [
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
      accessorKey: 'totalRiders',
      header: 'Total Riders',
      cell: ({ row }) => row.original.totalRiders,
    },
    {
      accessorKey: 'activePermits',
      header: 'Active Permits',
      cell: ({ row }) => <Badge variant="default" className="bg-green-600">{row.original.activePermits}</Badge>,
    },
    {
      accessorKey: 'expiredPermits',
      header: 'Expired Permits',
      cell: ({ row }) => <Badge variant="destructive">{row.original.expiredPermits}</Badge>,
    },
    {
      accessorKey: 'totalPenalties',
      header: 'Total Penalties',
      cell: ({ row }) => row.original.totalPenalties,
    },
    {
      accessorKey: 'paidPenalties',
      header: 'Paid',
      cell: ({ row }) => <span className="text-green-600">{row.original.paidPenalties}</span>,
    },
    {
      accessorKey: 'unpaidPenalties',
      header: 'Unpaid',
      cell: ({ row }) => <span className="text-red-600">{row.original.unpaidPenalties}</span>,
    },
    {
      accessorKey: 'complianceRate',
      header: 'Compliance Rate',
      cell: ({ row }) => {
        const rate = row.original.complianceRate;
        return (
          <span className={`font-semibold ${rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
            {rate}%
          </span>
        );
      },
    },
    {
      accessorKey: 'revenue',
      header: 'Revenue',
      cell: ({ row }) => <span className="font-semibold">KES {row.original.revenue.toLocaleString()}</span>,
    },
  ];

  // Revenue Share columns
  const revenueShareColumns: ColumnDef<RevenueShare>[] = [
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM dd, yyyy'),
    },
    {
      accessorKey: 'sacco_name',
      header: 'Sacco',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.sacco_name || 'Unknown'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'share_type',
      header: 'Share Type',
      cell: ({ row }) => {
        const type = row.original.share_type;
        const labels: Record<string, string> = {
          percentage: 'Percentage',
          fixed_per_rider: 'Fixed per Rider',
          none: 'None',
        };
        return <Badge variant="outline">{labels[type] || type}</Badge>;
      },
    },
    {
      accessorKey: 'base_amount',
      header: 'Base Amount',
      cell: ({ row }) => `KES ${Number(row.original.base_amount).toLocaleString()}`,
    },
    {
      accessorKey: 'share_amount',
      header: 'Share Amount',
      cell: ({ row }) => (
        <span className="font-semibold text-green-600">
          KES {Number(row.original.share_amount).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'percentage',
      header: 'Percentage',
      cell: ({ row }) => {
        const pct = row.original.percentage;
        return pct ? `${pct}%` : '-';
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
          pending: 'secondary',
          distributed: 'default',
          cancelled: 'destructive',
        };
        return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
      },
    },
  ];

  // Revenue Share by Sacco columns
  const revenueShareBySaccoColumns: ColumnDef<RevenueShareBySacco>[] = [
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
      accessorKey: 'shareType',
      header: 'Share Type',
      cell: ({ row }) => {
        const type = row.original.shareType;
        const labels: Record<string, string> = {
          percentage: 'Percentage',
          fixed_per_rider: 'Fixed per Rider',
          none: 'None',
        };
        return <Badge variant="outline">{labels[type] || type}</Badge>;
      },
    },
    {
      accessorKey: 'totalShares',
      header: 'Total Shares',
      cell: ({ row }) => row.original.totalShares,
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total Amount',
      cell: ({ row }) => (
        <span className="font-semibold">KES {row.original.totalAmount.toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'pendingAmount',
      header: 'Pending',
      cell: ({ row }) => (
        <span className="text-amber-600">KES {row.original.pendingAmount.toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'distributedAmount',
      header: 'Distributed',
      cell: ({ row }) => (
        <span className="text-green-600">KES {row.original.distributedAmount.toLocaleString()}</span>
      ),
    },
  ];

  // Audit Log columns
  const auditLogColumns: ColumnDef<UserActivityLog>[] = [
    {
      accessorKey: 'created_at',
      header: 'Date & Time',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM dd, yyyy HH:mm'),
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.user?.full_name || row.original.user?.email || 'System'}</p>
          {row.original.user?.email && <p className="text-xs text-muted-foreground">{row.original.user.email}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => <Badge variant="outline">{row.original.action}</Badge>,
    },
    {
      accessorKey: 'entity_type',
      header: 'Entity Type',
      cell: ({ row }) => <span className="text-sm">{row.original.entity_type}</span>,
    },
    {
      accessorKey: 'entity_id',
      header: 'Entity ID',
      cell: ({ row }) => row.original.entity_id ? <span className="text-xs font-mono">{row.original.entity_id.slice(0, 8)}...</span> : '-',
    },
  ];

  // Helper function to create export buttons
  const ExportButtons = ({ data, filename, title, disabled = false }: { data: any[], filename: string, title?: string, disabled?: boolean }) => {
    return (
      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            console.log('CSV button clicked', { dataLength: data?.length, filename });
            exportToCSV(data || [], filename);
          }}
          disabled={disabled}
          className="flex-1 sm:flex-initial min-h-[44px]"
        >
          <FileDown className="mr-2 h-4 w-4" />
          CSV
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            console.log('Excel button clicked', { dataLength: data?.length, filename });
            exportToExcel(data || [], filename);
          }}
          disabled={disabled}
          className="flex-1 sm:flex-initial min-h-[44px]"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            console.log('PDF button clicked', { dataLength: data?.length, filename, title });
            exportToPDF(data || [], filename, title || filename);
          }}
          disabled={disabled}
          className="flex-1 sm:flex-initial min-h-[44px]"
        >
          <FileText className="mr-2 h-4 w-4" />
          PDF
        </Button>
      </div>
    );
  };

  const isLoading = loadingDate || loadingSacco || loadingStage || loadingPermitType || loadingPenalty || 
    loadingRegistration || loadingPayment || loadingPenaltyReport || loadingCompliance || loadingSaccoPerformance;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reports, Exports & Audit Logs</h1>
            <p className="text-muted-foreground">Comprehensive reports, exports, and activity tracking</p>
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

        {/* Reports Tabs */}
        <Tabs defaultValue="revenue" className="space-y-6">
          <TabsList className="flex w-full flex-wrap gap-1 sm:gap-2">
            <TabsTrigger value="revenue" className="flex-1 min-w-[120px] sm:flex-initial">
              <DollarSign className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Revenue</span>
              <span className="sm:hidden">Rev</span>
            </TabsTrigger>
            <TabsTrigger value="registrations" className="flex-1 min-w-[120px] sm:flex-initial">
              <Users className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Registrations</span>
              <span className="sm:hidden">Reg</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-1 min-w-[120px] sm:flex-initial">
              <FileText className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Payments</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
            <TabsTrigger value="penalties" className="flex-1 min-w-[120px] sm:flex-initial">
              <AlertTriangle className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Penalties</span>
              <span className="sm:hidden">Pen</span>
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex-1 min-w-[120px] sm:flex-initial">
              <CheckCircle className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Compliance</span>
              <span className="sm:hidden">Comp</span>
            </TabsTrigger>
            <TabsTrigger value="sacco-performance" className="flex-1 min-w-[120px] sm:flex-initial">
              <Building2 className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Sacco Performance</span>
              <span className="sm:hidden">Sacco</span>
            </TabsTrigger>
            <TabsTrigger value="revenue-shares" className="flex-1 min-w-[120px] sm:flex-initial">
              <Share2 className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Revenue Shares</span>
              <span className="sm:hidden">Shares</span>
            </TabsTrigger>
            <TabsTrigger value="audit-logs" className="flex-1 min-w-[120px] sm:flex-initial">
              <Activity className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Audit Logs</span>
              <span className="sm:hidden">Audit</span>
            </TabsTrigger>
          </TabsList>

          {/* Revenue Reports Tab */}
          <TabsContent value="revenue" className="space-y-6">
            <Tabs defaultValue="date-range" className="space-y-4">
              <TabsList>
                <TabsTrigger value="date-range">By Date</TabsTrigger>
                <TabsTrigger value="sacco">By Sacco</TabsTrigger>
                <TabsTrigger value="stage">By Stage</TabsTrigger>
                <TabsTrigger value="permit-type">By Permit Type</TabsTrigger>
              </TabsList>

              {/* Revenue by Date Range */}
              <TabsContent value="date-range">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle>Revenue by Date Range</CardTitle>
                        <CardDescription>Daily revenue breakdown for the selected period</CardDescription>
                      </div>
                      <ExportButtons 
                        data={revenueByDate} 
                        filename="revenue_by_date_range" 
                        title="Revenue by Date Range" 
                      />
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle>Revenue by Sacco</CardTitle>
                        <CardDescription>Revenue breakdown by Sacco organization</CardDescription>
                      </div>
                      <ExportButtons 
                        data={revenueBySacco} 
                        filename="revenue_by_sacco" 
                        title="Revenue by Sacco" 
                      />
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle>Revenue by Stage</CardTitle>
                        <CardDescription>Revenue breakdown by stage location</CardDescription>
                      </div>
                      <ExportButtons 
                        data={revenueByStage} 
                        filename="revenue_by_stage" 
                        title="Revenue by Stage" 
                      />
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle>Revenue by Permit Type</CardTitle>
                        <CardDescription>Revenue breakdown by permit type</CardDescription>
                      </div>
                      <ExportButtons 
                        data={revenueByPermitType} 
                        filename="revenue_by_permit_type" 
                        title="Revenue by Permit Type" 
                      />
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
            </Tabs>
          </TabsContent>

          {/* Registrations Report Tab */}
          <TabsContent value="registrations">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Registration Report</CardTitle>
                    <CardDescription>Daily registration breakdown by status</CardDescription>
                  </div>
                  <ExportButtons 
                    data={registrationReport} 
                    filename="registration_report" 
                    title="Registration Report" 
                  />
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={registrationColumns}
                  data={registrationReport}
                  isLoading={loadingRegistration}
                  searchPlaceholder="Search dates..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Report Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Payment Report</CardTitle>
                    <CardDescription>Daily payment breakdown by status</CardDescription>
                  </div>
                  <ExportButtons 
                    data={paymentReport} 
                    filename="payment_report" 
                    title="Payment Report" 
                  />
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={paymentReportColumns}
                  data={paymentReport}
                  isLoading={loadingPayment}
                  searchPlaceholder="Search dates..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Penalties Report Tab */}
          <TabsContent value="penalties">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Penalty Report</CardTitle>
                    <CardDescription>Daily penalty breakdown by payment status</CardDescription>
                  </div>
                  <ExportButtons 
                    data={penaltyReport} 
                    filename="penalty_report" 
                    title="Penalty Report" 
                  />
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={penaltyReportColumns}
                  data={penaltyReport}
                  isLoading={loadingPenaltyReport}
                  searchPlaceholder="Search dates..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Report Tab */}
          <TabsContent value="compliance">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Compliance Report</CardTitle>
                    <CardDescription>Compliance breakdown by Sacco</CardDescription>
                  </div>
                  <ExportButtons 
                    data={complianceReport} 
                    filename="compliance_report" 
                    title="Compliance Report" 
                  />
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={complianceColumns}
                  data={complianceReport}
                  isLoading={loadingCompliance}
                  searchPlaceholder="Search saccos..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sacco Performance Report Tab */}
          <TabsContent value="sacco-performance">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Sacco Performance Report</CardTitle>
                    <CardDescription>Comprehensive performance metrics by Sacco</CardDescription>
                  </div>
                  <ExportButtons 
                    data={saccoPerformanceReport} 
                    filename="sacco_performance_report" 
                    title="Sacco Performance Report" 
                  />
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={saccoPerformanceColumns}
                  data={saccoPerformanceReport}
                  isLoading={loadingSaccoPerformance}
                  searchPlaceholder="Search saccos..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Shares Tab */}
          <TabsContent value="revenue-shares" className="space-y-6">
            <Tabs defaultValue="by-sacco" className="space-y-4">
              <TabsList>
                <TabsTrigger value="by-sacco">By Sacco</TabsTrigger>
                <TabsTrigger value="detailed">Detailed View</TabsTrigger>
              </TabsList>

              {/* Revenue Shares by Sacco */}
              <TabsContent value="by-sacco">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle>Revenue Shares by Sacco</CardTitle>
                        <CardDescription>Aggregated revenue share breakdown by Sacco organization</CardDescription>
                      </div>
                      <ExportButtons 
                        data={revenueSharesBySacco} 
                        filename="revenue_shares_by_sacco" 
                        title="Revenue Shares by Sacco" 
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      columns={revenueShareBySaccoColumns}
                      data={revenueSharesBySacco}
                      isLoading={loadingRevenueSharesBySacco}
                      searchPlaceholder="Search saccos..."
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Detailed Revenue Shares */}
              <TabsContent value="detailed">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle>Detailed Revenue Shares</CardTitle>
                        <CardDescription>Individual revenue share transactions and calculations</CardDescription>
                      </div>
                      <ExportButtons 
                        data={revenueShares} 
                        filename="revenue_shares_detailed" 
                        title="Detailed Revenue Shares" 
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      columns={revenueShareColumns}
                      data={revenueShares}
                      isLoading={loadingRevenueShares}
                      searchPlaceholder="Search revenue shares..."
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit-logs">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle>Audit Logs</CardTitle>
                      <CardDescription>Track all user actions, enforcement actions, and payment status changes</CardDescription>
                    </div>
                    <ExportButtons 
                      data={filteredAuditLogs} 
                      filename="audit_logs" 
                      title="Audit Logs" 
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={auditLogFilter} onValueChange={setAuditLogFilter}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="user_actions">User Actions</SelectItem>
                        <SelectItem value="enforcement_actions">Enforcement Actions</SelectItem>
                        <SelectItem value="payment_changes">Payment Status Changes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={auditLogColumns}
                  data={filteredAuditLogs}
                  isLoading={false}
                  searchPlaceholder="Search audit logs..."
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </DashboardLayout>
  );
}
