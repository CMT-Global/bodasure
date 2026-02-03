import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, UserCircle, CreditCard, Receipt, Settings, LogOut, ChevronLeft, ChevronRight, Bell, Menu, Shield, QrCode, Building2, MessageSquare, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { format } from 'date-fns';

interface RiderOwnerLayoutProps {
  children: ReactNode;
}

export function RiderOwnerLayout({ children }: RiderOwnerLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, hasRole } = useAuth();
  const { data: notifications = [] } = useUserNotifications(15, !!user);
  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden min-w-0 max-w-[100vw]">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - only Dashboard for rider/owner */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:relative lg:flex-shrink-0',
          isCollapsed ? 'w-16' : 'w-72',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {!isCollapsed && (
            <Link to="/rider-owner" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">B</span>
              </div>
              <span className="text-lg font-semibold text-sidebar-foreground">
                Boda<span className="text-primary">Sure</span>
              </span>
            </Link>
          )}
          {isCollapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary mx-auto">
              <span className="text-sm font-bold text-primary-foreground">B</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            <Link
              to="/rider-owner"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/rider-owner'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <LayoutDashboard className={cn('h-5 w-5 shrink-0', location.pathname === '/rider-owner' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Dashboard</span>}
            </Link>
            <Link
              to="/rider-owner/qr-id"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/rider-owner/qr-id'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <QrCode className={cn('h-5 w-5 shrink-0', location.pathname === '/rider-owner/qr-id' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">QR ID &amp; Verification</span>}
            </Link>
            <Link
              to="/rider-owner/sacco-stage"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/rider-owner/sacco-stage'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <Building2 className={cn('h-5 w-5 shrink-0', location.pathname === '/rider-owner/sacco-stage' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Sacco &amp; Stage</span>}
            </Link>
            <Link
              to="/rider-owner/compliance-status"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/rider-owner/compliance-status'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <Shield className={cn('h-5 w-5 shrink-0', location.pathname === '/rider-owner/compliance-status' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Compliance Status</span>}
            </Link>
            <Link
              to="/rider-owner/permit-payments"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/rider-owner/permit-payments'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <CreditCard className={cn('h-5 w-5 shrink-0', location.pathname === '/rider-owner/permit-payments' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Permit Payments</span>}
            </Link>
            <Link
              to="/rider-owner/penalties-payments"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/rider-owner/penalties-payments'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <Receipt className={cn('h-5 w-5 shrink-0', location.pathname === '/rider-owner/penalties-payments' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Penalties &amp; Payments</span>}
            </Link>
            <Link
              to="/rider-owner/notifications"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/rider-owner/notifications'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <MessageSquare className={cn('h-5 w-5 shrink-0', location.pathname === '/rider-owner/notifications' && 'text-primary')} />
              {!isCollapsed && (
                <span className="truncate flex items-center gap-2">
                  Notifications &amp; Communication
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </span>
              )}
            </Link>
            <Link
              to="/rider-owner/support-help"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/rider-owner/support-help'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <HelpCircle className={cn('h-5 w-5 shrink-0', location.pathname === '/rider-owner/support-help' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Support &amp; Help</span>}
            </Link>
            <Link
              to="/rider-owner/profile"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/rider-owner/profile'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <UserCircle className={cn('h-5 w-5 shrink-0', location.pathname === '/rider-owner/profile' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Profile &amp; Registration</span>}
            </Link>
          </nav>
        </ScrollArea>

        {/* Collapse button (desktop only) */}
        <div className="hidden lg:block p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 flex-shrink-0 z-30 flex h-14 sm:h-16 items-center justify-between gap-2 border-b border-border bg-background/95 px-2 sm:px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:gap-4 lg:px-6 min-w-0 overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden min-h-[44px] min-w-[44px] shrink-0 touch-manipulation"
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Portal Tabs — Rider & Owner cannot see County or Sacco; Platform super admin can see all */}
          <div className="flex items-center gap-1 sm:gap-2 ml-1 sm:ml-4 flex-shrink min-w-0 overflow-x-auto overflow-y-hidden py-1">
            {(hasRole('platform_super_admin') || hasRole('platform_admin')) && (
              <Button
                variant={location.pathname.startsWith('/super-admin') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/super-admin')}
                className="min-h-[44px] min-w-[44px] sm:min-w-0 px-3 touch-manipulation shrink-0 font-semibold"
              >
                <span className="hidden sm:inline">Super Admin Portal</span>
                <span className="sm:hidden">Super</span>
              </Button>
            )}
            {(hasRole('platform_super_admin') || hasRole('platform_admin')) && (
              <Button
                variant={location.pathname.startsWith('/dashboard') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="min-h-[44px] min-w-[44px] sm:min-w-0 px-3 touch-manipulation shrink-0"
              >
                <span className="hidden sm:inline">County Portal</span>
                <span className="sm:hidden">County Portal</span>
              </Button>
            )}
            {(hasRole('platform_super_admin') || hasRole('platform_admin')) && (
              <Button
                variant={location.pathname.startsWith('/sacco') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/sacco')}
                className="min-h-[44px] min-w-[44px] sm:min-w-0 px-3 touch-manipulation shrink-0"
              >
                <span className="hidden sm:inline">Sacco Portal</span>
                <span className="sm:hidden">Sacco Portal</span>
              </Button>
            )}
            <Button
              variant={location.pathname.startsWith('/rider-owner') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/rider-owner')}
              className="min-h-[44px] min-w-[44px] sm:min-w-0 px-3 touch-manipulation shrink-0"
            >
              <span className="hidden sm:inline">Rider & Owner Portal</span>
              <span className="sm:hidden">Rider & Owner Portal</span>
            </Button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative min-h-[44px] min-w-[44px] touch-manipulation shrink-0">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[min(96vw,24rem)] sm:w-96 max-h-[85vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-2 py-2">
                  <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => markAllRead.mutate()}
                        disabled={markAllRead.isPending}
                      >
                        Mark all read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        navigate('/rider-owner/notifications');
                      }}
                    >
                      View all
                    </Button>
                  </div>
                </div>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-0">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={cn(
                            'px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors border-b border-border/50 last:border-0',
                            !n.read_at && 'bg-primary/5'
                          )}
                          onClick={() => {
                            if (!n.read_at) markRead.mutate(n.id);
                          }}
                        >
                          <p className="font-medium text-sm truncate">{n.title}</p>
                          {n.body && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(n.created_at), 'PPp')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 md:gap-3 px-1 sm:px-2 min-h-[44px] min-w-[44px] touch-manipulation shrink-0">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start text-left">
                    <span className="text-sm font-medium truncate max-w-[140px] md:max-w-[160px]">{profile?.full_name || 'User'}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[140px] md:max-w-[160px]">{profile?.email}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(hasRole('platform_super_admin') || hasRole('county_super_admin') || hasRole('county_admin')) && (
                  <DropdownMenuItem onClick={() => navigate('/dashboard/settings')} className="min-h-[44px]">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive min-h-[44px]">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content - mobile-first: no horizontal scroll, full width */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 min-w-0 max-w-full">
          <div className="w-full max-w-full min-w-0 mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
