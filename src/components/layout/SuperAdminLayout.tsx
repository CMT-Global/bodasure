import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
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
import { LayoutDashboard, Settings, LogOut, ChevronLeft, ChevronRight, Bell, Menu, Map, Sliders, DollarSign, ShieldCheck, UsersRound, Building2, Headset, Cog, ClipboardCheck, Server, Banknote, Receipt, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

let savedSuperAdminSidebarScrollTop = 0;
const SCROLLBAR_HIDE_DELAY_MS = 1000;

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const scrollbarHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, hasRole } = useAuth();

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
    const saved = savedSuperAdminSidebarScrollTop;
    const restore = () => {
      if (el) el.scrollTop = saved;
    };
    restore();
    requestAnimationFrame(restore);
    const t = setTimeout(restore, 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="layout-root flex bg-background overflow-hidden">
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:relative lg:flex-shrink-0',
          'w-72',
          isCollapsed && 'lg:w-16',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {!isCollapsed && (
            <Link to="/super-admin" className="flex items-center gap-2">
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

        <div
          ref={sidebarScrollRef}
          className={cn(
            'sidebar-nav-scroll flex-1 overflow-y-auto overflow-x-hidden py-4',
            scrollbarVisible && 'scrollbar-visible'
          )}
          onScroll={() => {
            if (sidebarScrollRef.current) savedSuperAdminSidebarScrollTop = sidebarScrollRef.current.scrollTop;
            setScrollbarVisible(true);
            if (scrollbarHideTimeoutRef.current) clearTimeout(scrollbarHideTimeoutRef.current);
            scrollbarHideTimeoutRef.current = setTimeout(() => setScrollbarVisible(false), SCROLLBAR_HIDE_DELAY_MS);
          }}
          onClickCapture={() => {
            if (sidebarScrollRef.current) savedSuperAdminSidebarScrollTop = sidebarScrollRef.current.scrollTop;
          }}
        >
          <nav className="space-y-1 px-2">
            <Link
              to="/super-admin"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] min-w-0',
                location.pathname === '/super-admin'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <LayoutDashboard className={cn('h-5 w-5 shrink-0', location.pathname === '/super-admin' && 'text-primary')} />
              {!isCollapsed && <span className="break-words">Dashboard</span>}
            </Link>
            <Link
              to="/super-admin/counties"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] min-w-0',
                location.pathname === '/super-admin/counties'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <Map className={cn('h-5 w-5 shrink-0', location.pathname === '/super-admin/counties' && 'text-primary')} />
              {!isCollapsed && <span className="break-words">Multi-County Management</span>}
            </Link>
            <Link
              to="/super-admin/county-config"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] min-w-0',
                location.pathname === '/super-admin/county-config'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <Sliders className={cn('h-5 w-5 shrink-0', location.pathname === '/super-admin/county-config' && 'text-primary')} />
              {!isCollapsed && <span className="break-words">County Configuration</span>}
            </Link>
            <Link
              to="/super-admin/revenue-config"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] min-w-0',
                location.pathname === '/super-admin/revenue-config'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <DollarSign className={cn('h-5 w-5 shrink-0', location.pathname === '/super-admin/revenue-config' && 'text-primary')} />
              {!isCollapsed && <span className="break-words">Revenue & Commercial</span>}
            </Link>
            <Link
              to="/super-admin/monetization-settings"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] min-w-0',
                location.pathname === '/super-admin/monetization-settings'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <Banknote className={cn('h-5 w-5 shrink-0', location.pathname === '/super-admin/monetization-settings' && 'text-primary')} />
              {!isCollapsed && <span className="break-words">County Monetization Settings</span>}
            </Link>
            <Link
              to="/super-admin/finance-view"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] min-w-0',
                location.pathname === '/super-admin/finance-view'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <Receipt className={cn('h-5 w-5 shrink-0', location.pathname === '/super-admin/finance-view' && 'text-primary')} />
              {!isCollapsed && <span className="break-words">Finance View</span>}
            </Link>
            <Link
              to="/super-admin/roles-governance"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] min-w-0',
                location.pathname === '/super-admin/roles-governance'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <ShieldCheck className={cn('h-5 w-5 shrink-0', location.pathname === '/super-admin/roles-governance' && 'text-primary')} />
              {!isCollapsed && <span className="break-words">Role & Permission Governance</span>}
            </Link>
            <Link
              to="/super-admin/user-access-governance"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] min-w-0',
                location.pathname === '/super-admin/user-access-governance'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <UsersRound className={cn('h-5 w-5 shrink-0', location.pathname === '/super-admin/user-access-governance' && 'text-primary')} />
              {!isCollapsed && <span className="break-words">User & Access Governance</span>}
            </Link>
            <Link
              to="/super-admin/sacco-welfare-oversight"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] min-w-0',
                location.pathname === '/super-admin/sacco-welfare-oversight'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <Building2 className={cn('h-5 w-5 shrink-0', location.pathname === '/super-admin/sacco-welfare-oversight' && 'text-primary')} />
              {!isCollapsed && <span className="break-words">Sacco, Welfare & Structure Oversight</span>}
            </Link>
            <Link
              to="/super-admin/incident-escalation-support"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] min-w-0',
                location.pathname === '/super-admin/incident-escalation-support'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <Headset className={cn('h-5 w-5 shrink-0', location.pathname === '/super-admin/incident-escalation-support' && 'text-primary')} />
              {!isCollapsed && <span className="break-words">Incident, Escalation & Support</span>}
            </Link>
            <Link
              to="/super-admin/security-audit-compliance"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] min-w-0',
                location.pathname === '/super-admin/security-audit-compliance'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <ClipboardCheck className={cn('h-5 w-5 shrink-0', location.pathname === '/super-admin/security-audit-compliance' && 'text-primary')} />
              {!isCollapsed && <span className="break-words">Security, Audit & Compliance</span>}
            </Link>
            <Link
              to="/super-admin/environment-deployment"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] min-w-0',
                location.pathname === '/super-admin/environment-deployment'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <Server className={cn('h-5 w-5 shrink-0', location.pathname === '/super-admin/environment-deployment' && 'text-primary')} />
              {!isCollapsed && <span className="break-words">Environment & Deployment Controls</span>}
            </Link>
            <Link
              to="/super-admin/system-settings"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] min-w-0',
                location.pathname === '/super-admin/system-settings'
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
              )}
            >
              <Cog className={cn('h-5 w-5 shrink-0', location.pathname === '/super-admin/system-settings' && 'text-primary')} />
              {!isCollapsed && <span className="break-words">System Settings</span>}
            </Link>
          </nav>
        </div>

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

      <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        <header className="sticky top-0 flex-shrink-0 z-30 flex h-16 items-center justify-between gap-2 sm:gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 sm:px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden min-h-[44px] min-w-[44px]"
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Super Admin Portal — can see and switch to all portals */}
          <div className="flex items-center gap-2 ml-2 sm:ml-4 min-w-0">
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
                <DropdownMenuItem onClick={() => navigate('/super-admin')} className="min-h-[44px]">
                  <span className="sm:hidden">Super Admin</span>
                  <span className="hidden sm:inline">Super Admin Portal</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard')} className="min-h-[44px]">
                  <span className="sm:hidden">County</span>
                  <span className="hidden sm:inline">County Portal</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/sacco')} className="min-h-[44px]">
                  <span className="sm:hidden">Sacco</span>
                  <span className="hidden sm:inline">Sacco Portal</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/rider-owner')} className="min-h-[44px]">
                  <span className="sm:hidden">Rider & Owner</span>
                  <span className="hidden sm:inline">Rider & Owner Portal</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Desktop: all portal buttons — flex-nowrap so md shows one row; short labels until lg */}
            <div className="hidden md:flex flex-shrink-0 min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto overflow-y-hidden py-1">
              <Button
                variant={location.pathname.startsWith('/super-admin') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/super-admin')}
                className="min-h-[36px] min-w-0 shrink-0 font-semibold"
              >
                <span className="hidden lg:inline">Super Admin Portal</span>
                <span className="lg:hidden">Super Admin</span>
              </Button>
              <Button
                variant={location.pathname.startsWith('/dashboard') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="min-h-[36px] min-w-0 shrink-0"
              >
                <span className="hidden lg:inline">County Portal</span>
                <span className="lg:hidden">County</span>
              </Button>
              <Button
                variant={location.pathname.startsWith('/sacco') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/sacco')}
                className="min-h-[36px] min-w-0 shrink-0"
              >
                <span className="hidden lg:inline">Sacco Portal</span>
                <span className="lg:hidden">Sacco</span>
              </Button>
              <Button
                variant={location.pathname.startsWith('/rider-owner') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/rider-owner')}
                className="min-h-[36px] min-w-0 shrink-0"
              >
                <span className="hidden lg:inline">Rider & Owner Portal</span>
                <span className="lg:hidden">Rider & Owner</span>
              </Button>
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            <Button variant="ghost" size="icon" className="relative min-h-[44px] min-w-[44px]">
              <Bell className="h-5 w-5" />
            </Button>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
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
                <DropdownMenuItem onClick={() => navigate('/super-admin/system-settings')} className="min-h-[44px]">
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

        <main className="main-scroll-area flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 min-h-0">
          <div className="w-full max-w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
