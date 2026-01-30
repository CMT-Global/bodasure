import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { SUPER_ADMIN_PORTAL } from '@/config/portalRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

export default function SuperAdminDashboard() {
  return (
    <SuperAdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">
            {SUPER_ADMIN_PORTAL.description} — governance and oversight.
          </p>
        </div>

        {/* Role & access scope */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">Role & access scope</CardTitle>
              <Badge variant="secondary">{SUPER_ADMIN_PORTAL.role}</Badge>
              {SUPER_ADMIN_PORTAL.accessScope.governanceOnly && (
                <Badge variant="outline">Governance only</Badge>
              )}
            </div>
            <CardDescription>
              {SUPER_ADMIN_PORTAL.accessScope.summary}. {SUPER_ADMIN_PORTAL.accessScope.note}
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Permissions
              </CardTitle>
              <CardDescription>What you can do in this portal</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {SUPER_ADMIN_PORTAL.permissions.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <XCircle className="h-4 w-4 text-amber-600" />
                Restrictions
              </CardTitle>
              <CardDescription>Out of scope for this role</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {SUPER_ADMIN_PORTAL.restrictions.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <XCircle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
