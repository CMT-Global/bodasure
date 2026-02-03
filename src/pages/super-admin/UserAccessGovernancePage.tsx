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
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">User & Access Governance</h1>
          <p className="text-muted-foreground">
            View all users across all counties. Filter by county, role, and status. Suspend or deactivate users, force password reset, view login history, and enforce global security actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={countyFilter} onValueChange={setCountyFilter}>
            <SelectTrigger className="w-[180px]">
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
            <SelectTrigger className="w-full sm:w-[200px] min-h-[44px]">
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
            <SelectTrigger className="w-full sm:w-[140px] min-h-[44px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-2">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          </span>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="users" className="gap-2">
              <UsersRound className="h-4 w-4" />
              All users
            </TabsTrigger>
            <TabsTrigger value="suspicious" className="gap-2">
              <ShieldAlert className="h-4 w-4" />
              Suspicious activity
            </TabsTrigger>
            <TabsTrigger value="global" className="gap-2">
              <LogOut className="h-4 w-4" />
              Global security actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Users across all counties</CardTitle>
                <CardDescription>
                  Suspend or deactivate any user, force password reset, or view login history from the row actions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columns}
                  data={filteredUsers}
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
              <CardHeader>
                <CardTitle>Identify suspicious activity</CardTitle>
                <CardDescription>
                  Recent security-related audit events: failed actions, suspensions, user/profile changes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {suspiciousActivity.length === 0 ? (
                  <p className="text-muted-foreground py-4">No suspicious activity recorded.</p>
                ) : (
                  <div className="rounded-md border overflow-auto max-h-[400px]">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium">Time</th>
                          <th className="text-left p-3 font-medium">User</th>
                          <th className="text-left p-3 font-medium">Action</th>
                          <th className="text-left p-3 font-medium">Entity</th>
                          <th className="text-left p-3 font-medium">IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suspiciousActivity.map(log => (
                          <tr key={log.id} className="border-b last:border-0">
                            <td className="p-3 whitespace-nowrap">{format(new Date(log.created_at), 'MMM dd, HH:mm')}</td>
                            <td className="p-3">{log.user ? `${log.user.full_name || log.user.email}` : log.user_id?.slice(0, 8) || '—'}</td>
                            <td className="p-3">{log.action}</td>
                            <td className="p-3">{log.entity_type}</td>
                            <td className="p-3 text-muted-foreground">{log.ip_address || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="global" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enforce global security actions</CardTitle>
                <CardDescription>
                  Platform-wide security controls. Use with caution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="border-amber-200 dark:border-amber-900/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Force logout all users in a county</CardTitle>
                      <CardDescription>Revoke all sessions for users in the selected county. They will need to sign in again.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Select county (backend required)" />
                        </SelectTrigger>
                        <SelectContent>
                          {counties.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="mt-2" disabled>
                        Force logout (requires backend)
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-200 dark:border-amber-900/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Lock county access</CardTitle>
                      <CardDescription>Temporarily disable all non–super-admin access to a county until unlocked.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Select county (backend required)" />
                        </SelectTrigger>
                        <SelectContent>
                          {counties.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="mt-2" disabled>
                        Lock county (requires backend)
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-sm text-muted-foreground">
                  Global actions such as force logout and lock county require server-side implementation (e.g. Supabase Auth admin or custom API).
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Password reset dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force password reset</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.email}. They will need to use this password on next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                placeholder="Min 6 characters"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Confirm"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={resetPassword.isPending}>
              {resetPassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Login & activity history
              {loginHistoryUser && (
                <span className="font-normal text-muted-foreground text-base block mt-1">
                  {loginHistoryUser.full_name || loginHistoryUser.email}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Recent sign-ins and audit events for this user. Empty if no events have been recorded yet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-md border min-h-[120px]">
            {loginHistoryForUser.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground space-y-2">
                <p className="font-medium">No login or activity events recorded</p>
                <p className="text-sm">
                  Sign-in and other actions will appear here once they are logged. New logins are recorded automatically.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">Time</th>
                    <th className="text-left p-3 font-medium">Action</th>
                    <th className="text-left p-3 font-medium">Entity</th>
                    <th className="text-left p-3 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistoryForUser.map((log: UserActivityLog) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="p-3 whitespace-nowrap">{format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}</td>
                      <td className="p-3">{log.action}</td>
                      <td className="p-3">{log.entity_type}</td>
                      <td className="p-3 text-muted-foreground">{log.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLoginHistoryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
