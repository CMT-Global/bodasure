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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Users,
  Building2,
  Heart,
  MapPin,
  UserCircle,
  Lock,
  Unlock,
  Save,
} from 'lucide-react';
import { useAllCounties } from '@/hooks/useData';

const ROLE_CATEGORIES = [
  { id: 'county', label: 'County roles', icon: MapPin, description: 'County admin, county super admin, county staff' },
  { id: 'sacco', label: 'Sacco roles', icon: Building2, description: 'Sacco admin, sacco staff, sacco member' },
  { id: 'welfare', label: 'Welfare roles', icon: Heart, description: 'Welfare committee, welfare officer' },
  { id: 'stage', label: 'Stage roles', icon: MapPin, description: 'Stage chair, stage treasurer, stage member' },
  { id: 'rider_owner', label: 'Rider/owner capabilities', icon: UserCircle, description: 'Rider, owner, view-only, self-service' },
] as const;

const SAMPLE_SYSTEM_ROLES = [
  { id: 'platform_super_admin', name: 'Platform Super Admin', category: 'county', locked: true },
  { id: 'platform_admin', name: 'Platform Admin', category: 'county', locked: true },
  { id: 'county_super_admin', name: 'County Super Admin', category: 'county', locked: false },
  { id: 'county_admin', name: 'County Admin', category: 'county', locked: false },
  { id: 'sacco_admin', name: 'Sacco / Welfare Admin', category: 'sacco', locked: false },
  { id: 'sacco_officer', name: 'Sacco / Welfare Officer', category: 'sacco', locked: false },
  { id: 'stage_chairman', name: 'Stage Chairman', category: 'stage', locked: false },
  { id: 'stage_secretary', name: 'Stage Secretary', category: 'stage', locked: false },
  { id: 'stage_treasurer', name: 'Stage Treasurer', category: 'stage', locked: false },
  { id: 'rider', name: 'Rider', category: 'rider_owner', locked: false },
  { id: 'owner', name: 'Owner', category: 'rider_owner', locked: false },
];

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
  const { data: counties = [], isLoading: countiesLoading } = useAllCounties();

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Role & Permission Governance (System-Wide)</h1>
          <p className="text-muted-foreground">
            Define system roles (templates), permissions per role, override county-level roles, enable/disable roles per county, and lock sensitive permissions so they cannot be changed by county.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">County context (optional)</CardTitle>
            <CardDescription>
              Select a county to override roles or enable/disable roles for that county. Leave unselected to manage system-wide templates only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedCountyId ?? '_all'}
              onValueChange={v => setSelectedCountyId(v === '_all' ? null : v)}
              disabled={countiesLoading}
            >
              <SelectTrigger className="max-w-sm">
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
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> System roles
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Permissions per role
            </TabsTrigger>
            <TabsTrigger value="override" className="flex items-center gap-2">
              <Unlock className="h-4 w-4" /> County overrides
            </TabsTrigger>
            <TabsTrigger value="enable-disable" className="flex items-center gap-2">
              Enable/disable per county
            </TabsTrigger>
            <TabsTrigger value="locked" className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Locked permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Define system roles (templates)</CardTitle>
                <CardDescription>
                  System-wide role templates. County-level roles can be enabled/disabled or overridden per county.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {ROLE_CATEGORIES.map(({ id, label, icon: Icon, description }) => (
                    <Card key={id} className="border-muted">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-base">{label}</CardTitle>
                        </div>
                        <CardDescription className="text-sm">{description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {SAMPLE_SYSTEM_ROLES.filter(r => r.category === id).map(role => (
                            <li key={role.id} className="flex items-center gap-2">
                              {role.name}
                              {role.locked && <Lock className="h-3 w-3 text-amber-600 shrink-0" />}
                            </li>
                          ))}
                          {SAMPLE_SYSTEM_ROLES.filter(r => r.category === id).length === 0 && (
                            <li>— Define in backend</li>
                          )}
                        </ul>
                        <Button variant="outline" size="sm" className="mt-3 w-full">
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
              <CardHeader>
                <CardTitle>Define permissions per role</CardTitle>
                <CardDescription>
                  Assign permissions to each system role. Locked permissions cannot be changed by county admins.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Permission</th>
                        <th className="text-left p-3 font-medium">Category</th>
                        <th className="text-left p-3 font-medium">Locked</th>
                        <th className="text-left p-3 font-medium">Roles with access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SAMPLE_PERMISSIONS.map(perm => (
                        <tr key={perm.id} className="border-b last:border-0">
                          <td className="p-3">{perm.label}</td>
                          <td className="p-3">
                            <Badge variant="secondary">{perm.category}</Badge>
                          </td>
                          <td className="p-3">
                            {perm.locked ? (
                              <Lock className="h-4 w-4 text-amber-600" />
                            ) : (
                              <Unlock className="h-4 w-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">— Map in backend</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button variant="outline" className="mt-4">
                  Edit permission matrix
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="override" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Override county-level roles</CardTitle>
                <CardDescription>
                  When a county is selected, you can override which roles are available or what permissions they have in that county. System templates remain the default.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedCountyId ? (
                  <p className="text-muted-foreground">
                    Select a county above to configure overrides for that county.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Overriding roles for selected county. Locked permissions and platform roles cannot be overridden.
                    </p>
                    <div className="flex items-center gap-2">
                      <Switch id="override-enabled" />
                      <Label htmlFor="override-enabled">Enable county-level overrides for this county</Label>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure overrides
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enable-disable" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enable/disable roles per county</CardTitle>
                <CardDescription>
                  For each county, choose which system roles are available. Disabled roles cannot be assigned in that county.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedCountyId ? (
                  <p className="text-muted-foreground">
                    Select a county above to enable or disable roles for that county.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {SAMPLE_SYSTEM_ROLES.filter(r => !r.locked).map(role => (
                      <div key={role.id} className="flex items-center justify-between rounded-lg border p-3">
                        <span className="font-medium">{role.name}</span>
                        <Switch defaultChecked />
                      </div>
                    ))}
                    <Button className="gap-2">
                      <Save className="h-4 w-4" /> Save changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locked" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Locked permissions (sensitive)</CardTitle>
                <CardDescription>
                  Permissions marked as locked cannot be changed or overridden by county admins. Only Super Admin can modify these.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {SAMPLE_PERMISSIONS.filter(p => p.locked).map(perm => (
                    <li
                      key={perm.id}
                      className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-3"
                    >
                      <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="font-medium">{perm.label}</span>
                      <Badge variant="secondary">{perm.category}</Badge>
                    </li>
                  ))}
                  {SAMPLE_SYSTEM_ROLES.filter(r => r.locked).map(role => (
                    <li
                      key={role.id}
                      className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-3"
                    >
                      <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="font-medium">Role: {role.name}</span>
                      <Badge variant="secondary">system role</Badge>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-muted-foreground">
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
