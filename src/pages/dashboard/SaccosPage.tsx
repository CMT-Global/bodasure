import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus, Download, Building2, Users, Phone, Mail, MapPin, CheckCircle2, XCircle, AlertTriangle, MapPin as MapPinIcon, Loader2 } from 'lucide-react';
import { useSaccos, Sacco } from '@/hooks/useData';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { exportToCSV } from '@/utils/exportCsv';
import { saccoFormSchema, type SaccoFormValues } from '@/lib/zod';
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
import { useSaccoOfficials, useAssignSaccoRole } from '@/hooks/useSaccoManagement';

export default function SaccosPage() {
  const countyId = useEffectiveCountyId();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSacco, setSelectedSacco] = useState<Sacco | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const queryClient = useQueryClient();
  const { data: saccos = [], isLoading, error } = useSaccos(countyId);
  
  // Log for debugging
  useEffect(() => {
    if (error) {
      console.error('Error loading saccos:', error);
    }
  }, [error]);

  const filteredSaccos = useMemo(() => {
    return saccos.filter((sacco) => {
      if (statusFilter !== 'all' && sacco.status !== statusFilter) return false;
      if (riskFilter === 'high-risk' && (sacco.compliance_rate === undefined || sacco.compliance_rate >= 50)) return false;
      if (riskFilter === 'non-compliant' && (sacco.compliance_rate === undefined || sacco.compliance_rate >= 80)) return false;
      return true;
    });
  }, [saccos, statusFilter, riskFilter]);

  const handleExport = () => {
    if (!filteredSaccos.length) return;
    const rows = filteredSaccos.map((s) => ({
      name: s.name ?? '',
      registration_number: s.registration_number ?? '',
      contact_phone: s.contact_phone ?? '',
      contact_email: s.contact_email ?? '',
      address: s.address ?? '',
      member_count: s.member_count ?? '',
      stages_count: s.stages_count ?? '',
      compliance_rate: s.compliance_rate ?? '',
      penalties_count: s.penalties_count ?? '',
      status: s.status ?? '',
    }));
    exportToCSV(rows, 'saccos_export');
  };

  const deleteMutation = useMutation({
    mutationFn: async (saccoId: string) => {
      const { error } = await supabase.from('saccos').delete().eq('id', saccoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saccos'] });
      toast.success('Sacco deleted successfully');
      setIsDeleteOpen(false);
      setSelectedSacco(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete sacco');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ saccoId, status }: { saccoId: string; status: 'approved' | 'suspended' }) => {
      const { error } = await supabase.from('saccos').update({ status }).eq('id', saccoId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['saccos'] });
      toast.success(`Sacco ${variables.status === 'approved' ? 'approved' : 'suspended'} successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update sacco status');
    },
  });

  const columns: ColumnDef<Sacco>[] = [
    {
      accessorKey: 'name',
      header: 'Sacco Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
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
      cell: ({ row }) => (
        <span className="text-sm">{row.original.address || '-'}</span>
      ),
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
          <MapPinIcon className="h-4 w-4 text-muted-foreground" />
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
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isHighRisk ? 'text-destructive' : isNonCompliant ? 'text-amber-600' : 'text-success'}`}>
              {rate}%
            </span>
            {isHighRisk && <AlertTriangle className="h-4 w-4 text-destructive" />}
            {isNonCompliant && !isHighRisk && <AlertTriangle className="h-4 w-4 text-amber-600" />}
          </div>
        );
      },
    },
    {
      accessorKey: 'penalties_count',
      header: 'Penalties',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          {row.original.penalties_count || 0}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const sacco = row.original;
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
              <DropdownMenuItem onClick={() => { setSelectedSacco(sacco); setIsDetailOpen(true); }}>
                <Eye className="mr-2 h-4 w-4" />View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSelectedSacco(sacco); setIsFormOpen(true); }}>
                <Edit className="mr-2 h-4 w-4" />Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {sacco.status !== 'approved' && (
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ saccoId: sacco.id, status: 'approved' })}>
                  <CheckCircle className="mr-2 h-4 w-4" />Approve
                </DropdownMenuItem>
              )}
              {sacco.status !== 'suspended' && (
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ saccoId: sacco.id, status: 'suspended' })}>
                  <Ban className="mr-2 h-4 w-4" />Suspend
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSelectedSacco(sacco); setIsDeleteOpen(true); }} className="text-destructive">
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
            <h1 className="text-2xl font-bold">Saccos</h1>
            <p className="text-muted-foreground">Manage Sacco organizations • {filteredSaccos.length} total</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CountyFilterBar />
            <Button variant="outline" onClick={handleExport} disabled={isLoading || filteredSaccos.length === 0}><Download className="mr-2 h-4 w-4" />Export</Button>
            <Button onClick={() => { setSelectedSacco(null); setIsFormOpen(true); }} className="glow-primary">
              <Plus className="mr-2 h-4 w-4" />Add Sacco
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="high-risk">High Risk (&lt;50% compliance)</SelectItem>
              <SelectItem value="non-compliant">Non-Compliant (&lt;80% compliance)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable columns={columns} data={filteredSaccos} searchPlaceholder="Search saccos..." isLoading={isLoading} />

        {/* Form Dialog */}
        <SaccoFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} sacco={selectedSacco} countyId={countyId} />

        {/* Detail Sheet */}
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Sacco Details</SheetTitle>
              <SheetDescription>Information about {selectedSacco?.name}</SheetDescription>
            </SheetHeader>
            {selectedSacco && (
              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedSacco.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedSacco.registration_number}</p>
                    <StatusBadge status={selectedSacco.status} className="mt-1" />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Members</p>
                    <p className="text-lg font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {selectedSacco.member_count || 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Stages</p>
                    <p className="text-lg font-semibold flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4" />
                      {selectedSacco.stages_count || 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Compliance Rate</p>
                    <p className={`text-lg font-semibold ${(selectedSacco.compliance_rate ?? 100) < 80 ? 'text-amber-600' : 'text-success'}`}>
                      {selectedSacco.compliance_rate ?? 100}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Penalties</p>
                    <p className="text-lg font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {selectedSacco.penalties_count || 0}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Contact</h4>
                  {selectedSacco.contact_phone && (
                    <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{selectedSacco.contact_phone}</div>
                  )}
                  {selectedSacco.contact_email && (
                    <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{selectedSacco.contact_email}</div>
                  )}
                  {selectedSacco.address && (
                    <div className="flex items-center gap-3 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" />{selectedSacco.address}</div>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Sacco</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedSacco?.name}? This will also affect all associated riders and stages.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => selectedSacco && deleteMutation.mutate(selectedSacco.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

function getSaccoDefaultValues(sacco: Sacco | null): SaccoFormValues {
  return {
    name: sacco?.name || '',
    registration_number: sacco?.registration_number || '',
    contact_email: sacco?.contact_email || '',
    contact_phone: sacco?.contact_phone || '',
    address: sacco?.address || '',
    status: (sacco?.status as SaccoFormValues['status']) || 'pending',
  };
}

// Sacco Form Dialog Component
function SaccoFormDialog({ open, onOpenChange, sacco, countyId }: { open: boolean; onOpenChange: (open: boolean) => void; sacco: Sacco | null; countyId: string }) {
  const queryClient = useQueryClient();
  const isEditing = !!sacco;
  const [assignAdminEmail, setAssignAdminEmail] = useState('');

  const form = useForm<SaccoFormValues>({
    resolver: zodResolver(saccoFormSchema),
    defaultValues: getSaccoDefaultValues(sacco),
  });

  const { data: saccoOfficials = [] } = useSaccoOfficials(countyId, sacco?.id);
  const assignSaccoRole = useAssignSaccoRole();
  const saccoAdmin = sacco ? saccoOfficials.find((u) => u.roles.some((r) => r.role === 'sacco_admin' && r.sacco_id === sacco.id)) : null;

  useEffect(() => {
    if (!open) return;
    form.reset(getSaccoDefaultValues(sacco));
    setAssignAdminEmail('');
  }, [open, sacco]);

  const mutation = useMutation({
    mutationFn: async (values: SaccoFormValues) => {
      const payload = {
        name: values.name.trim(),
        registration_number: values.registration_number?.trim() || null,
        contact_email: values.contact_email?.trim() || null,
        contact_phone: values.contact_phone?.trim() || null,
        address: values.address?.trim() || null,
        status: values.status,
        county_id: countyId,
      };
      if (isEditing && sacco) {
        const { error } = await supabase.from('saccos').update(payload).eq('id', sacco.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saccos').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saccos'] });
      toast.success(isEditing ? 'Sacco updated' : 'Sacco added');
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onSubmit = (values: SaccoFormValues) => mutation.mutate(values);

  const handleAssignSaccoAdmin = async () => {
    if (!sacco?.id || !assignAdminEmail.trim()) {
      toast.error('Enter an email to assign');
      return;
    }
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', assignAdminEmail.trim().toLowerCase())
      .limit(1);
    const user = profiles?.[0];
    if (!user) {
      toast.error('No user found with that email');
      return;
    }
    assignSaccoRole.mutate(
      { userId: user.id, role: 'sacco_admin', countyId, saccoId: sacco.id },
      {
        onSuccess: () => {
          toast.success('Sacco Admin assigned');
          setAssignAdminEmail('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Sacco' : 'Add New Sacco'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Update sacco information' : 'Register a new Sacco organization'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="registration_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
              name="contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEditing && sacco && (
              <div className="grid gap-2 pt-2 border-t">
                <p className="text-sm font-medium">Sacco Admin</p>
                {saccoAdmin ? (
                  <p className="text-sm text-muted-foreground">
                    Current: {saccoAdmin.email} {saccoAdmin.full_name && `(${saccoAdmin.full_name})`}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not assigned</p>
                )}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Assign by email"
                    value={assignAdminEmail}
                    onChange={(e) => setAssignAdminEmail(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAssignSaccoAdmin}
                    disabled={assignSaccoRole.isPending || !assignAdminEmail.trim()}
                  >
                    {assignSaccoRole.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign'}
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
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
