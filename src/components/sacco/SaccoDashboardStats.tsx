import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SaccoDashboardStats as Stats } from '@/hooks/useData';

interface SaccoDashboardStatsProps {
  stats: Stats | null | undefined;
  isLoading: boolean;
}

function statusColor(value: number, amber: number, red: number): 'green' | 'amber' | 'red' | 'default' {
  if (value >= red) return 'red';
  if (value >= amber) return 'amber';
  return 'green';
}

export function SaccoDashboardStats({ stats, isLoading }: SaccoDashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 animate-pulse">
        <div className="h-5 bg-muted rounded w-1/3 mb-4" />
        <div className="h-24 bg-muted rounded" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
        No stats available
      </div>
    );
  }

  const totalMembers = stats.totalMembers || 1; // Avoid division by zero
  const compliantPercentage = Math.round((stats.compliantCount / totalMembers) * 100);
  const nonCompliantPercentage = Math.round((stats.nonCompliantCount / totalMembers) * 100);

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Compliant vs Non-Compliant Members</h3>
        <div className="space-y-4">
          {/* Visual comparison bars */}
          <div className="space-y-3">
            {/* Compliant bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="font-medium text-foreground">Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{stats.compliantCount.toLocaleString()}</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{compliantPercentage}%</span>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${compliantPercentage}%` }}
                />
              </div>
            </div>

            {/* Non-Compliant bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-3 w-3 rounded-full",
                    stats.nonCompliantCount >= 20 ? "bg-red-500" :
                    stats.nonCompliantCount >= 5 ? "bg-amber-500" : "bg-green-500"
                  )} />
                  <span className="font-medium text-foreground">Non-Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{stats.nonCompliantCount.toLocaleString()}</span>
                  <span className={cn(
                    "font-semibold",
                    stats.nonCompliantCount >= 20 ? "text-red-600 dark:text-red-400" :
                    stats.nonCompliantCount >= 5 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"
                  )}>
                    {nonCompliantPercentage}%
                  </span>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    stats.nonCompliantCount >= 20 ? "bg-red-500" :
                    stats.nonCompliantCount >= 5 ? "bg-amber-500" : "bg-green-500"
                  )}
                  style={{ width: `${nonCompliantPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Summary text */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {stats.compliantCount > stats.nonCompliantCount ? (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  ✓ Good compliance rate
                </span>
              ) : stats.nonCompliantCount > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  ⚠ Attention needed: {stats.nonCompliantCount} member{stats.nonCompliantCount !== 1 ? 's' : ''} require action
                </span>
              ) : (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  ✓ All members are compliant
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
