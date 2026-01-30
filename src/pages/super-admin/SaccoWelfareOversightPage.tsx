import { useState, useMemo } from 'react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { useSaccos, useAllCounties, Sacco } from '@/hooks/useData';
import { useSaccoOfficials } from '@/hooks/useSaccoManagement';
import { useSupportTicketsForCounty } from '@/hooks/useSupportTickets';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2,
  MapPin,
  Users,
  MapPinIcon,
  MoreHorizontal,
  Ban,
  CheckCircle,
  Flag,
  Loader2,
  Scale,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';

export default function SaccoWelfareOversightPage() {
  const queryClient = useQueryClient();
  const { data: saccos = [], isLoading: saccosLoading } = useSaccos(undefined);
  const { data: counties = [] } = useAllCounties();
  const { data: allTickets = [] } = useSupportTicketsForCounty(undefined, true);

  const [countyFilter, setCountyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [flaggedFilter, setFlaggedFilter] = useState<string>('all');
  const [officialsCountyId, setOfficialsCountyId] = useState<string | null>(null);
  const [officialsDialogOpen, setOfficialsDialogOpen] = useState(false);
  const [suspendSacco, setSuspendSacco] = useState<Sacco | null>(null);
  const [reinstateSacco, setReinstateSacco] = useState<Sacco | null>(null);

  const { data: officials = [] } = useSaccoOfficials(officialsCountyId ?? undefined, undefined);

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      saccoId,
      status,
    }: {
      saccoId: string;
      status: 'approved' | 'suspended';
    }) => {
      const { error } = await supabase.from('saccos').update({ status }).eq('id', saccoId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['saccos'] });
      toast.success(
        variables.status === 'approved'
          ? 'Sacco reinstated successfully'
          : 'Sacco suspended successfully'
      );
      setSuspendSacco(null);
      setReinstateSacco(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update sacco status');
    },
  });

  const toggleFlaggedMutation = useMutation({
    mutationFn: async ({
      saccoId,
      flagged,
    }: { saccoId: string; flagged: boolean }) => {
      const sacco = saccos.find(s => s.id === saccoId);
      const current = (sacco?.settings as Record<string, unknown>) ?? {};
      const { error } = await supabase
        .from('saccos')
        .update({
          settings: { ...current, flagged },
          updated_at: new Date().toISOString(),
        })
        .eq('id', saccoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saccos'] });
      toast.success('Flag status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update flag');
    },
  });

  const countyMap = useMemo(() => new Map(counties.map(c => [c.id, c])), [counties]);

  const filteredSaccos = useMemo(() => {
    return saccos.filter(sacco => {
      if (countyFilter !== 'all' && sacco.county_id !== countyFilter) return false;
      if (statusFilter !== 'all' && sacco.status !== statusFilter) return false;
      const isFlagged = !!(sacco.settings as Record<string, unknown>)?.flagged;
      if (flaggedFilter === 'flagged' && !isFlagged) return false;
      if (flaggedFilter === 'not_flagged' && isFlagged) return false;
      return true;
    });
  }, [saccos, countyFilter, statusFilter, flaggedFilter]);

  const disputeTickets = useMemo(() => {
    return allTickets.filter(
      t =>
        t.category === 'penalty_dispute' ||
        t.category === 'sacco_stage_issue'
    ).filter(t => t.status !== 'closed' && t.status !== 'resolved');
  }, [allTickets]);

  const columns: ColumnDef<Sacco>[] = [
    {
      accessorKey: 'name',
      header: 'Organization',
      cell: ({ row }) => {
        const s = row.original;
        const isFlagged = !!(s.settings as Record<string, unknown>)?.flagged;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{s.name}</p>
                {isFlagged && (
                  <Badge variant="destructive" className="text-xs gap-0.5">
                    <Flag className="h-3 w-3" /> Flagged
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {s.registration_number || 'No reg. number'}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'county_id',
      header: 'County',
      cell: ({ row }) => {
        const county = countyMap.get(row.original.county_id);
        return (
          <div className="flex items-center gap-1.5 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {county?.name ?? row.original.county_id}
          </div>
        );
      },
    },
    {
      accessorKey: 'member_count',
      header: 'Members',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          {row.original.member_count ?? 0}
        </div>
      ),
    },
    {
      accessorKey: 'stages_count',
      header: 'Stages',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <MapPinIcon className="h-4 w-4 text-muted-foreground" />
          {row.original.stages_count ?? 0}
        </div>
      ),
    },
    {
      accessorKey: 'compliance_rate',
      header: 'Compliance',
      cell: ({ row }) => {
        const rate = row.original.compliance_rate ?? 100;
        const isHigh = rate >= 80;
        const isLow = rate < 50;
        return (
          <span
            className={`text-sm font-medium ${
              isLow ? 'text-destructive' : isHigh ? 'text-green-600' : 'text-amber-600'
            }`}
          >
            {rate}%
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const sacco = row.original;
        const isFlagged = !!(sacco.settings as Record<string, unknown>)?.flagged;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Platform controls</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  toggleFlaggedMutation.mutate({
                    saccoId: sacco.id,
                    flagged: !isFlagged,
                  })
                }
              >
                <Flag className="mr-2 h-4 w-4" />
                {isFlagged ? 'Remove flag' : 'Flag as problematic'}
              </DropdownMenuItem>
              {sacco.status !== 'approved' && (
                <DropdownMenuItem
                  onClick={() => {
                    setReinstateSacco(sacco);
                  }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Reinstate
                </DropdownMenuItem>
              )}
              {sacco.status !== 'suspended' && (
                <DropdownMenuItem
                  onClick={() => {
                    setSuspendSacco(sacco);
                  }}
                  className="text-destructive"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Suspend
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">
            Sacco, Welfare & Structure Oversight
          </h1>
          <p className="text-muted-foreground mt-1">
            Platform-wide controls: view all Saccos & welfare groups, counties they operate in,
            officials and roles, member counts; flag problematic organizations; suspend or reinstate;
            resolve disputes escalated from counties.
          </p>
        </div>

        <Tabs defaultValue="organizations" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="disputes">
              Disputes escalated
              {disputeTickets.length > 0 && (
                <Badge variant="secondary" className="ml-1.5">
                  {disputeTickets.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organizations" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>All Saccos & welfare groups</CardTitle>
                  <CardDescription>
                    See which counties they operate in, member counts, and status. Flag or
                    suspend/reinstate from the row menu.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={countyFilter} onValueChange={setCountyFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="County" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All counties</SelectItem>
                      {counties.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={flaggedFilter} onValueChange={setFlaggedFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Flagged" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="flagged">Flagged only</SelectItem>
                      <SelectItem value="not_flagged">Not flagged</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOfficialsDialogOpen(true);
                    }}
                  >
                    View officials & roles
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {saccosLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <DataTable
                    columns={columns}
                    data={filteredSaccos}
                    searchPlaceholder="Search organizations..."
                    searchKey="name"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disputes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Disputes escalated from counties
                </CardTitle>
                <CardDescription>
                  Resolve penalty disputes and sacco/stage issues escalated from county portals.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {disputeTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Scale className="h-12 w-12 mb-3 opacity-50" />
                    <p className="font-medium">No open disputes</p>
                    <p className="text-sm">
                      Disputes escalated from counties will appear here for resolution.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {disputeTickets.map(ticket => {
                      const county = ticket.county_id
                        ? countyMap.get(ticket.county_id)
                        : null;
                      return (
                        <li
                          key={ticket.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 first:pt-0"
                        >
                          <div>
                            <p className="font-medium">{ticket.subject}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {ticket.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{ticket.category.replace(/_/g, ' ')}</Badge>
                              {county && (
                                <span className="text-xs text-muted-foreground">
                                  {county.name}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(ticket.created_at), 'PPp')}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant={
                              ticket.status === 'open' ? 'destructive' : 'secondary'
                            }
                          >
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Officials & roles dialog */}
        <Dialog open={officialsDialogOpen} onOpenChange={setOfficialsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Officials and roles</DialogTitle>
              <DialogDescription>
                View Sacco and welfare officials by county. Select a county to see users with
                sacco_admin, sacco_officer, welfare_admin, welfare_officer roles.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select
                value={officialsCountyId ?? 'none'}
                onValueChange={v => setOfficialsCountyId(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select county" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select county</SelectItem>
                  {counties.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {officialsCountyId && (
                <div className="rounded-md border divide-y max-h-64 overflow-y-auto">
                  {officials.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                      No Sacco/welfare officials in this county.
                    </p>
                  ) : (
                    officials.map(o => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between gap-2 p-3"
                      >
                        <div>
                          <p className="font-medium">{o.full_name || o.email}</p>
                          <p className="text-xs text-muted-foreground">{o.email}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {o.roles.map(r => (
                            <Badge key={r.id} variant="secondary" className="text-xs">
                              {r.role.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Suspend confirmation */}
        <AlertDialog
          open={!!suspendSacco}
          onOpenChange={open => !open && setSuspendSacco(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Suspend organization</AlertDialogTitle>
              <AlertDialogDescription>
                Suspend &quot;{suspendSacco?.name}&quot;? Members and officials will be
                restricted until reinstated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() =>
                  suspendSacco &&
                  updateStatusMutation.mutate({
                    saccoId: suspendSacco.id,
                    status: 'suspended',
                  })
                }
              >
                Suspend
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reinstate confirmation */}
        <AlertDialog
          open={!!reinstateSacco}
          onOpenChange={open => !open && setReinstateSacco(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reinstate organization</AlertDialogTitle>
              <AlertDialogDescription>
                Reinstate &quot;{reinstateSacco?.name}&quot;? The organization will be active
                again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  reinstateSacco &&
                  updateStatusMutation.mutate({
                    saccoId: reinstateSacco.id,
                    status: 'approved',
                  })
                }
              >
                Reinstate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SuperAdminLayout>
  );
}
