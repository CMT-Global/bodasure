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
import {
  LayoutDashboard,
  Users,
  Bike,
  Building2,
  MapPin,
  FileCheck,
  CreditCard,
  AlertTriangle,
  QrCode,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Menu,
  ClipboardList,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Riders', href: '/dashboard/riders', icon: Users },
  { title: 'Registration Management', href: '/dashboard/registration-management', icon: ClipboardList, roles: ['county_super_admin', 'county_admin', 'county_registration_agent'] },
  { title: 'Motorbikes', href: '/dashboard/motorbikes', icon: Bike },
  { title: 'Owners', href: '/dashboard/owners', icon: Users },
  { title: 'Saccos', href: '/dashboard/saccos', icon: Building2, roles: ['county_super_admin', 'county_admin'] },
  { title: 'Stages', href: '/dashboard/stages', icon: MapPin, roles: ['county_super_admin', 'county_admin'] },
  { title: 'Permits', href: '/dashboard/permits', icon: FileCheck },
  { title: 'Payments', href: '/dashboard/payments', icon: CreditCard, roles: ['county_super_admin', 'county_admin', 'county_finance_officer'] },
  { title: 'Penalties', href: '/dashboard/penalties', icon: AlertTriangle, roles: ['county_super_admin', 'county_admin', 'county_enforcement_officer'] },
  { title: 'Verification', href: '/dashboard/verification', icon: QrCode, roles: ['county_super_admin', 'county_admin', 'county_enforcement_officer'] },
  { title: 'Reports', href: '/dashboard/reports', icon: BarChart3, roles: ['county_super_admin', 'county_admin', 'county_finance_officer', 'county_analyst'] },
  { title: 'User Management', href: '/dashboard/users', icon: UserCog, roles: ['county_super_admin', 'county_admin'] },
  { title: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['platform_super_admin', 'county_super_admin', 'county_admin'] },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, roles, hasRole } = useAuth();

  // Filter navigation items based on user roles
  const filteredNavItems = navItems.filter((item) => {
    // If no roles specified, show to all authenticated users
    if (!item.roles || item.roles.length === 0) return true;
    
    // Check if user has any of the required roles
    return item.roles.some(role => hasRole(role));
  });

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

  return (
    <div className="flex h-screen bg-background overflow-hidden">
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
          isCollapsed ? 'w-16' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {!isCollapsed && (
            <Link to="/dashboard" className="flex items-center gap-2">
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
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]', // Touch-friendly
                    isActive
                      ? 'bg-sidebar-accent text-primary'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent'
                  )}
                >
                  <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                  {!isCollapsed && <span className="truncate">{item.title}</span>}
                </Link>
              );
            })}
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
        <header className="flex-shrink-0 z-30 flex h-16 items-center justify-end gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden mr-auto min-h-[44px] min-w-[44px]"
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Search - Removed */}
          {/* <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search riders, bikes, payments..."
                className="h-9 w-full rounded-lg border border-input bg-muted/50 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div> */}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative min-h-[44px] min-w-[44px]">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                3
              </span>
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 min-h-[44px]">
                  <Avatar className="h-9 w-9 sm:h-8 sm:w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="hidden md:flex flex-col items-start text-left">
                      <span className="text-sm font-medium truncate max-w-[120px]">{profile?.full_name || 'User'}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">{profile?.email}</span>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
          <div className="w-full max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
