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
import { Building2, MapPin, Mail, Phone, AlertCircle, Loader2, Send, Clock, CheckCircle, XCircle } from 'lucide-react';
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
      <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
        <p className="text-destructive font-medium">Failed to load</p>
        <p className="text-sm text-muted-foreground mt-1">Please try again later.</p>
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
      <div className="rounded-xl border border-border bg-card p-6 text-center max-w-md mx-auto">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No rider profile linked</h2>
        <p className="text-sm text-muted-foreground">
          Your account is not linked to a rider. Contact your Sacco or county admin to link your profile.
        </p>
      </div>
    );
  }

  const saccoName = rider.sacco?.name ?? null;
  const stageName = rider.stage?.name ?? null;

  return (
    <div className="space-y-6 max-w-full min-w-0">
      {/* Current assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5" />
            Sacco / Welfare & Stage
          </CardTitle>
          <CardDescription>Your current Sacco (welfare group) and stage assignment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assigned Sacco</p>
              <p className="font-medium">{saccoName ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assigned Stage</p>
              <p className="font-medium">{stageName ?? '—'}</p>
            </div>
          </div>

          {/* Leadership / contact (optional) */}
          {currentSacco && (currentSacco.contact_email || currentSacco.contact_phone || currentSacco.address) && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Sacco contact (leadership)</p>
              <div className="flex flex-col gap-1.5 text-sm">
                {currentSacco.contact_phone && (
                  <a
                    href={`tel:${currentSacco.contact_phone}`}
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {currentSacco.contact_phone}
                  </a>
                )}
                {currentSacco.contact_email && (
                  <a
                    href={`mailto:${currentSacco.contact_email}`}
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {currentSacco.contact_email}
                  </a>
                )}
                {currentSacco.address && (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {currentSacco.address}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer request */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transfer request</CardTitle>
          <CardDescription>
            Request a change of stage or Sacco (welfare group). Requests are subject to approval by your county or Sacco.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => setTransferDialogOpen(true)} className="gap-2">
            <Send className="h-4 w-4" />
            Request stage or Sacco transfer
          </Button>

          {requestsLoading ? (
            <Skeleton className="h-20 w-full rounded-lg" />
          ) : transferRequests.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Your transfer requests</p>
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
    <li className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
      <span className="truncate">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={request.status} />
        <span className="text-muted-foreground text-xs">
          {request.created_at ? format(parseISO(request.created_at), 'dd MMM yyyy') : ''}
        </span>
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  }
  if (status === 'approved') {
    return (
      <Badge variant="default" className="gap-1 bg-green-600">
        <CheckCircle className="h-3 w-3" />
        Approved
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request stage or Sacco transfer</DialogTitle>
          <DialogDescription>
            Select the new Sacco (welfare group) and/or stage. Your request will be sent for approval.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Sacco / Welfare group</Label>
            <Select value={transferSaccoId || currentSaccoId || ''} onValueChange={setTransferSaccoId}>
              <SelectTrigger>
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
            <Label>Stage</Label>
            <Select
              value={requestedStageId}
              onValueChange={setRequestedStageId}
              disabled={!effectiveSaccoId && stagesForSacco.length === 0}
            >
              <SelectTrigger>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => resetAndClose()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting || !requestedStageId}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Sacco / Welfare & Stage</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            View your assigned Sacco and stage, leadership contacts, and request a transfer.
          </p>
        </div>
        <SaccoStageContent />
      </div>
    </RiderOwnerLayout>
  );
}
