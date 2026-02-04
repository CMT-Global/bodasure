import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ColumnDef } from '@tanstack/react-table';
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
import { useAuth } from '@/hooks/useAuth';
import {
  useCountyUsers,
  useUserActivityLogs,
  useCreateCountyUser,
  useUpdateUserProfile,
  useAssignUserRoles,
  useResetUserPassword,
  useToggleUserStatus,
  CountyUser,
  UserActivityLog,
} from '@/hooks/useUserManagement';
import { Plus, MoreHorizontal, Edit, Ban, Key, Eye, Loader2, UserPlus, Shield, Activity, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Available roles for county users
const COUNTY_ROLES = [
  { value: 'county_super_admin', label: 'County Super Admin' },
  { value: 'county_admin', label: 'County Admin' },
  { value: 'county_finance_officer', label: 'County Finance Officer' },
  { value: 'county_enforcement_officer', label: 'County Enforcement Officer' },
  { value: 'county_registration_agent', label: 'County Registration Agent' },
  { value: 'county_analyst', label: 'County Analyst' },
];

export default function UsersPage() {
  const { profile, roles, hasRole } = useAuth();
  
  // Get county_id from profile or first role
  const countyId = useMemo(() => {
    return profile?.county_id || roles.find(r => r.county_id)?.county_id || undefined;
  }, [profile, roles]);

  // Platform/county super admins have full access; county_admin can manage users
  const canAccessUserManagement = hasRole('platform_super_admin') || hasRole('county_super_admin') || hasRole('county_admin');

  const { data: users = [], isLoading } = useCountyUsers(countyId);
  const { data: activityLogs = [] } = useUserActivityLogs(countyId);
  const createUser = useCreateCountyUser();
  const updateUser = useUpdateUserProfile();
  const assignRoles = useAssignUserRoles();
  const resetPassword = useResetUserPassword();
  const toggleStatus = useToggleUserStatus();

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRolesDialogOpen, setIsRolesDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CountyUser | null>(null);

  // Form states
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    roles: [] as string[],
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Activity logs pagination: 12 rows per page
  const ACTIVITY_PAGE_SIZE = 12;
  const [activityPage, setActivityPage] = useState(0);
  const activityTotalPages = Math.max(1, Math.ceil(activityLogs.length / ACTIVITY_PAGE_SIZE));
  const currentActivityPage = activityPage >= activityTotalPages ? 0 : activityPage;
  const paginatedActivityLogs = useMemo(() => {
    const start = currentActivityPage * ACTIVITY_PAGE_SIZE;
    return activityLogs.slice(start, start + ACTIVITY_PAGE_SIZE);
  }, [activityLogs, currentActivityPage]);

  useEffect(() => {
    if (activityPage >= activityTotalPages && activityTotalPages > 0) {
      setActivityPage(0);
    }
  }, [activityPage, activityTotalPages]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (statusFilter !== 'all' && user.is_active !== (statusFilter === 'active')) return false;
      if (roleFilter !== 'all' && !user.roles.some(r => r.role === roleFilter)) return false;
      return true;
    });
  }, [users, statusFilter, roleFilter]);

  // Create user
  const handleCreateUser = async () => {
    if (!countyId) {
      toast.error('County ID is required');
      return;
    }
    if (!userForm.email || !userForm.password || !userForm.fullName) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (userForm.roles.length === 0) {
      toast.error('Please assign at least one role');
      return;
    }

    await createUser.mutateAsync({
      email: userForm.email,
      password: userForm.password,
      fullName: userForm.fullName,
      phone: userForm.phone || undefined,
      countyId,
      roles: userForm.roles,
    });

    setIsCreateDialogOpen(false);
    setUserForm({ email: '', password: '', fullName: '', phone: '', roles: [] });
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    await updateUser.mutateAsync({
      userId: selectedUser.id,
      fullName: userForm.fullName,
      phone: userForm.phone || undefined,
    });

    setIsEditDialogOpen(false);
    setSelectedUser(null);
  };

  // Assign/update roles (including removing roles when unchecked)
  const handleAssignRoles = async () => {
    if (!selectedUser || !countyId) return;
    await assignRoles.mutateAsync({
      userId: selectedUser.id,
      roles: userForm.roles,
      countyId,
    });
    setIsRolesDialogOpen(false);
    setSelectedUser(null);
  };

  // Remove a single role from a user (county-scoped)
  const handleRemoveRole = (user: CountyUser, roleToRemove: string) => {
    const isCountyRole = user.roles.some(r => r.role === roleToRemove && r.county_id === countyId);
    if (!countyId || !isCountyRole) return;
    const newRoles = user.roles
      .filter(r => r.county_id === countyId && r.role !== roleToRemove)
      .map(r => r.role);
    assignRoles.mutate(
      { userId: user.id, roles: newRoles, countyId },
      {
        onSuccess: () => toast.success('Role removed'),
        onError: () => {},
      }
    );
  };

  // Reset password
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

  // Toggle user status
  const handleToggleStatus = async (isActive: boolean) => {
    if (!selectedUser) return;

    await toggleStatus.mutateAsync({
      userId: selectedUser.id,
      isActive,
    });

    setIsSuspendDialogOpen(false);
    setSelectedUser(null);
  };

  // Open dialogs
  const openEditDialog = (user: CountyUser) => {
    setSelectedUser(user);
    setUserForm({
      email: user.email,
      password: '',
      fullName: user.full_name || '',
      phone: user.phone || '',
      roles: [],
    });
    setIsEditDialogOpen(true);
  };

  const openRolesDialog = (user: CountyUser) => {
    setSelectedUser(user);
    const countyRoles = user.roles.filter(r => r.county_id === countyId).map(r => r.role);
    setUserForm({
      email: user.email,
      password: '',
      fullName: user.full_name || '',
      phone: user.phone || '',
      roles: countyRoles,
    });
    setIsRolesDialogOpen(true);
  };

  const openPasswordDialog = (user: CountyUser) => {
    setSelectedUser(user);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setIsPasswordDialogOpen(true);
  };

  // Columns
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
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => <span className="text-sm">{row.original.phone || '-'}</span>,
    },
    {
      accessorKey: 'roles',
      header: 'Roles',
      cell: ({ row }) => {
        const user = row.original;
        const countyRoleIds = user.roles.filter(r => r.county_id === countyId);
        return (
          <div className="flex flex-wrap gap-1">
            {user.roles.length === 0 ? (
              <Badge variant="outline">No roles</Badge>
            ) : (
              user.roles.map((role) => {
                const canRemove = role.county_id === countyId;
                const label = COUNTY_ROLES.find(r => r.value === role.role)?.label || role.role;
                return (
                  <Badge
                    key={role.id}
                    variant="secondary"
                    className={canRemove ? 'pr-1 gap-0.5' : ''}
                  >
                    {label}
                    {canRemove && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveRole(user, role.role);
                        }}
                        className="ml-0.5 rounded hover:bg-muted p-0.5 inline-flex items-center justify-center"
                        title={`Remove ${label}`}
                        disabled={assignRoles.isPending}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                );
              })
            )}
          </div>
        );
      },
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
              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                <Edit className="mr-2 h-4 w-4" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openRolesDialog(user)}>
                <Shield className="mr-2 h-4 w-4" />Manage Roles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openPasswordDialog(user)}>
                <Key className="mr-2 h-4 w-4" />Reset Password
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
                {user.is_active ? 'Suspend' : 'Activate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Access control - platform/county super admins and county admin can access user management
  if (!canAccessUserManagement) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage county users and permissions</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-amber-600">
                <Shield className="h-5 w-5" />
                <p>You need Platform Super Admin, County Super Admin, or County Admin privileges to access user management.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 min-w-0 overflow-x-hidden">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">User Management</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage county users, roles, and permissions • {filteredUsers.length} total</p>
            </div>
            <Button 
              onClick={() => { setUserForm({ email: '', password: '', fullName: '', phone: '', roles: [] }); setIsCreateDialogOpen(true); }} 
              className="glow-primary min-h-[44px] w-full sm:w-auto"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px] min-h-[44px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[200px] min-h-[44px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {COUNTY_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 p-1 h-auto gap-1 rounded-lg [&>button]:min-h-[44px] [&>button]:min-w-0">
            <TabsTrigger value="users" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Shield className="h-4 w-4 shrink-0" />
              Users
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Activity className="h-4 w-4 shrink-0" />
              Activity Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <DataTable
              columns={columns}
              data={filteredUsers}
              searchKeys={['full_name', 'email', 'phone']}
              searchPlaceholder="Search users..."
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="activity">
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">User Activity Logs</CardTitle>
                <CardDescription className="text-sm">View recent user activities and actions in your county. 12 entries per page.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 min-w-0 overflow-x-hidden">
                <div className="space-y-4">
                  {activityLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No activity logs found</p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {paginatedActivityLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-4 border rounded-lg bg-card min-w-0 overflow-hidden space-y-2"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-wrap">
                              <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <Badge variant="outline" className="text-xs shrink-0">{log.action}</Badge>
                                <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{log.entity_type}</span>
                                {log.entity_id && (
                                  <span className="text-xs text-muted-foreground font-mono truncate break-all">
                                    ID: {log.entity_id.slice(0, 12)}{log.entity_id.length > 12 ? '…' : ''}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
                                {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate break-all">
                              {log.user?.full_name || log.user?.email || 'System'}
                              {log.user?.email && log.user?.full_name ? ` (${log.user.email})` : ''}
                            </p>
                            {(log.old_values || log.new_values) && (
                              <div className="mt-2 text-xs space-y-1 min-w-0 overflow-x-auto">
                                {log.old_values && Object.keys(log.old_values).length > 0 && (
                                  <p className="text-red-600 dark:text-red-400 break-all">Old: {JSON.stringify(log.old_values)}</p>
                                )}
                                {log.new_values && Object.keys(log.new_values).length > 0 && (
                                  <p className="text-green-600 dark:text-green-400 break-all">New: {JSON.stringify(log.new_values)}</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* Pagination: 12 per page */}
                      <div className="flex flex-col gap-3 pt-2 border-t">
                        <p className="text-xs text-muted-foreground text-center">
                          {activityLogs.length === 0
                            ? 'No results'
                            : `Showing ${currentActivityPage * ACTIVITY_PAGE_SIZE + 1}–${Math.min((currentActivityPage + 1) * ACTIVITY_PAGE_SIZE, activityLogs.length)} of ${activityLogs.length} results`}
                        </p>
                        <div className="flex items-center gap-2 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActivityPage((p) => Math.max(0, p - 1))}
                            disabled={currentActivityPage <= 0}
                            className="flex-1 min-h-[44px] touch-manipulation"
                          >
                            <ChevronLeft className="h-4 w-4 shrink-0" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActivityPage((p) => Math.min(activityTotalPages - 1, p + 1))}
                            disabled={currentActivityPage >= activityTotalPages - 1}
                            className="flex-1 min-h-[44px] touch-manipulation"
                          >
                            Next
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create County User</DialogTitle>
              <DialogDescription>Create a new user account for your county</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  placeholder="John Doe"
                  className="min-h-[44px] text-base sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="user@example.com"
                  className="min-h-[44px] text-base sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="+254712345678"
                  className="min-h-[44px] text-base sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="min-h-[44px] text-base sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Roles *</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {COUNTY_ROLES.map((role) => (
                    <div key={role.value} className="flex items-center space-x-2 min-h-[44px]">
                      <input
                        type="checkbox"
                        id={role.value}
                        checked={userForm.roles.includes(role.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUserForm({ ...userForm, roles: [...userForm.roles, role.value] });
                          } else {
                            setUserForm({ ...userForm, roles: userForm.roles.filter(r => r !== role.value) });
                          }
                        }}
                        className="rounded border-gray-300 w-5 h-5"
                      />
                      <Label htmlFor={role.value} className="text-sm font-normal cursor-pointer flex-1">
                        {role.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
              <Button onClick={handleCreateUser} disabled={createUser.isPending} className="w-full sm:w-auto min-h-[44px]">
                {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  className="min-h-[44px] text-base sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  className="min-h-[44px] text-base sm:text-sm"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
              <Button onClick={handleUpdateUser} disabled={updateUser.isPending} className="w-full sm:w-auto min-h-[44px]">
                {updateUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Roles Dialog — add or remove roles; uncheck to remove */}
        <Dialog open={isRolesDialogOpen} onOpenChange={setIsRolesDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Roles</DialogTitle>
              <DialogDescription>
                Add or remove roles for {selectedUser?.full_name || selectedUser?.email}. Check roles to add, uncheck to remove.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                {COUNTY_ROLES.map((role) => (
                  <div key={role.value} className="flex items-center space-x-2 min-h-[44px]">
                    <input
                      type="checkbox"
                      id={`role-${role.value}`}
                      checked={userForm.roles.includes(role.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setUserForm({ ...userForm, roles: [...userForm.roles, role.value] });
                        } else {
                          setUserForm({ ...userForm, roles: userForm.roles.filter(r => r !== role.value) });
                        }
                      }}
                      className="rounded border-gray-300 w-5 h-5"
                    />
                    <Label htmlFor={`role-${role.value}`} className="text-sm font-normal cursor-pointer flex-1">
                      {role.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsRolesDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
              <Button onClick={handleAssignRoles} disabled={assignRoles.isPending} className="w-full sm:w-auto min-h-[44px]">
                {assignRoles.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Roles
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>Reset password for {selectedUser?.full_name || selectedUser?.email}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Password *</Label>
                <Input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="min-h-[44px] text-base sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password *</Label>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="min-h-[44px] text-base sm:text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Note: If direct password reset is not available, a password reset email will be sent to the user.
              </p>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
              <Button onClick={handleResetPassword} disabled={resetPassword.isPending} className="w-full sm:w-auto min-h-[44px]">
                {resetPassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Suspend/Activate User Dialog */}
        <AlertDialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedUser?.is_active ? 'Suspend User' : 'Activate User'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {selectedUser?.is_active ? 'suspend' : 'activate'} {selectedUser?.full_name || selectedUser?.email}?
                {selectedUser?.is_active && ' Suspended users will not be able to access the system.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedUser && handleToggleStatus(!selectedUser.is_active)}
                className={selectedUser?.is_active ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}
              >
                {selectedUser?.is_active ? 'Suspend' : 'Activate'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
