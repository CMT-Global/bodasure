import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Label } from '@/components/ui/label';
import {
  Search,
  Filter,
  Eye,
  FileWarning,
  Gavel,
  Flag,
  Building2,
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
} from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCountyDisciplineIncidents, CountyDisciplineIncidentRow } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';

type IncidentType = 'warning' | 'disciplinary_action' | 'incident_report';
type IncidentStatus = 'pending' | 'acknowledged' | 'resolved' | 'escalated' | 'dismissed';

export default function DisciplineIncidentsPage() {
  const { profile, roles } = useAuth();
  const countyId = useMemo(
    () => profile?.county_id ?? roles.find((r) => r.county_id)?.county_id ?? undefined,
    [profile, roles]
  );

  const { data: incidents = [], isLoading: incidentsLoading } = useCountyDisciplineIncidents(countyId);
  const queryClient = useQueryClient();

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<CountyDisciplineIncidentRow | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (typeFilter !== 'all' && incident.type !== typeFilter) return false;
      if (statusFilter !== 'all' && incident.status !== statusFilter) return false;
      if (severityFilter !== 'all' && incident.severity !== severityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          incident.member_name.toLowerCase().includes(q) ||
          incident.member_phone.toLowerCase().includes(q) ||
          incident.sacco_name.toLowerCase().includes(q) ||
          incident.title.toLowerCase().includes(q) ||
          incident.description.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [incidents, searchQuery, typeFilter, statusFilter, severityFilter]);

  const stats = useMemo(() => {
    const escalated = incidents.filter((i) => i.status === 'escalated').length;
    const resolved = incidents.filter((i) => i.status === 'resolved').length;
    const dismissed = incidents.filter((i) => i.status === 'dismissed').length;
    return { escalated, resolved, dismissed, total: incidents.length };
  }, [incidents]);

  const handleViewIncident = (incident: CountyDisciplineIncidentRow) => {
    setSelectedIncident(incident);
    setIsViewDialogOpen(true);
  };

  const handleUpdateStatus = async (incidentId: string, newStatus: IncidentStatus) => {
    if (!countyId) return;
    const { error } = await supabase
      .from('sacco_discipline_incidents')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', incidentId);

    if (error) {
      toast.error(error.message || 'Failed to update status');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['county-discipline-incidents', countyId] });
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

  const columns: ColumnDef<CountyDisciplineIncidentRow>[] = useMemo(
    () => [
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
        accessorKey: 'sacco_name',
        header: 'Sacco',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{row.original.sacco_name}</span>
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
        accessorKey: 'county_submission_date',
        header: 'Submitted',
        cell: ({ row }) =>
          row.original.county_submission_date
            ? format(new Date(row.original.county_submission_date), 'MMM d, yyyy')
            : '—',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => handleViewIncident(row.original)} className="h-8">
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-0 max-w-full min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">Discipline & Incidents (County)</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              Incidents escalated from saccos — review and mark as resolved
            </p>
          </div>
        </div>

        {!countyId ? (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 text-center text-muted-foreground text-sm sm:text-base">
            No county linked to your account. Contact an administrator.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Escalated</CardTitle>
                  <Flag className="h-4 w-4 text-amber-500 shrink-0" />
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  <div className="text-xl sm:text-2xl font-bold text-amber-500">{stats.escalated}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">awaiting action</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Resolved</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  <div className="text-xl sm:text-2xl font-bold">{stats.resolved}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">closed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Dismissed</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  <div className="text-xl sm:text-2xl font-bold">{stats.dismissed}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">closed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">submitted to county</p>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Escalated Incidents</CardTitle>
                <CardDescription className="text-sm">
                  View incidents submitted by saccos • {filteredIncidents.length} records
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="space-y-4 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by sacco, member, title, description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 min-h-[44px] text-base sm:text-sm"
                    />
                  </div>
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
                        <SelectItem value="escalated">Escalated</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="dismissed">Dismissed</SelectItem>
                        <SelectItem value="acknowledged">Acknowledged</SelectItem>
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
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {incident.sacco_name}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{incident.member_name}</p>
                          <p className="text-xs text-muted-foreground">{incident.member_phone}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {incident.county_submission_date ? format(new Date(incident.county_submission_date), 'MMM d, yyyy') : '—'}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full min-h-[44px] touch-manipulation"
                          onClick={() => handleViewIncident(incident)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View & update status
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                />
              </CardContent>
            </Card>

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
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400">
                          Submitted to County
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {selectedIncident.sacco_name}
                        </Badge>
                      </div>
                    )}
                  </DialogDescription>
                </DialogHeader>
                {selectedIncident && (
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="min-w-0">
                        <Label className="text-xs text-muted-foreground">Sacco</Label>
                        <p className="font-medium break-words">{selectedIncident.sacco_name}</p>
                      </div>
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
                        {selectedIncident.status !== 'resolved' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleUpdateStatus(selectedIncident.id, 'resolved')}
                            className="min-h-[44px] touch-manipulation"
                          >
                            Mark Resolved
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
    </DashboardLayout>
  );
}
