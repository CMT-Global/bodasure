import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StatusColor = 'green' | 'amber' | 'red' | 'default';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  statusColor?: StatusColor;
  className?: string;
}

const statusColorClasses: Record<StatusColor, { border: string; iconBg: string; iconText: string }> = {
  green: {
    border: 'border-green-500/20',
    iconBg: 'bg-green-500/10',
    iconText: 'text-green-600 dark:text-green-400',
  },
  amber: {
    border: 'border-amber-500/20',
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-600 dark:text-amber-400',
  },
  red: {
    border: 'border-red-500/20',
    iconBg: 'bg-red-500/10',
    iconText: 'text-red-600 dark:text-red-400',
  },
  default: {
    border: 'border-border',
    iconBg: 'bg-primary/10',
    iconText: 'text-primary',
  },
};

export function StatCard({ title, value, description, icon, trend, statusColor = 'default', className }: StatCardProps) {
  const colors = statusColorClasses[statusColor];

  return (
    <div className={cn('rounded-xl border bg-card p-4 sm:p-6 card-hover transition-all min-w-0 overflow-hidden', colors.border, className)}>
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold truncate">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              <span className={trend.isPositive ? 'text-success' : 'text-destructive'}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
        <div className={cn('flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl flex-shrink-0', colors.iconBg, colors.iconText)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
