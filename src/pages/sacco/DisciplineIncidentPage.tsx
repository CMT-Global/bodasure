import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SaccoPortalLayout } from '@/components/layout/SaccoPortalLayout';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Search,
  Filter,
  AlertTriangle,
  FileText,
  Send,
  Plus,
  Eye,
  FileWarning,
  Gavel,
  Flag,
  Calendar,
  User,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSaccos, useSaccoMembers, useDisciplineIncidents, DisciplineIncidentRow } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  TEXTAREA_MAX_CHARS,
  disciplineWarningFormSchema,
  disciplineDisciplinaryFormSchema,
  disciplineIncidentFormSchema,
  type DisciplineWarningFormValues,
  type DisciplineDisciplinaryFormValues,
  type DisciplineIncidentFormValues,
} from '@/lib/zod';

// Types for discipline and incident records (align with DB)
type IncidentType = 'warning' | 'disciplinary_action' | 'incident_report';
type IncidentStatus = 'pending' | 'acknowledged' | 'resolved' | 'escalated' | 'dismissed';
type DisciplineIncident = DisciplineIncidentRow;

export default function DisciplineIncidentPage() {
  const { profile, roles, user } = useAuth();
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

  const { data: members = [], isLoading: membersLoading } = useSaccoMembers(saccoId, countyId);
  const { data: incidents = [], isLoading: incidentsLoading } = useDisciplineIncidents(saccoId, countyId);
  const queryClient = useQueryClient();

  // Dialog states
  const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false);
  const [isDisciplinaryDialogOpen, setIsDisciplinaryDialogOpen] = useState(false);
  const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<DisciplineIncident | null>(null);

  // Form state with zod validation
  const warningForm = useForm<DisciplineWarningFormValues>({
    resolver: zodResolver(disciplineWarningFormSchema),
    defaultValues: { member_id: '', title: '', description: '', severity: 'low' },
  });

  const disciplinaryForm = useForm<DisciplineDisciplinaryFormValues>({
    resolver: zodResolver(disciplineDisciplinaryFormSchema),
    defaultValues: { member_id: '', title: '', description: '', action_taken: '', severity: 'medium' },
  });

  const incidentForm = useForm<DisciplineIncidentFormValues>({
    resolver: zodResolver(disciplineIncidentFormSchema),
    defaultValues: { member_id: '', title: '', description: '', severity: 'medium', submit_to_county: true },
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Calculate stats
  const stats = useMemo(() => {
    const warnings = incidents.filter(i => i.type === 'warning').length;
    const disciplinary = incidents.filter(i => i.type === 'disciplinary_action').length;
    const reports = incidents.filter(i => i.type === 'incident_report').length;
    const pending = incidents.filter(i => i.status === 'pending').length;
    const escalated = incidents.filter(i => i.status === 'escalated').length;
    const resolved = incidents.filter(i => i.status === 'resolved').length;

    return {
      warnings,
      disciplinary,
      reports,
      pending,
      escalated,
      resolved,
      total: incidents.length,
    };
  }, [incidents]);

  // Filter incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      // Type filter
      if (typeFilter !== 'all' && incident.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && incident.status !== statusFilter) {
        return false;
      }

      // Severity filter
      if (severityFilter !== 'all' && incident.severity !== severityFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesMember = incident.member_name.toLowerCase().includes(query) ||
                            incident.member_phone.toLowerCase().includes(query);
        const matchesTitle = incident.title.toLowerCase().includes(query);
        const matchesDescription = incident.description.toLowerCase().includes(query);
        
        if (!matchesMember && !matchesTitle && !matchesDescription) {
          return false;
        }
      }

      return true;
    });
  }, [incidents, searchQuery, typeFilter, statusFilter, severityFilter]);

  const handleIssueWarning = async (values: DisciplineWarningFormValues) => {
    if (!saccoId || !countyId || !user?.id) {
      toast.error('Missing sacco, county, or user');
      return;
    }
    const member = members.find(m => m.id === values.member_id);
    if (!member) {
      toast.error('Member not found');
      return;
    }
    const { error } = await supabase.from('sacco_discipline_incidents').insert({
      county_id: countyId,
      sacco_id: saccoId,
      rider_id: values.member_id,
      type: 'warning',
      title: values.title,
      description: values.description,
      status: 'pending',
      severity: values.severity,
      submitted_to_county: false,
      created_by: user.id,
    });
    if (error) {
      toast.error(error.message || 'Failed to issue warning');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['discipline-incidents', saccoId, countyId] });
    toast.success('Internal warning issued successfully');
    setIsWarningDialogOpen(false);
    warningForm.reset();
  };

  const handleRecordDisciplinary = async (values: DisciplineDisciplinaryFormValues) => {
    if (!saccoId || !countyId || !user?.id) {
      toast.error('Missing sacco, county, or user');
      return;
    }
    const member = members.find(m => m.id === values.member_id);
    if (!member) {
      toast.error('Member not found');
      return;
    }
    const descriptionWithAction = `${values.description}\n\nAction Taken: ${values.action_taken ?? ''}`;
    const { error } = await supabase.from('sacco_discipline_incidents').insert({
      county_id: countyId,
      sacco_id: saccoId,
      rider_id: values.member_id,
      type: 'disciplinary_action',
      title: values.title,
      description: descriptionWithAction,
      notes: values.action_taken || null,
      status: 'acknowledged',
      severity: values.severity,
      submitted_to_county: false,
      created_by: user.id,
    });
    if (error) {
      toast.error(error.message || 'Failed to record disciplinary action');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['discipline-incidents', saccoId, countyId] });
    toast.success('Disciplinary action recorded successfully');
    setIsDisciplinaryDialogOpen(false);
    disciplinaryForm.reset();
  };

  const handleSubmitIncident = async (values: DisciplineIncidentFormValues) => {
    if (!saccoId || !countyId || !user?.id) {
      toast.error('Missing sacco, county, or user');
      return;
    }
    const member = members.find(m => m.id === values.member_id);
    if (!member) {
      toast.error('Member not found');
      return;
    }
    const { error } = await supabase.from('sacco_discipline_incidents').insert({
      county_id: countyId,
      sacco_id: saccoId,
      rider_id: values.member_id,
      type: 'incident_report',
      title: values.title,
      description: values.description,
      status: values.submit_to_county ? 'escalated' : 'pending',
      severity: values.severity,
      submitted_to_county: values.submit_to_county,
      county_submission_date: values.submit_to_county ? new Date().toISOString() : null,
      created_by: user.id,
    });
    if (error) {
      toast.error(error.message || 'Failed to submit incident report');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['discipline-incidents', saccoId, countyId] });
    if (values.submit_to_county) {
      toast.success('Incident report submitted to county successfully');
    } else {
      toast.success('Incident report created successfully');
    }
    setIsIncidentDialogOpen(false);
    incidentForm.reset();
  };

  const handleViewIncident = (incident: DisciplineIncident) => {
    setSelectedIncident(incident);
    setIsViewDialogOpen(true);
  };

  const handleUpdateStatus = async (incidentId: string, newStatus: IncidentStatus, extra?: { submitted_to_county?: boolean; county_submission_date?: string }) => {
    if (!saccoId || !countyId) return;
    const payload: { status: IncidentStatus; submitted_to_county?: boolean; county_submission_date?: string; updated_at: string } = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (extra?.submitted_to_county != null) payload.submitted_to_county = extra.submitted_to_county;
    if (extra?.county_submission_date != null) payload.county_submission_date = extra.county_submission_date;

    const { error } = await supabase.from('sacco_discipline_incidents').update(payload).eq('id', incidentId);
    if (error) {
      toast.error(error.message || 'Failed to update status');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['discipline-incidents', saccoId, countyId] });
    toast.success('Status updated successfully');
    setIsViewDialogOpen(false);
    setSelectedIncident(null);
  };

  const getTypeIcon = (type: IncidentType) => {
    switch (type) {
      case 'warning':
        return <FileWarning className="h-4 w-4" />;
      case 'disciplinary_action':
        return <Gavel className="h-4 w-4" />;
      case 'incident_report':
        return <Flag className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: IncidentType) => {
    switch (type) {
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-800">Warning</Badge>;
      case 'disciplinary_action':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800">Disciplinary</Badge>;
      case 'incident_report':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800">Incident</Badge>;
    }
  };

  const getSeverityBadge = (severity?: 'low' | 'medium' | 'high' | 'critical') => {
    if (!severity) return null;
    switch (severity) {
      case 'low':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400">Low</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400">Medium</Badge>;
      case 'high':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400">High</Badge>;
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
    }
  };

  const columns: ColumnDef<DisciplineIncident>[] = useMemo(() => [
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {getTypeIcon(row.original.type)}
          {getTypeBadge(row.original.type)}
        </div>
      ),
    },
    {
      accessorKey: 'member_name',
      header: 'Member',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.member_name}</p>
          <p className="text-xs text-muted-foreground">{row.original.member_phone}</p>
        </div>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{row.original.description}</p>
        </div>
      ),
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => getSeverityBadge(row.original.severity),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'submitted_to_county',
      header: 'County',
      cell: ({ row }) => (
        row.original.submitted_to_county ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400">
            Submitted
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Internal</span>
        )
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, yyyy'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewIncident(row.original)}
          className="h-8"
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      ),
    },
  ], []);

  return (
    <SaccoPortalLayout>
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-0 max-w-full min-w-0">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">Internal Discipline & Incident Reporting</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              Issue warnings, record disciplinary actions, and submit incident reports to county
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-64 min-w-0">
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
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Dialog open={isWarningDialogOpen} onOpenChange={setIsWarningDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="min-h-[44px] w-full sm:w-auto touch-manipulation justify-center">
                    <FileWarning className="mr-2 h-4 w-4 shrink-0" />
                    Issue Warning
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 w-[calc(100vw-1.5rem)] sm:w-full max-w-[calc(100vw-1.5rem)] sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Issue Internal Warning</DialogTitle>
                    <DialogDescription>
                      Issue a warning to a member for internal discipline purposes
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...warningForm}>
                    <form onSubmit={warningForm.handleSubmit(handleIssueWarning)} className="space-y-4 py-4">
                      <FormField
                        control={warningForm.control}
                        name="member_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Member *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="min-h-[44px]">
                                  <SelectValue placeholder="Select member" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {members.map((m) => (
                                  <SelectItem key={m.id} value={m.id} className="min-h-[44px]">
                                    {m.full_name} - {m.phone}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={warningForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title *</FormLabel>
                            <FormControl>
                              <Input placeholder="Warning title" className="min-h-[44px]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={warningForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description *</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe the warning..." rows={5} className="min-h-[120px]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={warningForm.control}
                        name="severity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Severity</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="min-h-[44px]">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsWarningDialogOpen(false)} className="min-h-[44px]">
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="min-h-[44px]"
                          disabled={(warningForm.watch('description')?.length ?? 0) > TEXTAREA_MAX_CHARS}
                        >
                          Issue Warning
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog open={isDisciplinaryDialogOpen} onOpenChange={setIsDisciplinaryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="min-h-[44px] w-full sm:w-auto touch-manipulation justify-center">
                    <Gavel className="mr-2 h-4 w-4 shrink-0" />
                    Record Disciplinary
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 w-[calc(100vw-1.5rem)] sm:w-full max-w-[calc(100vw-1.5rem)] sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Record Disciplinary Action</DialogTitle>
                    <DialogDescription>
                      Record a disciplinary action taken against a member
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...disciplinaryForm}>
                    <form onSubmit={disciplinaryForm.handleSubmit(handleRecordDisciplinary)} className="space-y-4 py-4">
                      <FormField
                        control={disciplinaryForm.control}
                        name="member_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Member *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="min-h-[44px]">
                                  <SelectValue placeholder="Select member" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {members.map((m) => (
                                  <SelectItem key={m.id} value={m.id} className="min-h-[44px]">
                                    {m.full_name} - {m.phone}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={disciplinaryForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title *</FormLabel>
                            <FormControl>
                              <Input placeholder="Disciplinary action title" className="min-h-[44px]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={disciplinaryForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description *</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe the incident and violation..." rows={5} className="min-h-[120px]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={disciplinaryForm.control}
                        name="action_taken"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Action Taken</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe the disciplinary action taken..." rows={3} className="min-h-[100px]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={disciplinaryForm.control}
                        name="severity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Severity</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="min-h-[44px]">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDisciplinaryDialogOpen(false)} className="min-h-[44px]">
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="min-h-[44px]"
                          disabled={
                            (disciplinaryForm.watch('description')?.length ?? 0) > TEXTAREA_MAX_CHARS ||
                            (disciplinaryForm.watch('action_taken')?.length ?? 0) > TEXTAREA_MAX_CHARS
                          }
                        >
                          Record Action
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog open={isIncidentDialogOpen} onOpenChange={setIsIncidentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="min-h-[44px] w-full sm:w-auto touch-manipulation justify-center">
                    <Flag className="mr-2 h-4 w-4 shrink-0" />
                    Submit Incident
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 w-[calc(100vw-1.5rem)] sm:w-full max-w-[calc(100vw-1.5rem)] sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Submit Incident Report to County</DialogTitle>
                    <DialogDescription>
                      Submit an incident report to county officials for review
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...incidentForm}>
                    <form onSubmit={incidentForm.handleSubmit(handleSubmitIncident)} className="space-y-4 py-4">
                      <FormField
                        control={incidentForm.control}
                        name="member_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Member *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="min-h-[44px]">
                                  <SelectValue placeholder="Select member" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {members.map((m) => (
                                  <SelectItem key={m.id} value={m.id} className="min-h-[44px]">
                                    {m.full_name} - {m.phone}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={incidentForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title *</FormLabel>
                            <FormControl>
                              <Input placeholder="Incident report title" className="min-h-[44px]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={incidentForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description *</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Provide a detailed description of the incident..." rows={6} className="min-h-[150px]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={incidentForm.control}
                        name="severity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Severity</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="min-h-[44px]">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={incidentForm.control}
                        name="submit_to_county"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                id="submit-to-county"
                                checked={field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </FormControl>
                            <FormLabel htmlFor="submit-to-county" className="text-sm font-normal cursor-pointer">
                              Submit to county immediately
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsIncidentDialogOpen(false)} className="min-h-[44px]">
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="min-h-[44px]"
                          disabled={(incidentForm.watch('description')?.length ?? 0) > TEXTAREA_MAX_CHARS}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Submit to County
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {!countyId ? (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 text-center text-muted-foreground text-sm sm:text-base">
            No county linked to your account. Contact an administrator.
          </div>
        ) : saccos.length === 0 && !saccosLoading ? (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 text-center text-muted-foreground text-sm sm:text-base">
            No saccos in your county.
          </div>
        ) : !saccoId ? (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 text-center text-muted-foreground text-sm sm:text-base">
            Select a sacco to manage discipline and incidents.
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Warnings</CardTitle>
                  <FileWarning className="h-4 w-4 text-yellow-500 shrink-0" />
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  <div className="text-xl sm:text-2xl font-bold">{stats.warnings}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">internal warnings</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Disciplinary</CardTitle>
                  <Gavel className="h-4 w-4 text-orange-500 shrink-0" />
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  <div className="text-xl sm:text-2xl font-bold">{stats.disciplinary}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">actions recorded</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Incidents</CardTitle>
                  <Flag className="h-4 w-4 text-red-500 shrink-0" />
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  <div className="text-xl sm:text-2xl font-bold">{stats.reports}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">reports submitted</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  <div className="text-xl sm:text-2xl font-bold text-amber-500">{stats.pending}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">awaiting action</p>
                </CardContent>
              </Card>
            </div>

            {/* Incidents Table */}
            <Card className="overflow-hidden">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">All Incidents & Disciplinary Actions</CardTitle>
                <CardDescription className="text-sm">
                  View all warnings, disciplinary actions, and incident reports • {filteredIncidents.length} records
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {/* Search and Filters */}
                <div className="space-y-4 mb-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by member name, phone, title, description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 min-h-[44px] text-base sm:text-sm"
                    />
                  </div>

                  {/* Filter Row */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
                        <Filter className="mr-2 h-4 w-4 shrink-0" />
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="warning">Warnings</SelectItem>
                        <SelectItem value="disciplinary_action">Disciplinary</SelectItem>
                        <SelectItem value="incident_report">Incidents</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="acknowledged">Acknowledged</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="escalated">Escalated</SelectItem>
                        <SelectItem value="dismissed">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Data Table */}
                <DataTable
                  columns={columns}
                  data={filteredIncidents}
                  searchPlaceholder="Search incidents..."
                  isLoading={incidentsLoading}
                  mobileCardRender={(incident) => (
                    <Card className="overflow-hidden">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start gap-2 flex-wrap">
                          {getTypeIcon(incident.type)}
                          {getTypeBadge(incident.type)}
                          {getSeverityBadge(incident.severity)}
                          <StatusBadge status={incident.status} />
                        </div>
                        <div>
                          <p className="font-semibold truncate">{incident.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{incident.description}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{incident.member_name}</p>
                          <p className="text-xs text-muted-foreground">{incident.member_phone}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(incident.created_at), 'MMM d, yyyy')}
                          {incident.submitted_to_county && ' • Submitted to county'}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full min-h-[44px] touch-manipulation"
                          onClick={() => handleViewIncident(incident)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View details
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                />
              </CardContent>
            </Card>

            {/* View Incident Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 w-[calc(100vw-1.5rem)] sm:w-full max-w-[calc(100vw-1.5rem)] sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base sm:text-lg break-words">
                    {selectedIncident && getTypeIcon(selectedIncident.type)}
                    <span className="min-w-0 break-words">{selectedIncident?.title}</span>
                  </DialogTitle>
                  <DialogDescription>
                    {selectedIncident && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {getTypeBadge(selectedIncident.type)}
                        {getSeverityBadge(selectedIncident.severity)}
                        <StatusBadge status={selectedIncident.status} />
                        {selectedIncident.submitted_to_county && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400">
                            Submitted to County
                          </Badge>
                        )}
                      </div>
                    )}
                  </DialogDescription>
                </DialogHeader>
                {selectedIncident && (
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="min-w-0">
                        <Label className="text-xs text-muted-foreground">Member</Label>
                        <p className="font-medium break-words">{selectedIncident.member_name}</p>
                        <p className="text-sm text-muted-foreground break-all">{selectedIncident.member_phone}</p>
                      </div>
                      <div className="min-w-0">
                        <Label className="text-xs text-muted-foreground">Created</Label>
                        <p className="font-medium text-sm sm:text-base">{format(new Date(selectedIncident.created_at), 'PPp')}</p>
                        {selectedIncident.county_submission_date && (
                          <p className="text-sm text-muted-foreground">
                            Submitted: {format(new Date(selectedIncident.county_submission_date), 'PPp')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p className="text-sm whitespace-pre-wrap mt-1">{selectedIncident.description}</p>
                    </div>
                    {selectedIncident.notes && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Notes / Action Taken</Label>
                        <p className="text-sm whitespace-pre-wrap mt-1">{selectedIncident.notes}</p>
                      </div>
                    )}
                    <div className="border-t pt-4">
                      <Label className="text-xs text-muted-foreground mb-2 block">Update Status</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedIncident.status !== 'acknowledged' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(selectedIncident.id, 'acknowledged')}
                            className="min-h-[44px] touch-manipulation"
                          >
                            Mark Acknowledged
                          </Button>
                        )}
                        {selectedIncident.status !== 'resolved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(selectedIncident.id, 'resolved')}
                            className="min-h-[44px] touch-manipulation"
                          >
                            Mark Resolved
                          </Button>
                        )}
                        {selectedIncident.status !== 'escalated' && !selectedIncident.submitted_to_county && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleUpdateStatus(selectedIncident.id, 'escalated', {
                                submitted_to_county: true,
                                county_submission_date: new Date().toISOString(),
                              })
                            }
                            className="min-h-[44px] touch-manipulation"
                          >
                            <Send className="mr-2 h-4 w-4 shrink-0" />
                            Escalate to County
                          </Button>
                        )}
                        {selectedIncident.status !== 'dismissed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(selectedIncident.id, 'dismissed')}
                            className="min-h-[44px] touch-manipulation"
                          >
                            Dismiss
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="min-h-[44px] w-full sm:w-auto touch-manipulation">
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </SaccoPortalLayout>
  );
}
