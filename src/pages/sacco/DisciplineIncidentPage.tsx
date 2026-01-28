import { useState, useMemo, useEffect } from 'react';
import { SaccoPortalLayout } from '@/components/layout/SaccoPortalLayout';
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
import { useAuth } from '@/hooks/useAuth';
import { useSaccos, useSaccoMembers, RiderWithDetails } from '@/hooks/useData';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Types for discipline and incident records
type IncidentType = 'warning' | 'disciplinary_action' | 'incident_report';
type IncidentStatus = 'pending' | 'acknowledged' | 'resolved' | 'escalated' | 'dismissed';

interface DisciplineIncident {
  id: string;
  type: IncidentType;
  member_id: string;
  member_name: string;
  member_phone: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  submitted_to_county: boolean;
  county_submission_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  attachments?: string[];
}

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

  // Mock data - in production, this would come from a database
  const [incidents, setIncidents] = useState<DisciplineIncident[]>([]);

  // Dialog states
  const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false);
  const [isDisciplinaryDialogOpen, setIsDisciplinaryDialogOpen] = useState(false);
  const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<DisciplineIncident | null>(null);

  // Form states
  const [warningForm, setWarningForm] = useState({
    member_id: '',
    title: '',
    description: '',
    severity: 'low' as 'low' | 'medium' | 'high' | 'critical',
  });

  const [disciplinaryForm, setDisciplinaryForm] = useState({
    member_id: '',
    title: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    action_taken: '',
  });

  const [incidentForm, setIncidentForm] = useState({
    member_id: '',
    title: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    submit_to_county: true,
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

  const handleIssueWarning = () => {
    if (!warningForm.member_id || !warningForm.title || !warningForm.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const member = members.find(m => m.id === warningForm.member_id);
    if (!member) {
      toast.error('Member not found');
      return;
    }

    const newIncident: DisciplineIncident = {
      id: `inc_${Date.now()}`,
      type: 'warning',
      member_id: warningForm.member_id,
      member_name: member.full_name,
      member_phone: member.phone,
      title: warningForm.title,
      description: warningForm.description,
      status: 'pending',
      severity: warningForm.severity,
      submitted_to_county: false,
      created_by: user?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setIncidents(prev => [newIncident, ...prev]);
    toast.success('Internal warning issued successfully');
    setIsWarningDialogOpen(false);
    setWarningForm({
      member_id: '',
      title: '',
      description: '',
      severity: 'low',
    });
  };

  const handleRecordDisciplinary = () => {
    if (!disciplinaryForm.member_id || !disciplinaryForm.title || !disciplinaryForm.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const member = members.find(m => m.id === disciplinaryForm.member_id);
    if (!member) {
      toast.error('Member not found');
      return;
    }

    const newIncident: DisciplineIncident = {
      id: `inc_${Date.now()}`,
      type: 'disciplinary_action',
      member_id: disciplinaryForm.member_id,
      member_name: member.full_name,
      member_phone: member.phone,
      title: disciplinaryForm.title,
      description: `${disciplinaryForm.description}\n\nAction Taken: ${disciplinaryForm.action_taken}`,
      status: 'acknowledged',
      severity: disciplinaryForm.severity,
      submitted_to_county: false,
      created_by: user?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: disciplinaryForm.action_taken,
    };

    setIncidents(prev => [newIncident, ...prev]);
    toast.success('Disciplinary action recorded successfully');
    setIsDisciplinaryDialogOpen(false);
    setDisciplinaryForm({
      member_id: '',
      title: '',
      description: '',
      severity: 'medium',
      action_taken: '',
    });
  };

  const handleSubmitIncident = () => {
    if (!incidentForm.member_id || !incidentForm.title || !incidentForm.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const member = members.find(m => m.id === incidentForm.member_id);
    if (!member) {
      toast.error('Member not found');
      return;
    }

    const newIncident: DisciplineIncident = {
      id: `inc_${Date.now()}`,
      type: 'incident_report',
      member_id: incidentForm.member_id,
      member_name: member.full_name,
      member_phone: member.phone,
      title: incidentForm.title,
      description: incidentForm.description,
      status: incidentForm.submit_to_county ? 'escalated' : 'pending',
      severity: incidentForm.severity,
      submitted_to_county: incidentForm.submit_to_county,
      county_submission_date: incidentForm.submit_to_county ? new Date().toISOString() : undefined,
      created_by: user?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setIncidents(prev => [newIncident, ...prev]);
    if (incidentForm.submit_to_county) {
      toast.success('Incident report submitted to county successfully');
    } else {
      toast.success('Incident report created successfully');
    }
    setIsIncidentDialogOpen(false);
    setIncidentForm({
      member_id: '',
      title: '',
      description: '',
      severity: 'medium',
      submit_to_county: true,
    });
  };

  const handleViewIncident = (incident: DisciplineIncident) => {
    setSelectedIncident(incident);
    setIsViewDialogOpen(true);
  };

  const handleUpdateStatus = (incidentId: string, newStatus: IncidentStatus) => {
    setIncidents(prev =>
      prev.map(inc =>
        inc.id === incidentId
          ? { ...inc, status: newStatus, updated_at: new Date().toISOString() }
          : inc
      )
    );
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
      <div className="space-y-4 sm:space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Internal Discipline & Incident Reporting</h1>
            <p className="text-muted-foreground">
              Issue warnings, record disciplinary actions, and submit incident reports to county
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
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
            <div className="flex gap-2">
              <Dialog open={isWarningDialogOpen} onOpenChange={setIsWarningDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="min-h-[44px]">
                    <FileWarning className="mr-2 h-4 w-4" />
                    Issue Warning
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Issue Internal Warning</DialogTitle>
                    <DialogDescription>
                      Issue a warning to a member for internal discipline purposes
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="warning-member">Member *</Label>
                      <Select
                        value={warningForm.member_id}
                        onValueChange={(v) => setWarningForm(prev => ({ ...prev, member_id: v }))}
                      >
                        <SelectTrigger id="warning-member" className="min-h-[44px]">
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="min-h-[44px]">
                              {m.full_name} - {m.phone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="warning-title">Title *</Label>
                      <Input
                        id="warning-title"
                        value={warningForm.title}
                        onChange={(e) => setWarningForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Warning title"
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="warning-description">Description *</Label>
                      <Textarea
                        id="warning-description"
                        value={warningForm.description}
                        onChange={(e) => setWarningForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the warning..."
                        rows={5}
                        className="min-h-[120px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="warning-severity">Severity</Label>
                      <Select
                        value={warningForm.severity}
                        onValueChange={(v: 'low' | 'medium' | 'high' | 'critical') => setWarningForm(prev => ({ ...prev, severity: v }))}
                      >
                        <SelectTrigger id="warning-severity" className="min-h-[44px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsWarningDialogOpen(false)} className="min-h-[44px]">
                      Cancel
                    </Button>
                    <Button onClick={handleIssueWarning} className="min-h-[44px]">
                      Issue Warning
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isDisciplinaryDialogOpen} onOpenChange={setIsDisciplinaryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="min-h-[44px]">
                    <Gavel className="mr-2 h-4 w-4" />
                    Record Disciplinary
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Record Disciplinary Action</DialogTitle>
                    <DialogDescription>
                      Record a disciplinary action taken against a member
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="disciplinary-member">Member *</Label>
                      <Select
                        value={disciplinaryForm.member_id}
                        onValueChange={(v) => setDisciplinaryForm(prev => ({ ...prev, member_id: v }))}
                      >
                        <SelectTrigger id="disciplinary-member" className="min-h-[44px]">
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="min-h-[44px]">
                              {m.full_name} - {m.phone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="disciplinary-title">Title *</Label>
                      <Input
                        id="disciplinary-title"
                        value={disciplinaryForm.title}
                        onChange={(e) => setDisciplinaryForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Disciplinary action title"
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="disciplinary-description">Description *</Label>
                      <Textarea
                        id="disciplinary-description"
                        value={disciplinaryForm.description}
                        onChange={(e) => setDisciplinaryForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the incident and violation..."
                        rows={5}
                        className="min-h-[120px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="disciplinary-action">Action Taken *</Label>
                      <Textarea
                        id="disciplinary-action"
                        value={disciplinaryForm.action_taken}
                        onChange={(e) => setDisciplinaryForm(prev => ({ ...prev, action_taken: e.target.value }))}
                        placeholder="Describe the disciplinary action taken..."
                        rows={3}
                        className="min-h-[100px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="disciplinary-severity">Severity</Label>
                      <Select
                        value={disciplinaryForm.severity}
                        onValueChange={(v: 'low' | 'medium' | 'high' | 'critical') => setDisciplinaryForm(prev => ({ ...prev, severity: v }))}
                      >
                        <SelectTrigger id="disciplinary-severity" className="min-h-[44px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDisciplinaryDialogOpen(false)} className="min-h-[44px]">
                      Cancel
                    </Button>
                    <Button onClick={handleRecordDisciplinary} className="min-h-[44px]">
                      Record Action
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isIncidentDialogOpen} onOpenChange={setIsIncidentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="min-h-[44px]">
                    <Flag className="mr-2 h-4 w-4" />
                    Submit Incident
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Submit Incident Report to County</DialogTitle>
                    <DialogDescription>
                      Submit an incident report to county officials for review
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="incident-member">Member *</Label>
                      <Select
                        value={incidentForm.member_id}
                        onValueChange={(v) => setIncidentForm(prev => ({ ...prev, member_id: v }))}
                      >
                        <SelectTrigger id="incident-member" className="min-h-[44px]">
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="min-h-[44px]">
                              {m.full_name} - {m.phone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incident-title">Title *</Label>
                      <Input
                        id="incident-title"
                        value={incidentForm.title}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Incident report title"
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incident-description">Description *</Label>
                      <Textarea
                        id="incident-description"
                        value={incidentForm.description}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Provide a detailed description of the incident..."
                        rows={6}
                        className="min-h-[150px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incident-severity">Severity</Label>
                      <Select
                        value={incidentForm.severity}
                        onValueChange={(v: 'low' | 'medium' | 'high' | 'critical') => setIncidentForm(prev => ({ ...prev, severity: v }))}
                      >
                        <SelectTrigger id="incident-severity" className="min-h-[44px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="submit-to-county"
                        checked={incidentForm.submit_to_county}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, submit_to_county: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="submit-to-county" className="text-sm font-normal cursor-pointer">
                        Submit to county immediately
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsIncidentDialogOpen(false)} className="min-h-[44px]">
                      Cancel
                    </Button>
                    <Button onClick={handleSubmitIncident} className="min-h-[44px]">
                      <Send className="mr-2 h-4 w-4" />
                      Submit to County
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
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
            <Card>
              <CardHeader>
                <CardTitle>All Incidents & Disciplinary Actions</CardTitle>
                <CardDescription>
                  View all warnings, disciplinary actions, and incident reports • {filteredIncidents.length} records
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                        <SelectItem value="all">All Status</SelectItem>
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
                        <SelectItem value="all">All Severity</SelectItem>
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
                  isLoading={false}
                />
              </CardContent>
            </Card>

            {/* View Incident Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedIncident && getTypeIcon(selectedIncident.type)}
                    {selectedIncident?.title}
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Member</Label>
                        <p className="font-medium">{selectedIncident.member_name}</p>
                        <p className="text-sm text-muted-foreground">{selectedIncident.member_phone}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Created</Label>
                        <p className="font-medium">{format(new Date(selectedIncident.created_at), 'PPp')}</p>
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
                            className="min-h-[36px]"
                          >
                            Mark Acknowledged
                          </Button>
                        )}
                        {selectedIncident.status !== 'resolved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(selectedIncident.id, 'resolved')}
                            className="min-h-[36px]"
                          >
                            Mark Resolved
                          </Button>
                        )}
                        {selectedIncident.status !== 'escalated' && !selectedIncident.submitted_to_county && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleUpdateStatus(selectedIncident.id, 'escalated');
                              setIncidents(prev =>
                                prev.map(inc =>
                                  inc.id === selectedIncident.id
                                    ? { ...inc, submitted_to_county: true, county_submission_date: new Date().toISOString() }
                                    : inc
                                )
                              );
                            }}
                            className="min-h-[36px]"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Escalate to County
                          </Button>
                        )}
                        {selectedIncident.status !== 'dismissed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(selectedIncident.id, 'dismissed')}
                            className="min-h-[36px]"
                          >
                            Dismiss
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="min-h-[44px]">
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
