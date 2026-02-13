import { useState } from 'react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  ShieldCheck,
  Users,
  Building2,
  MapPin,
  UserCircle,
  Lock,
  Unlock,
  Save,
  Plus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { useAllCounties } from '@/hooks/useData';
import { useSystemRoleTemplates, type SystemRole } from '@/hooks/useSystemRoleTemplates';

/** Combined Sacco & Welfare use the same role set; DB may store category as 'sacco' or 'welfare'. */
const SACCO_WELFARE_CATEGORY_ID = 'sacco_welfare';
const ROLE_CATEGORIES = [
  { id: 'county', label: 'County roles', icon: MapPin, description: 'County admin, county super admin, county staff' },
  { id: SACCO_WELFARE_CATEGORY_ID, label: 'Sacco & Welfare roles', icon: Building2, description: 'Admin, officer, chairman, secretary, treasurer, general official' },
  { id: 'stage', label: 'Stage roles', icon: MapPin, description: 'Stage chair, stage treasurer, stage member' },
  { id: 'rider_owner', label: 'Rider/owner capabilities', icon: UserCircle, description: 'Rider, owner, view-only, self-service' },
] as const;

const SAMPLE_PERMISSIONS = [
  { id: 'manage_users', label: 'Manage users', category: 'county', locked: true },
  { id: 'manage_roles', label: 'Assign/change roles', category: 'county', locked: true },
  { id: 'view_reports', label: 'View reports', category: 'county', locked: false },
  { id: 'manage_sacco', label: 'Manage sacco', category: 'sacco', locked: false },
  { id: 'manage_stage', label: 'Manage stage', category: 'stage', locked: false },
  { id: 'view_compliance', label: 'View compliance', category: 'rider_owner', locked: false },
];

export default function RolePermissionGovernancePage() {
  const [selectedCountyId, setSelectedCountyId] = useState<string | null>(null);
  const [managingCategory, setManagingCategory] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<SystemRole | null>(null);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [roleToDelete, setRoleToDelete] = useState<SystemRole | null>(null);
  const { data: counties = [], isLoading: countiesLoading } = useAllCounties();
  const {
    roles: systemRoles,
    isLoading: rolesLoading,
    addRole,
    updateRole,
    deleteRole,
    isAdding,
    isUpdating,
    isDeleting,
  } = useSystemRoleTemplates();

  const handleManageRoles = (categoryId: string) => {
    setManagingCategory(categoryId);
    setIsAddingRole(false);
    setEditingRole(null);
    setNewRoleName('');
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim() || !managingCategory) return;
    const dbCategory = managingCategory === SACCO_WELFARE_CATEGORY_ID ? 'sacco' : managingCategory;
    await addRole({ name: newRoleName.trim(), category: dbCategory });
    setNewRoleName('');
    setIsAddingRole(false);
  };

  const handleEditRole = (role: SystemRole) => {
    if (role.locked) return;
    setEditingRole(role);
    setNewRoleName(role.name);
  };

  const handleSaveEdit = async () => {
    if (!editingRole || !newRoleName.trim()) return;
    await updateRole({ id: editingRole.id, name: newRoleName.trim() });
    setEditingRole(null);
    setNewRoleName('');
  };

  const handleDeleteRole = (role: SystemRole) => {
    if (role.locked) return;
    setRoleToDelete(role);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    await deleteRole(roleToDelete.id);
    setRoleToDelete(null);
  };

  const handleToggleLock = async (role: SystemRole) => {
    await updateRole({ id: role.id, locked: !role.locked });
  };

  const managingCategoryInfo = managingCategory
    ? ROLE_CATEGORIES.find(c => c.id === managingCategory)
    : null;
  const rolesInCategory = managingCategory
    ? managingCategory === SACCO_WELFARE_CATEGORY_ID
      ? systemRoles.filter(r => r.category === 'sacco' || r.category === 'welfare')
      : systemRoles.filter(r => r.category === managingCategory)
    : [];

  return (
    <SuperAdminLayout>
      <Dialog open={!!managingCategory} onOpenChange={open => !open && setManagingCategory(null)}>
        <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto rounded-xl border-border/80 p-4 shadow-xl sm:p-6">
          <DialogHeader className="space-y-1.5 pb-2">
            <DialogTitle className="flex flex-wrap items-center gap-2 text-base sm:gap-2.5 sm:text-lg">
              {managingCategoryInfo?.icon && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-9 sm:w-9">
                  <managingCategoryInfo.icon className="h-4 w-4" />
                </span>
              )}
              <span>Manage roles — {managingCategoryInfo?.label ?? managingCategory}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
              Add, edit, or delete roles in this category. Locked roles cannot be modified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Role List */}
            <div className="space-y-2">
              {rolesLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Loading roles…</p>
              ) : rolesInCategory.length > 0 ? (
                rolesInCategory.map(role => (
                  <div
                    key={role.id}
                    className={`flex flex-col gap-2 rounded-xl border px-3 py-3 transition-colors sm:flex-row sm:items-center sm:gap-3 sm:px-4 ${
                      role.locked
                        ? 'border-l-4 border-l-amber-500/80 bg-amber-500/5 dark:bg-amber-950/25 dark:border-l-amber-500/60'
                        : 'border-l-4 border-l-transparent bg-muted/20 dark:bg-muted/10 hover:bg-muted/30 dark:hover:bg-muted/20'
                    }`}
                  >
                    {editingRole?.id === role.id ? (
                      <>
                        <Input
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          placeholder="Role name"
                          className="min-w-0 flex-1 rounded-lg"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') {
                              setEditingRole(null);
                              setNewRoleName('');
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-1 sm:justify-start">
                          <Button size="icon" variant="ghost" className="h-9 min-h-9 min-w-9 w-9" onClick={handleSaveEdit} disabled={!newRoleName.trim() || isUpdating} title="Save">
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 min-h-9 min-w-9 w-9"
                            onClick={() => {
                              setEditingRole(null);
                              setNewRoleName('');
                            }}
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                          <span className="truncate font-medium text-foreground">{role.name}</span>
                          {role.locked && (
                            <Badge variant="outline" className="shrink-0 gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 dark:bg-amber-500/15">
                              <Lock className="h-3 w-3" />
                              Locked
                            </Badge>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center justify-end gap-0.5 rounded-lg bg-background/50 p-0.5 sm:justify-start">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 min-h-9 min-w-9 w-9 text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:shrink-0"
                            onClick={() => handleToggleLock(role)}
                            title={role.locked ? 'Unlock role' : 'Lock role'}
                          >
                            {role.locked ? (
                              <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <Unlock className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 min-h-9 min-w-9 w-9 text-muted-foreground hover:text-foreground disabled:opacity-50"
                            onClick={() => handleEditRole(role)}
                            disabled={role.locked}
                            title="Edit role"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 min-h-9 min-w-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            onClick={() => handleDeleteRole(role)}
                            disabled={role.locked}
                            title="Delete role"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/10 py-6 text-center sm:py-8">
                  <p className="text-sm text-muted-foreground">No roles in this category yet.</p>
                  <p className="mt-1 text-xs text-muted-foreground/80">Click &quot;Add new role&quot; below to create one.</p>
                </div>
              )}
            </div>

            {/* Add New Role Form */}
            {isAddingRole && (
              <div className="flex flex-col gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-3 py-3 dark:bg-primary/10 sm:flex-row sm:items-center sm:gap-2 sm:px-4">
                <Input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Enter role name"
                  className="min-w-0 flex-1 rounded-lg border-primary/20"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddRole();
                    if (e.key === 'Escape') {
                      setIsAddingRole(false);
                      setNewRoleName('');
                    }
                  }}
                  autoFocus
                />
                <div className="flex items-center justify-end gap-1 sm:justify-start">
                  <Button size="icon" className="h-9 min-h-9 min-w-9 w-9" onClick={handleAddRole} disabled={!newRoleName.trim() || isAdding} title="Add role">
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 min-h-9 min-w-9 w-9"
                    onClick={() => {
                      setIsAddingRole(false);
                      setNewRoleName('');
                    }}
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Add Role Button */}
            {!isAddingRole && !editingRole && (
              <Button
                variant="outline"
                className="w-full gap-2 rounded-xl border-dashed py-5 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-foreground sm:py-6"
                onClick={() => setIsAddingRole(true)}
              >
                <Plus className="h-4 w-4 shrink-0" />
                Add new role
              </Button>
            )}
          </div>

          <DialogFooter className="flex flex-col gap-2 border-t border-border/50 pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" className="w-full rounded-lg sm:w-auto" onClick={() => setManagingCategory(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{roleToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRole} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="min-w-0 space-y-6 overflow-x-hidden p-4 md:p-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Role & Permission Governance (System-Wide)</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Define system roles (templates), permissions per role, override county-level roles, enable/disable roles per county, and lock sensitive permissions so they cannot be changed by county.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-sm font-medium sm:text-base">County context (optional)</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Select a county to override roles or enable/disable roles for that county. Leave unselected to manage system-wide templates only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedCountyId ?? '_all'}
              onValueChange={v => setSelectedCountyId(v === '_all' ? null : v)}
              disabled={countiesLoading}
            >
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="All counties (system-wide)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All counties (system-wide)</SelectItem>
                {counties.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Tabs defaultValue="roles" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/50 p-1.5 sm:p-1">
            <TabsTrigger value="roles" className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
              <Users className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" /> System roles
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" /> Permissions
            </TabsTrigger>
            <TabsTrigger value="override" className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
              <Unlock className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" /> Overrides
            </TabsTrigger>
            <TabsTrigger value="enable-disable" className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
              Enable/disable
            </TabsTrigger>
            <TabsTrigger value="locked" className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
              <Lock className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" /> Locked
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Define system roles (templates)</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  System-wide role templates. County-level roles can be enabled/disabled or overridden per county.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {ROLE_CATEGORIES.map(({ id, label, icon: Icon, description }) => (
                    <Card key={id} className="min-w-0 border-muted">
                      <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                          <CardTitle className="text-sm sm:text-base">{label}</CardTitle>
                        </div>
                        <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 px-4 pb-4 sm:px-6 sm:pb-6">
                        <ul className="space-y-1 text-xs text-muted-foreground sm:text-sm">
                          {(id === SACCO_WELFARE_CATEGORY_ID
                            ? systemRoles.filter(r => r.category === 'sacco' || r.category === 'welfare')
                            : systemRoles.filter(r => r.category === id)
                          ).map(role => (
                            <li key={role.id} className="flex items-center gap-2">
                              <span className="truncate">{role.name}</span>
                              {role.locked && <Lock className="h-3 w-3 shrink-0 text-amber-600" />}
                            </li>
                          ))}
                          {(id === SACCO_WELFARE_CATEGORY_ID
                            ? systemRoles.filter(r => r.category === 'sacco' || r.category === 'welfare')
                            : systemRoles.filter(r => r.category === id)
                          ).length === 0 && (
                            <li>— No roles defined</li>
                          )}
                        </ul>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3 w-full min-h-9"
                          onClick={() => handleManageRoles(id)}
                        >
                          Manage roles
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Define permissions per role</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Assign permissions to each system role. Locked permissions cannot be changed by county admins.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="min-w-[480px] rounded-md border sm:min-w-0">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left font-medium sm:p-3">Permission</th>
                        <th className="p-2 text-left font-medium sm:p-3">Category</th>
                        <th className="p-2 text-left font-medium sm:p-3">Locked</th>
                        <th className="p-2 text-left font-medium sm:p-3">Roles with access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SAMPLE_PERMISSIONS.map(perm => (
                        <tr key={perm.id} className="border-b last:border-0">
                          <td className="p-2 sm:p-3">{perm.label}</td>
                          <td className="p-2 sm:p-3">
                            <Badge variant="secondary" className="text-xs">{perm.category}</Badge>
                          </td>
                          <td className="p-2 sm:p-3">
                            {perm.locked ? (
                              <Lock className="h-3.5 w-3.5 text-amber-600 sm:h-4 sm:w-4" />
                            ) : (
                              <Unlock className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" />
                            )}
                          </td>
                          <td className="p-2 text-muted-foreground sm:p-3">— Map in backend</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="mt-4 w-full min-h-9 sm:w-auto"
                  onClick={() => {
                    console.log('Editing permission matrix');
                    // TODO: Open permission matrix editor
                  }}
                >
                  Edit permission matrix
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="override" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Override county-level roles</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  When a county is selected, you can override which roles are available or what permissions they have in that county. System templates remain the default.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedCountyId ? (
                  <p className="text-sm text-muted-foreground sm:text-base">
                    Select a county above to configure overrides for that county.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      Overriding roles for selected county. Locked permissions and platform roles cannot be overridden.
                    </p>
                    <div className="flex items-start gap-2 sm:items-center">
                      <Switch id="override-enabled" className="shrink-0" />
                      <Label htmlFor="override-enabled" className="text-xs leading-tight sm:text-sm">
                        Enable county-level overrides for this county
                      </Label>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full min-h-9 sm:w-auto"
                      onClick={() => {
                        console.log('Configuring overrides for county:', selectedCountyId);
                        // TODO: Open county override configuration
                      }}
                    >
                      Configure overrides
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enable-disable" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Enable/disable roles per county</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  For each county, choose which system roles are available. Disabled roles cannot be assigned in that county.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedCountyId ? (
                  <p className="text-sm text-muted-foreground sm:text-base">
                    Select a county above to enable or disable roles for that county.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {systemRoles.filter(r => !r.locked).map(role => (
                      <div key={role.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border p-3">
                        <span className="min-w-0 truncate text-sm font-medium sm:text-base">{role.name}</span>
                        <Switch defaultChecked className="shrink-0" />
                      </div>
                    ))}
                    <Button className="w-full gap-2 min-h-9 sm:w-auto">
                      <Save className="h-4 w-4 shrink-0" /> Save changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locked" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Locked permissions (sensitive)</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Permissions marked as locked cannot be changed or overridden by county admins. Only Super Admin can modify these.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {SAMPLE_PERMISSIONS.filter(p => p.locked).map(perm => (
                    <li
                      key={perm.id}
                      className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20 sm:gap-3"
                    >
                      <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600 sm:h-4 sm:w-4" />
                      <span className="min-w-0 truncate text-sm font-medium sm:text-base">{perm.label}</span>
                      <Badge variant="secondary" className="text-xs">{perm.category}</Badge>
                    </li>
                  ))}
                  {systemRoles.filter(r => r.locked).map(role => (
                    <li
                      key={role.id}
                      className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20 sm:gap-3"
                    >
                      <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600 sm:h-4 sm:w-4" />
                      <span className="min-w-0 truncate text-sm font-medium sm:text-base">Role: {role.name}</span>
                      <Badge variant="secondary" className="text-xs">system role</Badge>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground sm:text-sm">
                  Add or remove locked permissions in the Permissions per role tab. Locked roles (e.g. Platform Super Admin) are always enforced system-wide.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
}
