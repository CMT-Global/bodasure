import { useMemo, useState } from 'react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import {
  useSupportTicketsForCounty,
  useUpdateSupportTicket,
  SUPPORT_CATEGORIES,
  type SupportTicket,
  type SupportTicketStatus,
} from '@/hooks/useSupportTickets';
import { useAllCounties } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Headset, Loader2, MapPin, Clock, History } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: SupportTicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export default function IncidentEscalationSupportPage() {
  const { data: tickets = [], isLoading, error } = useSupportTicketsForCounty(undefined, true);
  const { data: counties = [] } = useAllCounties();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [countyFilter, setCountyFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  const allFiltered = useMemo(() => {
    let list = tickets;
    if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter((t) => t.category === categoryFilter);
    if (countyFilter !== 'all') list = list.filter((t) => (t.county_id ?? 'unassigned') === countyFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tickets, statusFilter, categoryFilter, countyFilter, search]);

  const escalatedDisputes = useMemo(
    () => tickets.filter((t) => t.category === 'penalty_dispute' && t.status !== 'closed'),
    [tickets]
  );

  if (error) {
    return (
      <SuperAdminLayout>
        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
          <p className="text-destructive font-medium">Failed to load support tickets</p>
          <p className="text-sm text-muted-foreground mt-1">Please try again later.</p>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Incident, Escalation & Support Management</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            View all support tickets, escalated disputes, reassign to counties, override county decisions, and track resolution timelines with audit trail.
          </p>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="all">All support tickets</TabsTrigger>
            <TabsTrigger value="disputes">
              Escalated disputes
              {escalatedDisputes.length > 0 && (
                <span className="ml-2 rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-medium text-destructive">
                  {escalatedDisputes.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Headset className="h-5 w-5" />
                  All support tickets
                </CardTitle>
                <CardDescription>
                  View and manage all support tickets across counties. Reassign tickets, override decisions, and track resolution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <Input
                    placeholder="Search subject or description…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full sm:max-w-xs min-h-[44px]"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px] min-h-[44px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {SUPPORT_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={countyFilter} onValueChange={setCountyFilter}>
                    <SelectTrigger className="w-[180px] min-h-[44px]">
                      <SelectValue placeholder="County" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All counties</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {counties.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                  </div>
                ) : allFiltered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Headset className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="font-medium text-muted-foreground">No tickets</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tickets.length === 0
                        ? 'No support tickets yet.'
                        : 'No tickets match the current filters.'}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[min(500px,60vh)]">
                    <div className="space-y-2 pr-2">
                      {allFiltered.map((t) => (
                        <TicketCard
                          key={t.id}
                          ticket={t}
                          counties={counties}
                          onSelect={() => setSelected(t)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disputes" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">Escalated disputes</CardTitle>
                <CardDescription>
                  Penalty disputes (open or in progress) that may require platform override or reassignment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                  </div>
                ) : escalatedDisputes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Headset className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="font-medium text-muted-foreground">No escalated disputes</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      No open or in-progress penalty disputes at the moment.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[min(400px,50vh)]">
                    <div className="space-y-2 pr-2">
                      {escalatedDisputes.map((t) => (
                        <TicketCard
                          key={t.id}
                          ticket={t}
                          counties={counties}
                          onSelect={() => setSelected(t)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selected && (
        <TicketDetailDialog
          ticket={selected}
          counties={counties}
          onClose={() => setSelected(null)}
          onUpdated={() => setSelected(null)}
        />
      )}
    </SuperAdminLayout>
  );
}

function TicketCard({
  ticket,
  counties,
  onSelect,
}: {
  ticket: SupportTicket;
  counties: { id: string; name: string }[];
  onSelect: () => void;
}) {
  const cat = SUPPORT_CATEGORIES.find((c) => c.value === ticket.category)?.label ?? ticket.category;
  const countyName = ticket.county_id
    ? counties.find((c) => c.id === ticket.county_id)?.name ?? 'Unknown'
    : 'Unassigned';
  const statusColors: Record<string, string> = {
    open: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    in_progress: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    resolved: 'bg-green-500/15 text-green-700 dark:text-green-400',
    closed: 'bg-muted text-muted-foreground',
  };
  const sc = statusColors[ticket.status] ?? 'bg-muted text-muted-foreground';

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{ticket.subject}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ticket.description}</p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', sc)}>
            {ticket.status.replace('_', ' ')}
          </span>
          <span className="text-xs text-muted-foreground">{cat}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {countyName}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(ticket.created_at), 'PPp')}
          </span>
        </div>
      </div>
    </div>
  );
}

function TicketDetailDialog({
  ticket,
  counties,
  onClose,
  onUpdated,
}: {
  ticket: SupportTicket;
  counties: { id: string; name: string }[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [status, setStatus] = useState<SupportTicketStatus>(ticket.status);
  const [adminNotes, setAdminNotes] = useState(ticket.admin_notes ?? '');
  const [reassignCountyId, setReassignCountyId] = useState<string>(ticket.county_id ?? '');
  const updateTicket = useUpdateSupportTicket();

  const cat = SUPPORT_CATEGORIES.find((c) => c.value === ticket.category)?.label ?? ticket.category;
  const currentCountyName = ticket.county_id
    ? counties.find((c) => c.id === ticket.county_id)?.name ?? 'Unknown'
    : 'Unassigned';

  const handleSave = () => {
    const updates: Parameters<typeof updateTicket.mutate>[0] = {
      id: ticket.id,
      status,
      admin_notes: adminNotes.trim() || null,
    };
    if (reassignCountyId !== (ticket.county_id ?? '')) {
      updates.county_id = reassignCountyId || null;
    }
    updateTicket.mutate(updates, {
      onSuccess: () => {
        toast.success('Ticket updated');
        onUpdated();
        onClose();
      },
      onError: (e: Error) => toast.error(e.message ?? 'Update failed'),
    });
  };

  const createdAt = new Date(ticket.created_at);
  const updatedAt = new Date(ticket.updated_at);
  const resolutionTimeline = createdAt.getTime() !== updatedAt.getTime()
    ? { created: createdAt, lastUpdated: updatedAt }
    : { created: createdAt, lastUpdated: null };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ticket.subject}</DialogTitle>
          <DialogDescription>
            {cat} · {currentCountyName} · {format(createdAt, 'PPp')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Description</Label>
            <p className="text-sm mt-1 whitespace-pre-wrap">{ticket.description}</p>
          </div>
          {ticket.penalty_id && (
            <p className="text-xs text-muted-foreground">Linked penalty: {ticket.penalty_id}</p>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Reassign to county
            </Label>
            <Select
              value={reassignCountyId || 'unassigned'}
              onValueChange={(v) => setReassignCountyId(v === 'unassigned' ? '' : v)}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="County" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {counties.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="detail-status">Override status (county decision)</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as SupportTicketStatus)}>
              <SelectTrigger id="detail-status" className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="detail-notes">Admin notes (override)</Label>
            <Textarea
              id="detail-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes; overrides county notes where permitted."
              rows={3}
              className="resize-y"
            />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Clock className="h-4 w-4" />
              Resolution timeline
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Created: {format(resolutionTimeline.created, 'PPp')}</li>
              {resolutionTimeline.lastUpdated && (
                <li>Last updated: {format(resolutionTimeline.lastUpdated, 'PPp')}</li>
              )}
            </ul>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <History className="h-4 w-4" />
              Escalation audit trail
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Created at {format(ticket.created_at, 'PPp')}</li>
              {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
                <li>Updated at {format(ticket.updated_at, 'PPp')}</li>
              )}
              {ticket.admin_notes && (
                <li className="pt-1 border-t mt-1">Last admin notes: {ticket.admin_notes}</li>
              )}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateTicket.isPending} className="gap-2">
            {updateTicket.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
