import { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SaccoPortalLayout } from '@/components/layout/SaccoPortalLayout';
import { useSaccos, useSaccoMembers, useStages } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare,
  Bell,
  AlertCircle,
  Send,
  Users,
  MapPin,
  Shield,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TEXTAREA_MAX_CHARS, isOverCharLimit } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

export default function CommunicationToolsPage() {
  const queryClient = useQueryClient();
  const { profile, roles } = useAuth();
  const countyId = useMemo(
    () => profile?.county_id ?? roles.find((r) => r.county_id)?.county_id ?? undefined,
    [profile, roles]
  );

  const { data: saccos = [], isLoading: saccosLoading } = useSaccos(countyId);
  const [saccoId, setSaccoId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (saccos.length > 0 && !saccoId) setSaccoId(saccos[0].id);
    if (saccos.length === 0) setSaccoId(undefined);
  }, [saccos, saccoId]);

  const { data: members = [] } = useSaccoMembers(saccoId, countyId);
  const { data: stages = [] } = useStages(countyId, saccoId);

  // State for announcements
  const [announcements, setAnnouncements] = useState<Array<{
    id: string;
    title: string;
    message: string;
    date: Date;
    read: boolean;
  }>>([
    {
      id: '1',
      title: 'New Compliance Requirements',
      message: 'All members must complete their registration by end of month.',
      date: new Date('2026-01-25'),
      read: false,
    },
    {
      id: '2',
      title: 'Stage Assignment Updates',
      message: 'Please review your stage assignments and report any discrepancies.',
      date: new Date('2026-01-20'),
      read: true,
    },
  ]);

  // State for alerts
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    date: Date;
    read: boolean;
  }>>([
    {
      id: '1',
      type: 'warning',
      message: '5 members have pending compliance issues',
      date: new Date('2026-01-27'),
      read: false,
    },
    {
      id: '2',
      type: 'info',
      message: 'System maintenance scheduled for next week',
      date: new Date('2026-01-26'),
      read: false,
    },
  ]);

  // State for sending messages
  const [messageType, setMessageType] = useState<'all' | 'stage' | 'non-compliant'>('all');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  const nonCompliantMembers = useMemo(() => {
    return members.filter((m) => m.compliance_status === 'non_compliant');
  }, [members]);

  const getRecipientCount = () => {
    if (messageType === 'all') return members.length;
    if (messageType === 'stage') {
      return members.filter((m) => m.stage_id === selectedStage).length;
    }
    return nonCompliantMembers.length;
  };

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageContent.trim()) {
      toast.error('Please fill in both subject and message');
      return;
    }
    if (isOverCharLimit(messageContent)) {
      toast.error(`Maximum ${TEXTAREA_MAX_CHARS} characters allowed.`);
      return;
    }

    if (messageType === 'stage' && !selectedStage) {
      toast.error('Please select a stage');
      return;
    }

    if (!saccoId || !countyId) {
      toast.error('Sacco or county not selected');
      return;
    }

    setIsSending(true);
    try {
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !currentUser) {
        throw new Error('Not authenticated');
      }

      const recipients = messageType === 'all'
        ? members
        : messageType === 'stage'
        ? members.filter((m) => m.stage_id === selectedStage)
        : nonCompliantMembers;

      const recipientCount = recipients.length;
      const recipientUserIds = recipients
        .map((m) => m.user_id)
        .filter((id): id is string => !!id);

      // 1. Always save to Supabase (sacco_sent_messages)
      const { error: msgError } = await supabase.from('sacco_sent_messages').insert({
        county_id: countyId,
        sacco_id: saccoId,
        sender_id: currentUser.id,
        subject: messageSubject.trim(),
        body: messageContent.trim(),
        recipient_type: messageType,
        stage_id: messageType === 'stage' ? selectedStage || null : null,
        recipient_count: recipientCount,
      });
      if (msgError) throw msgError;

      // 2. Create in-app notifications for each recipient with user_id
      const notificationsToInsert: { user_id: string; title: string; body: string }[] = recipientUserIds.map(
        (user_id) => ({
          user_id,
          title: messageSubject.trim(),
          body: messageContent.trim(),
        })
      );

      // 3. Always notify the sender so they see the message in the app
      notificationsToInsert.push({
        user_id: currentUser.id,
        title: `Message sent: ${messageSubject.trim()}`,
        body: `Your message was sent to ${recipientCount} member${recipientCount !== 1 ? 's' : ''}.${recipientUserIds.length < recipientCount && recipientCount > 0 ? ` ${recipientUserIds.length} received in-app notification.` : ''}`,
      });

      if (notificationsToInsert.length > 0) {
        const { error: notifError } = await supabase.from('user_notifications').insert(notificationsToInsert);
        if (notifError) throw notifError;
        queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      }

      if (recipientUserIds.length < recipientCount && recipientCount > 0) {
        toast.success(
          `Message saved. Sent to ${recipientCount} member${recipientCount !== 1 ? 's' : ''}; ${recipientUserIds.length} in-app notification${recipientUserIds.length !== 1 ? 's' : ''} delivered.`
        );
      } else {
        toast.success(`Message sent to ${recipientCount} member${recipientCount !== 1 ? 's' : ''}. Check your notifications.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      toast.error(message);
      setIsSending(false);
      return;
    }

    setMessageSubject('');
    setMessageContent('');
    setSelectedStage('');
    setIsSending(false);
  };

  const markAnnouncementRead = (id: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    );
  };

  const markAlertRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    );
  };

  const unreadAnnouncements = announcements.filter((a) => !a.read).length;
  const unreadAlerts = alerts.filter((a) => !a.read).length;

  return (
    <SaccoPortalLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold lg:text-3xl">Communication Tools</h1>
              <p className="text-muted-foreground">
                Receive announcements, view alerts, and send messages to members
              </p>
            </div>
            {countyId && (
              <div className="w-full sm:w-64">
                <Select
                  value={saccoId ?? ''}
                  onValueChange={(v) => setSaccoId(v || undefined)}
                  disabled={saccosLoading || saccos.length === 0}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder={saccosLoading ? 'Loading…' : 'Select sacco'} />
                  </SelectTrigger>
                  <SelectContent>
                    {saccos.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="min-h-[44px]">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {!countyId ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                No county assigned. Please contact an administrator.
              </p>
            </CardContent>
          </Card>
        ) : !saccoId ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                {saccosLoading ? 'Loading saccos…' : 'No sacco selected. Please select a sacco.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* County Announcements */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <CardTitle>County Announcements</CardTitle>
                  </div>
                  {unreadAnnouncements > 0 && (
                    <Badge variant="default">{unreadAnnouncements} new</Badge>
                  )}
                </div>
                <CardDescription>
                  Important announcements from county administration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {announcements.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No announcements
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {announcements.map((announcement) => (
                        <div
                          key={announcement.id}
                          className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                            !announcement.read
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-accent'
                          }`}
                          onClick={() => markAnnouncementRead(announcement.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm">{announcement.title}</h4>
                                {!announcement.read && (
                                  <div className="h-2 w-2 rounded-full bg-primary" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {announcement.message}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(announcement.date, 'PPp')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* System Alerts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <CardTitle>System Alerts</CardTitle>
                  </div>
                  {unreadAlerts > 0 && (
                    <Badge variant="destructive">{unreadAlerts} new</Badge>
                  )}
                </div>
                <CardDescription>
                  Important system notifications and warnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {alerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No alerts
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                            !alert.read
                              ? 'border-destructive bg-destructive/5'
                              : 'border-border hover:bg-accent'
                          }`}
                          onClick={() => markAlertRead(alert.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant={
                                    alert.type === 'error'
                                      ? 'destructive'
                                      : alert.type === 'warning'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {alert.type}
                                </Badge>
                                {!alert.read && (
                                  <div className="h-2 w-2 rounded-full bg-destructive" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(alert.date, 'PPp')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Send Messages */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <CardTitle>Send Messages</CardTitle>
                </div>
                <CardDescription>
                  Send messages to all members, stage-specific members, or non-compliant members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Message Type Selection */}
                  <div className="space-y-2">
                    <Label>Recipient Type</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Button
                        variant={messageType === 'all' ? 'default' : 'outline'}
                        className="h-auto min-h-[44px] py-4 flex flex-col items-start gap-2 touch-manipulation"
                        onClick={() => {
                          setMessageType('all');
                          setSelectedStage('');
                        }}
                      >
                        <Users className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-semibold">All Members</div>
                          <div className="text-xs text-muted-foreground">
                            {members.length} member{members.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </Button>
                      <Button
                        variant={messageType === 'stage' ? 'default' : 'outline'}
                        className="h-auto min-h-[44px] py-4 flex flex-col items-start gap-2 touch-manipulation"
                        onClick={() => setMessageType('stage')}
                      >
                        <MapPin className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-semibold">Stage-Specific</div>
                          <div className="text-xs text-muted-foreground">Select a stage</div>
                        </div>
                      </Button>
                      <Button
                        variant={messageType === 'non-compliant' ? 'default' : 'outline'}
                        className="h-auto min-h-[44px] py-4 flex flex-col items-start gap-2 touch-manipulation"
                        onClick={() => {
                          setMessageType('non-compliant');
                          setSelectedStage('');
                        }}
                      >
                        <Shield className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-semibold">Non-Compliant</div>
                          <div className="text-xs text-muted-foreground">
                            {nonCompliantMembers.length} member{nonCompliantMembers.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </Button>
                    </div>
                  </div>

                  {/* Stage Selection (if stage-specific) */}
                  {messageType === 'stage' && (
                    <div className="space-y-2">
                      <Label>Select Stage</Label>
                      <Select value={selectedStage} onValueChange={setSelectedStage}>
                        <SelectTrigger className="min-h-[44px]">
                          <SelectValue placeholder="Select a stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id} className="min-h-[44px]">
                              {stage.name} ({members.filter((m) => m.stage_id === stage.id).length} members)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Separator />

                  {/* Message Form */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Enter message subject"
                        value={messageSubject}
                        onChange={(e) => setMessageSubject(e.target.value)}
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Enter your message"
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        rows={6}
                        className={cn('resize-none', isOverCharLimit(messageContent) && 'border-destructive')}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Will be sent to{' '}
                        <span className="font-semibold text-foreground">
                          {getRecipientCount()} member{getRecipientCount() !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={isSending || !messageSubject.trim() || !messageContent.trim() || (messageType === 'stage' && !selectedStage) || isOverCharLimit(messageContent)}
                        className="min-h-[44px] gap-2"
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* In-App Notifications Info */}
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">In-App Notifications</h4>
                        <p className="text-sm text-muted-foreground">
                          Messages will be delivered as in-app notifications. SMS notifications are
                          optional and can be enabled later.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SaccoPortalLayout>
  );
}
