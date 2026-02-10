import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SaccoPortalLayout } from '@/components/layout/SaccoPortalLayout';
import { useAuth } from '@/hooks/useAuth';
import { useSaccos } from '@/hooks/useData';
import {
  useSacco,
  useSaccoOfficials,
  useUpdateSaccoProfile,
  useAssignSaccoRole,
  useRemoveSaccoRole,
  useSaccoRevenueShares,
  useUploadSaccoDocument,
  useDeleteSaccoDocument,
} from '@/hooks/useSaccoManagement';
import { useCountyUsers } from '@/hooks/useUserManagement';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  Users,
  Upload,
  FileText,
  DollarSign,
  Settings,
  UserPlus,
  X,
  Loader2,
  Save,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { saccoProfileFormSchema, saccoCreateUserFormSchema, type SaccoProfileFormValues, type SaccoCreateUserFormValues } from '@/lib/zod';

const SACCO_OFFICIAL_ROLES = [
  { value: 'sacco_admin', label: 'Sacco Admin' },
  { value: 'sacco_officer', label: 'Sacco Officer' },
  { value: 'chairman', label: 'Chairman' },
  { value: 'vice_chairman', label: 'Vice Chairman' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'vice_secretary', label: 'Vice Secretary' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'vice_treasurer', label: 'Vice Treasurer' },
  { value: 'general_official', label: 'General Official' },
];

export default function SaccoProfileSettingsPage() {
  const { countyId, hasRole } = useAuth();
  const isSaccoAdmin = hasRole('sacco_admin') || hasRole('platform_super_admin');
  const queryClient = useQueryClient();

  const { data: saccos = [], isLoading: saccosLoading } = useSaccos(countyId);
  const [saccoId, setSaccoId] = useState<string | undefined>(undefined);

  const { data: sacco, isLoading: saccoLoading } = useSacco(saccoId);
  const { data: officials = [], isLoading: officialsLoading } = useSaccoOfficials(countyId, saccoId);
  const { data: revenueShares = [], isLoading: revenueSharesLoading } = useSaccoRevenueShares(saccoId, countyId);
  const { data: countyUsers = [] } = useCountyUsers(countyId);

  const updateProfile = useUpdateSaccoProfile();
  const assignRole = useAssignSaccoRole();
  const removeRole = useRemoveSaccoRole();
  const uploadDocument = useUploadSaccoDocument();
  const deleteDocument = useDeleteSaccoDocument();
  const [documentToDelete, setDocumentToDelete] = useState<{ index: number; type: string } | null>(null);
  const [registrationFileName, setRegistrationFileName] = useState<string | null>(null);
  const registrationFileInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<SaccoProfileFormValues>({
    resolver: zodResolver(saccoProfileFormSchema),
    defaultValues: {
      name: '',
      registration_number: '',
      contact_email: '',
      contact_phone: '',
      address: '',
    },
  });

  const [showAssignRoleDialog, setShowAssignRoleDialog] = useState(false);
  const [assignMode, setAssignMode] = useState<'existing' | 'create'>('existing');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('sacco_officer');
  const [roleToRemove, setRoleToRemove] = useState<{ userId: string; role: string; saccoId?: string | null; welfareGroupId?: string | null } | null>(null);

  const createUserForm = useForm<SaccoCreateUserFormValues>({
    resolver: zodResolver(saccoCreateUserFormSchema),
    defaultValues: { full_name: '', email: '', phone: '', password: '', role: 'sacco_officer' },
  });

  // Update form when sacco data loads
  useEffect(() => {
    if (sacco) {
      profileForm.reset({
        name: sacco.name || '',
        registration_number: sacco.registration_number || '',
        contact_email: sacco.contact_email || '',
        contact_phone: sacco.contact_phone || '',
        address: sacco.address || '',
      });
    }
  }, [sacco, profileForm]);

  // Auto-select first sacco
  useEffect(() => {
    if (saccos.length > 0 && !saccoId) {
      setSaccoId(saccos[0].id);
    }
  }, [saccos, saccoId]);

  const handleUpdateProfile = async (values: SaccoProfileFormValues) => {
    if (!saccoId) return;
    updateProfile.mutate({
      saccoId,
      updates: values,
    });
  };

  const createSaccoUser = useMutation({
    mutationFn: async (values: SaccoCreateUserFormValues) => {
      if (!countyId || !saccoId || !sacco) throw new Error('Sacco context required');
      let userId: string;
      try {
        const { data: authData, error: authError } = await (supabase.auth as any).admin?.createUser({
          email: values.email,
          password: values.password,
          email_confirm: true,
          user_metadata: { full_name: values.full_name },
        });
        if (authError) throw authError;
        if (!authData?.user) throw new Error('Failed to create user');
        userId = authData.user.id;
      } catch (_) {
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: values.full_name } },
        });
        if (signupError) throw signupError;
        if (!signupData.user) throw new Error('Failed to create user');
        userId = signupData.user.id;
      }
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          county_id: sacco.county_id,
          full_name: values.full_name,
          phone: (values.phone && values.phone.trim()) || null,
        })
        .eq('id', userId);
      if (profileError) throw profileError;
      await assignRole.mutateAsync({
        userId,
        role: values.role,
        countyId,
        saccoId,
      });
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sacco-officials', countyId, saccoId] });
      queryClient.invalidateQueries({ queryKey: ['county-users', countyId] });
      toast.success('User created and role assigned');
      setShowAssignRoleDialog(false);
      createUserForm.reset({ full_name: '', email: '', phone: '', password: '', role: 'sacco_officer' });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to create user'),
  });

  const handleCreateUser = (values: SaccoCreateUserFormValues) => createSaccoUser.mutate(values);

  const handleAssignRole = async () => {
    if (!countyId || !selectedUser) return;
    assignRole.mutate(
      {
        userId: selectedUser,
        role: selectedRole,
        countyId,
        saccoId: saccoId ?? undefined,
      },
      {
        onSuccess: () => {
          setShowAssignRoleDialog(false);
          setSelectedUser('');
        },
      }
    );
  };

  const handleRemoveRole = async () => {
    if (!countyId || !roleToRemove) return;
    removeRole.mutate(
      {
        userId: roleToRemove.userId,
        role: roleToRemove.role,
        countyId,
        saccoId: roleToRemove.saccoId ?? saccoId ?? undefined,
        welfareGroupId: roleToRemove.welfareGroupId,
      },
      {
        onSuccess: () => {
          setRoleToRemove(null);
        },
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !saccoId || !countyId) return;

    setRegistrationFileName(file.name);
    const documentType = e.target.name || 'registration';
    uploadDocument.mutate(
      {
        file,
        saccoId,
        countyId,
        documentType,
      },
      {
        onSuccess: () => {
          setRegistrationFileName(null);
          if (registrationFileInputRef.current) registrationFileInputRef.current.value = '';
        },
      }
    );
  };

  const handleDeleteDocument = () => {
    if (!saccoId || documentToDelete == null) return;
    const doc = documents[documentToDelete.index] as { path?: string };
    deleteDocument.mutate(
      {
        saccoId,
        documentIndex: documentToDelete.index,
        path: doc?.path,
      },
      {
        onSuccess: () => setDocumentToDelete(null),
      }
    );
  };

  const documents = (sacco?.settings as any)?.documents || [];

  return (
    <SaccoPortalLayout>
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-0 max-w-full min-w-0">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">Sacco Profile & Settings</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">Manage your sacco profile, officials, and documents.</p>
          </div>
          <div className="w-full sm:w-64 min-w-0">
            <Select
              value={saccoId ?? ''}
              onValueChange={(v) => setSaccoId(v || undefined)}
              disabled={saccosLoading || saccos.length === 0}
            >
              <SelectTrigger className="min-h-[44px] w-full touch-manipulation">
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
        </div>

        {!countyId ? (
          <div className="rounded-lg border border-border bg-card p-4 sm:p-6 text-center">
            <p className="text-muted-foreground text-sm sm:text-base">No county assigned. Please contact an administrator.</p>
          </div>
        ) : !saccoId ? (
          <div className="rounded-lg border border-border bg-card p-4 sm:p-6 text-center">
            <p className="text-muted-foreground text-sm sm:text-base">Please select a sacco to manage.</p>
          </div>
        ) : (
          <Tabs defaultValue="profile" className="space-y-4">
            {/* Segmented tab bar: all four visible on mobile (2x2 grid), single row on desktop. */}
            <TabsList className="grid grid-cols-2 sm:flex sm:flex-nowrap h-auto gap-2 p-2 rounded-lg bg-muted/80 text-muted-foreground border-0 shadow-inner w-full sm:w-max">
              <TabsTrigger
                value="profile"
                className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-3 min-h-[44px] touch-manipulation text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span>Profile</span>
              </TabsTrigger>
              <TabsTrigger
                value="officials"
                className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-3 min-h-[44px] touch-manipulation text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
              >
                <Users className="h-4 w-4 shrink-0" />
                <span>Officials</span>
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-3 min-h-[44px] touch-manipulation text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span>Documents</span>
              </TabsTrigger>
              <TabsTrigger
                value="revenue"
                className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-3 min-h-[44px] touch-manipulation text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
              >
                <DollarSign className="h-4 w-4 shrink-0" />
                <span>Revenue Share</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4 mt-4">
              <Card className="overflow-hidden">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Building2 className="h-5 w-5 shrink-0" />
                    Sacco Profile Information
                  </CardTitle>
                  <CardDescription className="text-sm">Update your sacco or welfare profile information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(handleUpdateProfile)} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                          control={profileForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sacco Name *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. 2NK SACCO"
                                  disabled={updateProfile.isPending}
                                  className="min-h-[44px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="registration_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Registration Number</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. CS/22341/NBI"
                                  disabled={updateProfile.isPending}
                                  className="min-h-[44px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="contact_email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Email</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="e.g. contact@sacco.org"
                                  disabled={updateProfile.isPending}
                                  className="min-h-[44px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="contact_phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Phone</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. +254700000000"
                                  disabled={updateProfile.isPending}
                                  className="min-h-[44px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. Kiambu, Kenya"
                                  disabled={updateProfile.isPending}
                                  className="min-h-[44px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={updateProfile.isPending}
                          className="gap-2 min-h-[44px] touch-manipulation"
                        >
                          {updateProfile.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Officials Tab */}
            <TabsContent value="officials" className="space-y-4 mt-4">
              <Card className="overflow-hidden">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Users className="h-5 w-5 shrink-0" />
                        Manage Officials
                      </CardTitle>
                      <CardDescription className="text-sm">Assign and remove roles for sacco officials. Assign an existing user or create a new user and assign a role.</CardDescription>
                    </div>
                    <Dialog
                      open={showAssignRoleDialog}
                      onOpenChange={(open) => {
                        setShowAssignRoleDialog(open);
                        if (!open) {
                          setAssignMode('existing');
                          setSelectedUser('');
                          createUserForm.reset({ full_name: '', email: '', phone: '', password: '', role: 'sacco_officer' });
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button className="gap-2 min-h-[44px] w-full sm:w-auto touch-manipulation justify-center">
                          <UserPlus className="h-4 w-4 shrink-0" />
                          Assign Role
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Assign Role to Official</DialogTitle>
                          <DialogDescription>
                            Assign a role to an existing user or create a new user and assign a role.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="flex gap-2 border-b pb-3">
                            <Button
                              type="button"
                              variant={assignMode === 'existing' ? 'secondary' : 'ghost'}
                              size="sm"
                              className="min-h-[44px] touch-manipulation"
                              onClick={() => { setAssignMode('existing'); setSelectedUser(''); }}
                            >
                              Existing user
                            </Button>
                            {isSaccoAdmin && (
                              <Button
                                type="button"
                                variant={assignMode === 'create' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="min-h-[44px] touch-manipulation"
                                onClick={() => { setAssignMode('create'); setSelectedUser(''); createUserForm.reset({ full_name: '', email: '', phone: '', password: '', role: (selectedRole || 'sacco_officer') as SaccoCreateUserFormValues['role'] }); }}
                              >
                                Create new user
                              </Button>
                            )}
                          </div>

                          {assignMode === 'existing' ? (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor="user-select">User</Label>
                                <Select value={selectedUser} onValueChange={setSelectedUser}>
                                  <SelectTrigger id="user-select" className="min-h-[44px]">
                                    <SelectValue placeholder="Select user" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {countyUsers
                                      .filter((u) => u.is_active && u.roles.some((r) => SACCO_OFFICIAL_ROLES.some((o) => o.value === r.role)))
                                      .map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                          {user.full_name || user.email}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="role-select">Role</Label>
                                <Select value={selectedRole} onValueChange={(v: string) => setSelectedRole(v)}>
                                  <SelectTrigger id="role-select" className="min-h-[44px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SACCO_OFFICIAL_ROLES.map((r) => (
                                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setShowAssignRoleDialog(false)} className="min-h-[44px] touch-manipulation">
                                  Cancel
                                </Button>
                                <Button onClick={handleAssignRole} disabled={!selectedUser || assignRole.isPending} className="min-h-[44px] touch-manipulation">
                                  {assignRole.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Assigning…
                                    </>
                                  ) : (
                                    'Assign'
                                  )}
                                </Button>
                              </div>
                            </>
                          ) : (
                            <Form {...createUserForm}>
                              <form onSubmit={createUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
                                <FormField
                                  control={createUserForm.control}
                                  name="full_name"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Full Name *</FormLabel>
                                      <FormControl>
                                        <Input placeholder="John Doe" className="min-h-[44px]" {...field} />
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
                                        <Input type="email" placeholder="user@example.com" className="min-h-[44px]" {...field} />
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
                                        <Input placeholder="+254712345678" className="min-h-[44px]" {...field} />
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
                                        <Input type="password" placeholder="Minimum 6 characters" className="min-h-[44px]" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={createUserForm.control}
                                  name="role"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Role *</FormLabel>
                                      <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                          <SelectTrigger className="min-h-[44px]">
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {SACCO_OFFICIAL_ROLES.map((r) => (
                                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="flex justify-end gap-2 pt-2">
                                  <Button type="button" variant="outline" onClick={() => setShowAssignRoleDialog(false)} className="min-h-[44px] touch-manipulation">
                                    Cancel
                                  </Button>
                                  <Button type="submit" disabled={createSaccoUser.isPending} className="min-h-[44px] touch-manipulation">
                                    {createSaccoUser.isPending ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating…
                                      </>
                                    ) : (
                                      'Create & assign role'
                                    )}
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {officialsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : officials.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground text-sm sm:text-base">No officials found.</p>
                  ) : (
                    <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">User</TableHead>
                            <TableHead className="text-xs sm:text-sm">Roles</TableHead>
                            <TableHead className="text-xs sm:text-sm whitespace-nowrap">Granted At</TableHead>
                            <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {officials.map((official) => (
                            <TableRow key={official.id}>
                              <TableCell className="py-3">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                  <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarImage src={official.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {(official.full_name || official.email)
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{official.full_name || official.email}</p>
                                    <p className="text-xs text-muted-foreground truncate">{official.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex flex-wrap gap-1">
                                  {official.roles.map((role) => (
                                    <Badge key={role.id} variant="secondary" className="text-xs">
                                      {role.role.replace('_', ' ')}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="py-3 text-xs sm:text-sm whitespace-nowrap">
                                {official.roles[0]?.granted_at
                                  ? format(new Date(official.roles[0].granted_at), 'PPp')
                                  : 'N/A'}
                              </TableCell>
                              <TableCell className="text-right py-3">
                                {official.roles.map((role) => (
                                  <Button
                                    key={role.id}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setRoleToRemove({ userId: official.user_id, role: role.role, saccoId: role.sacco_id, welfareGroupId: role.welfare_group_id })}
                                    disabled={removeRole.isPending}
                                    className="min-h-[44px] min-w-[44px] touch-manipulation"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                ))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4 mt-4">
              <Card className="overflow-hidden">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <FileText className="h-5 w-5 shrink-0" />
                    Registration Documents
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Upload registration documents if required by county.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
                  <div className="space-y-2">
                    <Label htmlFor="registration-doc" className="text-sm">Registration Document</Label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <label
                        htmlFor="registration-doc"
                        className="flex flex-1 min-h-[44px] w-full touch-manipulation rounded-md border border-input bg-background ring-offset-background has-[:focus-visible]:outline-none has-[:focus-visible]:border-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
                      >
                        <span className="flex h-full min-h-[44px] w-full cursor-pointer items-center gap-2 px-3 py-2">
                          <span className="rounded bg-muted px-3 py-2 text-sm font-medium text-foreground shrink-0">
                            Choose File
                          </span>
                          <span className="truncate text-sm text-muted-foreground min-w-0">
                            {registrationFileName ?? 'No file chosen'}
                          </span>
                        </span>
                        <input
                          ref={registrationFileInputRef}
                          id="registration-doc"
                          type="file"
                          name="registration"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileUpload}
                          disabled={uploadDocument.isPending}
                          className="sr-only"
                          aria-label="Registration document"
                        />
                      </label>
                      {uploadDocument.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </div>
                  {documents.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Uploaded Documents</Label>
                      <div className="space-y-2">
                        {documents.map((doc: any, index: number) => (
                          <div
                            key={index}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border p-3 min-w-0"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{doc.type}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'PPp') : 'Unknown'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(doc.url, '_blank')}
                                className="min-h-[44px] touch-manipulation"
                              >
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDocumentToDelete({ index, type: doc.type })}
                                disabled={deleteDocument.isPending}
                                className="min-h-[44px] touch-manipulation text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Revenue Share Tab */}
            <TabsContent value="revenue" className="space-y-4 mt-4">
              <Card className="overflow-hidden">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <DollarSign className="h-5 w-5 shrink-0" />
                    Revenue Share Information
                  </CardTitle>
                  <CardDescription className="text-sm">
                    View revenue share information (read-only, if enabled by county).
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {revenueSharesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : revenueShares.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground text-sm sm:text-base">
                      No revenue share data available.
                    </p>
                  ) : (
                    <ScrollArea className="h-[400px] w-full">
                      <div className="overflow-x-auto min-w-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs sm:text-sm whitespace-nowrap">Date</TableHead>
                              <TableHead className="text-xs sm:text-sm">Rider</TableHead>
                              <TableHead className="text-xs sm:text-sm whitespace-nowrap">Base Amount</TableHead>
                              <TableHead className="text-xs sm:text-sm whitespace-nowrap">Share Amount</TableHead>
                              <TableHead className="text-xs sm:text-sm">Type</TableHead>
                              <TableHead className="text-xs sm:text-sm">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {revenueShares.map((share) => (
                              <TableRow key={share.id}>
                                <TableCell className="text-xs sm:text-sm whitespace-nowrap py-3">
                                  {format(new Date(share.created_at), 'PPp')}
                                </TableCell>
                                <TableCell className="py-3 text-xs sm:text-sm min-w-0 max-w-[120px] sm:max-w-none truncate">{share.rider?.full_name || 'N/A'}</TableCell>
                                <TableCell className="text-xs sm:text-sm whitespace-nowrap py-3">KES {Number(share.base_amount).toLocaleString()}</TableCell>
                                <TableCell className="text-xs sm:text-sm whitespace-nowrap py-3">KES {Number(share.share_amount).toLocaleString()}</TableCell>
                                <TableCell className="py-3">
                                  <Badge variant="outline" className="text-xs">{share.share_type}</Badge>
                                </TableCell>
                                <TableCell className="py-3">
                                  <Badge
                                    variant={
                                      share.status === 'distributed'
                                        ? 'default'
                                        : share.status === 'pending'
                                        ? 'secondary'
                                        : 'destructive'
                                    }
                                    className="text-xs"
                                  >
                                    {share.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Remove Role Confirmation */}
        <AlertDialog
          open={!!roleToRemove}
          onOpenChange={(open) => !open && setRoleToRemove(null)}
        >
          <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-lg p-4 sm:p-6">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Role</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this role? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveRole}
                disabled={removeRole.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removeRole.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing…
                  </>
                ) : (
                  'Remove'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Document Confirmation */}
        <AlertDialog
          open={!!documentToDelete}
          onOpenChange={(open) => !open && setDocumentToDelete(null)}
        >
          <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-lg p-4 sm:p-6">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this document ({documentToDelete?.type})? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteDocument}
                disabled={deleteDocument.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteDocument.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing…
                  </>
                ) : (
                  'Remove'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SaccoPortalLayout>
  );
}
