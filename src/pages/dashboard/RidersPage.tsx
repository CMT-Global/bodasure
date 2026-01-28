import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Download } from 'lucide-react';
import { useRiders, Rider } from '@/hooks/useData';
import { getRiderColumns } from '@/components/riders/RiderColumns';
import { RiderFormDialog } from '@/components/riders/RiderFormDialog';
import { RiderDetailSheet } from '@/components/riders/RiderDetailSheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
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

export default function RidersPage() {
  const { profile, roles } = useAuth();
  
  // Get county_id from profile or first role
  const countyId = useMemo(() => {
    return profile?.county_id || roles.find(r => r.county_id)?.county_id || undefined;
  }, [profile, roles]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');

  const queryClient = useQueryClient();
  const { data: riders = [], isLoading } = useRiders(countyId);

  // Filter riders
  const filteredRiders = useMemo(() => {
    return riders.filter((rider) => {
      if (statusFilter !== 'all' && rider.status !== statusFilter) return false;
      if (complianceFilter !== 'all' && rider.compliance_status !== complianceFilter) return false;
      return true;
    });
  }, [riders, statusFilter, complianceFilter]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (riderId: string) => {
      const { error } = await supabase.from('riders').delete().eq('id', riderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      toast.success('Rider deleted successfully');
      setIsDeleteOpen(false);
      setSelectedRider(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete rider');
    },
  });

  const handleEdit = (rider: Rider) => {
    setSelectedRider(rider);
    setIsFormOpen(true);
  };

  const handleView = (rider: Rider) => {
    setSelectedRider(rider);
    setIsDetailOpen(true);
  };

  const handleDelete = (rider: Rider) => {
    setSelectedRider(rider);
    setIsDeleteOpen(true);
  };

  const handleAdd = () => {
    setSelectedRider(null);
    setIsFormOpen(true);
  };

  const columns = getRiderColumns({
    onEdit: handleEdit,
    onView: handleView,
    onDelete: handleDelete,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Riders</h1>
            <p className="text-muted-foreground">
              Manage registered riders • {filteredRiders.length} total
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={handleAdd} className="glow-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Rider
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="mr-2 h-4 w-4" />
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

          <Select value={complianceFilter} onValueChange={setComplianceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Compliance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Compliance</SelectItem>
              <SelectItem value="compliant">Compliant</SelectItem>
              <SelectItem value="non_compliant">Non-Compliant</SelectItem>
              <SelectItem value="pending_review">Under Review</SelectItem>
              <SelectItem value="blacklisted">Blacklisted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredRiders}
          searchPlaceholder="Search by name, ID, phone..."
          isLoading={isLoading}
        />

        {/* Add/Edit Dialog */}
        <RiderFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          rider={selectedRider}
          countyId={countyId}
        />

        {/* Detail Sheet */}
        <RiderDetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          rider={selectedRider}
          onEdit={() => {
            setIsDetailOpen(false);
            setIsFormOpen(true);
          }}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Rider</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedRider?.full_name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedRider && deleteMutation.mutate(selectedRider.id)}
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
