import { ColumnDef } from '@tanstack/react-table';
import { Rider } from '@/hooks/useData';
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
import { MoreHorizontal, Eye, Edit, QrCode, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface RiderColumnsProps {
  onEdit: (rider: Rider) => void;
  onView: (rider: Rider) => void;
  onDelete: (rider: Rider) => void;
}

export function getRiderColumns({ onEdit, onView, onDelete }: RiderColumnsProps): ColumnDef<Rider>[] {
  return [
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
              <p className="text-xs text-muted-foreground">{rider.phone}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'id_number',
      header: 'ID Number',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.id_number}</span>
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
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'compliance_status',
      header: 'Compliance',
      cell: ({ row }) => <StatusBadge status={row.original.compliance_status} />,
    },
    {
      accessorKey: 'qr_code',
      header: 'QR Code',
      cell: ({ row }) => (
        row.original.qr_code ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <QrCode className="h-3 w-3" />
            {row.original.qr_code}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Not issued</span>
        )
      ),
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
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(rider)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Rider
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(rider)}
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
