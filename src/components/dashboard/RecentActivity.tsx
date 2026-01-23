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
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest actions across the platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              <Avatar className={cn('h-9 w-9', typeColors[activity.type])}>
                <AvatarFallback className="bg-transparent text-xs font-semibold">
                  {typeIcons[activity.type]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
                <p className="text-xs text-muted-foreground">{activity.description}</p>
              </div>
              {activity.status && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
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
