import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus, Heart, Users, Phone, Mail, MapPin } from 'lucide-react';
import { useWelfareGroups, WelfareGroup } from '@/hooks/useData';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColumnDef } from '@tanstack/react-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Trash2, CheckCircle, Ban } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth';

export default function WelfareGroupsPage() {
  const { profile, roles } = useAuth();

  const countyId = useMemo(() => {
    const id = profile?.county_id || roles.find((r) => r.county_id)?.county_id || '550e8400-e29b-41d4-a716-446655440001';
    return id;
  }, [profile, roles]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<WelfareGroup | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const queryClient = useQueryClient();
  const { data: groups = [], isLoading, error } = useWelfareGroups(countyId);

  useEffect(() => {
    if (error) console.error('Error loading welfare groups:', error);
  }, [error]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
      if (riskFilter === 'high-risk' && (g.compliance_rate === undefined || g.compliance_rate >= 50)) return false;
      if (riskFilter === 'non-compliant' && (g.compliance_rate === undefined || g.compliance_rate >= 80)) return false;
      return true;
    });
  }, [groups, statusFilter, riskFilter]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('welfare_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welfare-groups'] });
      toast.success('Welfare group deleted successfully');
      setIsDeleteOpen(false);
      setSelectedGroup(null);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to delete welfare group'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'suspended' }) => {
      const { error } = await supabase.from('welfare_groups').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['welfare-groups'] });
      toast.success(`Welfare group ${variables.status === 'approved' ? 'approved' : 'suspended'} successfully`);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update status'),
  });

  const columns: ColumnDef<WelfareGroup>[] = [
    {
      accessorKey: 'name',
      header: 'Welfare Group Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Heart className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.registration_number || 'No reg. number'}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'contact_phone',
      header: 'Contact',
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{row.original.contact_phone || '-'}</p>
          <p className="text-xs text-muted-foreground">{row.original.contact_email || '-'}</p>
        </div>
      ),
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => <span className="text-sm">{row.original.address || '-'}</span>,
    },
    {
      accessorKey: 'member_count',
      header: 'Members',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          {row.original.member_count || 0}
        </div>
      ),
    },
    {
      accessorKey: 'stages_count',
      header: 'Stages',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {row.original.stages_count || 0}
        </div>
      ),
    },
    {
      accessorKey: 'compliance_rate',
      header: 'Compliance',
      cell: ({ row }) => {
        const rate = row.original.compliance_rate ?? 100;
        const isHighRisk = rate < 50;
        const isNonCompliant = rate < 80;
        return (
          <span
            className={`text-sm font-medium ${isHighRisk ? 'text-destructive' : isNonCompliant ? 'text-amber-600' : 'text-success'}`}
          >
            {rate}%
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const g = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => { setSelectedGroup(g); setIsDetailOpen(true); }}>
                <Eye className="mr-2 h-4 w-4" /> View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSelectedGroup(g); setIsFormOpen(true); }}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              {g.status !== 'approved' && (
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: g.id, status: 'approved' })}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Approve
                </DropdownMenuItem>
              )}
              {g.status !== 'suspended' && (
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: g.id, status: 'suspended' })}>
                  <Ban className="mr-2 h-4 w-4" /> Suspend
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSelectedGroup(g); setIsDeleteOpen(true); }} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welfare Groups</h1>
            <p className="text-muted-foreground">Manage welfare groups • {filteredGroups.length} total</p>
          </div>
          <Button onClick={() => { setSelectedGroup(null); setIsFormOpen(true); }} className="glow-primary">
            <Plus className="mr-2 h-4 w-4" /> Add Welfare Group
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Compliance" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="high-risk">High risk (&lt;50%)</SelectItem>
              <SelectItem value="non-compliant">Non-compliant (&lt;80%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable columns={columns} data={filteredGroups} searchPlaceholder="Search welfare groups..." isLoading={isLoading} />

        <WelfareGroupFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} group={selectedGroup} countyId={countyId} />

        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Welfare Group Details</SheetTitle>
              <SheetDescription>Information about {selectedGroup?.name}</SheetDescription>
            </SheetHeader>
            {selectedGroup && (
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">{selectedGroup.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedGroup.registration_number}</p>
                  <StatusBadge status={selectedGroup.status} className="mt-1" />
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> Members: {selectedGroup.member_count ?? 0}</div>
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> Stages: {selectedGroup.stages_count ?? 0}</div>
                  <div>Compliance: <span className="font-medium">{selectedGroup.compliance_rate ?? 100}%</span></div>
                  <div>Penalties: {selectedGroup.penalties_count ?? 0}</div>
                </div>
                {(selectedGroup.contact_phone || selectedGroup.contact_email || selectedGroup.address) && (
                  <>
                    <Label className="text-muted-foreground">Contact</Label>
                    {selectedGroup.contact_phone && <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{selectedGroup.contact_phone}</div>}
                    {selectedGroup.contact_email && <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{selectedGroup.contact_email}</div>}
                    {selectedGroup.address && <div className="flex items-center gap-3 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" />{selectedGroup.address}</div>}
                  </>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>

        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Welfare Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedGroup?.name}? This will also affect all associated riders and stages.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => selectedGroup && deleteMutation.mutate(selectedGroup.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

function WelfareGroupFormDialog({
  open,
  onOpenChange,
  group,
  countyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: WelfareGroup | null;
  countyId: string;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!group;
  const [formData, setFormData] = useState({
    name: group?.name || '',
    registration_number: group?.registration_number || '',
    contact_email: group?.contact_email || '',
    contact_phone: group?.contact_phone || '',
    address: group?.address || '',
    status: (group?.status || 'pending') as 'pending' | 'approved' | 'rejected' | 'suspended',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { ...formData, county_id: countyId };
      if (isEditing && group) {
        const { error } = await supabase.from('welfare_groups').update(payload).eq('id', group.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('welfare_groups').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welfare-groups'] });
      toast.success(isEditing ? 'Welfare group updated' : 'Welfare group added');
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    setFormData({
      name: group?.name || '',
      registration_number: group?.registration_number || '',
      contact_email: group?.contact_email || '',
      contact_phone: group?.contact_phone || '',
      address: group?.address || '',
      status: (group?.status || 'pending') as 'pending' | 'approved' | 'rejected' | 'suspended',
    });
  }, [group]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Welfare Group' : 'Add Welfare Group'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Update welfare group information' : 'Register a new welfare group'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
          <div><Label>Registration Number</Label><Input value={formData.registration_number} onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} /></div>
          <div><Label>Address</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as WelfareGroup['status'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !formData.name}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
