import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import {
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bell,
  Menu,
  Users,
  MapPin,
  Shield,
  FileWarning,
  UserPlus,
  MessageSquare,
  FileText,
  History,
  FileEdit,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { format } from 'date-fns';

interface SaccoPortalLayoutProps {
  children: ReactNode;
}

let savedSaccoSidebarScrollTop = 0;
const SCROLLBAR_HIDE_DELAY_MS = 1000;

export function SaccoPortalLayout({ children }: SaccoPortalLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const scrollbarHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, hasRole } = useAuth();
  const { data: notifications = [] } = useUserNotifications(15, !!user);
  /** Sacco/Welfare officials with profile permission can edit profile (Chairman, Vice Chairman, Secretary, Vice Secretary, Admin). */
  const canEditSaccoProfile =
    hasRole('sacco_admin') ||
    hasRole('welfare_admin') ||
    hasRole('chairman') ||
    hasRole('vice_chairman') ||
    hasRole('secretary') ||
    hasRole('vice_secretary') ||
    hasRole('platform_super_admin');
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
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    return () => {
      if (scrollbarHideTimeoutRef.current) clearTimeout(scrollbarHideTimeoutRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;
    const saved = savedSaccoSidebarScrollTop;
    const restore = () => {
      if (el) el.scrollTop = saved;
    };
    restore();
    requestAnimationFrame(restore);
    const t = setTimeout(restore, 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="layout-root flex bg-background overflow-hidden min-w-0">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
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
            <Link to="/sacco" className="flex items-center gap-2">
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
        <div
          ref={sidebarScrollRef}
          className={cn(
            'sidebar-nav-scroll flex-1 overflow-y-auto overflow-x-hidden py-4',
            scrollbarVisible && 'scrollbar-visible'
          )}
          onScroll={() => {
            if (sidebarScrollRef.current) savedSaccoSidebarScrollTop = sidebarScrollRef.current.scrollTop;
            setScrollbarVisible(true);
            if (scrollbarHideTimeoutRef.current) clearTimeout(scrollbarHideTimeoutRef.current);
            scrollbarHideTimeoutRef.current = setTimeout(() => setScrollbarVisible(false), SCROLLBAR_HIDE_DELAY_MS);
          }}
          onClickCapture={() => {
            if (sidebarScrollRef.current) savedSaccoSidebarScrollTop = sidebarScrollRef.current.scrollTop;
          }}
        >
          <nav className="space-y-1 px-2">
            <Link
              to="/sacco"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/sacco'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <LayoutDashboard className={cn('h-5 w-5 shrink-0', location.pathname === '/sacco' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Dashboard</span>}
            </Link>
            <Link
              to="/sacco/registration-support"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/sacco/registration-support'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <UserPlus className={cn('h-5 w-5 shrink-0', location.pathname === '/sacco/registration-support' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Registration Support</span>}
            </Link>
            <Link
              to="/sacco/members"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/sacco/members'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <Users className={cn('h-5 w-5 shrink-0', location.pathname === '/sacco/members' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Member Management</span>}
            </Link>
            <Link
              to="/sacco/update-requests"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/sacco/update-requests'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <FileEdit className={cn('h-5 w-5 shrink-0', location.pathname === '/sacco/update-requests' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Update requests</span>}
            </Link>
            <Link
              to="/sacco/stages"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/sacco/stages'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <MapPin className={cn('h-5 w-5 shrink-0', location.pathname === '/sacco/stages' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Stage Management</span>}
            </Link>
            <Link
              to="/sacco/compliance"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/sacco/compliance'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <Shield className={cn('h-5 w-5 shrink-0', location.pathname === '/sacco/compliance' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Compliance & Penalties</span>}
            </Link>
            <Link
              to="/sacco/discipline"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/sacco/discipline'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <FileWarning className={cn('h-5 w-5 shrink-0', location.pathname === '/sacco/discipline' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Discipline & Incidents</span>}
            </Link>
            <Link
              to="/sacco/communication"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/sacco/communication'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <MessageSquare className={cn('h-5 w-5 shrink-0', location.pathname === '/sacco/communication' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Communication Tools</span>}
            </Link>
            <Link
              to="/sacco/reports"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                location.pathname === '/sacco/reports'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <FileText className={cn('h-5 w-5 shrink-0', location.pathname === '/sacco/reports' && 'text-primary')} />
              {!isCollapsed && <span className="truncate">Reports & Exports</span>}
            </Link>
            {canEditSaccoProfile && (
              <Link
                to="/sacco/settings"
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                  location.pathname === '/sacco/settings'
                    ? 'bg-sidebar-accent text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
                )}
              >
                <Settings className={cn('h-5 w-5 shrink-0', location.pathname === '/sacco/settings' && 'text-primary')} />
                {!isCollapsed && <span className="truncate">Profile & Settings</span>}
              </Link>
            )}
            {canEditSaccoProfile && (
              <Link
                to="/sacco/audit-logs"
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                  location.pathname === '/sacco/audit-logs'
                    ? 'bg-sidebar-accent text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
                )}
              >
                <History className={cn('h-5 w-5 shrink-0', location.pathname === '/sacco/audit-logs' && 'text-primary')} />
                {!isCollapsed && <span className="truncate">Audit Logs</span>}
              </Link>
            )}
          </nav>
        </div>

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
      <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 flex-shrink-0 z-30 flex h-16 items-center justify-between gap-2 sm:gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 sm:px-4 lg:px-6">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden min-h-[44px] min-w-[44px]"
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Portal switcher — mobile: dropdown (like Super Admin); desktop: buttons */}
          <div className="flex min-w-0 items-center gap-2 ml-2 sm:ml-4">
            {/* Mobile: single dropdown to save space */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="md:hidden min-h-[40px] gap-1.5 font-medium shrink-0"
                >
                  <span className="truncate">
                    {location.pathname.startsWith('/super-admin') && 'Super Admin'}
                    {location.pathname.startsWith('/dashboard') && 'County'}
                    {location.pathname.startsWith('/sacco') && 'Sacco'}
                    {location.pathname.startsWith('/rider-owner') && 'Rider & Owner'}
                    {!location.pathname.startsWith('/super-admin') && !location.pathname.startsWith('/dashboard') && !location.pathname.startsWith('/sacco') && !location.pathname.startsWith('/rider-owner') && 'Portals'}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {(hasRole('platform_super_admin') || hasRole('platform_admin')) && (
                  <DropdownMenuItem onClick={() => navigate('/super-admin')} className="min-h-[44px]">
                    <span className="sm:hidden">Super Admin</span>
                    <span className="hidden sm:inline">Super Admin Portal</span>
                  </DropdownMenuItem>
                )}
                {(hasRole('platform_super_admin') || hasRole('platform_admin')) && (
                  <DropdownMenuItem onClick={() => navigate('/dashboard')} className="min-h-[44px]">
                    <span className="sm:hidden">County</span>
                    <span className="hidden sm:inline">County Portal</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate('/sacco')} className="min-h-[44px]">
                  <span className="sm:hidden">Sacco</span>
                  <span className="hidden sm:inline">Sacco Portal</span>
                </DropdownMenuItem>
                {(hasRole('platform_super_admin') || hasRole('platform_admin')) && (
                  <DropdownMenuItem onClick={() => navigate('/rider-owner')} className="min-h-[44px]">
                    <span className="sm:hidden">Rider & Owner</span>
                    <span className="hidden sm:inline">Rider & Owner Portal</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Desktop: portal buttons — flex-nowrap so md shows one row; short labels until lg */}
            <div className="hidden md:flex flex-shrink-0 min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto overflow-y-hidden py-1">
              {(hasRole('platform_super_admin') || hasRole('platform_admin')) && (
                <Button
                  variant={location.pathname.startsWith('/super-admin') ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigate('/super-admin')}
                  className="min-h-[44px] min-w-0 shrink-0 px-3 touch-manipulation font-semibold"
                >
                  <span className="hidden lg:inline">Super Admin Portal</span>
                  <span className="lg:hidden">Super Admin</span>
                </Button>
              )}
              {(hasRole('platform_super_admin') || hasRole('platform_admin')) && (
                <Button
                  variant={location.pathname.startsWith('/dashboard') ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="min-h-[44px] min-w-0 shrink-0 px-3 touch-manipulation"
                >
                  <span className="hidden lg:inline">County Portal</span>
                  <span className="lg:hidden">County</span>
                </Button>
              )}
              <Button
                variant={location.pathname.startsWith('/sacco') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/sacco')}
                className="min-h-[44px] min-w-0 shrink-0 px-3 touch-manipulation"
              >
                <span className="hidden lg:inline">Sacco Portal</span>
                <span className="lg:hidden">Sacco</span>
              </Button>
              {(hasRole('platform_super_admin') || hasRole('platform_admin')) && (
                <Button
                  variant={location.pathname.startsWith('/rider-owner') ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigate('/rider-owner')}
                  className="min-h-[44px] min-w-0 shrink-0 px-3 touch-manipulation"
                >
                  <span className="hidden lg:inline">Rider & Owner Portal</span>
                  <span className="lg:hidden">Rider & Owner</span>
                </Button>
              )}
            </div>
          </div>

          {/* Spacer to push right side content to the right */}
          <div className="flex-1" />

          {/* Right side - fixed on the right */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative min-h-[44px] min-w-[44px]">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 sm:w-96">
                <div className="flex items-center justify-between px-2 py-2">
                  <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
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

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 md:gap-3 px-1 sm:px-2 min-h-[44px]">
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
                <DropdownMenuItem onClick={() => navigate('/sacco/settings')} className="min-h-[44px]">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive min-h-[44px]">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content - no horizontal scroll, touch-friendly */}
        <main className="main-scroll-area flex-1 overflow-y-auto overflow-x-hidden min-w-0 p-3 sm:p-4 lg:p-6 min-h-0">
          <div className="w-full max-w-full min-w-0 mx-auto [overflow-x:clip]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
