import React, { useState } from 'react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMonetizationSummary, type MonetizationSummaryByCounty } from '@/hooks/useRevenue';
import { format } from 'date-fns';
import { Loader2, Download, FileSpreadsheet, Calendar } from 'lucide-react';
import { toast } from 'sonner';

function formatKES(n: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function exportMonetizationCSV(data: MonetizationSummaryByCounty[], startDate: string, endDate: string) {
  if (!data?.length) {
    toast.error('No data to export.');
    return;
  }
  const headers = [
    'County',
    'County Code',
    'Total Gross (KES)',
    'Platform Fees (KES)',
    'Processing Fees (KES)',
    'Penalty Commission (KES)',
    'SMS Charges (KES)',
    'Total Deductions (KES)',
    'Net to County (KES)',
  ];
  const rows = data.map((row) => [
    row.countyName,
    row.countyCode,
    row.totalGross.toFixed(2),
    row.platformFees.toFixed(2),
    row.processingFees.toFixed(2),
    row.penaltyCommission.toFixed(2),
    row.smsCharges.toFixed(2),
    row.totalDeductions.toFixed(2),
    row.netToCounty.toFixed(2),
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `monetization_summary_${startDate}_to_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast.success('CSV exported.');
}

function exportMonetizationExcel(data: MonetizationSummaryByCounty[], startDate: string, endDate: string) {
  if (!data?.length) {
    toast.error('No data to export.');
    return;
  }
  const headers = [
    'County',
    'County Code',
    'Total Gross (KES)',
    'Platform Fees (KES)',
    'Processing Fees (KES)',
    'Penalty Commission (KES)',
    'SMS Charges (KES)',
    'Total Deductions (KES)',
    'Net to County (KES)',
  ];
  let html = '<table><tr>';
  headers.forEach((h) => (html += `<th>${h}</th>`));
  html += '</tr>';
  data.forEach((row) => {
    html += '<tr>';
    [
      row.countyName,
      row.countyCode,
      row.totalGross.toFixed(2),
      row.platformFees.toFixed(2),
      row.processingFees.toFixed(2),
      row.penaltyCommission.toFixed(2),
      row.smsCharges.toFixed(2),
      row.totalDeductions.toFixed(2),
      row.netToCounty.toFixed(2),
    ].forEach((v) => (html += `<td>${v}</td>`));
    html += '</tr>';
  });
  html += '</table>';
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `monetization_summary_${startDate}_to_${endDate}.xls`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast.success('Excel exported.');
}

export default function SuperAdminFinanceViewPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const { data: summaryByCounty = [], isLoading } = useMonetizationSummary(startDate, endDate);

  return (
    <SuperAdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance View</h1>
          <p className="text-muted-foreground">
            Monetization summary per county: gross collected, deductions by category, and net due/remitted.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date range
            </CardTitle>
            <CardDescription>Select the period for gross, deductions, and net amounts.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">From</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">To</Label>
              <Input
                id="end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportMonetizationCSV(summaryByCounty, startDate, endDate)}
                disabled={!summaryByCounty.length}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportMonetizationExcel(summaryByCounty, startDate, endDate)}
                disabled={!summaryByCounty.length}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {summaryByCounty.map((county) => (
              <Card key={county.countyId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{county.countyName}</CardTitle>
                  <CardDescription>
                    {county.countyCode} · {startDate} to {endDate}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border bg-muted/30 p-4 font-mono text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total gross collected</span>
                      <span className="font-medium">{formatKES(county.totalGross)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <span className="text-muted-foreground text-xs uppercase tracking-wide">Deductions by category</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span className="text-muted-foreground">Platform fees</span>
                      <span>{formatKES(county.platformFees)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span className="text-muted-foreground">Processing fees</span>
                      <span>{formatKES(county.processingFees)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span className="text-muted-foreground">Penalty commission</span>
                      <span>{formatKES(county.penaltyCommission)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span className="text-muted-foreground">SMS charges</span>
                      <span>{formatKES(county.smsCharges)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-medium">
                      <span>Total deductions</span>
                      <span>{formatKES(county.totalDeductions)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base">
                      <span>Net amount due/remitted to county</span>
                      <span>{formatKES(county.netToCounty)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && summaryByCounty.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No payment data for the selected date range.
            </CardContent>
          </Card>
        )}
      </div>
    </SuperAdminLayout>
  );
}
