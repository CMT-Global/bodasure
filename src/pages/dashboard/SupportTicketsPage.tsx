import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import {
  useSupportTicketsForCounty,
  useUpdateSupportTicket,
  SUPPORT_CATEGORIES,
  SUPPORT_TICKET_STATUS_STYLES,
  type SupportTicket,
  type SupportTicketStatus,
} from '@/hooks/useSupportTickets';
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
import { AlertCircle, HelpCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TEXTAREA_MAX_CHARS, isOverCharLimit } from '@/utils/textareaCharLimit';

const STATUS_OPTIONS: { value: SupportTicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export default function SupportTicketsPage() {
  const { profile, roles } = useAuth();
  const countyId = useMemo(
    () => profile?.county_id ?? roles.find((r) => r.county_id)?.county_id ?? undefined,
    [profile, roles]
  );
  const { data: tickets = [], isLoading, error } = useSupportTicketsForCounty(countyId, true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  const filtered = useMemo(() => {
    let list = tickets;
    if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter((t) => t.category === categoryFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tickets, statusFilter, categoryFilter, search]);

  if (error) {
    return (
      <DashboardLayout>
        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
          <p className="text-destructive font-medium">Failed to load support tickets</p>
          <p className="text-sm text-muted-foreground mt-1">Please try again later.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Tickets submitted by riders and owners from the Support & Help page. Update status and add notes.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Tickets
            </CardTitle>
            <CardDescription>
              {countyId
                ? 'Tickets for your county. Platform admins see all tickets.'
                : 'All support tickets (platform admin view).'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Input
                placeholder="Search subject or description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs min-h-[44px]"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] min-h-[44px]">
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
                <SelectTrigger className="w-[180px] min-h-[44px]">
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
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <HelpCircle className="h-12 w-12 text-muted-foreground mb-3" />
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
                  {filtered.map((t) => (
                    <TicketCard
                      key={t.id}
                      ticket={t}
                      onSelect={() => setSelected(t)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {selected && (
        <TicketDetailDialog
          ticket={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => setSelected(null)}
        />
      )}
    </DashboardLayout>
  );
}

function TicketCard({
  ticket,
  onSelect,
}: {
  ticket: SupportTicket;
  onSelect: () => void;
}) {
  const cat = SUPPORT_CATEGORIES.find((c) => c.value === ticket.category)?.label ?? ticket.category;
  const sc = SUPPORT_TICKET_STATUS_STYLES[ticket.status] ?? 'bg-muted text-muted-foreground';

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
  onClose,
  onUpdated,
}: {
  ticket: SupportTicket;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [status, setStatus] = useState<SupportTicketStatus>(ticket.status);
  const [adminNotes, setAdminNotes] = useState(ticket.admin_notes ?? '');
  const updateTicket = useUpdateSupportTicket();

  const cat = SUPPORT_CATEGORIES.find((c) => c.value === ticket.category)?.label ?? ticket.category;

  const handleSave = () => {
    if (isOverCharLimit(adminNotes)) {
      toast.error(`Maximum ${TEXTAREA_MAX_CHARS} characters allowed.`);
      return;
    }
    updateTicket.mutate(
      { id: ticket.id, status, admin_notes: adminNotes.trim() || null },
      {
        onSuccess: () => {
          toast.success('Ticket updated');
          onUpdated();
          onClose();
        },
        onError: (e: Error) => toast.error(e.message ?? 'Update failed'),
      }
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ticket.subject}</DialogTitle>
          <DialogDescription>
            {cat} · {format(new Date(ticket.created_at), 'PPp')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Description</Label>
            <p className="text-sm mt-1 whitespace-pre-wrap">{ticket.description}</p>
          </div>
          {ticket.penalty_id && (
            <p className="text-xs text-muted-foreground">
              Linked penalty: {ticket.penalty_id}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="detail-status">Status</Label>
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
            <Label htmlFor="detail-notes">Admin notes</Label>
            <Textarea
              id="detail-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes for county support…"
              rows={3}
              className={cn('resize-y', isOverCharLimit(adminNotes) && 'border-destructive')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateTicket.isPending || isOverCharLimit(adminNotes)} className="gap-2">
            {updateTicket.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
