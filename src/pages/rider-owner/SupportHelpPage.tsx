import { useState } from 'react';
import { RiderOwnerLayout } from '@/components/layout/RiderOwnerLayout';
import { useAuth } from '@/hooks/useAuth';
import { useRiderOwnerDashboard } from '@/hooks/useData';
import { useRiderPenalties } from '@/hooks/usePenalties';
import {
  useMySupportTickets,
  useCreateSupportTicket,
  SUPPORT_CATEGORIES,
  SUPPORT_TICKET_STATUS_STYLES,
  type SupportTicketCategory,
  type SupportTicket,
} from '@/hooks/useSupportTickets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, HelpCircle, Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TEXTAREA_MAX_CHARS, isOverCharLimit } from '@/components/ui/textarea';
import { supportTicketFormSchema } from '@/lib/zod';

function SupportHelpContent() {
  const { user, profile, roles } = useAuth();
  const { data: dashboard, isLoading: dashboardLoading, error } = useRiderOwnerDashboard(user?.id);
  const rider = dashboard?.rider ?? null;
  const countyId = rider?.county_id ?? profile?.county_id ?? roles.find((r) => r.county_id)?.county_id ?? null;
  const { data: penalties = [] } = useRiderPenalties(rider?.id ?? '', countyId ?? undefined);
  const { data: tickets = [], isLoading: ticketsLoading, error: ticketsError } = useMySupportTickets(!!user);
  const createTicket = useCreateSupportTicket();

  const [category, setCategory] = useState<SupportTicketCategory | ''>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [penaltyId, setPenaltyId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{
    category?: string;
    subject?: string;
    description?: string;
  }>({});

  const overCharLimit = isOverCharLimit(description);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const payload = {
      category: category || undefined,
      subject: subject.trim(),
      description: description.trim(),
      penalty_id: category === 'penalty_dispute' && penaltyId ? penaltyId : undefined,
    };
    const result = supportTicketFormSchema.safeParse(payload);
    if (!result.success) {
      const issues = result.error.flatten().fieldErrors;
      setFormErrors({
        category: issues.category?.[0],
        subject: issues.subject?.[0],
        description: issues.description?.[0],
      });
      return;
    }
    createTicket.mutate(
      {
        county_id: countyId,
        category: result.data.category as SupportTicketCategory,
        subject: result.data.subject,
        description: result.data.description,
        penalty_id: result.data.category === 'penalty_dispute' && result.data.penalty_id ? result.data.penalty_id : null,
      },
      {
        onSuccess: () => {
          toast.success('Support ticket submitted. County support will review it shortly.');
          setCategory('');
          setSubject('');
          setDescription('');
          setPenaltyId(null);
          setFormErrors({});
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Failed to submit ticket.');
        },
      }
    );
  };

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
        <p className="text-destructive font-medium">Failed to load</p>
        <p className="text-sm text-muted-foreground mt-1">Please try again later.</p>
      </div>
    );
  }

  if (dashboardLoading || !dashboard) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full min-w-0 overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold break-words">Support & Help</h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-1">
          Contact support or report an issue. Tickets are visible to county support and admins.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Contact Support / Report Issue
          </CardTitle>
          <CardDescription>
            Choose a category, add a subject and description. For penalty disputes you may optionally link a specific penalty.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v as SupportTicketCategory | '');
                  if (formErrors.category) setFormErrors((e) => ({ ...e, category: undefined }));
                }}
              >
                <SelectTrigger id="category" className={cn('min-h-[44px]', formErrors.category && 'border-destructive')}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.category && (
                <p className="text-xs text-destructive">{formErrors.category}</p>
              )}
            </div>

            {category === 'penalty_dispute' && rider && penalties.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="penalty">Link penalty (optional)</Label>
                <Select value={penaltyId ?? '__none__'} onValueChange={(v) => setPenaltyId(v === '__none__' ? null : v)}>
                  <SelectTrigger id="penalty" className="min-h-[44px]">
                    <SelectValue placeholder="Optional: select penalty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {penalties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.penalty_type} — KES {Number(p.amount).toLocaleString()}
                        {p.description ? ` — ${p.description.slice(0, 40)}${p.description.length > 40 ? '…' : ''}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  if (formErrors.subject) setFormErrors((e) => ({ ...e, subject: undefined }));
                }}
                placeholder="Brief summary of the issue"
                className={cn('min-h-[44px]', formErrors.subject && 'border-destructive')}
                maxLength={200}
              />
              {formErrors.subject && (
                <p className="text-xs text-destructive">{formErrors.subject}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (formErrors.description) setFormErrors((e) => ({ ...e, description: undefined }));
                }}
                placeholder="Provide details so we can help you quickly."
                rows={4}
                className={cn(
                  'resize-y min-h-[100px]',
                  (overCharLimit || formErrors.description) && 'border-destructive focus-visible:ring-destructive'
                )}
              />
              {formErrors.description && (
                <p className="text-xs text-destructive">{formErrors.description}</p>
              )}
            </div>

            <Button type="submit" disabled={createTicket.isPending || overCharLimit} className="gap-2 min-h-[44px] touch-manipulation w-full sm:w-auto">
              {createTicket.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : (
                <Send className="h-4 w-4 shrink-0" />
              )}
              Submit ticket
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My tickets</CardTitle>
          <CardDescription>
            Your submitted support tickets. County support will update status and may add notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ticketsError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
              Failed to load tickets.
            </div>
          )}
          {ticketsLoading && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          )}
          {!ticketsLoading && !ticketsError && tickets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="font-medium text-muted-foreground">No tickets yet</p>
              <p className="text-sm text-muted-foreground mt-1">Submit a ticket above to get help.</p>
            </div>
          )}
          {!ticketsLoading && !ticketsError && tickets.length > 0 && (
            <ScrollArea className="h-[min(400px,50vh)]">
              <div className="space-y-2 pr-2">
                {tickets.map((t) => (
                  <TicketRow key={t.id} ticket={t} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const DESCRIPTION_PREVIEW_CHARS = 150;

function TicketRow({ ticket }: { ticket: SupportTicket }) {
  const [expanded, setExpanded] = useState(false);
  const cat = SUPPORT_CATEGORIES.find((c) => c.value === ticket.category)?.label ?? ticket.category;
  const sc = SUPPORT_TICKET_STATUS_STYLES[ticket.status] ?? 'bg-muted text-muted-foreground';
  const showExpand = ticket.description.length > DESCRIPTION_PREVIEW_CHARS;
  const displayDescription = showExpand && !expanded
    ? `${ticket.description.slice(0, DESCRIPTION_PREVIEW_CHARS).trim()}…`
    : ticket.description;

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-sm">{ticket.subject}</span>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', sc)}>
          {ticket.status.replace('_', ' ')}
        </span>
        <span className="text-xs text-muted-foreground">{cat}</span>
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{displayDescription}</p>
      {showExpand && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
      {ticket.admin_notes && (
        <div className="rounded bg-muted/60 p-2 text-sm">
          <span className="font-medium text-muted-foreground">Support note:</span>{' '}
          <span className="text-foreground">{ticket.admin_notes}</span>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{format(new Date(ticket.created_at), 'PPp')}</p>
    </div>
  );
}

export default function SupportHelpPage() {
  return (
    <RiderOwnerLayout>
      <SupportHelpContent />
    </RiderOwnerLayout>
  );
}
