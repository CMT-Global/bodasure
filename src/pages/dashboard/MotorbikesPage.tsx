import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Download, Bike } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColumnDef } from '@tanstack/react-table';

const DEMO_COUNTY_ID = '550e8400-e29b-41d4-a716-446655440001';

interface Motorbike {
  id: string;
  registration_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  status: string;
  qr_code: string | null;
  owner?: { full_name: string } | null;
  rider?: { full_name: string } | null;
}

export default function MotorbikesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: motorbikes = [], isLoading } = useQuery({
    queryKey: ['motorbikes', DEMO_COUNTY_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motorbikes')
        .select(`*, owner:owners(full_name), rider:riders(full_name)`)
        .eq('county_id', DEMO_COUNTY_ID)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Motorbike[];
    },
  });

  const filteredMotorbikes = useMemo(() => {
    return motorbikes.filter((m) => statusFilter === 'all' || m.status === statusFilter);
  }, [motorbikes, statusFilter]);

  const columns: ColumnDef<Motorbike>[] = [
    {
      accessorKey: 'registration_number',
      header: 'Registration',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bike className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium font-mono">{row.original.registration_number}</p>
            <p className="text-xs text-muted-foreground">{row.original.make} {row.original.model}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'owner.full_name',
      header: 'Owner',
      cell: ({ row }) => <span className="text-sm">{row.original.owner?.full_name || '-'}</span>,
    },
    {
      accessorKey: 'rider.full_name',
      header: 'Rider',
      cell: ({ row }) => <span className="text-sm">{row.original.rider?.full_name || '-'}</span>,
    },
    {
      accessorKey: 'color',
      header: 'Details',
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{row.original.color || '-'}</p>
          <p className="text-xs text-muted-foreground">{row.original.year || '-'}</p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Motorbikes</h1>
            <p className="text-muted-foreground">Registered motorbikes • {filteredMotorbikes.length} total</p>
          </div>
          <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
        </div>

        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable columns={columns} data={filteredMotorbikes} searchPlaceholder="Search by plate number..." isLoading={isLoading} />
      </div>
    </DashboardLayout>
  );
}
