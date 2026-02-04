import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus, Download, Building2, Users, Phone, Mail, MapPin, CheckCircle2, XCircle, AlertTriangle, MapPin as MapPinIcon } from 'lucide-react';
import { useSaccos, Sacco } from '@/hooks/useData';
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
import { Separator } from '@/components/ui/separator';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { exportToCSV } from '@/utils/exportCsv';
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

export default function SaccosPage() {
  const { profile, roles } = useAuth();
  
  // Get county_id from profile or first role
  const countyId = useMemo(() => {
    const id = profile?.county_id || roles.find(r => r.county_id)?.county_id || '550e8400-e29b-41d4-a716-446655440001';
    return id;
  }, [profile, roles]);

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
          <div className="flex gap-2">
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

// Sacco Form Dialog Component
function SaccoFormDialog({ open, onOpenChange, sacco, countyId }: { open: boolean; onOpenChange: (open: boolean) => void; sacco: Sacco | null; countyId: string }) {
  const queryClient = useQueryClient();
  const isEditing = !!sacco;

  const [formData, setFormData] = useState({
    name: sacco?.name || '',
    registration_number: sacco?.registration_number || '',
    contact_email: sacco?.contact_email || '',
    contact_phone: sacco?.contact_phone || '',
    address: sacco?.address || '',
    status: sacco?.status || 'pending',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { ...formData, county_id: countyId };
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
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Reset form when sacco changes
  useEffect(() => {
    setFormData({
      name: sacco?.name || '',
      registration_number: sacco?.registration_number || '',
      contact_email: sacco?.contact_email || '',
      contact_phone: sacco?.contact_phone || '',
      address: sacco?.address || '',
      status: sacco?.status || 'pending',
    });
  }, [sacco]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Sacco' : 'Add New Sacco'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Update sacco information' : 'Register a new Sacco organization'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
          <div><Label>Registration Number</Label><Input value={formData.registration_number} onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} /></div>
          <div><Label>Address</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as Sacco['status'] })}>
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
