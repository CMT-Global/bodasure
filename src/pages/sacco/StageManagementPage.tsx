import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SaccoPortalLayout } from '@/components/layout/SaccoPortalLayout';
import { useSaccos, useStages, useSaccoMembers, Stage, type RiderWithDetails } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Plus,
  MapPin,
  Users,
  MoreHorizontal,
  Eye,
  UserPlus,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { useIsMobile } from '@/hooks/use-mobile';
import { stageFormSchema, STAGE_CAPACITY_MIN, STAGE_CAPACITY_MAX, type StageFormValues } from '@/lib/zod';

const PROBLEMATIC_COMPLIANCE_THRESHOLD = 50;
const PROBLEMATIC_PENALTIES_THRESHOLD = 3;

export default function StageManagementPage() {
  const { profile, roles } = useAuth();
  const countyId = useMemo(
    () => profile?.county_id ?? roles.find((r) => r.county_id)?.county_id ?? undefined,
    [profile, roles]
  );

  const { data: saccos = [], isLoading: saccosLoading } = useSaccos(countyId);
  const [saccoId, setSaccoId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (saccos.length > 0 && !saccoId) setSaccoId(saccos[0].id);
    if (saccos.length === 0) setSaccoId(undefined);
  }, [saccos, saccoId]);

  const { data: stages = [], isLoading: stagesLoading } = useStages(countyId, saccoId);
  const { data: members = [] } = useSaccoMembers(saccoId, countyId);

  const [isRequestStageOpen, setIsRequestStageOpen] = useState(false);
  const [viewStage, setViewStage] = useState<Stage | null>(null);
  const [assignStage, setAssignStage] = useState<Stage | null>(null);

  const stagesForSacco = useMemo(() => stages, [stages]);

  const columns: ColumnDef<Stage>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Stage',
        cell: ({ row }) => {
          const stage = row.original;
          const isProblematic =
            (stage.compliance_rate ?? 100) < PROBLEMATIC_COMPLIANCE_THRESHOLD ||
            (stage.penalties_count ?? 0) >= PROBLEMATIC_PENALTIES_THRESHOLD;
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{stage.name}</p>
                  {isProblematic && (
                    <span
                      className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-1.5 py-0.5 text-xs font-medium text-destructive"
                      title="Low compliance or high penalties"
                    >
                      <AlertTriangle className="h-3 w-3" /> At risk
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{stage.location || 'No location'}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'member_count',
        header: 'Members',
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            {row.original.member_count ?? 0}
            {row.original.capacity != null && (
              <span className="text-muted-foreground">/ {row.original.capacity}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'compliance_rate',
        header: 'Compliance',
        cell: ({ row }) => {
          const rate = row.original.compliance_rate ?? 100;
          const isLow = rate < PROBLEMATIC_COMPLIANCE_THRESHOLD;
          return (
            <span className={isLow ? 'font-medium text-destructive' : 'text-muted-foreground'}>
              {rate}%
            </span>
          );
        },
      },
      {
        accessorKey: 'penalties_count',
        header: 'Penalties',
        cell: ({ row }) => {
          const count = row.original.penalties_count ?? 0;
          const isHigh = count >= PROBLEMATIC_PENALTIES_THRESHOLD;
          return (
            <span className={isHigh ? 'font-medium text-destructive' : 'text-muted-foreground'}>
              {count}
            </span>
          );
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const stage = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setViewStage(stage)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View members
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAssignStage(stage)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign members
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    []
  );

  return (
    <SaccoPortalLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Stage Management</h1>
            <p className="text-muted-foreground">
              Manage stages, assign riders, and monitor compliance.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-56">
              <Select
                value={saccoId ?? ''}
                onValueChange={(v) => setSaccoId(v || undefined)}
                disabled={saccosLoading || saccos.length === 0}
              >
                <SelectTrigger className="min-h-[44px] touch-target">
                  <SelectValue placeholder={saccosLoading ? 'Loading…' : 'Select sacco'} />
                </SelectTrigger>
                <SelectContent>
                  {saccos.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="min-h-[44px]">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setIsRequestStageOpen(true)}
              disabled={!saccoId || saccosLoading}
              className="min-h-[44px]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Request new stage
            </Button>
          </div>
        </div>

        {!countyId ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No county linked to your account. Contact an administrator.
          </div>
        ) : saccos.length === 0 && !saccosLoading ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No saccos in your county.
          </div>
        ) : !saccoId ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            Select a sacco to manage stages.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stage-level compliance summary */}
            <Card>
              <CardHeader>
                <CardTitle>Stage compliance summary</CardTitle>
                <CardDescription>
                  Stages with compliance below {PROBLEMATIC_COMPLIANCE_THRESHOLD}% or with{' '}
                  {PROBLEMATIC_PENALTIES_THRESHOLD}+ penalties are flagged as at risk.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-w-full min-w-0">
                <DataTable
                  columns={columns}
                  data={stagesForSacco}
                  searchPlaceholder="Search stages..."
                  isLoading={stagesLoading}
                  mobileCardRender={(stage) => {
                    const isProblematic =
                      (stage.compliance_rate ?? 100) < PROBLEMATIC_COMPLIANCE_THRESHOLD ||
                      (stage.penalties_count ?? 0) >= PROBLEMATIC_PENALTIES_THRESHOLD;
                    return (
                      <Card className="overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <MapPin className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{stage.name}</p>
                              <p className="text-xs text-muted-foreground">{stage.location || 'No location'}</p>
                              {isProblematic && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-1.5 py-0.5 text-xs font-medium text-destructive mt-1">
                                  <AlertTriangle className="h-3 w-3" /> At risk
                                </span>
                              )}
                            </div>
                            <StatusBadge status={stage.status} />
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {stage.member_count ?? 0}
                              {stage.capacity != null && ` / ${stage.capacity}`}
                            </span>
                            <span>Compliance: {stage.compliance_rate ?? 100}%</span>
                            <span>Penalties: {stage.penalties_count ?? 0}</span>
                          </div>
                          <div className="flex flex-col gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full min-h-[44px] touch-manipulation"
                              onClick={() => setViewStage(stage)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View members
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full min-h-[44px] touch-manipulation"
                              onClick={() => setAssignStage(stage)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Assign members
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <RequestStageDialog
        open={isRequestStageOpen}
        onOpenChange={setIsRequestStageOpen}
        countyId={countyId ?? ''}
        saccoId={saccoId ?? ''}
      />

      <ViewStageMembersDialog
        open={!!viewStage}
        onOpenChange={(open) => !open && setViewStage(null)}
        stage={viewStage}
        members={members}
      />

      <AssignMembersDialog
        open={!!assignStage}
        onOpenChange={(open) => !open && setAssignStage(null)}
        stage={assignStage}
        members={members}
        stages={stagesForSacco}
      />
    </SaccoPortalLayout>
  );
}

function RequestStageDialog({
  open,
  onOpenChange,
  countyId,
  saccoId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countyId: string;
  saccoId: string;
}) {
  const queryClient = useQueryClient();

  const form = useForm<StageFormValues>({
    resolver: zodResolver(stageFormSchema),
    defaultValues: {
      name: '',
      location: '',
      capacity: '',
      sacco_id: saccoId,
      status: 'pending',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: '',
        location: '',
        capacity: '',
        sacco_id: saccoId,
        status: 'pending',
      });
    }
  }, [open, saccoId, form]);

  const mutation = useMutation({
    mutationFn: async (values: StageFormValues) => {
      const payload = {
        name: values.name.trim(),
        location: (values.location ?? '').trim() || null,
        capacity: values.capacity?.trim() ? parseInt(values.capacity.trim(), 10) : null,
        county_id: countyId,
        sacco_id: values.sacco_id,
        status: values.status,
      };
      const { error } = await supabase.from('stages').insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success('Stage request submitted. County approval required.');
      form.reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request new stage</DialogTitle>
          <DialogDescription>
            Submit a new stage for county approval. Name and location will be reviewed.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Central Stage" className="min-h-[44px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Address or landmark" className="min-h-[44px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={STAGE_CAPACITY_MIN}
                      max={STAGE_CAPACITY_MAX}
                      placeholder={`Max members (${STAGE_CAPACITY_MIN}–${STAGE_CAPACITY_MAX})`}
                      className="min-h-[44px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="min-h-[44px] touch-manipulation"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="min-h-[44px] touch-manipulation"
              >
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ViewStageMembersDialog({
  open,
  onOpenChange,
  stage,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: Stage | null;
  members: RiderWithDetails[];
}) {
  const stageMembers = useMemo(() => {
    if (!stage) return [];
    return members.filter((m) => m.stage_id === stage.id);
  }, [stage, members]);

  if (!stage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{stage.name} – members</DialogTitle>
          <DialogDescription>
            {stageMembers.length} member{stageMembers.length !== 1 ? 's' : ''} assigned to this
            stage.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-md border">
          {stageMembers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No members assigned yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {stageMembers.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium">{m.full_name}</p>
                    <p className="text-sm text-muted-foreground">{m.phone}</p>
                  </div>
                  {m.compliance_status && (
                    <StatusBadge status={m.compliance_status} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-[44px] touch-manipulation">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const NO_STAGE_VALUE = '__none__';

function AssignMembersDialog({
  open,
  onOpenChange,
  stage,
  members,
  stages,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: Stage | null;
  members: RiderWithDetails[];
  stages: Stage[];
}) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [assignments, setAssignments] = useState<Record<string, string>>({}); // rider_id -> stage_id or NO_STAGE_VALUE

  useEffect(() => {
    if (!open || !members.length) {
      setAssignments({});
      return;
    }
    const initial: Record<string, string> = {};
    members.forEach((m) => {
      initial[m.id] = m.stage_id ?? NO_STAGE_VALUE;
    });
    setAssignments(initial);
  }, [open, members]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!stage) return;
      for (const [riderId, stageId] of Object.entries(assignments)) {
        const valueToSave = stageId === NO_STAGE_VALUE ? null : stageId;
        const { error } = await supabase
          .from('riders')
          .update({ stage_id: valueToSave })
          .eq('id', riderId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      queryClient.invalidateQueries({ queryKey: ['sacco-members'] });
      toast.success('Assignments updated.');
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!stage) return null;

  const stageOptions = stages.map((s) => ({ id: s.id, name: s.name }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] flex flex-col mx-4 sm:mx-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle>Assign members to {stage.name}</DialogTitle>
          <DialogDescription>
            Set each member&apos;s stage. Only members assigned to this stage will appear under View
            members.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto rounded-md border min-h-0 overflow-x-hidden">
          {isMobile ? (
            <ul className="divide-y divide-border p-2">
              {members.map((m) => (
                <li key={m.id} className="p-3 space-y-2">
                  <p className="font-medium truncate">{m.full_name}</p>
                  <p className="text-xs text-muted-foreground">{m.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    Current: {m.stage_id ? stages.find((s) => s.id === m.stage_id)?.name ?? '—' : 'No stage'}
                  </p>
                  <Select
                    value={assignments[m.id] ?? (m.stage_id ?? NO_STAGE_VALUE)}
                    onValueChange={(v) =>
                      setAssignments((prev) => ({ ...prev, [m.id]: v }))
                    }
                  >
                    <SelectTrigger className="w-full min-h-[44px] touch-manipulation">
                      <SelectValue placeholder="Assign to stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_STAGE_VALUE} className="min-h-[44px]">No stage</SelectItem>
                      {stageOptions.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="min-h-[44px]">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          ) : (
            <table className="w-full text-sm min-w-0">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium">Member</th>
                  <th className="text-left p-3 font-medium">Current stage</th>
                  <th className="text-left p-3 font-medium">Assign to</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="p-3">
                      <p className="font-medium">{m.full_name}</p>
                      <p className="text-muted-foreground">{m.phone}</p>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {m.stage_id ? stages.find((s) => s.id === m.stage_id)?.name ?? '—' : 'No stage'}
                    </td>
                    <td className="p-3">
                      <Select
                        value={assignments[m.id] ?? (m.stage_id ?? NO_STAGE_VALUE)}
                        onValueChange={(v) =>
                          setAssignments((prev) => ({ ...prev, [m.id]: v }))
                        }
                      >
                        <SelectTrigger className="h-9 w-full max-w-[180px] min-h-[44px]">
                          <SelectValue placeholder="Stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_STAGE_VALUE}>No stage</SelectItem>
                          {stageOptions.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <DialogFooter className="flex-shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-[44px] touch-manipulation">
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="min-h-[44px] touch-manipulation">
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
