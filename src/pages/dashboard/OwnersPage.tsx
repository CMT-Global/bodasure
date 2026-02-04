import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus, Download, User, Phone, Mail } from 'lucide-react';
import { useOwners, Owner } from '@/hooks/useData';
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
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

const DEMO_COUNTY_ID = '550e8400-e29b-41d4-a716-446655440001';

export default function OwnersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const queryClient = useQueryClient();
  const { data: owners = [], isLoading } = useOwners(DEMO_COUNTY_ID);

  const filteredOwners = useMemo(() => {
    return owners.filter((owner) => {
      if (statusFilter !== 'all' && owner.status !== statusFilter) return false;
      return true;
    });
  }, [owners, statusFilter]);

  const deleteMutation = useMutation({
    mutationFn: async (ownerId: string) => {
      const { error } = await supabase.from('owners').delete().eq('id', ownerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      toast.success('Owner deleted');
      setIsDeleteOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const columns: ColumnDef<Owner>[] = [
    {
      accessorKey: 'full_name',
      header: 'Owner',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">{row.original.full_name}</p>
            <p className="text-xs text-muted-foreground">ID: {row.original.id_number}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Contact',
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" />{row.original.phone}</div>
          {row.original.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{row.original.email}</div>}
        </div>
      ),
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => <span className="text-sm">{row.original.address || '-'}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const owner = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSelectedOwner(owner); setIsFormOpen(true); }}>
                <Edit className="mr-2 h-4 w-4" />Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSelectedOwner(owner); setIsDeleteOpen(true); }} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Owners</h1>
            <p className="text-muted-foreground">Manage bike owners • {filteredOwners.length} total</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
            <Button onClick={() => { setSelectedOwner(null); setIsFormOpen(true); }} className="glow-primary">
              <Plus className="mr-2 h-4 w-4" />Add Owner
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable columns={columns} data={filteredOwners} searchPlaceholder="Search owners..." isLoading={isLoading} />

        {/* Form Dialog */}
        <OwnerFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} owner={selectedOwner} countyId={DEMO_COUNTY_ID} />

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Owner</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete {selectedOwner?.full_name}?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => selectedOwner && deleteMutation.mutate(selectedOwner.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

function OwnerFormDialog({ open, onOpenChange, owner, countyId }: { open: boolean; onOpenChange: (open: boolean) => void; owner: Owner | null; countyId: string }) {
  const queryClient = useQueryClient();
  const isEditing = !!owner;

  const [formData, setFormData] = useState({
    full_name: owner?.full_name || '',
    id_number: owner?.id_number || '',
    phone: owner?.phone || '',
    email: owner?.email || '',
    address: owner?.address || '',
    status: owner?.status || 'pending',
  });

  // When dialog opens (or selected owner changes), sync form with that owner so edit shows current data
  useEffect(() => {
    if (!open) return;
    if (owner) {
      setFormData({
        full_name: owner.full_name,
        id_number: owner.id_number,
        phone: owner.phone,
        email: owner.email || '',
        address: owner.address || '',
        status: owner.status,
      });
    } else {
      setFormData({
        full_name: '',
        id_number: '',
        phone: '',
        email: '',
        address: '',
        status: 'pending',
      });
    }
  }, [open, owner]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { 
        full_name: formData.full_name,
        id_number: formData.id_number,
        phone: formData.phone,
        email: formData.email || null,
        address: formData.address || null,
        status: formData.status,
        county_id: countyId,
      };
      if (isEditing && owner) {
        const { error } = await supabase.from('owners').update(payload).eq('id', owner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('owners').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      toast.success(isEditing ? 'Owner updated' : 'Owner added');
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Owner' : 'Add New Owner'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Update owner information' : 'Register a new bike owner'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div><Label>Full Name *</Label><Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} /></div>
          <div><Label>ID Number *</Label><Input value={formData.id_number} onChange={(e) => setFormData({ ...formData, id_number: e.target.value })} /></div>
          <div><Label>Phone *</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
          <div><Label>Address</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as Owner['status'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !formData.full_name || !formData.id_number || !formData.phone}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
