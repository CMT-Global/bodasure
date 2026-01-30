import { useState, useMemo, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAllCounties } from '@/hooks/useData';
import { Cog, Loader2, Save, Bell, FileCheck, UserPlus, Wrench, Layers } from 'lucide-react';
import { toast } from 'sonner';

type SystemModule = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

type NotificationChannel = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

type VerificationRule = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

export default function SystemSettingsPage() {
  const { data: counties = [], isLoading: countiesLoading } = useAllCounties();

  const [modules, setModules] = useState<SystemModule[]>([
    { id: 'riders', label: 'Riders & Registration', description: 'Rider registration, permits, and profiles', enabled: true },
    { id: 'saccos', label: 'Saccos & Stages', description: 'Sacco management and stage operations', enabled: true },
    { id: 'permits', label: 'Permits & Payments', description: 'Permit issuance and payment processing', enabled: true },
    { id: 'penalties', label: 'Penalties & Compliance', description: 'Penalties, disputes, and compliance', enabled: true },
    { id: 'support', label: 'Support & Tickets', description: 'Support tickets and escalation', enabled: true },
    { id: 'reports', label: 'Reports & Analytics', description: 'Reporting and analytics dashboards', enabled: true },
  ]);

  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>([
    { id: 'email', label: 'Email', description: 'Send notifications via email', enabled: true },
    { id: 'sms', label: 'SMS', description: 'Send notifications via SMS', enabled: true },
    { id: 'in_app', label: 'In-app', description: 'In-app notification center', enabled: true },
    { id: 'push', label: 'Push (future)', description: 'Mobile push notifications', enabled: false },
  ]);

  const [verificationRules, setVerificationRules] = useState<VerificationRule[]>([
    { id: 'qr_required', label: 'QR code required', description: 'Rider must have valid QR for verification', enabled: true },
    { id: 'id_required', label: 'ID verification', description: 'Require ID verification for registration', enabled: true },
    { id: 'sacco_approval', label: 'Sacco approval', description: 'Sacco must approve new members', enabled: true },
    { id: 'county_approval', label: 'County approval', description: 'County must approve registrations', enabled: false },
  ]);

  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([
    { id: 'profile', label: 'Profile completion', description: 'Require profile completion before permit', enabled: true },
    { id: 'sacco_join', label: 'Sacco membership', description: 'Require Sacco membership', enabled: true },
    { id: 'training', label: 'Training acknowledgment', description: 'Require training acknowledgment', enabled: false },
    { id: 'documents', label: 'Document upload', description: 'Require document upload (ID, etc.)', enabled: true },
  ]);

  const [maintenanceGlobal, setMaintenanceGlobal] = useState(false);
  const [maintenanceCountyIds, setMaintenanceCountyIds] = useState<Set<string>>(new Set());
  const [selectedCountyForFeatures, setSelectedCountyForFeatures] = useState<string | null>(null);
  const [countyFeatureOverrides, setCountyFeatureOverrides] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (counties.length > 0 && !selectedCountyForFeatures) setSelectedCountyForFeatures(counties[0].id);
  }, [counties, selectedCountyForFeatures]);

  const countyFeatureToggles = useMemo(() => {
    const cid = selectedCountyForFeatures;
    if (!cid) return {};
    return countyFeatureOverrides[cid] ?? {};
  }, [selectedCountyForFeatures, countyFeatureOverrides]);

  const setCountyFeature = (moduleId: string, enabled: boolean) => {
    const cid = selectedCountyForFeatures;
    if (!cid) return;
    setCountyFeatureOverrides(prev => ({
      ...prev,
      [cid]: { ...(prev[cid] ?? {}), [moduleId]: enabled },
    }));
  };

  const toggleMaintenanceCounty = (countyId: string) => {
    setMaintenanceCountyIds(prev => {
      const next = new Set(prev);
      if (next.has(countyId)) next.delete(countyId);
      else next.add(countyId);
      return next;
    });
  };

  const handleSaveModules = () => {
    toast.success('System modules saved');
  };

  const handleSaveNotificationChannels = () => {
    toast.success('Notification channels saved');
  };

  const handleSaveVerificationRules = () => {
    toast.success('Verification rules saved');
  };

  const handleSaveOnboarding = () => {
    toast.success('Onboarding workflows saved');
  };

  const handleSaveMaintenance = () => {
    toast.success('Maintenance mode settings saved');
  };

  const handleSaveCountyFeatures = () => {
    toast.success('County feature overrides saved');
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Cog className="h-6 w-6 sm:h-7 sm:w-7" />
            System Settings
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Enable/disable system modules, control notification channels, verification rules, onboarding workflows, and maintenance mode globally or per county.
          </p>
        </div>

        {/* System modules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              System modules
            </CardTitle>
            <CardDescription>Enable or disable system modules across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {modules.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <Label className="text-base font-medium">{m.label}</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">{m.description}</p>
                </div>
                <Switch
                  checked={m.enabled}
                  onCheckedChange={(v) =>
                    setModules(prev => prev.map(x => (x.id === m.id ? { ...x, enabled: v } : x)))
                  }
                />
              </div>
            ))}
            <Button onClick={handleSaveModules}>
              <Save className="h-4 w-4 mr-2" />
              Save modules
            </Button>
          </CardContent>
        </Card>

        {/* Toggle features per county */}
        <Card>
          <CardHeader>
            <CardTitle>Features per county</CardTitle>
            <CardDescription>Override which features are available in each county.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>County</Label>
              <Select
                value={selectedCountyForFeatures ?? ''}
                onValueChange={setSelectedCountyForFeatures}
                disabled={countiesLoading}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select county" />
                </SelectTrigger>
                <SelectContent>
                  {counties.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-3">
              {modules.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <Label className="text-sm font-medium">{m.label}</Label>
                  <Switch
                    checked={countyFeatureToggles[m.id] ?? m.enabled}
                    onCheckedChange={(v) => setCountyFeature(m.id, v)}
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleSaveCountyFeatures} disabled={!selectedCountyForFeatures}>
              <Save className="h-4 w-4 mr-2" />
              Save county features
            </Button>
          </CardContent>
        </Card>

        {/* Notification channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification channels
            </CardTitle>
            <CardDescription>Control which notification channels are active globally.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notificationChannels.map((ch) => (
              <div key={ch.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <Label className="text-base font-medium">{ch.label}</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">{ch.description}</p>
                </div>
                <Switch
                  checked={ch.enabled}
                  onCheckedChange={(v) =>
                    setNotificationChannels(prev =>
                      prev.map(x => (x.id === ch.id ? { ...x, enabled: v } : x))
                    )
                  }
                />
              </div>
            ))}
            <Button onClick={handleSaveNotificationChannels}>
              <Save className="h-4 w-4 mr-2" />
              Save notification channels
            </Button>
          </CardContent>
        </Card>

        {/* Verification rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Verification rules
            </CardTitle>
            <CardDescription>Control verification and compliance rules applied platform-wide.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {verificationRules.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <Label className="text-base font-medium">{r.label}</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">{r.description}</p>
                </div>
                <Switch
                  checked={r.enabled}
                  onCheckedChange={(v) =>
                    setVerificationRules(prev =>
                      prev.map(x => (x.id === r.id ? { ...x, enabled: v } : x))
                    )
                  }
                />
              </div>
            ))}
            <Button onClick={handleSaveVerificationRules}>
              <Save className="h-4 w-4 mr-2" />
              Save verification rules
            </Button>
          </CardContent>
        </Card>

        {/* Onboarding workflows */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Onboarding workflows
            </CardTitle>
            <CardDescription>Control which onboarding steps are required for riders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {onboardingSteps.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <Label className="text-base font-medium">{s.label}</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>
                </div>
                <Switch
                  checked={s.enabled}
                  onCheckedChange={(v) =>
                    setOnboardingSteps(prev =>
                      prev.map(x => (x.id === s.id ? { ...x, enabled: v } : x))
                    )
                  }
                />
              </div>
            ))}
            <Button onClick={handleSaveOnboarding}>
              <Save className="h-4 w-4 mr-2" />
              Save onboarding workflows
            </Button>
          </CardContent>
        </Card>

        {/* Maintenance mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Maintenance mode
            </CardTitle>
            <CardDescription>
              Enable maintenance mode globally or for specific counties. Users in affected areas will see a maintenance message.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <Label className="text-base font-medium">Global maintenance mode</Label>
                <p className="text-sm text-muted-foreground mt-0.5">Disable access for all counties.</p>
              </div>
              <Switch checked={maintenanceGlobal} onCheckedChange={setMaintenanceGlobal} />
            </div>
            <Separator />
            <div>
              <Label className="text-base font-medium mb-3 block">Maintenance per county</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Enable maintenance for specific counties only (ignored when global maintenance is on).
              </p>
              {countiesLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading counties…
                </div>
              ) : (
                <div className="space-y-2">
                  {counties.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                      <span className="font-medium">{c.name}</span>
                      <Switch
                        checked={maintenanceCountyIds.has(c.id)}
                        onCheckedChange={() => toggleMaintenanceCounty(c.id)}
                        disabled={maintenanceGlobal}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleSaveMaintenance}>
              <Save className="h-4 w-4 mr-2" />
              Save maintenance settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
