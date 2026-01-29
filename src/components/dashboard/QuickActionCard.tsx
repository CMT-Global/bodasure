import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StatusColor = 'green' | 'amber' | 'red' | 'default';

interface QuickActionCardProps {
  title: string;
  description?: string;
  icon: ReactNode;
  statusColor?: StatusColor;
  onClick: () => void;
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

export function QuickActionCard({
  title,
  description,
  icon,
  statusColor = 'default',
  onClick,
  className,
}: QuickActionCardProps) {
  const colors = statusColorClasses[statusColor];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border bg-card p-4 sm:p-6 text-left transition-all',
        'hover:border-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'card-hover touch-manipulation',
        colors.border,
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl flex-shrink-0',
            colors.iconBg,
            colors.iconText
          )}
        >
          {icon}
        </div>
      </div>
    </button>
  );
}
