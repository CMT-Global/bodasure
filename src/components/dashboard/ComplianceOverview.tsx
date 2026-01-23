import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ComplianceItem {
  id: string;
  name: string;
  type: 'sacco' | 'stage' | 'rider';
  complianceRate: number;
  status: 'compliant' | 'at_risk' | 'non_compliant';
}

interface ComplianceOverviewProps {
  items: ComplianceItem[];
}

const statusConfig = {
  compliant: {
    label: 'Compliant',
    className: 'status-compliant',
  },
  at_risk: {
    label: 'At Risk',
    className: 'status-pending',
  },
  non_compliant: {
    label: 'Non-Compliant',
    className: 'status-non-compliant',
  },
};

export function ComplianceOverview({ items }: ComplianceOverviewProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Compliance Overview</CardTitle>
        <CardDescription>Top organizations by compliance status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xs font-semibold uppercase">
                  {item.type[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Rate</span>
                    <span className="font-medium">{item.complianceRate}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        item.complianceRate >= 80 ? 'bg-success' :
                        item.complianceRate >= 50 ? 'bg-warning' : 'bg-destructive'
                      )}
                      style={{ width: `${item.complianceRate}%` }}
                    />
                  </div>
                </div>
                <Badge variant="outline" className={cn('text-xs', statusConfig[item.status].className)}>
                  {statusConfig[item.status].label}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
