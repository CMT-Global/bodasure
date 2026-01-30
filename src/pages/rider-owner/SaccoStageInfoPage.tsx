import { useState, useMemo, useEffect } from 'react';
import { RiderOwnerLayout } from '@/components/layout/RiderOwnerLayout';
import { useAuth } from '@/hooks/useAuth';
import { useRiderOwnerDashboard } from '@/hooks/useData';
import {
  useRiderUpdateRequests,
  useSubmitRiderUpdateRequest,
  type RiderUpdateRequest,
} from '@/hooks/useRiderUpdateRequests';
import { useSaccos, useStages, type Sacco, type Stage } from '@/hooks/useData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2, MapPin, Mail, Phone, AlertCircle, Loader2, Send, Clock, CheckCircle, XCircle, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

function SaccoStageContent() {
  const { user } = useAuth();
  const { data: dashboard, isLoading: dashboardLoading, error } = useRiderOwnerDashboard(user?.id);
  const rider = dashboard?.rider ?? null;
  const countyId = rider?.county_id;

  const { data: saccos = [] } = useSaccos(countyId);
  const [transferSaccoId, setTransferSaccoId] = useState<string>('');
  const stagesSaccoId = transferSaccoId || rider?.sacco_id || undefined;
  const { data: stages = [] } = useStages(countyId, stagesSaccoId);
  const { data: allStagesInCounty = [] } = useStages(countyId, undefined);

  const { data: updateRequests = [], isLoading: requestsLoading } = useRiderUpdateRequests(user?.id);
  const transferRequests = useMemo(
    () => updateRequests.filter((r) => r.request_type === 'sacco_stage_transfer'),
    [updateRequests]
  );

  const submitTransfer = useSubmitRiderUpdateRequest();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [requestedStageId, setRequestedStageId] = useState('');

  useEffect(() => {
    if (transferDialogOpen) setRequestedStageId('');
  }, [transferSaccoId]);

  const currentSacco = useMemo(
    () => (rider?.sacco_id ? saccos.find((s) => s.id === rider.sacco_id) : null),
    [rider?.sacco_id, saccos]
  );

  const handleSubmitTransfer = async () => {
    if (!rider || !countyId || !user?.id) return;
    const newSaccoId = transferSaccoId || rider.sacco_id;
    if (!requestedStageId.trim()) {
      toast.error('Please select a stage.');
      return;
    }
    const stage = stages.find((s) => s.id === requestedStageId);
    if (stage && stage.sacco_id !== newSaccoId) {
      toast.error('Selected stage does not belong to the selected Sacco.');
      return;
    }
    try {
      await submitTransfer.mutateAsync({
        county_id: countyId,
        rider_id: rider.id,
        request_type: 'sacco_stage_transfer',
        requested_by: user.id,
        payload: {
          requested_sacco_id: newSaccoId || null,
          requested_stage_id: requestedStageId,
        },
      });
      toast.success('Transfer request submitted. It will be reviewed by your county or Sacco.');
      setTransferDialogOpen(false);
      setTransferSaccoId('');
      setRequestedStageId('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit transfer request.');
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="font-semibold text-destructive">Failed to load</p>
        <p className="mt-1 text-sm text-muted-foreground">Please try again later.</p>
      </div>
    );
  }

  if (dashboardLoading || !user) {
    return (
      <div className="space-y-4 max-w-full min-w-0">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
          <Building2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight">No rider profile linked</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is not linked to a rider. Contact your Sacco or county admin to link your profile.
        </p>
      </div>
    );
  }

  const saccoName = rider.sacco?.name ?? null;
  const stageName = rider.stage?.name ?? null;

  return (
    <div className="space-y-6 max-w-full min-w-0 overflow-x-hidden">
      {/* Current assignment */}
      <Card className="overflow-hidden rounded-xl border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-lg font-semibold tracking-tight">Sacco / Welfare & Stage</CardTitle>
              <CardDescription className="text-sm">
                Your current Sacco (welfare group) and stage assignment.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/20 p-4 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assigned Sacco</p>
              <p className="mt-1.5 text-lg font-semibold">{saccoName ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assigned Stage</p>
              <p className="mt-1.5 text-lg font-semibold">{stageName ?? '—'}</p>
            </div>
          </div>

          {/* Leadership / contact (optional) */}
          {currentSacco && (currentSacco.contact_email || currentSacco.contact_phone || currentSacco.address) && (
            <div className="rounded-xl border border-border bg-muted/10 p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sacco contact (leadership)
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
                {currentSacco.contact_phone && (
                  <a
                    href={`tel:${currentSacco.contact_phone}`}
                    className="flex items-center gap-2.5 text-primary transition-colors hover:underline"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Phone className="h-4 w-4 text-primary" />
                    </span>
                    {currentSacco.contact_phone}
                  </a>
                )}
                {currentSacco.contact_email && (
                  <a
                    href={`mailto:${currentSacco.contact_email}`}
                    className="flex items-center gap-2.5 text-primary transition-colors hover:underline"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Mail className="h-4 w-4 text-primary" />
                    </span>
                    {currentSacco.contact_email}
                  </a>
                )}
                {currentSacco.address && (
                  <span className="flex items-center gap-2.5 text-muted-foreground">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <MapPin className="h-4 w-4 shrink-0" />
                    </span>
                    {currentSacco.address}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer request */}
      <Card className="overflow-hidden rounded-xl border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-lg font-semibold tracking-tight">Transfer request</CardTitle>
              <CardDescription className="text-sm">
                Request a change of stage or Sacco (welfare group). Requests are subject to approval by your county or Sacco.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <Button
            onClick={() => setTransferDialogOpen(true)}
            className="gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium hover:bg-primary/90 min-h-[44px] touch-manipulation w-full sm:w-auto"
          >
            <Send className="h-4 w-4 shrink-0" />
            Request stage or Sacco transfer
          </Button>

          {requestsLoading ? (
            <Skeleton className="h-20 w-full rounded-xl" />
          ) : transferRequests.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Your transfer requests
              </p>
              <ul className="space-y-2">
                {transferRequests.map((req) => (
                  <TransferRequestItem key={req.id} request={req} saccos={saccos} stages={allStagesInCounty} />
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <TransferRequestDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        saccos={saccos}
        stages={stages}
        currentSaccoId={rider.sacco_id}
        currentStageId={rider.stage_id}
        transferSaccoId={transferSaccoId}
        setTransferSaccoId={setTransferSaccoId}
        requestedStageId={requestedStageId}
        setRequestedStageId={setRequestedStageId}
        onSubmit={handleSubmitTransfer}
        isSubmitting={submitTransfer.isPending}
      />
    </div>
  );
}

function TransferRequestItem({
  request,
  saccos,
  stages,
}: {
  request: RiderUpdateRequest;
  saccos: Sacco[];
  stages: Stage[];
}) {
  const payload = request.payload as { requested_sacco_id?: string; requested_stage_id?: string } | undefined;
  const saccoId = payload?.requested_sacco_id;
  const stageId = payload?.requested_stage_id;
  const sacco = saccoId ? saccos.find((s) => s.id === saccoId) : null;
  const stage = stageId ? stages.find((s) => s.id === stageId) : null;
  const label = [sacco?.name, stage?.name].filter(Boolean).join(' · ') || 'Transfer';

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-muted/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="truncate text-sm font-medium">{label}</span>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <StatusBadge status={request.status} />
        <span className="text-xs text-muted-foreground">
          {request.created_at ? format(parseISO(request.created_at), 'dd MMM yyyy') : ''}
        </span>
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending') {
    return (
      <Badge variant="secondary" className="gap-1.5 rounded-full px-2.5 py-0.5 font-medium">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  }
  if (status === 'approved') {
    return (
      <Badge className="gap-1.5 rounded-full bg-green-600/90 px-2.5 py-0.5 font-medium hover:bg-green-600">
        <CheckCircle className="h-3 w-3" />
        Approved
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1.5 rounded-full px-2.5 py-0.5 font-medium">
      <XCircle className="h-3 w-3" />
      Rejected
    </Badge>
  );
}

function TransferRequestDialog({
  open,
  onOpenChange,
  saccos,
  stages,
  currentSaccoId,
  currentStageId,
  transferSaccoId,
  setTransferSaccoId,
  requestedStageId,
  setRequestedStageId,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saccos: Sacco[];
  stages: Stage[];
  currentSaccoId: string | null;
  currentStageId: string | null;
  transferSaccoId: string;
  setTransferSaccoId: (v: string) => void;
  requestedStageId: string;
  setRequestedStageId: (v: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const effectiveSaccoId = transferSaccoId || currentSaccoId;
  const stagesForSacco = useMemo(() => {
    if (!effectiveSaccoId) return stages;
    return stages.filter((s) => s.sacco_id === effectiveSaccoId);
  }, [stages, effectiveSaccoId]);

  const resetAndClose = () => {
    setTransferSaccoId(currentSaccoId || '');
    setRequestedStageId(currentStageId || '');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? resetAndClose() : onOpenChange(o))}>
      <DialogContent className="rounded-xl w-[calc(100vw-2rem)] sm:max-w-md max-w-[calc(100vw-2rem)] overflow-x-hidden">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold">Request stage or Sacco transfer</DialogTitle>
          <DialogDescription className="text-sm">
            Select the new Sacco (welfare group) and/or stage. Your request will be sent for approval.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sacco / Welfare group</Label>
            <Select value={transferSaccoId || currentSaccoId || ''} onValueChange={setTransferSaccoId}>
              <SelectTrigger className="rounded-lg min-h-[44px] touch-manipulation">
                <SelectValue placeholder="Select Sacco" />
              </SelectTrigger>
              <SelectContent>
                {saccos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Stage</Label>
            <Select
              value={requestedStageId}
              onValueChange={setRequestedStageId}
              disabled={!effectiveSaccoId && stagesForSacco.length === 0}
            >
              <SelectTrigger className="rounded-lg min-h-[44px] touch-manipulation">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stagesForSacco.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.location ? ` — ${s.location}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 flex-col-reverse sm:flex-row sm:gap-0">
          <Button variant="outline" onClick={() => resetAndClose()} disabled={isSubmitting} className="rounded-lg min-h-[44px] touch-manipulation w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting || !requestedStageId} className="rounded-lg gap-2 min-h-[44px] touch-manipulation w-full sm:w-auto">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Submitting…
              </>
            ) : (
              'Submit request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SaccoStageInfoPage() {
  return (
    <RiderOwnerLayout>
      <div className="space-y-5 sm:space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sacco / Welfare & Stage</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            View your assigned Sacco and stage, leadership contacts, and request a transfer.
          </p>
        </div>
        <SaccoStageContent />
      </div>
    </RiderOwnerLayout>
  );
}
