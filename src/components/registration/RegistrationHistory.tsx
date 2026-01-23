import { useRegistrationHistory } from '@/hooks/useRegistrationHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Loader2, History } from 'lucide-react';

interface RegistrationHistoryProps {
  riderId: string;
}

export function RegistrationHistory({ riderId }: RegistrationHistoryProps) {
  const { data: history, isLoading } = useRegistrationHistory(riderId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Registration History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Registration History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No registration history available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Registration History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry) => (
            <div key={entry.id} className="border-l-2 border-primary/20 pl-4 py-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-sm">{entry.action}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {entry.profiles?.full_name || 'System'} • {format(new Date(entry.created_at), 'PPp')}
                  </p>
                  {entry.new_values && Object.keys(entry.new_values).length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Changes:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {Object.entries(entry.new_values).map(([key, value]) => (
                          <li key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
