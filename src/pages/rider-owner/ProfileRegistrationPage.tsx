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
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

function BikeDetailsTable({
  bikes,
  showAssignedRider = false,
}: {
  bikes: RiderOwnerProfileBike[];
  showAssignedRider?: boolean;
}) {
  if (!bikes.length) {
    return (
      <p className="text-sm text-muted-foreground py-4">No bikes linked.</p>
    );
  }
  return (
    <div className="space-y-3">
      {bikes.map((b) => (
        <div
          key={b.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
        >
          <div className="flex items-center gap-2">
            <Bike className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{b.registration_number}</span>
            {(b.make || b.model) && (
              <span className="text-sm text-muted-foreground">
                {[b.make, b.model].filter(Boolean).join(' ')}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {b.year && <span>{b.year}</span>}
            {b.color && <span> · {b.color}</span>}
            {showAssignedRider && b.rider?.full_name && (
              <span className="flex items-center gap-1">
                · Rider: {b.rider.full_name}
              </span>
            )}
          </div>
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
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <User className="h-4 w-4" />
          Rider profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border-2 border-border">
            <AvatarImage src={rider?.photo_url ?? undefined} alt={rider?.full_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {rider ? getInitials(rider.full_name) : '—'}
            </AvatarFallback>
          </Avatar>
          <div className="grid gap-1 text-sm min-w-0 flex-1">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Full name</span>
              <span className="font-medium truncate">{rider?.full_name ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">{rider?.phone ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">ID number</span>
              <span className="font-medium">{rider?.id_number ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">County</span>
              <span className="font-medium">{countyName ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-2 flex-wrap">
              <span className="text-muted-foreground">Sacco / Stage</span>
              <span className="font-medium">
                {[saccoName, stageName].filter(Boolean).join(' · ') || '—'}
              </span>
            </div>
          </div>
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
      <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
        <p className="text-destructive font-medium">Failed to load profile</p>
        <p className="text-sm text-muted-foreground mt-1">Please try again later.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!rider && !owner) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center max-w-md mx-auto">
        <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No profile linked</h2>
        <p className="text-sm text-muted-foreground">
          Your account is not linked to a rider or owner record. Contact your Sacco or
          county admin to link your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {rider && (
        <>
          <ProfileView data={data!} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Bike className="h-4 w-4" />
                Bike details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BikeDetailsTable bikes={motorbikes} showAssignedRider={false} />
            </CardContent>
          </Card>
        </>
      )}

      {owner && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Owner view
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{owner.full_name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{owner.phone}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">ID number</span>
                <span className="font-medium">{owner.id_number}</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Owned bikes
              </h4>
              <BikeDetailsTable bikes={ownedBikes} showAssignedRider />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Update requests
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            You cannot edit critical fields directly. Submit a change request for
            county/sacco approval.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {rider && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRequestDialog({ open: true, type: 'phone' })}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Phone update
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRequestDialog({ open: true, type: 'photo' })}
                >
                  <FileImage className="h-4 w-4 mr-2" />
                  Photo update
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRequestDialog({ open: true, type: 'sacco_stage_transfer' })
                  }
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Sacco / stage transfer
                </Button>
              </>
            )}
            {owner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setRequestDialog({ open: true, type: 'owner_rider_reassignment' })
                }
              >
                <UserCog className="h-4 w-4 mr-2" />
                Owner / rider reassignment
              </Button>
            )}
          </div>

          {requests.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Your requests</h4>
              <ScrollArea className="h-[200px] rounded-lg border">
                <div className="p-2 space-y-2">
                  {requests.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm"
                    >
                      <div>
                        <span className="font-medium capitalize">
                          {r.request_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          {format(new Date(r.created_at), 'dd MMM yyyy')}
                        </span>
                      </div>
                      <Badge
                        variant={
                          r.status === 'approved'
                            ? 'default'
                            : r.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                        }
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
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Profile &amp; Registration</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            View your rider profile, bike details, and submit update requests.
          </p>
        </div>
        <ProfileRegistrationContent />
      </div>
    </RiderOwnerLayout>
  );
}
