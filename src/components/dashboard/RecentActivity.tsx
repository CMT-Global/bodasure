import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'registration' | 'payment' | 'permit' | 'penalty' | 'verification';
  title: string;
  description: string;
  time: string;
  status?: 'success' | 'pending' | 'warning' | 'error';
}

interface RecentActivityProps {
  activities: Activity[];
}

const typeColors = {
  registration: 'bg-blue-500/20 text-blue-400',
  payment: 'bg-success/20 text-success',
  permit: 'bg-primary/20 text-primary',
  penalty: 'bg-destructive/20 text-destructive',
  verification: 'bg-purple-500/20 text-purple-400',
};

const typeIcons = {
  registration: 'R',
  payment: 'P',
  permit: 'L',
  penalty: 'F',
  verification: 'V',
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card className="border-border bg-card min-w-0 overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
        <CardDescription className="text-sm">Latest actions across the platform</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 sm:gap-4 min-w-0">
              <Avatar className={cn('h-9 w-9 shrink-0', typeColors[activity.type])}>
                <AvatarFallback className="bg-transparent text-xs font-semibold">
                  {typeIcons[activity.type]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
                  <p className="text-sm font-medium break-words">{activity.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{activity.time}</span>
                </div>
                <p className="text-xs text-muted-foreground break-words">{activity.description}</p>
              </div>
              {activity.status && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs shrink-0',
                    activity.status === 'success' && 'border-success/50 text-success',
                    activity.status === 'pending' && 'border-warning/50 text-warning',
                    activity.status === 'warning' && 'border-warning/50 text-warning',
                    activity.status === 'error' && 'border-destructive/50 text-destructive'
                  )}
                >
                  {activity.status}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
