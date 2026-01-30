import { useState, useMemo, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, MoreHorizontal, Edit, Trash2, CheckCircle, XCircle, Lock, Unlock, Map, Loader2 } from 'lucide-react';
import { useCountyUsers } from '@/hooks/useUserManagement';
import { useAssignUserRoles } from '@/hooks/useUserManagement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
            <h1 className="text-2xl font-bold">Multi-County Management</h1>
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
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<string>('pending');
  const [assignEmail, setAssignEmail] = useState('');

  useEffect(() => {
    if (open) {
      setName(county?.name ?? '');
      setCode(county?.code ?? '');
      setLogoUrl(county?.logo_url ?? '');
      setContactEmail(county?.contact_email ?? '');
      setContactPhone(county?.contact_phone ?? '');
      setAddress(county?.address ?? '');
      setStatus(county?.status ?? 'pending');
      setAssignEmail('');
    }
  }, [open, county]);

  const createMutation = useCreateCounty();
  const updateMutation = useUpdateCounty();
  const { data: countyUsers = [] } = useCountyUsers(county?.id);
  const assignRoles = useAssignUserRoles();

  const countySuperAdmin = countyUsers.find((u) => u.roles.some((r) => r.role === 'county_super_admin' && r.county_id === county?.id));

  const resetForm = () => {
    setName(county?.name ?? '');
    setCode(county?.code ?? '');
    setLogoUrl(county?.logo_url ?? '');
    setContactEmail(county?.contact_email ?? '');
    setContactPhone(county?.contact_phone ?? '');
    setAddress(county?.address ?? '');
    setStatus(county?.status ?? 'pending');
    setAssignEmail('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = () => {
    if (!name.trim() || !code.trim()) {
      toast.error('Name and code are required');
      return;
    }
    const statusVal = status as County['status'];
    if (isEdit && county) {
      const payload: CountyUpdate = {
        name: name.trim(),
        code: code.trim(),
        logo_url: logoUrl.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        address: address.trim() || null,
        status: statusVal,
      };
      updateMutation.mutate(
        { id: county.id, payload },
        {
          onSuccess: () => {
            onSuccess();
            handleOpenChange(false);
          },
        }
      );
    } else {
      const payload: CountyInsert = {
        name: name.trim(),
        code: code.trim(),
        logo_url: logoUrl.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        address: address.trim() || undefined,
        status: statusVal,
      };
      createMutation.mutate(payload, {
        onSuccess: () => {
          onSuccess();
          handleOpenChange(false);
        },
      });
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
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>County name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nairobi" disabled={isEdit} />
            {isEdit && <p className="text-xs text-muted-foreground">Name cannot be changed after creation.</p>}
          </div>
          <div className="grid gap-2">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. NBI" disabled={isEdit} />
            {isEdit && <p className="text-xs text-muted-foreground">Code cannot be changed after creation.</p>}
          </div>
          <div className="grid gap-2">
            <Label>Logo URL</Label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid gap-2">
            <Label>Contact email</Label>
            <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="county@example.com" />
          </div>
          <div className="grid gap-2">
            <Label>Contact phone</Label>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+254..." />
          </div>
          <div className="grid gap-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="County HQ address" />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pilot</SelectItem>
                <SelectItem value="active">Live</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isEdit && county && (
            <div className="grid gap-2 pt-2 border-t">
              <Label>County Super Admin</Label>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isEdit ? 'Save changes' : 'Create county'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
