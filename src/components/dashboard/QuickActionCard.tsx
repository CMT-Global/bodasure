import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StatusColor = 'green' | 'amber' | 'red' | 'orange' | 'default';

interface QuickActionCardProps {
  title: string;
  description?: string;
  icon: ReactNode;
  statusColor?: StatusColor;
  onClick: () => void;
  className?: string;
}

const statusColorClasses: Record<StatusColor, { iconBg: string; iconText: string }> = {
  green: {
    iconBg: 'bg-green-600/20 dark:bg-green-500/15',
    iconText: 'text-green-600 dark:text-green-400',
  },
  amber: {
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-600 dark:text-amber-400',
  },
  red: {
    iconBg: 'bg-red-500/10',
    iconText: 'text-red-600 dark:text-red-400',
  },
  orange: {
    iconBg: 'bg-green-600/20 dark:bg-green-500/15',
    iconText: 'text-green-600 dark:text-green-400',
  },
  default: {
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
        'w-full rounded-xl border border-green-500/50 bg-card p-4 sm:p-5 text-left transition-all min-h-[48px] sm:min-h-[52px]',
        'hover:border-orange-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'touch-manipulation min-w-0',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5 flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground break-words">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg flex-shrink-0',
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
