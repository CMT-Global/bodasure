import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Download, User, Phone, Mail } from 'lucide-react';
import { useOwners, Owner } from '@/hooks/useData';
import { CountyFilterBar } from '@/components/shared/CountyFilterBar';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { exportToCSV } from '@/utils/exportCsv';
import { ownerFormSchema, type OwnerFormValues } from '@/lib/zod';
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
import { useEffectiveCountyId } from '@/contexts/PlatformSuperAdminCountyContext';

export default function OwnersPage() {
  const countyId = useEffectiveCountyId();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const queryClient = useQueryClient();
  const { data: owners = [], isLoading } = useOwners(countyId);

  const filteredOwners = useMemo(() => {
    return owners.filter((owner) => {
      if (statusFilter !== 'all' && owner.status !== statusFilter) return false;
      return true;
    });
  }, [owners, statusFilter]);

  const handleExport = () => {
    if (!filteredOwners.length) return;
    const rows = filteredOwners.map((o) => ({
      full_name: o.full_name ?? '',
      id_number: o.id_number ?? '',
      phone: o.phone ?? '',
      email: o.email ?? '',
      address: o.address ?? '',
      status: o.status ?? '',
    }));
    exportToCSV(rows, 'owners_export');
  };

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
      <div className="space-y-4 sm:space-y-6 overflow-x-hidden min-w-0">
        <div className="flex flex-col gap-4 min-w-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold break-words">Owners</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage bike owners • {filteredOwners.length} total</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <CountyFilterBar />
            <Button variant="outline" size="default" onClick={handleExport} disabled={isLoading || filteredOwners.length === 0} className="w-full sm:w-auto min-h-[44px] touch-manipulation shrink-0">
              <Download className="mr-2 h-4 w-4 shrink-0" />Export
            </Button>
            <Button onClick={() => { setSelectedOwner(null); setIsFormOpen(true); }} className="glow-primary w-full sm:w-auto min-h-[44px] touch-manipulation shrink-0">
              <Plus className="mr-2 h-4 w-4 shrink-0" />Add Owner
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 min-w-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full min-w-0 sm:w-[150px] min-h-[44px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={filteredOwners}
          searchPlaceholder="Search owners..."
          searchKeys={['full_name', 'phone', 'email', 'id_number']}
          isLoading={isLoading}
          mobileCardRender={(owner) => (
            <OwnerMobileCard
              owner={owner}
              onEdit={() => { setSelectedOwner(owner); setIsFormOpen(true); }}
              onDelete={() => { setSelectedOwner(owner); setIsDeleteOpen(true); }}
            />
          )}
        />

        {/* Form Dialog */}
        <OwnerFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} owner={selectedOwner} countyId={countyId} />

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

function OwnerMobileCard({ owner, onEdit, onDelete }: { owner: Owner; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="overflow-hidden min-w-0">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{owner.full_name}</p>
              <p className="text-xs text-muted-foreground">ID: {owner.id_number}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 touch-manipulation">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3 shrink-0" />
            <span className="truncate">{owner.phone}</span>
          </div>
          {owner.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3 shrink-0" />
              <span className="truncate break-all">{owner.email}</span>
            </div>
          )}
          {owner.address && <p className="line-clamp-2 break-words">{owner.address}</p>}
        </div>
        <div className="mt-3 pt-3 border-t">
          <StatusBadge status={owner.status} />
        </div>
      </CardContent>
    </Card>
  );
}

function getDefaultValues(owner: Owner | null): OwnerFormValues {
  const status = owner?.status;
  const allowedStatus: OwnerFormValues['status'] =
    status === 'approved' || status === 'rejected' ? status : 'pending';
  return {
    full_name: owner?.full_name || '',
    id_number: owner?.id_number || '',
    phone: owner?.phone || '',
    email: owner?.email || '',
    address: owner?.address || '',
    status: allowedStatus,
  };
}

function OwnerFormDialog({ open, onOpenChange, owner, countyId }: { open: boolean; onOpenChange: (open: boolean) => void; owner: Owner | null; countyId: string }) {
  const queryClient = useQueryClient();
  const isEditing = !!owner;

  const form = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerFormSchema),
    defaultValues: getDefaultValues(owner),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(getDefaultValues(owner));
  }, [open, owner]);

  const mutation = useMutation({
    mutationFn: async (values: OwnerFormValues) => {
      const payload = {
        full_name: values.full_name.trim(),
        id_number: values.id_number.trim(),
        phone: values.phone.trim(),
        email: values.email?.trim() || null,
        address: values.address?.trim() || null,
        status: values.status,
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
      form.reset();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onSubmit = (values: OwnerFormValues) => mutation.mutate(values);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Owner' : 'Add New Owner'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Update owner information' : 'Register a new bike owner'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="id_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID Number *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
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
                    <Input {...field} />
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto min-h-[44px]">
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="w-full sm:w-auto min-h-[44px]">
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
