import { useMemo } from 'react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAllAuditLogs } from '@/hooks/useUserManagement';
import type { UserActivityLog } from '@/hooks/useUserManagement';
import {
  ClipboardCheck,
  Download,
  FileCheck,
  Fingerprint,
  Lock,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

function exportAuditLogsToCsv(logs: UserActivityLog[]) {
  const headers = [
    'Timestamp',
    'Action',
    'Entity Type',
    'Entity ID',
    'User',
    'User Email',
    'County ID',
    'IP Address',
    'User Agent',
  ];
  const rows = logs.map((log) => [
    log.created_at,
    log.action,
    log.entity_type,
    log.entity_id ?? '',
    (log as UserActivityLog & { user?: { full_name: string | null; email: string } })?.user?.full_name ?? '',
    (log as UserActivityLog & { user?: { full_name: string | null; email: string } })?.user?.email ?? '',
    (log as UserActivityLog & { county_id?: string | null }).county_id ?? '',
    log.ip_address ?? '',
    (log.user_agent ?? '').replace(/,/g, ';'),
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit_logs_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SecurityAuditCompliancePage() {
  const { data: auditLogs = [], isLoading: logsLoading } = useAllAuditLogs();

  const recentLogs = useMemo(() => auditLogs.slice(0, 50), [auditLogs]);

  const handleExportForRegulators = () => {
    exportAuditLogsToCsv(auditLogs);
    toast.success('Audit logs exported for regulators');
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 sm:h-7 sm:w-7" />
            Security, Audit & Compliance
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Non-negotiable controls: immutable audit logs, action traceability, county data isolation, payment integrity, fraud flags, IP/session monitoring, and exportable logs for regulators.
          </p>
        </div>

        {/* Immutable audit logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Immutable audit logs
            </CardTitle>
            <CardDescription>
              All platform actions are recorded in append-only audit logs. Logs cannot be edited or deleted after creation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4 bg-muted/30">
              <div>
                <Badge variant="default" className="mb-2">Active</Badge>
                <p className="text-sm text-muted-foreground">
                  Audit log storage is append-only. Retention and hashing policies are enforced at the database layer.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action traceability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Action traceability
            </CardTitle>
            <CardDescription>
              Every significant action is tied to a user, timestamp, entity type, and optional old/new values for full traceability.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4 bg-muted/30">
              <div>
                <Badge variant="default" className="mb-2">Active</Badge>
                <p className="text-sm text-muted-foreground">
                  Actions include: user changes, role assignments, payments, penalties, registration updates, and support/escalation events.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* County data isolation enforcement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              County data isolation enforcement
            </CardTitle>
            <CardDescription>
              Row-level security and county-scoped queries ensure users only access data for their assigned county(s).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4 bg-muted/30">
              <div>
                <Badge variant="default" className="mb-2">Enforced</Badge>
                <p className="text-sm text-muted-foreground">
                  RLS policies and application filters enforce county boundaries. Super admin can view all; county admins are restricted to their county.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment integrity checks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Payment integrity checks
            </CardTitle>
            <CardDescription>
              Payment records are validated; duplicates and anomalies are flagged. Reconciliation and audit trails support integrity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4 bg-muted/30">
              <div>
                <Badge variant="default" className="mb-2">Active</Badge>
                <p className="text-sm text-muted-foreground">
                  Payment events are logged in audit logs. Reconciliation reports and duplicate checks can be run from Reports.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fraud pattern flags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Fraud pattern flags
            </CardTitle>
            <CardDescription>
              Suspicious patterns (e.g. rapid role changes, unusual payment volumes, cross-county anomalies) can be flagged for review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4 bg-muted/30">
              <div>
                <Badge variant="secondary" className="mb-2">Monitoring</Badge>
                <p className="text-sm text-muted-foreground">
                  Audit logs and reports support manual and automated review. Configure thresholds and alerts in System Settings or future fraud module.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IP/session monitoring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              IP / session monitoring
            </CardTitle>
            <CardDescription>
              Login and action logs capture IP address and user agent for session and security monitoring.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4 bg-muted/30">
              <div>
                <Badge variant="default" className="mb-2">Active</Badge>
                <p className="text-sm text-muted-foreground">
                  Audit log entries include ip_address and user_agent where available. Use audit logs below to review sessions and access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exportable audit logs for regulators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportable audit logs for regulators
            </CardTitle>
            <CardDescription>
              Download full or filtered audit logs in CSV format for regulatory submission or external audit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleExportForRegulators} disabled={logsLoading || auditLogs.length === 0}>
                {logsLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export all audit logs (CSV)
              </Button>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Recent audit events</h4>
              {logsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading audit logs…
                </div>
              ) : recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No audit logs found.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Time</th>
                        <th className="text-left p-3 font-medium">Action</th>
                        <th className="text-left p-3 font-medium">Entity</th>
                        <th className="text-left p-3 font-medium">User</th>
                        <th className="text-left p-3 font-medium">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLogs.map((log) => (
                        <tr key={log.id} className="border-b last:border-0">
                          <td className="p-3 text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="p-3">{log.action}</td>
                          <td className="p-3">
                            {log.entity_type}
                            {log.entity_id ? ` (${log.entity_id.slice(0, 8)}…)` : ''}
                          </td>
                          <td className="p-3">
                            {(log as UserActivityLog & { user?: { full_name: string | null; email: string } }).user?.full_name ??
                              (log as UserActivityLog & { user?: { full_name: string | null; email: string } }).user?.email ??
                              log.user_id?.slice(0, 8) ?? '—'}
                          </td>
                          <td className="p-3 text-muted-foreground font-mono text-xs">
                            {log.ip_address ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
