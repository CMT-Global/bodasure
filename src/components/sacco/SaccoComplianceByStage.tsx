import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Stage } from '@/hooks/useData';

interface SaccoComplianceByStageProps {
  stages: Stage[];
  isLoading: boolean;
}

export function SaccoComplianceByStage({ stages, isLoading }: SaccoComplianceByStageProps) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3 mb-1" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-10 w-10 bg-muted rounded-lg" />
                <div className="flex-1 ml-3">
                  <div className="h-4 bg-muted rounded w-24 mb-2" />
                  <div className="h-3 bg-muted rounded w-16" />
                </div>
                <div className="h-6 bg-muted rounded w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stages.length) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Compliance by stage</CardTitle>
          <CardDescription>Performance per stage</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">No stages with members</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Compliance by stage</CardTitle>
        <CardDescription>Performance per stage</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage) => {
            const rate = stage.compliance_rate ?? 0;
            const status =
              rate >= 80 ? 'compliant' : rate >= 50 ? 'at_risk' : 'non_compliant';
            const barColor =
              rate >= 80 ? 'bg-success' : rate >= 50 ? 'bg-warning' : 'bg-destructive';
            const badgeClass =
              status === 'compliant'
                ? 'status-compliant'
                : status === 'at_risk'
                  ? 'status-pending'
                  : 'status-non-compliant';
            const badgeLabel =
              status === 'compliant' ? 'Compliant' : status === 'at_risk' ? 'At risk' : 'Non-compliant';

            return (
              <div key={stage.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Status indicator dot */}
                  <div className={cn(
                    "h-3 w-3 shrink-0 rounded-full",
                    rate >= 80 ? "bg-green-500" :
                    rate >= 50 ? "bg-amber-500" : "bg-red-500"
                  )} />
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold uppercase">
                    S
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{stage.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {stage.member_count ?? 0} member{stage.member_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <div className="w-20 sm:w-24">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Rate</span>
                      <span className={cn(
                        "font-semibold",
                        rate >= 80 ? "text-green-600 dark:text-green-400" :
                        rate >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {rate}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', barColor)}
                        style={{ width: `${Math.min(100, rate)}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium px-2.5 py-1 rounded-md border shrink-0 whitespace-nowrap',
                      badgeClass
                    )}
                  >
                    {badgeLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
