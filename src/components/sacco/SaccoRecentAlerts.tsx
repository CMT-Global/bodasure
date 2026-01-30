import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AlertTriangle, FileX, Bell } from 'lucide-react';
import type { SaccoAlertItem } from '@/hooks/useData';

interface SaccoRecentAlertsProps {
  alerts: SaccoAlertItem[];
  isLoading: boolean;
}

const severityConfig = {
  error: {
    icon: AlertTriangle,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
    iconClass: 'text-destructive',
  },
  warning: {
    icon: FileX,
    className: 'bg-warning/10 text-warning border-warning/20',
    iconClass: 'text-warning',
  },
  info: {
    icon: Bell,
    className: 'bg-primary/10 text-primary border-primary/20',
    iconClass: 'text-primary',
  },
} as const;

export function SaccoRecentAlerts({ alerts, isLoading }: SaccoRecentAlertsProps) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3 mb-1" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg border border-border">
                <div className="h-9 w-9 bg-muted rounded-lg shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-muted rounded w-32 mb-2" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-16 mt-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Recent alerts from county</CardTitle>
        <CardDescription>Penalties, expired permits, and compliance notices</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No recent alerts
          </p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const config = severityConfig[alert.severity];
              const Icon = config.icon;
              return (
                <div
                  key={alert.id}
                  className={cn(
                    'flex gap-3 p-3 rounded-lg border transition-colors',
                    config.className
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      config.iconClass
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs opacity-90 truncate mt-0.5">{alert.description}</p>
                    <p className="text-xs opacity-75 mt-1">{alert.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
