import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { useEffectiveCountyId } from '@/contexts/PlatformSuperAdminCountyContext';
import { CountyFilterBar } from '@/components/shared/CountyFilterBar';
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
import {
  countyUserCreateFormSchema,
  countyUserEditFormSchema,
  countyUserRolesFormSchema,
  countyUserResetPasswordFormSchema,
  type CountyUserCreateFormValues,
  type CountyUserEditFormValues,
  type CountyUserRolesFormValues,
  type CountyUserResetPasswordFormValues,
} from '@/lib/zod';

// Available roles for county users (county portal only — used for create/edit and filters)
const COUNTY_ROLES = [
  { value: 'county_super_admin', label: 'County Super Admin' },
  { value: 'county_admin', label: 'County Admin' },
  { value: 'county_finance_officer', label: 'County Finance Officer' },
  { value: 'county_enforcement_officer', label: 'County Enforcement Officer' },
  { value: 'county_registration_agent', label: 'County Registration Agent' },
  { value: 'county_analyst', label: 'County Analyst' },
];

const COUNTY_PORTAL_ROLE_VALUES = new Set(COUNTY_ROLES.map((r) => r.value));

export default function UsersPage() {
  const { profile, roles, hasRole } = useAuth();
  const countyId = useEffectiveCountyId();

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

  const createUserForm = useForm<CountyUserCreateFormValues>({
    resolver: zodResolver(countyUserCreateFormSchema),
    defaultValues: { full_name: '', email: '', phone: '', password: '', roles: [] },
  });

  const editUserForm = useForm<CountyUserEditFormValues>({
    resolver: zodResolver(countyUserEditFormSchema),
    defaultValues: { full_name: '', phone: '' },
  });

  const rolesForm = useForm<CountyUserRolesFormValues>({
    resolver: zodResolver(countyUserRolesFormSchema),
    defaultValues: { roles: [] },
  });

  const resetPasswordForm = useForm<CountyUserResetPasswordFormValues>({
    resolver: zodResolver(countyUserResetPasswordFormSchema),
    defaultValues: { new_password: '', confirm_password: '' },
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
      // Only show users with a county portal role (County Super Admin, County Admin, etc.)
      const countyPortalRolesForUser = user.roles.filter((r) => COUNTY_PORTAL_ROLE_VALUES.has(r.role));
      if (countyPortalRolesForUser.length === 0) return false;
      // When a county is selected, only show users whose county portal role is for this county (don't show other county's users)
      if (countyId) {
        const hasRoleForThisCounty = countyPortalRolesForUser.some((r) => r.county_id === countyId);
        if (!hasRoleForThisCounty) return false;
      }
      if (statusFilter !== 'all' && user.is_active !== (statusFilter === 'active')) return false;
      if (roleFilter !== 'all' && !user.roles.some((r) => r.role === roleFilter)) return false;
      return true;
    });
  }, [users, countyId, statusFilter, roleFilter]);

  // Create user
  const handleCreateUser = async (values: CountyUserCreateFormValues) => {
    if (!countyId) {
      toast.error('County ID is required');
      return;
    }
    await createUser.mutateAsync({
      email: values.email,
      password: values.password,
      fullName: values.full_name,
      phone: values.phone || undefined,
      countyId,
      roles: values.roles,
    });
    setIsCreateDialogOpen(false);
    createUserForm.reset();
  };

  // Update user
  const handleUpdateUser = async (values: CountyUserEditFormValues) => {
    if (!selectedUser) return;
    await updateUser.mutateAsync({
      userId: selectedUser.id,
      fullName: values.full_name,
      phone: values.phone || undefined,
    });
    setIsEditDialogOpen(false);
    setSelectedUser(null);
  };

  // Assign/update roles (including removing roles when unchecked)
  const handleAssignRoles = async (values: CountyUserRolesFormValues) => {
    if (!selectedUser || !countyId) return;
    await assignRoles.mutateAsync({
      userId: selectedUser.id,
      roles: values.roles,
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
  const handleResetPassword = async (values: CountyUserResetPasswordFormValues) => {
    if (!selectedUser) return;
    await resetPassword.mutateAsync({
      userId: selectedUser.id,
      email: selectedUser.email,
      newPassword: values.new_password,
    });
    setIsPasswordDialogOpen(false);
    resetPasswordForm.reset();
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
    editUserForm.reset({ full_name: user.full_name || '', phone: user.phone || '' });
    setIsEditDialogOpen(true);
  };

  const openRolesDialog = (user: CountyUser) => {
    setSelectedUser(user);
    const countyRoles = user.roles.filter(r => r.county_id === countyId).map(r => r.role);
    rolesForm.reset({ roles: countyRoles });
    setIsRolesDialogOpen(true);
  };

  const openPasswordDialog = (user: CountyUser) => {
    setSelectedUser(user);
    resetPasswordForm.reset({ new_password: '', confirm_password: '' });
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
            <div className="flex flex-col sm:flex-row gap-2">
              <CountyFilterBar />
              <Button 
              onClick={() => { createUserForm.reset(); setIsCreateDialogOpen(true); }} 
              className="glow-primary min-h-[44px] w-full sm:w-auto"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create User
            </Button>
            </div>
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
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (open) createUserForm.reset(); }}>
          <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create County User</DialogTitle>
              <DialogDescription>Create a new user account for your county</DialogDescription>
            </DialogHeader>
            <Form {...createUserForm}>
              <form onSubmit={createUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
                <FormField
                  control={createUserForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" className="min-h-[44px] text-base sm:text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createUserForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="user@example.com" className="min-h-[44px] text-base sm:text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createUserForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+254712345678" className="min-h-[44px] text-base sm:text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createUserForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Minimum 6 characters" className="min-h-[44px] text-base sm:text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createUserForm.control}
                  name="roles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roles *</FormLabel>
                      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                        {COUNTY_ROLES.map((role) => (
                          <div key={role.value} className="flex items-center space-x-2 min-h-[44px]">
                            <input
                              type="checkbox"
                              id={role.value}
                              checked={field.value.includes(role.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  field.onChange([...field.value, role.value]);
                                } else {
                                  field.onChange(field.value.filter((r) => r !== role.value));
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
                  <Button type="submit" disabled={createUser.isPending} className="w-full sm:w-auto min-h-[44px]">
                    {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create User
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information</DialogDescription>
            </DialogHeader>
            <Form {...editUserForm}>
              <form onSubmit={editUserForm.handleSubmit(handleUpdateUser)} className="space-y-4">
                <FormField
                  control={editUserForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input className="min-h-[44px] text-base sm:text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editUserForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input className="min-h-[44px] text-base sm:text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
                  <Button type="submit" disabled={updateUser.isPending} className="w-full sm:w-auto min-h-[44px]">
                    {updateUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update
                  </Button>
                </DialogFooter>
              </form>
            </Form>
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
            <Form {...rolesForm}>
              <form onSubmit={rolesForm.handleSubmit(handleAssignRoles)} className="space-y-2">
                <FormField
                  control={rolesForm.control}
                  name="roles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roles</FormLabel>
                      <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                        {COUNTY_ROLES.map((role) => (
                          <div key={role.value} className="flex items-center space-x-2 min-h-[44px]">
                            <input
                              type="checkbox"
                              id={`role-${role.value}`}
                              checked={field.value.includes(role.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  field.onChange([...field.value, role.value]);
                                } else {
                                  field.onChange(field.value.filter((r) => r !== role.value));
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsRolesDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
                  <Button type="submit" disabled={assignRoles.isPending} className="w-full sm:w-auto min-h-[44px]">
                    {assignRoles.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Roles
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>Reset password for {selectedUser?.full_name || selectedUser?.email}</DialogDescription>
            </DialogHeader>
            <Form {...resetPasswordForm}>
              <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-4">
                <FormField
                  control={resetPasswordForm.control}
                  name="new_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Minimum 6 characters" className="min-h-[44px] text-base sm:text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetPasswordForm.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" className="min-h-[44px] text-base sm:text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Note: If direct password reset is not available, a password reset email will be sent to the user.
                </p>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
                  <Button type="submit" disabled={resetPassword.isPending} className="w-full sm:w-auto min-h-[44px]">
                    {resetPassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reset Password
                  </Button>
                </DialogFooter>
              </form>
            </Form>
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
