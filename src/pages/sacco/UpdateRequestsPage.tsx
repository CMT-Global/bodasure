import { useState } from 'react';
import { SaccoPortalLayout } from '@/components/layout/SaccoPortalLayout';
import { useAuth } from '@/hooks/useAuth';
import {
  useRiderUpdateRequestsForSacco,
  useReviewRiderUpdateRequest,
  type RiderUpdateRequest,
  type RiderUpdateRequestWithNames,
  type RiderUpdateRequestType,
} from '@/hooks/useRiderUpdateRequests';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, XCircle, Loader2, FileEdit } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const REQUEST_TYPE_LABELS: Record<RiderUpdateRequestType, string> = {
  phone: 'Phone update',
  photo: 'Photo update',
  sacco_stage_transfer: 'Sacco / stage transfer',
  owner_rider_reassignment: 'Owner / rider reassignment',
};

function payloadSummary(req: RiderUpdateRequest): string {
  const p = req.payload as Record<string, unknown>;
  if (req.request_type === 'phone' && typeof p.new_phone === 'string') return p.new_phone;
  if (req.request_type === 'photo' && p.note) return String(p.note);
  if (req.request_type === 'sacco_stage_transfer') {
    const parts = [];
    if (p.new_sacco_id) parts.push('new sacco');
    if (p.new_stage_id) parts.push('new stage');
    return parts.length ? parts.join(', ') : '—';
  }
  if (req.request_type === 'owner_rider_reassignment' && p.motorbike_id) return 'Reassign bike';
  return '—';
}

function requestUserName(req: RiderUpdateRequestWithNames): string {
  const riderOrOwnerName = req.riders?.full_name ?? req.owners?.full_name ?? null;
  if (riderOrOwnerName) return riderOrOwnerName;
  return req.requested_by_name ?? '—';
}

export default function SaccoUpdateRequestsPage() {
  const { user } = useAuth();
  const [statusFilterValue, setStatusFilterValue] = useState<string>('pending');
  const { data: requests = [], isLoading, error } = useRiderUpdateRequestsForSacco(
    statusFilterValue === 'all' ? undefined : (statusFilterValue as 'pending' | 'approved' | 'rejected')
  );
  const reviewMutation = useReviewRiderUpdateRequest();
  const [detailRequest, setDetailRequest] = useState<RiderUpdateRequestWithNames | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; request: RiderUpdateRequestWithNames | null }>({
    open: false,
    request: null,
  });
  const [rejectNotes, setRejectNotes] = useState('');

  const handleApprove = (req: RiderUpdateRequestWithNames) => {
    if (!user?.id) return;
    reviewMutation.mutate(
      {
        requestId: req.id,
        action: 'approve',
        reviewedBy: user.id,
      },
      {
        onSuccess: () => {
          toast.success('Request approved');
          setDetailRequest(null);
        },
        onError: (e: Error) => toast.error(e.message ?? 'Failed to approve'),
      }
    );
  };

  const handleReject = (req: RiderUpdateRequestWithNames) => {
    setRejectDialog({ open: true, request: req });
  };

  const confirmReject = () => {
    const req = rejectDialog.request;
    if (!req || !user?.id) return;
    reviewMutation.mutate(
      {
        requestId: req.id,
        action: 'reject',
        notes: rejectNotes.trim() || undefined,
        reviewedBy: user.id,
      },
      {
        onSuccess: () => {
          toast.success('Request rejected');
          setRejectDialog({ open: false, request: null });
          setRejectNotes('');
          setDetailRequest(null);
        },
        onError: (e: Error) => toast.error(e.message ?? 'Failed to reject'),
      }
    );
  };

  if (error) {
    return (
      <SaccoPortalLayout>
        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
          <p className="text-destructive font-medium">Failed to load update requests</p>
          <p className="text-sm text-muted-foreground mt-1">Please try again later.</p>
        </div>
      </SaccoPortalLayout>
    );
  }

  return (
    <SaccoPortalLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Update requests</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Riders and owners raise these from Rider-Owner → Profile. Approve or reject requests for your sacco&apos;s members.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              Pending &amp; recent requests
            </CardTitle>
            <CardDescription>
              Requests submitted from the rider-owner profile (phone, photo, sacco/stage transfer, rider reassignment).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Select value={statusFilterValue} onValueChange={setStatusFilterValue}>
                <SelectTrigger className="w-[160px] min-h-[44px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <p className="text-muted-foreground text-sm py-6 text-center">
                {statusFilterValue === 'pending'
                  ? 'No pending requests. Riders and owners submit requests from Rider-Owner → Profile.'
                  : 'No requests match the selected filter.'}
              </p>
            ) : (
              <ScrollArea className="h-[400px] sm:h-[500px] rounded-lg border border-border/60">
                <div className="p-3 space-y-2">
                  {requests.map((r) => (
                    <div
                      key={r.id}
                      className={cn(
                        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-4 py-3',
                        detailRequest?.id === r.id && 'ring-2 ring-primary/50'
                      )}
                    >
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => setDetailRequest(detailRequest?.id === r.id ? null : r)}
                      >
                        <span className="font-medium text-foreground">
                          {REQUEST_TYPE_LABELS[r.request_type]}
                        </span>
                        <p className="text-sm text-foreground/90 mt-0.5">
                          {requestUserName(r)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(r.created_at), 'dd MMM yyyy, HH:mm')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Summary: {payloadSummary(r)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={
                            r.status === 'approved'
                              ? 'default'
                              : r.status === 'rejected'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="capitalize"
                        >
                          {r.status}
                        </Badge>
                        {r.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="min-h-[36px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(r);
                              }}
                              disabled={reviewMutation.isPending}
                            >
                              {reviewMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Accept
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-[36px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReject(r);
                              }}
                              disabled={reviewMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Detail dialog */}
        <Dialog open={!!detailRequest} onOpenChange={(open) => !open && setDetailRequest(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {detailRequest ? REQUEST_TYPE_LABELS[detailRequest.request_type] : ''}
              </DialogTitle>
              <DialogDescription>
                {detailRequest &&
                  `Submitted ${format(new Date(detailRequest.created_at), 'dd MMM yyyy, HH:mm')}. ${payloadSummary(detailRequest)}`}
              </DialogDescription>
            </DialogHeader>
            {detailRequest && (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">User:</span>{' '}
                  <span className="font-medium text-foreground">{requestUserName(detailRequest)}</span>
                </p>
                {detailRequest.requested_by_name && (
                  <p>
                    <span className="text-muted-foreground">Requested by:</span>{' '}
                    {detailRequest.requested_by_name}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <Badge
                    variant={
                      detailRequest.status === 'approved'
                        ? 'default'
                        : detailRequest.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className="capitalize"
                  >
                    {detailRequest.status}
                  </Badge>
                </p>
                {detailRequest.request_type === 'phone' && (
                  <p>
                    <span className="text-muted-foreground">New phone:</span>{' '}
                    {(detailRequest.payload as Record<string, unknown>).new_phone as string}
                  </p>
                )}
                {detailRequest.notes && (
                  <p>
                    <span className="text-muted-foreground">Notes:</span> {detailRequest.notes}
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              {detailRequest?.status === 'pending' && (
                <>
                  <Button
                    variant="default"
                    onClick={() => handleApprove(detailRequest)}
                    disabled={reviewMutation.isPending}
                  >
                    {reviewMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Accept'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReject(detailRequest)}
                    disabled={reviewMutation.isPending}
                  >
                    Decline
                  </Button>
                </>
              )}
              <Button variant="ghost" onClick={() => setDetailRequest(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject confirmation */}
        <AlertDialog
          open={rejectDialog.open}
          onOpenChange={(open) => {
            if (!open) setRejectDialog({ open: false, request: null });
            setRejectNotes('');
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Decline request?</AlertDialogTitle>
              <AlertDialogDescription>
                The requester will see this as rejected. You can add a note (optional).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <label className="text-sm font-medium text-foreground">Note (optional)</label>
              <Textarea
                className="mt-1 min-h-[80px]"
                placeholder="Reason for declining…"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmReject}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {reviewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Decline'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SaccoPortalLayout>
  );
}
