import { RiderOwnerLayout } from '@/components/layout/RiderOwnerLayout';
import { useAuth } from '@/hooks/useAuth';
import {
  useUserNotifications,
  useMarkNotificationRead,
  useMarkNotificationUnread,
  useMarkAllNotificationsRead,
  type UserNotification,
} from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Bell, Check, CheckCheck, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

function NotificationsContent() {
  const { user } = useAuth();
  const { data: notifications = [], isLoading, error } = useUserNotifications(100, !!user);
  const markRead = useMarkNotificationRead();
  const markUnread = useMarkNotificationUnread();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
        <p className="text-destructive font-medium">Failed to load notifications</p>
        <p className="text-sm text-muted-foreground mt-1">Please try again later.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Notifications & Communication</h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-1">
          In-app inbox for payment confirmations, permit expiry reminders, new penalties, Sacco
          announcements, and county announcements. Mark items as read or unread.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notification inbox
              </CardTitle>
              <CardDescription>
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : notifications.length === 0
                    ? 'No notifications yet'
                    : 'All caught up'}
              </CardDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="shrink-0"
              >
                {markAllRead.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-2" />
                )}
                Mark all read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="font-medium text-muted-foreground">No notifications</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                You’ll see payment confirmations, permit expiry reminders, new penalties, and
                Sacco or county announcements here when they’re sent.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-20rem)] sm:h-[420px]">
              <div className="space-y-1 pr-2">
                {notifications.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onMarkRead={() => markRead.mutate(n.id)}
                    onMarkUnread={() => markUnread.mutate(n.id)}
                    isMarkingRead={markRead.isPending && markRead.variables === n.id}
                    isMarkingUnread={markUnread.isPending && markUnread.variables === n.id}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
  onMarkUnread,
  isMarkingRead,
  isMarkingUnread,
}: {
  notification: UserNotification;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  isMarkingRead: boolean;
  isMarkingUnread: boolean;
}) {
  const isRead = !!notification.read_at;
  const isPending = isRead ? isMarkingUnread : isMarkingRead;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-start gap-2 rounded-lg border p-4 transition-colors',
        !isRead && 'bg-primary/5 border-primary/20'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-sm', !isRead && 'text-foreground')}>{notification.title}</p>
        {notification.body && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {format(new Date(notification.created_at), 'PPp')}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isRead ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={onMarkUnread}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Bell className="h-3.5 w-3.5 mr-1.5" />
                Mark unread
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={onMarkRead}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Mark read
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RiderOwnerLayout>
      <NotificationsContent />
    </RiderOwnerLayout>
  );
}
