import React, { useState, useMemo } from 'react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMonetizationSummary, type MonetizationSummaryByCounty } from '@/hooks/useRevenue';
import { superAdminFinanceDateRangeSchema } from '@/lib/zod';
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

const DATE_MIN = '2020-01-01';

function getTodayISO() {
  return format(new Date(), 'yyyy-MM-dd');
}

export default function SuperAdminFinanceViewPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return format(d, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => getTodayISO());

  const validation = useMemo(
    () => superAdminFinanceDateRangeSchema.safeParse({ startDate, endDate }),
    [startDate, endDate]
  );
  const errors: { startDate?: string; endDate?: string } = {};
  if (!validation.success && validation.error.flatten()) {
    const field = validation.error.flatten().fieldErrors;
    if (field.startDate?.[0]) errors.startDate = field.startDate[0];
    if (field.endDate?.[0]) errors.endDate = field.endDate[0];
  }
  const isValid = validation.success;
  const effectiveStart = isValid ? validation.data.startDate : (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return format(d, 'yyyy-MM-dd');
  })();
  const effectiveEnd = isValid ? validation.data.endDate : getTodayISO();

  const { data: summaryByCounty = [], isLoading } = useMonetizationSummary(effectiveStart, effectiveEnd);

  return (
    <SuperAdminLayout>
      <div className="min-w-0 space-y-6 overflow-x-hidden p-4 md:p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Finance View</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Monetization summary per county: gross collected, deductions by category, and net due/remitted.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="h-4 w-5 shrink-0 sm:h-5" />
              Date range
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Select the period for gross, deductions, and net amounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1 space-y-2 sm:flex-initial">
              <Label htmlFor="start" className="text-sm">From</Label>
              <Input
                id="start"
                type="date"
                min={DATE_MIN}
                max={getTodayISO()}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={errors.startDate ? 'border-destructive w-full sm:w-auto' : 'w-full sm:w-auto'}
                aria-invalid={!!errors.startDate}
                aria-describedby={errors.startDate ? 'start-error' : undefined}
              />
              {errors.startDate && (
                <p id="start-error" className="text-sm text-destructive">
                  {errors.startDate}
                </p>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2 sm:flex-initial">
              <Label htmlFor="end" className="text-sm">To</Label>
              <Input
                id="end"
                type="date"
                min={DATE_MIN}
                max={getTodayISO()}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={errors.endDate ? 'border-destructive w-full sm:w-auto' : 'w-full sm:w-auto'}
                aria-invalid={!!errors.endDate}
                aria-describedby={errors.endDate ? 'end-error' : undefined}
              />
              {errors.endDate && (
                <p id="end-error" className="text-sm text-destructive">
                  {errors.endDate}
                </p>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-initial">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => exportMonetizationCSV(summaryByCounty, effectiveStart, effectiveEnd)}
                disabled={!summaryByCounty.length || !isValid}
              >
                <Download className="mr-2 h-4 w-4 shrink-0" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => exportMonetizationExcel(summaryByCounty, effectiveStart, effectiveEnd)}
                disabled={!summaryByCounty.length || !isValid}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4 shrink-0" />
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
              <Card key={county.countyId} className="min-w-0 overflow-hidden">
                <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
                  <CardTitle className="text-base sm:text-lg">{county.countyName}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {county.countyCode} · {startDate} to {endDate}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
                  <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs sm:p-4 sm:text-sm">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-2">
                      <span className="text-muted-foreground">Total gross collected</span>
                      <span className="font-medium sm:text-right">{formatKES(county.totalGross)}</span>
                    </div>
                    <div className="mt-2 border-t pt-2">
                      <span className="text-muted-foreground text-xs uppercase tracking-wide">Deductions by category</span>
                    </div>
                    <div className="flex flex-col gap-0.5 pl-0 pt-1 sm:flex-row sm:justify-between sm:gap-2 sm:pl-2">
                      <span className="text-muted-foreground">Platform fees</span>
                      <span className="sm:text-right">{formatKES(county.platformFees)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-2 sm:pl-2">
                      <span className="text-muted-foreground">Processing fees</span>
                      <span className="sm:text-right">{formatKES(county.processingFees)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-2 sm:pl-2">
                      <span className="text-muted-foreground">Penalty commission</span>
                      <span className="sm:text-right">{formatKES(county.penaltyCommission)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-2 sm:pl-2">
                      <span className="text-muted-foreground">SMS charges</span>
                      <span className="sm:text-right">{formatKES(county.smsCharges)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 border-t pt-2 font-medium sm:flex-row sm:justify-between sm:gap-2">
                      <span>Total deductions</span>
                      <span className="sm:text-right">{formatKES(county.totalDeductions)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 font-semibold text-base sm:flex-row sm:justify-between sm:gap-2">
                      <span className="text-sm sm:text-base">Net amount due/remitted to county</span>
                      <span className="sm:text-right">{formatKES(county.netToCounty)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && summaryByCounty.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground sm:py-10 sm:text-base">
              No payment data for the selected date range.
            </CardContent>
          </Card>
        )}
      </div>
    </SuperAdminLayout>
  );
}
