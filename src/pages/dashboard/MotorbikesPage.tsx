import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Download, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MotorbikeFormDialog } from '@/components/motorbikes/MotorbikeFormDialog';
import { MotorbikeDetailSheet } from '@/components/motorbikes/MotorbikeDetailSheet';
import { getMotorbikeColumns } from '@/components/motorbikes/MotorbikeColumns';
import { Motorbike, useMotorbikes } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

export default function MotorbikesPage() {
  const { profile, roles } = useAuth();
  
  // Get county_id from profile or first role
  const countyId = useMemo(() => {
    return profile?.county_id || roles.find(r => r.county_id)?.county_id || undefined;
  }, [profile, roles]);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedMotorbike, setSelectedMotorbike] = useState<Motorbike | null>(null);

  const queryClient = useQueryClient();
  const { data: motorbikes = [], isLoading } = useMotorbikes(countyId);

  const filteredMotorbikes = useMemo(() => {
    return motorbikes.filter((m) => statusFilter === 'all' || m.status === statusFilter);
  }, [motorbikes, statusFilter]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (motorbikeId: string) => {
      const { error } = await supabase.from('motorbikes').delete().eq('id', motorbikeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motorbikes'] });
      toast.success('Motorbike deleted successfully');
      setIsDeleteOpen(false);
      setSelectedMotorbike(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete motorbike');
    },
  });

  const handleEdit = (motorbike: Motorbike) => {
    setSelectedMotorbike(motorbike);
    setIsFormOpen(true);
  };

  const handleView = (motorbike: Motorbike) => {
    setSelectedMotorbike(motorbike);
    setIsDetailOpen(true);
  };

  const handleDelete = (motorbike: Motorbike) => {
    setSelectedMotorbike(motorbike);
    setIsDeleteOpen(true);
  };

  const handleAdd = () => {
    setSelectedMotorbike(null);
    setIsFormOpen(true);
  };

  const columns = getMotorbikeColumns({
    onEdit: handleEdit,
    onView: handleView,
    onDelete: handleDelete,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Motorbikes</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Registered motorbikes • {filteredMotorbikes.length} total</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="min-h-[44px] flex-1 sm:flex-initial">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={handleAdd} className="glow-primary min-h-[44px] flex-1 sm:flex-initial">
                <Plus className="mr-2 h-4 w-4" />
                Add Motorbike
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px] min-h-[44px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable columns={columns} data={filteredMotorbikes} searchPlaceholder="Search by plate number..." isLoading={isLoading} />

        {/* Add/Edit Dialog */}
        <MotorbikeFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          motorbike={selectedMotorbike}
          countyId={countyId}
        />

        {/* Detail Sheet */}
        <MotorbikeDetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          motorbike={selectedMotorbike}
          onEdit={() => {
            setIsDetailOpen(false);
            setIsFormOpen(true);
          }}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Motorbike</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete motorbike {selectedMotorbike?.registration_number}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedMotorbike && deleteMutation.mutate(selectedMotorbike.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
