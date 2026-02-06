import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SaccoPortalLayout } from '@/components/layout/SaccoPortalLayout';
import { useAuth } from '@/hooks/useAuth';
import { useSaccos } from '@/hooks/useData';
import { useSaccoAuditLogs } from '@/hooks/useSaccoAuditLogs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Filter,
  Loader2,
  Calendar,
  User,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { saccoAuditLogsFilterFormSchema, type SaccoAuditLogsFilterFormValues } from '@/lib/zod';

export default function SaccoAuditLogsPage() {
  const { profile, roles } = useAuth();
  const countyId = useMemo(
    () => profile?.county_id ?? roles.find((r) => r.county_id)?.county_id ?? undefined,
    [profile, roles]
  );

  const { data: saccos = [], isLoading: saccosLoading } = useSaccos(countyId);
  const [saccoId, setSaccoId] = useState<string | undefined>(undefined);

  const isMobile = useIsMobile();

  const filterForm = useForm<SaccoAuditLogsFilterFormValues>({
    resolver: zodResolver(saccoAuditLogsFilterFormSchema),
    mode: 'onChange',
    defaultValues: {
      actionType: '',
      entityType: '',
      startDate: '',
      endDate: '',
    },
  });

  const formValues = filterForm.watch();
  const filters = useMemo(
    () => ({
      actionType: formValues.actionType?.trim() || undefined,
      entityType: formValues.entityType && formValues.entityType !== '__all__' ? formValues.entityType : undefined,
      startDate: formValues.startDate?.trim() || undefined,
      endDate: formValues.endDate?.trim() || undefined,
    }),
    [formValues.actionType, formValues.entityType, formValues.startDate, formValues.endDate]
  );

  const { data: auditLogs = [], isLoading: logsLoading } = useSaccoAuditLogs(
    saccoId,
    countyId,
    filters
  );

  // Auto-select first sacco
  useEffect(() => {
    if (saccos.length > 0 && !saccoId) {
      setSaccoId(saccos[0].id);
    }
  }, [saccos, saccoId]);

  const getActionIcon = (action: string) => {
    if (action.toLowerCase().includes('approve') || action.toLowerCase().includes('create')) {
      return <AlertCircle className="h-4 w-4 text-green-500" />;
    }
    if (action.toLowerCase().includes('suspend') || action.toLowerCase().includes('reject')) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (action.toLowerCase().includes('update') || action.toLowerCase().includes('assign')) {
      return <Shield className="h-4 w-4 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.toLowerCase().includes('approve') || action.toLowerCase().includes('create')) {
      return 'default';
    }
    if (action.toLowerCase().includes('suspend') || action.toLowerCase().includes('reject')) {
      return 'destructive';
    }
    return 'secondary';
  };

  return (
    <SaccoPortalLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Audit Logs & Accountability</h1>
            <p className="text-muted-foreground">
              Track all actions including member approvals, suspensions, stage assignments, role changes, and more.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={saccoId ?? ''}
              onValueChange={(v) => setSaccoId(v || undefined)}
              disabled={saccosLoading || saccos.length === 0}
            >
              <SelectTrigger className="min-h-[44px]">
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
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-muted-foreground">No county assigned. Please contact an administrator.</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...filterForm}>
                  <form className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <FormField
                        control={filterForm.control}
                        name="actionType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Action Type</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., approve, suspend"
                                className="min-h-[44px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={filterForm.control}
                        name="entityType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Entity Type</FormLabel>
                            <Select
                              value={field.value || '__all__'}
                              onValueChange={(v) => field.onChange(v === '__all__' ? '' : v)}
                            >
                              <FormControl>
                                <SelectTrigger className="min-h-[44px]">
                                  <SelectValue placeholder="All entities" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="__all__">All entities</SelectItem>
                                <SelectItem value="rider">Riders</SelectItem>
                                <SelectItem value="sacco">Saccos</SelectItem>
                                <SelectItem value="stage">Stages</SelectItem>
                                <SelectItem value="user_role">User Roles</SelectItem>
                                <SelectItem value="incident">Incidents</SelectItem>
                                <SelectItem value="disciplinary_action">Disciplinary Actions</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={filterForm.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" className="min-h-[44px]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={filterForm.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input type="date" className="min-h-[44px]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          filterForm.reset({
                            actionType: '',
                            entityType: '',
                            startDate: '',
                            endDate: '',
                          })
                        }
                        disabled={
                          !formValues.actionType &&
                          !formValues.entityType &&
                          !formValues.startDate &&
                          !formValues.endDate
                        }
                        className="min-h-[44px] touch-manipulation"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Audit Logs Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Audit Logs
                </CardTitle>
                <CardDescription>
                  Each log entry includes user, role, action, and timestamp.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No audit logs found.</p>
                  </div>
                ) : isMobile ? (
                  <ScrollArea className="h-[600px] max-w-full overflow-x-hidden">
                    <div className="space-y-3 pr-2">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="rounded-lg border border-border p-4 space-y-2 text-sm"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium">
                              {format(new Date(log.created_at), 'PPp')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {log.user ? (
                              <>
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {(log.user.full_name || log.user.email)
                                      .split(' ')
                                      .map((n) => n[0])
                                      .join('')
                                      .toUpperCase()
                                      .slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium truncate">
                                  {log.user.full_name || log.user.email}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">System</span>
                            )}
                            {log.role && (
                              <Badge variant="outline" className="text-xs">
                                {log.role.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getActionIcon(log.action)}
                            <Badge variant={getActionBadgeVariant(log.action)}>{log.action}</Badge>
                            <Badge variant="secondary">{log.entity_type}</Badge>
                          </div>
                          {log.new_values && Object.keys(log.new_values).length > 0 && (
                            <div className="text-xs text-muted-foreground truncate">
                              {Object.entries(log.new_values)
                                .slice(0, 2)
                                .map(([key, value]) => (
                                  <span key={key}>
                                    <span className="font-medium">{key}:</span>{' '}
                                    {String(value).substring(0, 40)}
                                    {String(value).length > 40 ? '...' : ''}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <ScrollArea className="h-[600px] max-w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Entity Type</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {format(new Date(log.created_at), 'PPp')}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {log.user ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {(log.user.full_name || log.user.email)
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {log.user.full_name || log.user.email}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{log.user.email}</p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">System</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.role ? (
                                <Badge variant="outline">{log.role.replace('_', ' ')}</Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getActionIcon(log.action)}
                                <Badge variant={getActionBadgeVariant(log.action)}>
                                  {log.action}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{log.entity_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                {log.new_values && Object.keys(log.new_values).length > 0 ? (
                                  <div className="text-xs text-muted-foreground">
                                    {Object.entries(log.new_values)
                                      .slice(0, 2)
                                      .map(([key, value]) => (
                                        <div key={key} className="truncate">
                                          <span className="font-medium">{key}:</span>{' '}
                                          {String(value).substring(0, 30)}
                                          {String(value).length > 30 ? '...' : ''}
                                        </div>
                                      ))}
                                    {Object.keys(log.new_values).length > 2 && (
                                      <div className="text-muted-foreground">
                                        +{Object.keys(log.new_values).length - 2} more
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No details</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </SaccoPortalLayout>
  );
}
