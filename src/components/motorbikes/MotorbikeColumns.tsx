import { ColumnDef } from '@tanstack/react-table';
import { Motorbike } from '@/hooks/useData';
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
import { MoreHorizontal, Eye, Edit, Trash2, Bike } from 'lucide-react';

interface MotorbikeColumnsProps {
  onEdit: (motorbike: Motorbike) => void;
  onView: (motorbike: Motorbike) => void;
  onDelete: (motorbike: Motorbike) => void;
}

export function getMotorbikeColumns({ onEdit, onView, onDelete }: MotorbikeColumnsProps): ColumnDef<Motorbike>[] {
  return [
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
            <p className="text-xs text-muted-foreground">
              {row.original.make && row.original.model 
                ? `${row.original.make} ${row.original.model}`
                : 'Make/Model not specified'}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'owner.full_name',
      header: 'Owner',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.owner?.full_name || '-'}</span>
      ),
    },
    {
      accessorKey: 'rider.full_name',
      header: 'Rider',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.rider?.full_name || '-'}</span>
      ),
    },
    {
      accessorKey: 'color',
      header: 'Details',
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{row.original.color || '-'}</p>
          {row.original.year && (
            <p className="text-xs text-muted-foreground">{row.original.year}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'qr_code',
      header: 'QR Code',
      cell: ({ row }) => {
        const riderQr = row.original.rider?.qr_code;
        if (riderQr) {
          return (
            <span className="text-xs font-mono text-muted-foreground" title={riderQr}>
              {riderQr}
            </span>
          );
        }
        return <span className="text-xs text-muted-foreground">Not issued</span>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const motorbike = row.original;
        
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
              <DropdownMenuItem onClick={() => onView(motorbike)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(motorbike)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Motorbike
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(motorbike)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
