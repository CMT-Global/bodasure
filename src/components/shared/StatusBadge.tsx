import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Registration status
  pending: { label: 'Pending', className: 'bg-warning/20 text-warning border-warning/30' },
  approved: { label: 'Approved', className: 'bg-success/20 text-success border-success/30' },
  rejected: { label: 'Rejected', className: 'bg-destructive/20 text-destructive border-destructive/30' },
  suspended: { label: 'Suspended', className: 'bg-muted text-muted-foreground border-muted' },
  
  // Compliance status
  compliant: { label: 'Compliant', className: 'bg-success/20 text-success border-success/30' },
  non_compliant: { label: 'Non-Compliant', className: 'bg-destructive/20 text-destructive border-destructive/30' },
  pending_review: { label: 'Under Review', className: 'bg-warning/20 text-warning border-warning/30' },
  blacklisted: { label: 'Blacklisted', className: 'bg-destructive/20 text-destructive border-destructive/30' },
  
  // Permit status
  active: { label: 'Active', className: 'bg-success/20 text-success border-success/30' },
  expired: { label: 'Expired', className: 'bg-destructive/20 text-destructive border-destructive/30' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-muted' },
  
  // Payment status
  completed: { label: 'Completed', className: 'bg-success/20 text-success border-success/30' },
  failed: { label: 'Failed', className: 'bg-destructive/20 text-destructive border-destructive/30' },
  refunded: { label: 'Refunded', className: 'bg-muted text-muted-foreground border-muted' },
  
  // County status
  inactive: { label: 'Inactive', className: 'bg-muted text-muted-foreground border-muted' },
  
  // Penalty status
  unpaid: { label: 'Unpaid', className: 'bg-destructive/20 text-destructive border-destructive/30' },
  paid: { label: 'Paid', className: 'bg-success/20 text-success border-success/30' },
  waived: { label: 'Waived', className: 'bg-muted text-muted-foreground border-muted' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-muted text-muted-foreground' };
  
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', config.className, className)}>
      {config.label}
    </Badge>
  );
}
