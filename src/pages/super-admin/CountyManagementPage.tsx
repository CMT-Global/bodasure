import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import {
  County,
  useAllCounties,
  useCreateCounty,
  useUpdateCounty,
  useDeleteCounty,
  useSetCountyLocked,
  fetchDashboardStatsForCounty,
  CountyInsert,
  CountyUpdate,
} from '@/hooks/useData';
import { useQueries } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, MoreHorizontal, Edit, Trash2, CheckCircle, XCircle, Lock, Unlock, Map, Loader2 } from 'lucide-react';
import { useCountyUsers } from '@/hooks/useUserManagement';
import { useAssignUserRoles } from '@/hooks/useUserManagement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { countyFormSchema, type CountyFormValues } from '@/lib/zod';

const COUNTY_STATUS_LABELS: Record<string, string> = {
  pending: 'Pilot',
  active: 'Live',
  suspended: 'Suspended',
  inactive: 'Inactive',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);
}

export default function CountyManagementPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [selectedCounty, setSelectedCounty] = useState<County | null>(null);

  const { data: counties = [], isLoading: countiesLoading } = useAllCounties();
  const countyIds = useMemo(() => counties.map((c) => c.id), [counties]);

  const statsQueries = useQueries({
    queries: countyIds.map((id) => ({
      queryKey: ['county-stats', id],
      queryFn: () => fetchDashboardStatsForCounty(id),
      enabled: !!id,
    })),
  });

  const statsMap = useMemo(() => {
    const map: Record<string, Awaited<ReturnType<typeof fetchDashboardStatsForCounty>>> = {};
    countyIds.forEach((id, i) => {
      const result = statsQueries[i]?.data;
      if (result) map[id] = result;
    });
    return map;
  }, [countyIds, statsQueries]);

  const createMutation = useCreateCounty();
  const updateMutation = useUpdateCounty();
  const deleteMutation = useDeleteCounty();
  const lockMutation = useSetCountyLocked();

  const columns: ColumnDef<County>[] = [
    {
      accessorKey: 'name',
      header: 'County',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {row.original.logo_url ? (
              <img src={row.original.logo_url} alt="" className="h-8 w-8 rounded object-contain" />
            ) : (
              <Map className="h-4 w-4" />
            )}
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.code}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'riders',
      header: 'Riders',
      cell: ({ row }) => {
        const stats = statsMap[row.original.id];
        return <span className="text-sm">{stats?.totalRiders ?? '—'}</span>;
      },
    },
    {
      id: 'activePermits',
      header: 'Active Permits',
      cell: ({ row }) => {
        const stats = statsMap[row.original.id];
        return <span className="text-sm">{stats?.activePermits ?? '—'}</span>;
      },
    },
    {
      id: 'revenue',
      header: 'Revenue',
      cell: ({ row }) => {
        const stats = statsMap[row.original.id];
        return <span className="text-sm">{stats ? formatCurrency(stats.totalRevenue) : '—'}</span>;
      },
    },
    {
      id: 'compliance',
      header: 'Compliance',
      cell: ({ row }) => {
        const stats = statsMap[row.original.id];
        const rate = stats?.complianceRate ?? null;
        if (rate === null) return <span className="text-muted-foreground">—</span>;
        const isLow = rate < 80;
        return (
          <span className={`text-sm font-medium ${isLow ? 'text-amber-600' : 'text-green-600'}`}>
            {rate}%
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {COUNTY_STATUS_LABELS[row.original.status] ?? row.original.status}
        </span>
      ),
    },
    {
      id: 'locked',
      header: 'Locked',
      cell: ({ row }) => {
        const settings = row.original.settings as Record<string, unknown> | undefined;
        const locked = !!settings?.locked;
        return locked ? <Lock className="h-4 w-4 text-amber-600" /> : <Unlock className="h-4 w-4 text-muted-foreground" />;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const county = row.original;
        const settings = county.settings as Record<string, unknown> | undefined;
        const locked = !!settings?.locked;
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
              <DropdownMenuItem onClick={() => { setSelectedCounty(county); setIsFormOpen(true); }}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              {county.status !== 'active' && (
                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: county.id, payload: { status: 'active' } })}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Activate
                </DropdownMenuItem>
              )}
              {county.status !== 'inactive' && (
                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: county.id, payload: { status: 'inactive' } })}>
                  <XCircle className="mr-2 h-4 w-4" /> Deactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => lockMutation.mutate({ id: county.id, locked: !locked })}>
                {locked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                {locked ? 'Unlock' : 'Lock (read-only)'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setSelectedCounty(county); setIsDeleteOpen(true); setDeleteConfirmName(''); }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete county data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const canDelete = selectedCounty && deleteConfirmName.trim().toLowerCase() === selectedCounty.name.trim().toLowerCase();
  const isDeleting = deleteMutation.isPending;

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Multi-County Management</h1>
            <p className="text-muted-foreground">
              Create, edit, activate/deactivate counties • View rider count, permits, revenue, compliance • Lock or delete county data
            </p>
          </div>
          <Button onClick={() => { setSelectedCounty(null); setIsFormOpen(true); }} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" /> Create county
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={counties}
          searchKey="name"
          searchPlaceholder="Search counties..."
          isLoading={countiesLoading}
          mobileCardRender={(county) => {
            const stats = statsMap[county.id];
            const settings = county.settings as Record<string, unknown> | undefined;
            const locked = !!settings?.locked;
            return (
              <Card className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {county.logo_url ? (
                          <img src={county.logo_url} alt="" className="h-8 w-8 rounded object-contain" />
                        ) : (
                          <Map className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{county.name}</p>
                        <p className="text-xs text-muted-foreground">{county.code}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setSelectedCounty(county); setIsFormOpen(true); }}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        {county.status !== 'active' && (
                          <DropdownMenuItem onClick={() => updateMutation.mutate({ id: county.id, payload: { status: 'active' } })}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Activate
                          </DropdownMenuItem>
                        )}
                        {county.status !== 'inactive' && (
                          <DropdownMenuItem onClick={() => updateMutation.mutate({ id: county.id, payload: { status: 'inactive' } })}>
                            <XCircle className="mr-2 h-4 w-4" /> Deactivate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => lockMutation.mutate({ id: county.id, locked: !locked })}>
                          {locked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                          {locked ? 'Unlock' : 'Lock (read-only)'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => { setSelectedCounty(county); setIsDeleteOpen(true); setDeleteConfirmName(''); }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete county data
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Riders</span>
                      <p className="font-medium">{stats?.totalRiders ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Permits</span>
                      <p className="font-medium">{stats?.activePermits ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Revenue</span>
                      <p className="font-medium truncate">{stats ? formatCurrency(stats.totalRevenue) : '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Compliance</span>
                      <p className="font-medium">
                        {stats?.complianceRate != null ? (
                          <span className={stats.complianceRate < 80 ? 'text-amber-600' : 'text-green-600'}>{stats.complianceRate}%</span>
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t">
                    <span className="text-xs font-medium">{COUNTY_STATUS_LABELS[county.status] ?? county.status}</span>
                    {locked ? <Lock className="h-4 w-4 text-amber-600 shrink-0" /> : <Unlock className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>
                </CardContent>
              </Card>
            );
          }}
        />

        {/* Create / Edit County Dialog */}
        <CountyFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          county={selectedCounty}
          onSuccess={() => { setSelectedCounty(null); setIsFormOpen(false); }}
        />

        {/* Delete confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete county data</AlertDialogTitle>
              <AlertDialogDescription>
                This action is <strong>irreversible</strong>. All data for this county (riders, permits, payments, etc.) will be permanently deleted.
                Type the county name below to confirm: <strong>{selectedCounty?.name}</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Input
                placeholder="Type county name to confirm"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                className="font-mono"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirmName('')}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!canDelete || isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (selectedCounty && canDelete) {
                    deleteMutation.mutate(selectedCounty.id, {
                      onSuccess: () => {
                        setIsDeleteOpen(false);
                        setSelectedCounty(null);
                        setDeleteConfirmName('');
                      },
                    });
                  }
                }}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete permanently'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SuperAdminLayout>
  );
}

function getCountyFormDefaultValues(county: County | null): CountyFormValues {
  return {
    name: county?.name ?? '',
    code: county?.code ?? '',
    logo_url: county?.logo_url ?? '',
    contact_email: county?.contact_email ?? '',
    contact_phone: county?.contact_phone ?? '',
    address: county?.address ?? '',
    status: (county?.status as CountyFormValues['status']) ?? 'pending',
  };
}

function CountyFormDialog({
  open,
  onOpenChange,
  county,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  county: County | null;
  onSuccess: () => void;
}) {
  const isEdit = !!county;
  const [assignEmail, setAssignEmail] = useState('');

  const form = useForm<CountyFormValues>({
    resolver: zodResolver(countyFormSchema),
    defaultValues: getCountyFormDefaultValues(county),
  });

  useEffect(() => {
    if (open) {
      form.reset(getCountyFormDefaultValues(county));
      setAssignEmail('');
    }
  }, [open, county]);

  const createMutation = useCreateCounty();
  const updateMutation = useUpdateCounty();
  const { data: countyUsers = [] } = useCountyUsers(county?.id);
  const assignRoles = useAssignUserRoles();

  const countySuperAdmin = countyUsers.find((u) => u.roles.some((r) => r.role === 'county_super_admin' && r.county_id === county?.id));

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset();
    onOpenChange(next);
  };

  const onSubmit = (values: CountyFormValues) => {
    const payloadBase = {
      name: values.name.trim(),
      code: values.code.trim(),
      logo_url: values.logo_url?.trim() || null,
      contact_email: values.contact_email?.trim() || null,
      contact_phone: values.contact_phone?.trim() || null,
      address: values.address?.trim() || null,
      status: values.status as County['status'],
    };
    if (isEdit && county) {
      updateMutation.mutate(
        { id: county.id, payload: payloadBase as CountyUpdate },
        {
          onSuccess: () => {
            onSuccess();
            handleOpenChange(false);
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          ...payloadBase,
          logo_url: payloadBase.logo_url ?? undefined,
          contact_email: payloadBase.contact_email ?? undefined,
          contact_phone: payloadBase.contact_phone ?? undefined,
          address: payloadBase.address ?? undefined,
        } as CountyInsert,
        {
          onSuccess: () => {
            onSuccess();
            handleOpenChange(false);
          },
        }
      );
    }
  };

  const handleAssignSuperAdmin = async () => {
    if (!county?.id || !assignEmail.trim()) {
      toast.error('Enter an email to assign');
      return;
    }
    const { data: profiles } = await supabase.from('profiles').select('id').eq('email', assignEmail.trim().toLowerCase()).limit(1);
    const user = profiles?.[0];
    if (!user) {
      toast.error('No user found with that email');
      return;
    }
    assignRoles.mutate(
      { userId: user.id, countyId: county.id, roles: ['county_super_admin'] },
      {
        onSuccess: () => {
          toast.success('County Super Admin assigned');
          setAssignEmail('');
        },
      }
    );
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit county' : 'Create county'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update county profile, branding, contact details and status.' : 'Add a new county. You can assign a County Super Admin after creation.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>County name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Nairobi" disabled={isEdit} />
                  </FormControl>
                  {isEdit && <p className="text-xs text-muted-foreground">Name cannot be changed after creation.</p>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. NBI" disabled={isEdit} />
                  </FormControl>
                  {isEdit && <p className="text-xs text-muted-foreground">Code cannot be changed after creation.</p>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} placeholder="county@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+254..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="County HQ address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pilot</SelectItem>
                      <SelectItem value="active">Live</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEdit && county && (
              <div className="grid gap-2 pt-2 border-t">
                <p className="text-sm font-medium">County Super Admin</p>
                {countySuperAdmin ? (
                  <p className="text-sm text-muted-foreground">
                    Current: {countySuperAdmin.email} {countySuperAdmin.full_name && `(${countySuperAdmin.full_name})`}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not assigned</p>
                )}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Assign by email"
                    value={assignEmail}
                    onChange={(e) => setAssignEmail(e.target.value)}
                  />
                  <Button type="button" variant="secondary" onClick={handleAssignSuperAdmin} disabled={assignRoles.isPending || !assignEmail.trim()}>
                    {assignRoles.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign'}
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isEdit ? 'Save changes' : 'Create county'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
