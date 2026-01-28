import { useState, useMemo, useEffect } from 'react';
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
} from '@/hooks/useSaccoManagement';
import { useCountyUsers } from '@/hooks/useUserManagement';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SaccoProfileSettingsPage() {
  const { profile, roles } = useAuth();
  const countyId = useMemo(
    () => profile?.county_id ?? roles.find((r) => r.county_id)?.county_id ?? undefined,
    [profile, roles]
  );

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

  // Form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    registration_number: '',
    contact_email: '',
    contact_phone: '',
    address: '',
  });

  const [showAssignRoleDialog, setShowAssignRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'sacco_admin' | 'sacco_officer' | 'welfare_admin' | 'welfare_officer'>('sacco_officer');
  const [roleToRemove, setRoleToRemove] = useState<{ userId: string; role: string } | null>(null);

  // Update form when sacco data loads
  useEffect(() => {
    if (sacco) {
      setProfileForm({
        name: sacco.name || '',
        registration_number: sacco.registration_number || '',
        contact_email: sacco.contact_email || '',
        contact_phone: sacco.contact_phone || '',
        address: sacco.address || '',
      });
    }
  }, [sacco]);

  // Auto-select first sacco
  useEffect(() => {
    if (saccos.length > 0 && !saccoId) {
      setSaccoId(saccos[0].id);
    }
  }, [saccos, saccoId]);

  const handleUpdateProfile = async () => {
    if (!saccoId) return;
    updateProfile.mutate({
      saccoId,
      updates: profileForm,
    });
  };

  const handleAssignRole = async () => {
    if (!countyId || !selectedUser) return;
    assignRole.mutate(
      {
        userId: selectedUser,
        role: selectedRole,
        countyId,
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

    const documentType = e.target.name || 'registration';
    uploadDocument.mutate({
      file,
      saccoId,
      countyId,
      documentType,
    });
  };

  const documents = (sacco?.settings as any)?.documents || [];

  return (
    <SaccoPortalLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Sacco Profile & Settings</h1>
            <p className="text-muted-foreground">Manage your sacco profile, officials, and documents.</p>
          </div>
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
        </div>

        {!countyId ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-muted-foreground">No county assigned. Please contact an administrator.</p>
          </div>
        ) : !saccoId ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-muted-foreground">Please select a sacco to manage.</p>
          </div>
        ) : (
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="officials">Officials</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="revenue">Revenue Share</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Sacco Profile Information
                  </CardTitle>
                  <CardDescription>Update your sacco or welfare profile information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Sacco Name *</Label>
                      <Input
                        id="name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        disabled={updateProfile.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registration_number">Registration Number</Label>
                      <Input
                        id="registration_number"
                        value={profileForm.registration_number}
                        onChange={(e) => setProfileForm({ ...profileForm, registration_number: e.target.value })}
                        disabled={updateProfile.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={profileForm.contact_email}
                        onChange={(e) => setProfileForm({ ...profileForm, contact_email: e.target.value })}
                        disabled={updateProfile.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Contact Phone</Label>
                      <Input
                        id="contact_phone"
                        value={profileForm.contact_phone}
                        onChange={(e) => setProfileForm({ ...profileForm, contact_phone: e.target.value })}
                        disabled={updateProfile.isPending}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                        disabled={updateProfile.isPending}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleUpdateProfile}
                      disabled={updateProfile.isPending || !profileForm.name}
                      className="gap-2"
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Officials Tab */}
            <TabsContent value="officials" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Manage Officials
                      </CardTitle>
                      <CardDescription>Assign and remove roles for sacco officials.</CardDescription>
                    </div>
                    <Dialog open={showAssignRoleDialog} onOpenChange={setShowAssignRoleDialog}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <UserPlus className="h-4 w-4" />
                          Assign Role
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Role to Official</DialogTitle>
                          <DialogDescription>Select a user and role to assign.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="user-select">User</Label>
                            <Select value={selectedUser} onValueChange={setSelectedUser}>
                              <SelectTrigger id="user-select">
                                <SelectValue placeholder="Select user" />
                              </SelectTrigger>
                              <SelectContent>
                                {countyUsers
                                  .filter((u) => u.is_active)
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
                            <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v)}>
                              <SelectTrigger id="role-select">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sacco_admin">Sacco Admin</SelectItem>
                                <SelectItem value="sacco_officer">Sacco Officer</SelectItem>
                                <SelectItem value="welfare_admin">Welfare Admin</SelectItem>
                                <SelectItem value="welfare_officer">Welfare Officer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowAssignRoleDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleAssignRole} disabled={!selectedUser || assignRole.isPending}>
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
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {officialsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : officials.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">No officials found.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Roles</TableHead>
                          <TableHead>Granted At</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {officials.map((official) => (
                          <TableRow key={official.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={official.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {(official.full_name || official.email)
                                      .split(' ')
                                      .map((n) => n[0])
                                      .join('')
                                      .toUpperCase()
                                      .slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{official.full_name || official.email}</p>
                                  <p className="text-sm text-muted-foreground">{official.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {official.roles.map((role) => (
                                  <Badge key={role.id} variant="secondary">
                                    {role.role.replace('_', ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              {official.roles[0]?.granted_at
                                ? format(new Date(official.roles[0].granted_at), 'PPp')
                                : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              {official.roles.map((role) => (
                                <Button
                                  key={role.id}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setRoleToRemove({ userId: official.user_id, role: role.role })}
                                  disabled={removeRole.isPending}
                                  className="ml-2"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              ))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Registration Documents
                  </CardTitle>
                  <CardDescription>
                    Upload registration documents if required by county.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="registration-doc">Registration Document</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="registration-doc"
                        type="file"
                        name="registration"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        disabled={uploadDocument.isPending}
                        className="flex-1"
                      />
                      {uploadDocument.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  {documents.length > 0 && (
                    <div className="space-y-2">
                      <Label>Uploaded Documents</Label>
                      <div className="space-y-2">
                        {documents.map((doc: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-lg border border-border p-3"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{doc.type}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'PPp') : 'Unknown'}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(doc.url, '_blank')}
                            >
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Revenue Share Tab */}
            <TabsContent value="revenue" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Revenue Share Information
                  </CardTitle>
                  <CardDescription>
                    View revenue share information (read-only, if enabled by county).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {revenueSharesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : revenueShares.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">
                      No revenue share data available.
                    </p>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Rider</TableHead>
                            <TableHead>Base Amount</TableHead>
                            <TableHead>Share Amount</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {revenueShares.map((share) => (
                            <TableRow key={share.id}>
                              <TableCell>
                                {format(new Date(share.created_at), 'PPp')}
                              </TableCell>
                              <TableCell>{share.rider?.full_name || 'N/A'}</TableCell>
                              <TableCell>KES {Number(share.base_amount).toLocaleString()}</TableCell>
                              <TableCell>KES {Number(share.share_amount).toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{share.share_type}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    share.status === 'distributed'
                                      ? 'default'
                                      : share.status === 'pending'
                                      ? 'secondary'
                                      : 'destructive'
                                  }
                                >
                                  {share.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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
          <AlertDialogContent>
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
      </div>
    </SaccoPortalLayout>
  );
}
