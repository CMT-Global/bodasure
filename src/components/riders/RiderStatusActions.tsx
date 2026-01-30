import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { CheckCircle2, XCircle, Ban, RotateCcw, Loader2 } from 'lucide-react';

export interface RiderStatusActionsRider {
  id: string;
  full_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
}

interface RiderStatusActionsProps {
  rider: RiderStatusActionsRider | null;
  onSuccess?: () => void;
  disabled?: boolean;
  /** Optional label context, e.g. "member" for sacco or "rider" for county */
  contextLabel?: string;
}

export function RiderStatusActions({
  rider,
  onSuccess,
  disabled = false,
  contextLabel = 'rider',
}: RiderStatusActionsProps) {
  const queryClient = useQueryClient();
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showReinstateConfirm, setShowReinstateConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'approve' | 'reject' | 'suspend' | 'reinstate' | null
  >(null);

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      riderId,
      status,
    }: {
      riderId: string;
      status: 'approved' | 'rejected' | 'suspended';
    }) => {
      const { error } = await supabase
        .from('riders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', riderId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      queryClient.invalidateQueries({ queryKey: ['riders-with-details'] });
      queryClient.invalidateQueries({ queryKey: ['sacco-members'] });
      queryClient.invalidateQueries({ queryKey: ['sacco-pending-riders'] });
      toast.success(`${contextLabel === 'member' ? 'Member' : 'Rider'} ${status} successfully`);
      setShowApproveConfirm(false);
      setShowRejectConfirm(false);
      setShowSuspendConfirm(false);
      setShowReinstateConfirm(false);
      setPendingAction(null);
      onSuccess?.();
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Update failed');
      setPendingAction(null);
    },
  });

  const handleApprove = () => {
    if (!rider) return;
    setPendingAction('approve');
    updateStatusMutation.mutate({ riderId: rider.id, status: 'approved' });
  };
  const handleReject = () => {
    if (!rider) return;
    setPendingAction('reject');
    updateStatusMutation.mutate({ riderId: rider.id, status: 'rejected' });
  };
  const handleSuspend = () => {
    if (!rider) return;
    setPendingAction('suspend');
    updateStatusMutation.mutate({ riderId: rider.id, status: 'suspended' });
  };
  const handleReinstate = () => {
    if (!rider) return;
    setPendingAction('reinstate');
    updateStatusMutation.mutate({ riderId: rider.id, status: 'approved' });
  };

  if (!rider) return null;

  const isPending = rider.status === 'pending';
  const isApproved = rider.status === 'approved';
  const isSuspended = rider.status === 'suspended';
  const isRejected = rider.status === 'rejected';
  const canReinstate = isSuspended || isRejected;
  const busy = updateStatusMutation.isPending;

  return (
    <>
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Registration status</h4>
        <div className="flex flex-wrap gap-2">
          {isPending && (
            <>
              <Button
                size="sm"
                onClick={() => setShowApproveConfirm(true)}
                disabled={disabled || busy}
                className="gap-2 min-h-[44px] touch-manipulation"
              >
                {pendingAction === 'approve' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowRejectConfirm(true)}
                disabled={disabled || busy}
                className="gap-2 min-h-[44px] touch-manipulation"
              >
                {pendingAction === 'reject' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Reject
              </Button>
            </>
          )}
          {isApproved && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSuspendConfirm(true)}
              disabled={disabled || busy}
              className="gap-2 min-h-[44px] touch-manipulation"
            >
              {pendingAction === 'suspend' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Ban className="h-4 w-4" />
              )}
              Suspend
            </Button>
          )}
          {canReinstate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReinstateConfirm(true)}
              disabled={disabled || busy}
              className="gap-2 min-h-[44px] touch-manipulation"
            >
              {pendingAction === 'reinstate' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reinstate
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {contextLabel}</AlertDialogTitle>
            <AlertDialogDescription>
              Approve <strong>{rider.full_name}</strong>? They will be able to operate as a
              registered {contextLabel}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={busy}>
              {pendingAction === 'approve' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving…
                </>
              ) : (
                'Approve'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {contextLabel}</AlertDialogTitle>
            <AlertDialogDescription>
              Reject <strong>{rider.full_name}</strong>? They will not be approved as a registered{' '}
              {contextLabel}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pendingAction === 'reject' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting…
                </>
              ) : (
                'Reject'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSuspendConfirm} onOpenChange={setShowSuspendConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {contextLabel}</AlertDialogTitle>
            <AlertDialogDescription>
              Suspend <strong>{rider.full_name}</strong>? They will be temporarily unable to operate
              until reinstated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pendingAction === 'suspend' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suspending…
                </>
              ) : (
                'Suspend'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showReinstateConfirm} onOpenChange={setShowReinstateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reinstate {contextLabel}</AlertDialogTitle>
            <AlertDialogDescription>
              Reinstate <strong>{rider.full_name}</strong>? They will be approved and able to operate
              again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReinstate} disabled={busy}>
              {pendingAction === 'reinstate' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reinstating…
                </>
              ) : (
                'Reinstate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
