import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus, Download, MapPin, Users } from 'lucide-react';
import { useStages, useSaccos, Stage } from '@/hooks/useData';
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
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
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

export default function StagesPage() {
  const { profile, roles } = useAuth();
  
  // Get county_id from profile or first role
  const countyId = useMemo(() => {
    const id = profile?.county_id || roles.find(r => r.county_id)?.county_id || '550e8400-e29b-41d4-a716-446655440001';
    return id;
  }, [profile, roles]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const queryClient = useQueryClient();
  const { data: stages = [], isLoading } = useStages(countyId);
  const { data: saccos = [] } = useSaccos(countyId);

  const filteredStages = useMemo(() => {
    return stages.filter((stage) => {
      if (statusFilter !== 'all' && stage.status !== statusFilter) return false;
      return true;
    });
  }, [stages, statusFilter]);

  const handleExport = () => {
    if (!filteredStages.length) return;
    const rows = filteredStages.map((s) => ({
      name: s.name ?? '',
      location: s.location ?? '',
      sacco: s.sacco?.name ?? '',
      capacity: s.capacity ?? '',
      status: s.status ?? '',
    }));
    exportToCSV(rows, 'stages_export');
  };

  const deleteMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await supabase.from('stages').delete().eq('id', stageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success('Stage deleted successfully');
      setIsDeleteOpen(false);
      setSelectedStage(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const columns: ColumnDef<Stage>[] = [
    {
      accessorKey: 'name',
      header: 'Stage Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.location || 'No location'}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'sacco.name',
      header: 'Sacco',
      cell: ({ row }) => <span className="text-sm">{row.original.sacco?.name || '-'}</span>,
    },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          {row.original.capacity || '-'}
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
        const stage = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSelectedStage(stage); setIsFormOpen(true); }}>
                <Edit className="mr-2 h-4 w-4" />Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSelectedStage(stage); setIsDeleteOpen(true); }} className="text-destructive">
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
            <h1 className="text-2xl font-bold">Stages</h1>
            <p className="text-muted-foreground">Manage stage locations • {filteredStages.length} total</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={isLoading || filteredStages.length === 0}><Download className="mr-2 h-4 w-4" />Export</Button>
            <Button onClick={() => { setSelectedStage(null); setIsFormOpen(true); }} className="glow-primary">
              <Plus className="mr-2 h-4 w-4" />Add Stage
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

        <DataTable columns={columns} data={filteredStages} searchPlaceholder="Search stages..." isLoading={isLoading} />

        {/* Form Dialog */}
        <StageFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} stage={selectedStage} countyId={countyId} saccos={saccos} />

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Stage</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete {selectedStage?.name}?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => selectedStage && deleteMutation.mutate(selectedStage.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

function StageFormDialog({ open, onOpenChange, stage, countyId, saccos }: { open: boolean; onOpenChange: (open: boolean) => void; stage: Stage | null; countyId: string; saccos: { id: string; name: string }[] }) {
  const queryClient = useQueryClient();
  const isEditing = !!stage;

  const [formData, setFormData] = useState({
    name: stage?.name || '',
    location: stage?.location || '',
    sacco_id: stage?.sacco_id || 'none',
    capacity: stage?.capacity?.toString() || '',
    status: stage?.status || 'pending',
  });

  // Reset form when stage changes
  useEffect(() => {
    setFormData({
      name: stage?.name || '',
      location: stage?.location || '',
      sacco_id: stage?.sacco_id || 'none',
      capacity: stage?.capacity?.toString() || '',
      status: stage?.status || 'pending',
    });
  }, [stage]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { 
        name: formData.name,
        location: formData.location || null,
        sacco_id: formData.sacco_id === 'none' ? null : formData.sacco_id || null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        status: formData.status,
        county_id: countyId,
      };
      if (isEditing && stage) {
        const { error } = await supabase.from('stages').update(payload).eq('id', stage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('stages').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success(isEditing ? 'Stage updated' : 'Stage added');
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Stage' : 'Add New Stage'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Update stage information' : 'Register a new stage location'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
          <div><Label>Location</Label><Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
          <div>
            <Label>Sacco</Label>
            <Select value={formData.sacco_id} onValueChange={(v) => setFormData({ ...formData, sacco_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select a Sacco" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {saccos.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Capacity</Label><Input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as Stage['status'] })}>
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
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !formData.name}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
