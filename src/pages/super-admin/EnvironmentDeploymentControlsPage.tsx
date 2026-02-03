import { useState } from 'react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Server, Save, Key, CreditCard, Layers, Activity, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type Environment = 'development' | 'staging' | 'production';

type FeatureFlag = {
  id: string;
  label: string;
  description: string;
  dev: boolean;
  staging: boolean;
  prod: boolean;
};

type ApiKeyRow = {
  id: string;
  name: string;
  env: Environment;
  maskedValue: string;
  lastRotated: string;
  status: 'active' | 'expired';
};

const ENV_LABELS: Record<Environment, string> = {
  development: 'Development',
  staging: 'Staging',
  production: 'Production',
};

export default function EnvironmentDeploymentControlsPage() {
  const [selectedEnv, setSelectedEnv] = useState<Environment>('production');
  const [paymentMode, setPaymentMode] = useState<'test' | 'live'>('test');
  const [saving, setSaving] = useState(false);

  const [features, setFeatures] = useState<FeatureFlag[]>([
    { id: 'permits', label: 'Permits & payments', description: 'Permit issuance and payment collection', dev: true, staging: true, prod: true },
    { id: 'penalties', label: 'Penalties & disputes', description: 'Penalty issuance and dispute handling', dev: true, staging: true, prod: true },
    { id: 'support', label: 'Support tickets', description: 'Support ticket creation and escalation', dev: true, staging: true, prod: true },
    { id: 'sms', label: 'SMS notifications', description: 'Send SMS for verification and alerts', dev: true, staging: false, prod: true },
    { id: 'analytics', label: 'Analytics dashboard', description: 'Advanced analytics and reporting', dev: true, staging: true, prod: true },
  ]);

  const [apiKeys] = useState<ApiKeyRow[]>([
    { id: '1', name: 'Stripe (payments)', env: 'production', maskedValue: 'sk_live_••••••••••••••••••••••••', lastRotated: '2025-01-15', status: 'active' },
    { id: '2', name: 'Stripe (payments)', env: 'staging', maskedValue: 'sk_test_••••••••••••••••••••••••', lastRotated: '2025-01-10', status: 'active' },
    { id: '3', name: 'SMS provider', env: 'production', maskedValue: '••••••••••••••••••••••••••••••••', lastRotated: '2025-01-01', status: 'active' },
  ]);

  const setFeatureForEnv = (featureId: string, env: Environment, enabled: boolean) => {
    setFeatures(prev =>
      prev.map(f =>
        f.id === featureId ? { ...f, [env]: enabled } : f
      )
    );
  };

  const handleSaveFeatures = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Feature flags saved for selected environment');
    }, 600);
  };

  const handleSavePaymentMode = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success(`Payment mode set to ${paymentMode === 'live' ? 'Live' : 'Test'}`);
    }, 600);
  };

  return (
    <SuperAdminLayout>
      <div className="min-w-0 space-y-6 overflow-x-hidden p-4 md:p-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <Server className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
            Environment & Deployment Controls
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Switch features per environment, control test vs live payments, manage API keys (visibility only), and view deployment status.
          </p>
        </div>

        {/* Feature flags per environment */}
        <Card>
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Layers className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
              Features per environment
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Enable or disable features for each environment. Changes apply only to the selected environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Environment</Label>
              <Select value={selectedEnv} onValueChange={(v) => setSelectedEnv(v as Environment)}>
                <SelectTrigger className="w-full max-w-xs min-h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">{ENV_LABELS.development}</SelectItem>
                  <SelectItem value="staging">{ENV_LABELS.staging}</SelectItem>
                  <SelectItem value="production">{ENV_LABELS.production}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              {features.map((f) => (
                <div key={f.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
                  <div className="min-w-0 flex-1">
                    <Label className="text-sm font-medium sm:text-base">{f.label}</Label>
                    <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{f.description}</p>
                  </div>
                  <Switch
                    checked={f[selectedEnv]}
                    onCheckedChange={(v) => setFeatureForEnv(f.id, selectedEnv, v)}
                    className="shrink-0"
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleSaveFeatures} disabled={saving} className="w-full min-h-9 sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <Save className="mr-2 h-4 w-4 shrink-0" />}
              Save feature flags
            </Button>
          </CardContent>
        </Card>

        {/* Test vs live payment mode */}
        <Card>
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CreditCard className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
              Payment mode
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Control whether payments use test or live gateways. Use test in non-production environments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Label className="text-sm font-medium sm:text-base">Current mode</Label>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as 'test' | 'live')}>
                  <SelectTrigger className="min-h-9 w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Test (sandbox)</SelectItem>
                    <SelectItem value="live">Live (real charges)</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant={paymentMode === 'live' ? 'destructive' : 'secondary'} className="shrink-0">
                  {paymentMode === 'live' ? 'Live' : 'Test'}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              API keys are managed separately; this only toggles which mode the application uses. Keys are never exposed in the UI.
            </p>
            <Button onClick={handleSavePaymentMode} disabled={saving} className="w-full min-h-9 sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <Save className="mr-2 h-4 w-4 shrink-0" />}
              Save payment mode
            </Button>
          </CardContent>
        </Card>

        {/* API keys — visibility only, no exposure */}
        <Card>
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Key className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
              API keys (visibility only)
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              View which keys exist and their status. Values are never shown; rotate or create keys in your secure secret store.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[520px] overflow-hidden rounded-lg border sm:min-w-0">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium sm:p-3">Name</th>
                    <th className="p-2 text-left font-medium sm:p-3">Environment</th>
                    <th className="p-2 text-left font-medium sm:p-3">Value (masked)</th>
                    <th className="p-2 text-left font-medium sm:p-3">Last rotated</th>
                    <th className="p-2 text-left font-medium sm:p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="p-2 sm:p-3">{row.name}</td>
                      <td className="p-2 sm:p-3">
                        <Badge variant="outline" className="text-xs">{ENV_LABELS[row.env]}</Badge>
                      </td>
                      <td className="flex min-w-0 items-center gap-1 p-2 font-mono text-muted-foreground sm:p-3">
                        <span className="truncate">{row.maskedValue}</span>
                        <span className="shrink-0 text-muted-foreground" title="Values are never exposed">
                          <EyeOff className="inline h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-2 text-muted-foreground sm:p-3">{row.lastRotated}</td>
                      <td className="p-2 sm:p-3">
                        <Badge variant={row.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="h-3.5 w-3.5 shrink-0" />
              Full key values are never displayed. Rotate or add keys via your secure vault or CI/CD.
            </p>
          </CardContent>
        </Card>

        {/* Deployment status (basic) */}
        <Card>
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Activity className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
              Deployment status
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Basic view of current deployment and health. Detailed logs and rollback are handled in your deployment pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              <div className="min-w-0 rounded-lg border p-3 sm:p-4">
                <p className="text-xs text-muted-foreground sm:text-sm">Environment</p>
                <p className="mt-1 text-base font-semibold sm:text-lg">Production</p>
              </div>
              <div className="min-w-0 rounded-lg border p-3 sm:p-4">
                <p className="text-xs text-muted-foreground sm:text-sm">Version</p>
                <p className="mt-1 font-mono text-base font-semibold sm:text-lg">1.2.0</p>
              </div>
              <div className="min-w-0 rounded-lg border p-3 sm:p-4">
                <p className="text-xs text-muted-foreground sm:text-sm">Last deployed</p>
                <p className="mt-1 break-words text-base font-semibold sm:text-lg">2025-01-28 14:32 UTC</p>
              </div>
              <div className="min-w-0 rounded-lg border p-3 sm:p-4">
                <p className="text-xs text-muted-foreground sm:text-sm">Status</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                  <span className="text-base font-semibold sm:text-lg">Healthy</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              For full deployment history, rollback, and logs, use your CI/CD or hosting dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
