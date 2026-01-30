import { useState, useEffect } from 'react';
import { RiderOwnerLayout } from '@/components/layout/RiderOwnerLayout';
import { useAuth } from '@/hooks/useAuth';
import {
  useRiderOwnerProfile,
  useSaccos,
  useStages,
  type RiderOwnerProfileBike,
  type RiderOwnerProfileData,
} from '@/hooks/useData';
import {
  useRiderUpdateRequests,
  useSubmitRiderUpdateRequest,
  type RiderUpdateRequestType,
} from '@/hooks/useRiderUpdateRequests';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';
import {
  User,
  Bike,
  Building2,
  MapPin,
  AlertCircle,
  Loader2,
  Send,
  FileImage,
  Phone,
  ArrowLeftRight,
  UserCog,
  IdCard,
  Hash,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 font-medium text-foreground truncate">
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

function BikeDetailsTable({
  bikes,
  showAssignedRider = false,
}: {
  bikes: RiderOwnerProfileBike[];
  showAssignedRider?: boolean;
}) {
  if (!bikes.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 py-10 text-center">
        <Bike className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">No bikes linked</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {bikes.map((b) => (
        <div
          key={b.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/5 p-4 transition-colors hover:bg-muted/10"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bike className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">
                {b.registration_number}
              </p>
              {(b.make || b.model) && (
                <p className="text-sm text-muted-foreground truncate">
                  {[b.make, b.model].filter(Boolean).join(' ')}
                  {b.year ? ` · ${b.year}` : ''}
                  {b.color ? ` · ${b.color}` : ''}
                </p>
              )}
            </div>
          </div>
          {showAssignedRider && b.rider?.full_name && (
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
              <User className="h-3.5 w-3.5" />
              {b.rider.full_name}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProfileView({ data }: { data: RiderOwnerProfileData }) {
  const rider = data.rider;
  const countyName = rider?.county?.name ?? null;
  const saccoName = rider?.sacco?.name ?? null;
  const stageName = rider?.stage?.name ?? null;
  const saccoStage = [saccoName, stageName].filter(Boolean).join(' · ') || null;
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <Card className="overflow-hidden border-border/80 shadow-lg">
      <div className="relative h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
      <CardContent className="relative pt-0 pb-6">
        <div className="-mt-12 flex flex-col sm:flex-row sm:items-end gap-6">
          <Avatar className="h-24 w-24 shrink-0 border-4 border-card shadow-xl ring-2 ring-primary/30">
            <AvatarImage src={rider?.photo_url ?? undefined} alt={rider?.full_name} />
            <AvatarFallback className="bg-primary/20 text-primary text-2xl font-semibold">
              {rider ? getInitials(rider.full_name) : '—'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 pb-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {rider?.full_name ?? '—'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Rider profile
            </p>
          </div>
        </div>
        <Separator className="my-6 bg-border/60" />
        <div className="grid gap-0 divide-y divide-border/60">
          <InfoRow icon={User} label="Full name" value={rider?.full_name ?? undefined} />
          <InfoRow icon={Phone} label="Phone" value={rider?.phone ?? undefined} />
          <InfoRow icon={IdCard} label="ID number" value={rider?.id_number ?? undefined} />
          <InfoRow icon={MapPin} label="County" value={countyName ?? undefined} />
          <InfoRow icon={Building2} label="Sacco / Stage" value={saccoStage ?? undefined} />
        </div>
      </CardContent>
    </Card>
  );
}

function UpdateRequestDialog({
  open,
  onOpenChange,
  type,
  riderId,
  ownerId,
  countyId,
  requestedBy,
  ownedBikes,
  saccoId,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: RiderUpdateRequestType;
  riderId: string | null;
  ownerId: string | null;
  countyId: string;
  requestedBy: string;
  ownedBikes: RiderOwnerProfileBike[];
  saccoId: string | null;
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const [phone, setPhone] = useState('');
  const [photoNote, setPhotoNote] = useState('');
  const [saccoIdSelect, setSaccoIdSelect] = useState('');
  const [stageIdSelect, setStageIdSelect] = useState('');
  const [reassignBikeId, setReassignBikeId] = useState('');
  const [reassignNote, setReassignNote] = useState('');

  const { data: saccos = [] } = useSaccos(countyId);
  const { data: stages = [] } = useStages(countyId, saccoIdSelect || saccoId || undefined);

  useEffect(() => {
    if (!open) {
      setPhone('');
      setPhotoNote('');
      setSaccoIdSelect('');
      setStageIdSelect('');
      setReassignBikeId('');
      setReassignNote('');
    }
  }, [open]);

  const handleSubmit = () => {
    if (type === 'phone') {
      if (!phone.trim()) {
        toast.error('Enter a phone number');
        return;
      }
      onSubmit({ new_phone: phone.trim() });
    } else if (type === 'photo') {
      onSubmit({ note: photoNote.trim() || undefined });
    } else if (type === 'sacco_stage_transfer') {
      if (!saccoIdSelect && !stageIdSelect) {
        toast.error('Select a new sacco or stage');
        return;
      }
      onSubmit({
        new_sacco_id: saccoIdSelect || undefined,
        new_stage_id: stageIdSelect || undefined,
        note: undefined,
      });
    } else if (type === 'owner_rider_reassignment') {
      onSubmit({
        motorbike_id: reassignBikeId || undefined,
        note: reassignNote.trim() || undefined,
      });
    }
  };

  const titles: Record<RiderUpdateRequestType, string> = {
    phone: 'Request phone update',
    photo: 'Request photo update',
    sacco_stage_transfer: 'Sacco / stage transfer request',
    owner_rider_reassignment: 'Owner / rider reassignment request',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titles[type]}</DialogTitle>
          <DialogDescription>
            Your request will be sent to the county/sacco approval queue. You cannot
            edit these details directly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {type === 'phone' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">New phone number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254..."
                />
              </div>
            </>
          )}
          {type === 'photo' && (
            <div className="space-y-2">
              <Label htmlFor="photo-note">Note (optional)</Label>
              <Textarea
                id="photo-note"
                value={photoNote}
                onChange={(e) => setPhotoNote(e.target.value)}
                placeholder="e.g. I will upload a new photo separately..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Request a profile photo update. County may contact you for the new
                image.
              </p>
            </div>
          )}
          {type === 'sacco_stage_transfer' && (
            <>
              <div className="space-y-2">
                <Label>Sacco</Label>
                <Select value={saccoIdSelect} onValueChange={setSaccoIdSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sacco (optional)" />
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
                <Select value={stageIdSelect} onValueChange={setStageIdSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {type === 'owner_rider_reassignment' && (
            <>
              {ownedBikes.length > 0 && (
                <div className="space-y-2">
                  <Label>Bike</Label>
                  <Select value={reassignBikeId} onValueChange={setReassignBikeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bike (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {ownedBikes.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.registration_number}
                          {b.rider?.full_name ? ` — ${b.rider.full_name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reassign-note">Note</Label>
                <Textarea
                  id="reassign-note"
                  value={reassignNote}
                  onChange={(e) => setReassignNote(e.target.value)}
                  placeholder="e.g. Assign rider X to this bike..."
                  rows={3}
                />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit request
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfileRegistrationContent() {
  const { user } = useAuth();
  const { data, isLoading, error } = useRiderOwnerProfile(user?.id);
  const { data: requests = [] } = useRiderUpdateRequests(user?.id);
  const submitRequest = useSubmitRiderUpdateRequest();
  const [requestDialog, setRequestDialog] = useState<{
    open: boolean;
    type: RiderUpdateRequestType;
  }>({ open: false, type: 'phone' });

  const rider = data?.rider ?? null;
  const owner = data?.owner ?? null;
  const motorbikes = data?.motorbikes ?? [];
  const ownedBikes = data?.ownedBikes ?? [];
  const countyId = rider?.county_id ?? owner?.county_id ?? '';
  const saccoId = rider?.sacco_id ?? null;

  const handleSubmitRequest = (payload: Record<string, unknown>) => {
    const isReassignment = requestDialog.type === 'owner_rider_reassignment';
    submitRequest.mutate(
      {
        county_id: countyId,
        rider_id: !isReassignment && rider ? rider.id : undefined,
        owner_id: isReassignment && owner ? owner.id : undefined,
        request_type: requestDialog.type,
        payload,
        requested_by: user!.id!,
      },
      {
        onSuccess: () => {
          setRequestDialog((p) => ({ ...p, open: false }));
          toast.success('Request submitted. It will be reviewed by county/sacco.');
        },
        onError: (e: Error) => {
          toast.error(e.message || 'Failed to submit request');
        },
      }
    );
  };

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-8 text-center max-w-md mx-auto">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mx-auto mb-4">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <p className="text-destructive font-semibold">Failed to load profile</p>
        <p className="text-sm text-muted-foreground mt-2">Please try again later.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-full min-w-0">
        <div className="flex gap-4">
          <Skeleton className="h-24 w-24 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!rider && !owner) {
    return (
      <div className="rounded-xl border border-border/80 bg-card shadow-sm p-8 sm:p-10 text-center max-w-md mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mx-auto mb-5">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">No profile linked</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your account is not linked to a rider or owner record. Contact your Sacco or
          county admin to link your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full min-w-0">
      {rider && (
        <>
          <ProfileView data={data!} />
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bike className="h-5 w-5" />
                </div>
                Bike details
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Motorbikes linked to your rider profile
              </p>
            </CardHeader>
            <CardContent>
              <BikeDetailsTable bikes={motorbikes} showAssignedRider={false} />
            </CardContent>
          </Card>
        </>
      )}

      {owner && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              Owner profile
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Your owner record and owned bikes
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-0 divide-y divide-border/60 rounded-xl border border-border/80 bg-muted/5 p-4">
              <InfoRow icon={User} label="Name" value={owner.full_name} />
              <InfoRow icon={Phone} label="Phone" value={owner.phone} />
              <InfoRow icon={IdCard} label="ID number" value={owner.id_number} />
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                Owned bikes
              </h4>
              <BikeDetailsTable bikes={ownedBikes} showAssignedRider />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserCog className="h-5 w-5" />
            </div>
            Update requests
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Submit a change request for county/sacco approval. Critical fields cannot be edited directly.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rider && (
              <>
                <button
                  type="button"
                  onClick={() => setRequestDialog({ open: true, type: 'phone' })}
                  className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/5 p-4 text-left transition-colors hover:bg-primary/10 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground">Phone update</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Change your phone number</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestDialog({ open: true, type: 'photo' })}
                  className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/5 p-4 text-left transition-colors hover:bg-primary/10 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileImage className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground">Photo update</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Request a new profile photo</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRequestDialog({ open: true, type: 'sacco_stage_transfer' })
                  }
                  className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/5 p-4 text-left transition-colors hover:bg-primary/10 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ArrowLeftRight className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground">Sacco / stage transfer</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Change sacco or stage</p>
                  </div>
                </button>
              </>
            )}
            {owner && (
              <button
                type="button"
                onClick={() =>
                  setRequestDialog({ open: true, type: 'owner_rider_reassignment' })
                }
                className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/5 p-4 text-left transition-colors hover:bg-primary/10 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50 sm:col-span-2 lg:col-span-1"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserCog className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-foreground">Owner / rider reassignment</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Reassign rider to a bike</p>
                </div>
              </button>
            )}
          </div>

          {requests.length > 0 && (
            <div className="rounded-xl border border-border/80 bg-muted/5 overflow-hidden">
              <div className="border-b border-border/60 bg-muted/10 px-4 py-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" />
                  Your requests
                </h4>
              </div>
              <ScrollArea className="h-[220px]">
                <div className="p-3 space-y-2">
                  {requests.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-4 py-3"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-foreground capitalize">
                          {r.request_type.replace(/_/g, ' ')}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(r.created_at), 'dd MMM yyyy, HH:mm')}
                        </p>
                      </div>
                      <Badge
                        variant={
                          r.status === 'approved'
                            ? 'default'
                            : r.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="shrink-0 capitalize"
                      >
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      <UpdateRequestDialog
        open={requestDialog.open}
        onOpenChange={(open) => setRequestDialog((p) => ({ ...p, open }))}
        type={requestDialog.type}
        riderId={rider?.id ?? null}
        ownerId={owner?.id ?? null}
        countyId={countyId}
        requestedBy={user!.id!}
        ownedBikes={ownedBikes}
        saccoId={saccoId}
        onSubmit={handleSubmitRequest}
        isSubmitting={submitRequest.isPending}
      />
    </div>
  );
}

export default function ProfileRegistrationPage() {
  return (
    <RiderOwnerLayout>
      <div className="space-y-6 sm:space-y-8 animate-fade-in">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Profile &amp; Registration
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
            View your rider profile, bike details, and submit update requests for approval.
          </p>
        </div>
        <ProfileRegistrationContent />
      </div>
    </RiderOwnerLayout>
  );
}
