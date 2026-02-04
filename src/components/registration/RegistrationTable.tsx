import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { RiderCard } from './RiderCard';
import { RiderWithDetails } from '@/hooks/useData';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';

interface RegistrationTableProps {
  riders: RiderWithDetails[];
  onView: (rider: RiderWithDetails) => void;
  isLoading?: boolean;
}

export function RegistrationTable({ riders, onView, isLoading }: RegistrationTableProps) {
  const isMobile = useIsMobile();

  const columns: ColumnDef<RiderWithDetails>[] = useMemo(() => [
    {
      accessorKey: 'full_name',
      header: 'Rider',
      cell: ({ row }) => {
        const rider = row.original;
        const initials = rider.full_name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={rider.photo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{rider.full_name}</p>
              <p className="text-xs text-muted-foreground font-mono">{rider.id_number}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.phone}</span>
      ),
    },
    {
      accessorKey: 'sacco.name',
      header: 'Sacco',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.sacco?.name || '-'}</span>
      ),
    },
    {
      accessorKey: 'stage.name',
      header: 'Stage',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.stage?.name || '-'}</span>
      ),
    },
    {
      accessorKey: 'motorbike.registration_number',
      header: 'Bike Plate',
      cell: ({ row }) => (
        <span className="text-sm font-mono">
          {row.original.motorbike?.registration_number || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'permit.status',
      header: 'Permit Status',
      cell: ({ row }) => {
        const permit = row.original.permit;
        if (!permit) return <span className="text-xs text-muted-foreground">No permit</span>;
        return <StatusBadge status={permit.status} />;
      },
    },
    {
      accessorKey: 'compliance_status',
      header: 'Compliance',
      cell: ({ row }) => <StatusBadge status={row.original.compliance_status} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const rider = row.original;
        
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
              <DropdownMenuItem onClick={() => onView(rider)}>
                <Eye className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [onView]);

  // Mobile view: show cards
  if (isMobile) {
    return (
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : riders.length > 0 ? (
          riders.map((rider) => (
            <RiderCard key={rider.id} rider={rider} onView={onView} />
          ))
        ) : (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            No riders found
          </div>
        )}
      </div>
    );
  }

  // Desktop view: show table
  return (
    <DataTable
      columns={columns}
      data={riders}
      searchKeys={['full_name', 'id_number', 'phone', 'motorbike.registration_number']}
      searchPlaceholder="Search by name, phone, ID, or bike plate..."
      isLoading={isLoading}
    />
  );
}
