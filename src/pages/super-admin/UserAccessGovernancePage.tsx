import { useState, useMemo } from 'react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCountyUsers,
  useAllAuditLogs,
  useUpdateUserProfile,
  useResetUserPassword,
  useToggleUserStatus,
  CountyUser,
  UserActivityLog,
} from '@/hooks/useUserManagement';
import { useAllCounties } from '@/hooks/useData';
import {
  MoreHorizontal,
  Ban,
  Key,
  Activity,
  ShieldAlert,
  LogOut,
  Loader2,
  UsersRound,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';

const ALL_ROLES = [
  { value: 'platform_super_admin', label: 'Platform Super Admin' },
  { value: 'platform_admin', label: 'Platform Admin' },
  { value: 'county_super_admin', label: 'County Super Admin' },
  { value: 'county_admin', label: 'County Admin' },
  { value: 'county_finance_officer', label: 'County Finance Officer' },
  { value: 'county_enforcement_officer', label: 'County Enforcement Officer' },
  { value: 'county_registration_agent', label: 'County Registration Agent' },
  { value: 'county_analyst', label: 'County Analyst' },
  { value: 'sacco_admin', label: 'Sacco / Welfare Admin' },
  { value: 'sacco_officer', label: 'Sacco / Welfare Officer' },
  { value: 'stage_chairman', label: 'Stage Chairman' },
  { value: 'stage_secretary', label: 'Stage Secretary' },
  { value: 'stage_treasurer', label: 'Stage Treasurer' },
  { value: 'rider', label: 'Rider' },
  { value: 'owner', label: 'Owner' },
];

export default function UserAccessGovernancePage() {
  const { data: users = [], isLoading } = useCountyUsers(undefined);
  const { data: counties = [] } = useAllCounties();
  const { data: allAuditLogs = [] } = useAllAuditLogs();

  const updateProfile = useUpdateUserProfile();
  const resetPassword = useResetUserPassword();
  const toggleStatus = useToggleUserStatus();

  const [countyFilter, setCountyFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [selectedUser, setSelectedUser] = useState<CountyUser | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isLoginHistoryOpen, setIsLoginHistoryOpen] = useState(false);
  const [loginHistoryUserId, setLoginHistoryUserId] = useState<string | null>(null);
  const [loginHistoryUser, setLoginHistoryUser] = useState<CountyUser | null>(null);
  const [loginHistoryPage, setLoginHistoryPage] = useState(1);

  const LOGIN_HISTORY_ROWS_PER_PAGE = 15;

  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });

  const countyMap = useMemo(() => new Map(counties.map(c => [c.id, c])), [counties]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (countyFilter !== 'all' && user.county_id !== countyFilter) return false;
      if (statusFilter !== 'all' && user.is_active !== (statusFilter === 'active')) return false;
      if (roleFilter !== 'all' && !user.roles.some(r => r.role === roleFilter)) return false;
      return true;
    });
  }, [users, countyFilter, roleFilter, statusFilter]);

  const loginHistoryForUser = useMemo(() => {
    if (!loginHistoryUserId) return [];
    return allAuditLogs
      .filter(log => log.user_id === loginHistoryUserId)
      .slice(0, 100);
  }, [allAuditLogs, loginHistoryUserId]);

  const loginHistoryTotalPages = Math.max(1, Math.ceil(loginHistoryForUser.length / LOGIN_HISTORY_ROWS_PER_PAGE));
  const loginHistoryPaginated = useMemo(() => {
    const start = (loginHistoryPage - 1) * LOGIN_HISTORY_ROWS_PER_PAGE;
    return loginHistoryForUser.slice(start, start + LOGIN_HISTORY_ROWS_PER_PAGE);
  }, [loginHistoryForUser, loginHistoryPage, LOGIN_HISTORY_ROWS_PER_PAGE]);

  const suspiciousActivity = useMemo(() => {
    return allAuditLogs
      .filter(
        log =>
          log.action?.toLowerCase().includes('fail') ||
          log.action?.toLowerCase().includes('suspend') ||
          log.action?.toLowerCase().includes('lock') ||
          log.entity_type === 'user' || log.entity_type === 'profile'
      )
      .slice(0, 50);
  }, [allAuditLogs]);

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    await resetPassword.mutateAsync({
      userId: selectedUser.id,
      email: selectedUser.email,
      newPassword: passwordForm.newPassword,
    });
    setIsPasswordDialogOpen(false);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setSelectedUser(null);
  };

  const handleToggleStatus = async (isActive: boolean) => {
    if (!selectedUser) return;
    await toggleStatus.mutateAsync({ userId: selectedUser.id, isActive });
    setIsSuspendDialogOpen(false);
    setSelectedUser(null);
  };

  const openLoginHistory = (user: CountyUser) => {
    setLoginHistoryUserId(user.id);
    setLoginHistoryUser(user);
    setLoginHistoryPage(1);
    setIsLoginHistoryOpen(true);
  };

  const columns: ColumnDef<CountyUser>[] = [
    {
      accessorKey: 'full_name',
      header: 'User',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.full_name || 'No name'}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      id: 'county',
      header: 'County',
      cell: ({ row }) => {
        const cid = row.original.county_id;
        const county = cid ? countyMap.get(cid) : null;
        return <span className="text-sm">{county ? `${county.name} (${county.code})` : cid ? cid.slice(0, 8) + '…' : '—'}</span>;
      },
    },
    {
      accessorKey: 'roles',
      header: 'Roles',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.length === 0 ? (
            <Badge variant="outline">No roles</Badge>
          ) : (
            row.original.roles.map(role => (
              <Badge key={role.id} variant="secondary">
                {ALL_ROLES.find(r => r.value === role.role)?.label || role.role}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'destructive'}>
          {row.original.is_active ? 'Active' : 'Suspended'}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM dd, yyyy'),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openLoginHistory(user)}>
                <Activity className="mr-2 h-4 w-4" />
                View login history
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(user);
                  setPasswordForm({ newPassword: '', confirmPassword: '' });
                  setIsPasswordDialogOpen(true);
                }}
              >
                <Key className="mr-2 h-4 w-4" />
                Force password reset
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(user);
                  setIsSuspendDialogOpen(true);
                }}
                className={user.is_active ? 'text-amber-600' : 'text-green-600'}
              >
                <Ban className="mr-2 h-4 w-4" />
                {user.is_active ? 'Suspend / Deactivate' : 'Activate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="min-w-0 space-y-6 overflow-x-hidden p-4 md:p-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">User & Access Governance</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            View all users across all counties. Filter by county, role, and status. Suspend or deactivate users, force password reset, view login history, and enforce global security actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select value={countyFilter} onValueChange={setCountyFilter}>
            <SelectTrigger className="w-full min-h-9 sm:w-[180px]">
              <SelectValue placeholder="County" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All counties</SelectItem>
              {counties.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full min-h-9 sm:w-[200px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ALL_ROLES.map(r => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full min-h-9 sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-0 w-full text-sm text-muted-foreground sm:ml-2 sm:w-auto">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          </span>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="flex h-auto flex-wrap gap-1 p-1.5 sm:p-1">
            <TabsTrigger value="users" className="gap-1.5 text-xs sm:gap-2 sm:text-sm">
              <UsersRound className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              All users
            </TabsTrigger>
            <TabsTrigger value="suspicious" className="gap-1.5 text-xs sm:gap-2 sm:text-sm">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              Suspicious
            </TabsTrigger>
            <TabsTrigger value="global" className="gap-1.5 text-xs sm:gap-2 sm:text-sm">
              <LogOut className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              Global actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Users across all counties</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Suspend or deactivate any user, force password reset, or view login history from the row actions.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <DataTable
                  columns={columns}
                  data={filteredUsers}
                  searchKeys={['full_name', 'email']}
                  searchPlaceholder="Search users by name or email..."
                  isLoading={isLoading}
                  mobileCardRender={(user) => {
                    const county = user.county_id ? countyMap.get(user.county_id) : null;
                    return (
                      <Card className="overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{user.full_name || 'No name'}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {county ? `${county.name} (${county.code})` : user.county_id ? user.county_id.slice(0, 8) + '…' : '—'}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openLoginHistory(user)}>
                                  <Activity className="mr-2 h-4 w-4" />
                                  View login history
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setPasswordForm({ newPassword: '', confirmPassword: '' });
                                    setIsPasswordDialogOpen(true);
                                  }}
                                >
                                  <Key className="mr-2 h-4 w-4" />
                                  Force password reset
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsSuspendDialogOpen(true);
                                  }}
                                  className={user.is_active ? 'text-amber-600' : 'text-green-600'}
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  {user.is_active ? 'Suspend / Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length === 0 ? (
                              <Badge variant="outline">No roles</Badge>
                            ) : (
                              user.roles.map(role => (
                                <Badge key={role.id} variant="secondary" className="text-xs">
                                  {ALL_ROLES.find(r => r.value === role.role)?.label || role.role}
                                </Badge>
                              ))
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-2 border-t text-sm">
                            <Badge variant={user.is_active ? 'default' : 'destructive'}>
                              {user.is_active ? 'Active' : 'Suspended'}
                            </Badge>
                            <span className="text-muted-foreground text-xs">{format(new Date(user.created_at), 'MMM dd, yyyy')}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suspicious" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Identify suspicious activity</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Recent security-related audit events: failed actions, suspensions, user/profile changes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {suspiciousActivity.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground sm:text-base">No suspicious activity recorded.</p>
                ) : (
                  <div className="max-h-[400px] overflow-auto rounded-md border">
                    <div className="min-w-[520px] overflow-x-auto sm:min-w-0">
                      <table className="w-full text-xs sm:text-sm">
                        <thead className="sticky top-0 bg-muted/50">
                          <tr>
                            <th className="p-2 text-left font-medium sm:p-3">Time</th>
                            <th className="p-2 text-left font-medium sm:p-3">User</th>
                            <th className="p-2 text-left font-medium sm:p-3">Action</th>
                            <th className="p-2 text-left font-medium sm:p-3">Entity</th>
                            <th className="p-2 text-left font-medium sm:p-3">IP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {suspiciousActivity.map(log => (
                            <tr key={log.id} className="border-b last:border-0">
                              <td className="whitespace-nowrap p-2 sm:p-3">{format(new Date(log.created_at), 'MMM dd, HH:mm')}</td>
                              <td className="max-w-[120px] truncate p-2 sm:max-w-none sm:p-3">{log.user ? `${log.user.full_name || log.user.email}` : log.user_id?.slice(0, 8) || '—'}</td>
                              <td className="max-w-[100px] truncate p-2 sm:max-w-none sm:p-3">{log.action}</td>
                              <td className="p-2 sm:p-3">{log.entity_type}</td>
                              <td className="p-2 text-muted-foreground sm:p-3">{log.ip_address || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="global" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Enforce global security actions</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Platform-wide security controls. Use with caution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                  <Card className="min-w-0 border-amber-200 dark:border-amber-900/50">
                    <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
                      <CardTitle className="text-sm sm:text-base">Force logout all users in a county</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Revoke all sessions for users in the selected county. They will need to sign in again.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4 sm:px-6 sm:pb-6">
                      <Select disabled>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select county (backend required)" />
                        </SelectTrigger>
                        <SelectContent>
                          {counties.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="mt-2 min-h-9 w-full min-w-0 whitespace-normal break-words text-center sm:w-auto" disabled>
                        Force logout (requires backend)
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0 border-amber-200 dark:border-amber-900/50">
                    <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
                      <CardTitle className="text-sm sm:text-base">Lock county access</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Temporarily disable all non–super-admin access to a county until unlocked.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4 sm:px-6 sm:pb-6">
                      <Select disabled>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select county (backend required)" />
                        </SelectTrigger>
                        <SelectContent>
                          {counties.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="mt-2 min-h-9 w-full min-w-0 whitespace-normal break-words text-center sm:w-auto" disabled>
                        Lock county (requires backend)
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Global actions such as force logout and lock county require server-side implementation (e.g. Supabase Auth admin or custom API).
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Password reset dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Force password reset</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Set a new password for {selectedUser?.email}. They will need to use this password on next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="newPassword" className="text-sm">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                placeholder="Min 6 characters"
                className="mt-1 min-h-9 w-full"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-sm">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Confirm"
                className="mt-1 min-h-9 w-full"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
            <Button className="w-full min-h-9 sm:w-auto" onClick={handleResetPassword} disabled={resetPassword.isPending}>
              {resetPassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />}
              Reset password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend / Activate dialog */}
      <AlertDialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.is_active ? 'Suspend / Deactivate user' : 'Activate user'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.is_active
                ? `Suspend ${selectedUser.full_name || selectedUser.email}? They will not be able to sign in until reactivated.`
                : `Reactivate ${selectedUser?.full_name || selectedUser?.email}? They will be able to sign in again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && handleToggleStatus(!selectedUser.is_active)}
              className={selectedUser?.is_active ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              disabled={toggleStatus.isPending}
            >
              {toggleStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedUser?.is_active ? 'Suspend' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Login history dialog */}
      <Dialog
        open={isLoginHistoryOpen}
        onOpenChange={open => {
          setIsLoginHistoryOpen(open);
          if (!open) {
            setLoginHistoryUserId(null);
            setLoginHistoryUser(null);
            setLoginHistoryPage(1);
          }
        }}
      >
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl flex-col overflow-hidden p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Login & activity history
              {loginHistoryUser && (
                <span className="mt-1 block text-sm font-normal text-muted-foreground sm:text-base">
                  {loginHistoryUser.full_name || loginHistoryUser.email}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Recent sign-ins and audit events for this user. Empty if no events have been recorded yet.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-[120px] flex-1 overflow-auto rounded-md border">
            {loginHistoryForUser.length === 0 ? (
              <div className="space-y-2 p-4 text-center text-muted-foreground sm:p-6">
                <p className="text-sm font-medium sm:text-base">No login or activity events recorded</p>
                <p className="text-xs sm:text-sm">
                  Sign-in and other actions will appear here once they are logged. New logins are recorded automatically.
                </p>
              </div>
            ) : (
              <>
                <div className="min-w-[380px] overflow-x-auto sm:min-w-0">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="sticky top-0 bg-muted/50">
                      <tr>
                        <th className="p-2 text-left font-medium sm:p-3">Time</th>
                        <th className="p-2 text-left font-medium sm:p-3">Action</th>
                        <th className="p-2 text-left font-medium sm:p-3">Entity</th>
                        <th className="p-2 text-left font-medium sm:p-3">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loginHistoryPaginated.map((log: UserActivityLog) => (
                        <tr key={log.id} className="border-b last:border-0">
                          <td className="whitespace-nowrap p-2 sm:p-3">{format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}</td>
                          <td className="max-w-[100px] truncate p-2 sm:max-w-none sm:p-3">{log.action}</td>
                          <td className="p-2 sm:p-3">{log.entity_type}</td>
                          <td className="p-2 text-muted-foreground sm:p-3">{log.ip_address || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {loginHistoryTotalPages > 1 && (
                  <Pagination className="mt-3 shrink-0 justify-end border-t pt-3">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setLoginHistoryPage((p) => Math.max(1, p - 1));
                          }}
                          className={
                            loginHistoryPage === 1
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <span className="px-4 py-2 text-sm text-muted-foreground">
                          Page {loginHistoryPage} of {loginHistoryTotalPages}
                        </span>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setLoginHistoryPage((p) => Math.min(loginHistoryTotalPages, p + 1));
                          }}
                          className={
                            loginHistoryPage >= loginHistoryTotalPages
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </div>
          <DialogFooter className="shrink-0 border-t pt-4 sm:justify-end">
            <Button variant="outline" className="w-full min-h-9 sm:w-auto" onClick={() => setIsLoginHistoryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
