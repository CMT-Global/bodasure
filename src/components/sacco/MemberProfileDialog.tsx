import { useState } from 'react';
import { RiderWithDetails } from '@/hooks/useData';
import { useRiderPenalties } from '@/hooks/usePenalties';
import { useStages } from '@/hooks/useData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Bike,
  Building2,
  MapPin as MapPinIcon,
  CheckCircle2,
  XCircle,
  Ban,
  RotateCcw,
  Loader2,
  History,
} from 'lucide-react';
import { format } from 'date-fns';
import { RegistrationHistory } from '@/components/registration/RegistrationHistory';

interface MemberProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rider: RiderWithDetails | null;
  countyId: string | undefined;
  saccoId: string | undefined;
}

export function MemberProfileDialog({
  open,
  onOpenChange,
  rider,
  countyId,
  saccoId,
}: MemberProfileDialogProps) {
  const queryClient = useQueryClient();
  const [transferStageId, setTransferStageId] = useState<string>('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showReinstateConfirm, setShowReinstateConfirm] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | 'suspend' | 'reinstate' | 'transfer' | null>(null);

  const { data: penalties = [], isLoading: penaltiesLoading } = useRiderPenalties(
    rider?.id ?? '',
    countyId
  );
  const { data: stages = [] } = useStages(countyId, saccoId);

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
      queryClient.invalidateQueries({ queryKey: ['sacco-members'] });
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      toast.success(`Member ${status} successfully`);
      setShowApproveConfirm(false);
      setShowRejectConfirm(false);
      setShowSuspendConfirm(false);
      setShowReinstateConfirm(false);
      setPendingAction(null);
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Update failed');
      setPendingAction(null);
    },
  });

  const transferMutation = useMutation({
    mutationFn: async ({
      riderId,
      stageId,
    }: {
      riderId: string;
      stageId: string;
    }) => {
      const { error } = await supabase
        .from('riders')
        .update({ stage_id: stageId, updated_at: new Date().toISOString() })
        .eq('id', riderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sacco-members'] });
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      toast.success('Member transferred to new stage');
      setShowTransferConfirm(false);
      setTransferStageId('');
      setPendingAction(null);
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Transfer failed');
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
  const handleTransfer = () => {
    if (!rider || !transferStageId) return;
    setPendingAction('transfer');
    transferMutation.mutate({ riderId: rider.id, stageId: transferStageId });
  };

  const isPending = rider?.status === 'pending';
  const isApproved = rider?.status === 'approved';
  const isSuspended = rider?.status === 'suspended';
  const isRejected = rider?.status === 'rejected';
  const canReinstate = isSuspended || isRejected;
  const stagesForTransfer = stages.filter((s) => s.id !== rider?.stage_id);
  const busy = updateStatusMutation.isPending || transferMutation.isPending;

  if (!rider) return null;

  const initials = rider.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Member Profile</DialogTitle>
            <DialogDescription>
              View permit status, penalties, compliance history. Approve, suspend, or transfer members.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={rider.photo_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{rider.full_name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">ID: {rider.id_number}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge status={rider.status} />
                    <StatusBadge status={rider.compliance_status} />
                    {rider.permit && <StatusBadge status={rider.permit.status} />}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Contact</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{rider.phone}</span>
                  </div>
                  {rider.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{rider.email}</span>
                    </div>
                  )}
                  {rider.address && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{rider.address}</span>
                    </div>
                  )}
                  {rider.date_of_birth && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(rider.date_of_birth), 'PPP')}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Organization & Permit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Organization</h4>
                  <div className="space-y-2">
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Sacco</p>
                      </div>
                      <p className="font-medium">{rider.sacco?.name || 'Not assigned'}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Stage</p>
                      </div>
                      <p className="font-medium">{rider.stage?.name || 'Not assigned'}</p>
                    </div>
                    {rider.motorbike && (
                      <div className="rounded-lg border border-border p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Bike className="h-4 w-4 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Plate</p>
                        </div>
                        <p className="font-medium font-mono">{rider.motorbike.registration_number}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Permit status</h4>
                  {rider.permit ? (
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Permit</p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium font-mono">{rider.permit.permit_number}</p>
                        <StatusBadge status={rider.permit.status} />
                        {rider.permit.expires_at && (
                          <p className="text-xs text-muted-foreground">
                            Expires: {format(new Date(rider.permit.expires_at), 'PPP')}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm text-muted-foreground">No active permit</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Penalties */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Penalties</h4>
                {penaltiesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : penalties.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No penalties</p>
                ) : (
                  <div className="space-y-2">
                    {penalties.slice(0, 10).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">{p.penalty_type}</p>
                          {p.description && (
                            <p className="text-xs text-muted-foreground">{p.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(p.created_at), 'PP')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-medium">KES {Number(p.amount).toLocaleString()}</p>
                          <StatusBadge
                            status={p.is_paid ? 'paid' : 'unpaid'}
                          />
                        </div>
                      </div>
                    ))}
                    {penalties.length > 10 && (
                      <p className="text-xs text-muted-foreground">
                        +{penalties.length - 10} more
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Compliance history */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Compliance history
                </h4>
                <RegistrationHistory riderId={rider.id} />
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Actions</h4>
                <div className="flex flex-wrap gap-2">
                  {isPending && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setShowApproveConfirm(true)}
                        disabled={busy}
                        className="gap-2"
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
                        disabled={busy}
                        className="gap-2"
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
                      disabled={busy}
                      className="gap-2"
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
                      disabled={busy}
                      className="gap-2"
                    >
                      {pendingAction === 'reinstate' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      Reinstate
                    </Button>
                  )}
                  {stagesForTransfer.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={transferStageId}
                        onValueChange={setTransferStageId}
                        disabled={busy}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Transfer to stage…" />
                        </SelectTrigger>
                        <SelectContent>
                          {stagesForTransfer.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (transferStageId) setShowTransferConfirm(true);
                          else toast.error('Select a stage first');
                        }}
                        disabled={!transferStageId || busy}
                        className="gap-2"
                      >
                        {pendingAction === 'transfer' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Transfer (approval required)
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Approve */}
      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve member</AlertDialogTitle>
            <AlertDialogDescription>
              Approve <strong>{rider?.full_name}</strong> as a member? They will be able to operate
              under this sacco.
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

      {/* Reject */}
      <AlertDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject member</AlertDialogTitle>
            <AlertDialogDescription>
              Reject <strong>{rider?.full_name}</strong>? They will not be able to join this sacco.
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

      {/* Suspend */}
      <AlertDialog open={showSuspendConfirm} onOpenChange={setShowSuspendConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend member</AlertDialogTitle>
            <AlertDialogDescription>
              Suspend <strong>{rider?.full_name}</strong>? They will be temporarily unable to
              operate under this sacco until reinstated.
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

      {/* Reinstate */}
      <AlertDialog open={showReinstateConfirm} onOpenChange={setShowReinstateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reinstate member</AlertDialogTitle>
            <AlertDialogDescription>
              Reinstate <strong>{rider?.full_name}</strong>? They will be approved and able to
              operate again under this sacco.
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

      {/* Transfer */}
      <AlertDialog open={showTransferConfirm} onOpenChange={setShowTransferConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer member</AlertDialogTitle>
            <AlertDialogDescription>
              Transfer <strong>{rider?.full_name}</strong> to{' '}
              <strong>{stages.find((s) => s.id === transferStageId)?.name ?? 'selected stage'}</strong>?
              This change requires confirmation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransfer} disabled={busy}>
              {pendingAction === 'transfer' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring…
                </>
              ) : (
                'Confirm transfer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
