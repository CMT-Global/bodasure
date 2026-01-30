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
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Server className="h-6 w-6 sm:h-7 sm:w-7" />
            Environment & Deployment Controls
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Switch features per environment, control test vs live payments, manage API keys (visibility only), and view deployment status.
          </p>
        </div>

        {/* Feature flags per environment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Features per environment
            </CardTitle>
            <CardDescription>
              Enable or disable features for each environment. Changes apply only to the selected environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select value={selectedEnv} onValueChange={(v) => setSelectedEnv(v as Environment)}>
                <SelectTrigger className="w-full max-w-xs">
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
                <div key={f.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <Label className="text-base font-medium">{f.label}</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">{f.description}</p>
                  </div>
                  <Switch
                    checked={f[selectedEnv]}
                    onCheckedChange={(v) => setFeatureForEnv(f.id, selectedEnv, v)}
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleSaveFeatures} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save feature flags
            </Button>
          </CardContent>
        </Card>

        {/* Test vs live payment mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment mode
            </CardTitle>
            <CardDescription>
              Control whether payments use test or live gateways. Use test in non-production environments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="text-base font-medium">Current mode</Label>
              <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as 'test' | 'live')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test (sandbox)</SelectItem>
                  <SelectItem value="live">Live (real charges)</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant={paymentMode === 'live' ? 'destructive' : 'secondary'}>
                {paymentMode === 'live' ? 'Live' : 'Test'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              API keys are managed separately; this only toggles which mode the application uses. Keys are never exposed in the UI.
            </p>
            <Button onClick={handleSavePaymentMode} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save payment mode
            </Button>
          </CardContent>
        </Card>

        {/* API keys — visibility only, no exposure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API keys (visibility only)
            </CardTitle>
            <CardDescription>
              View which keys exist and their status. Values are never shown; rotate or create keys in your secure secret store.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Environment</th>
                    <th className="text-left p-3 font-medium">Value (masked)</th>
                    <th className="text-left p-3 font-medium">Last rotated</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="p-3">{row.name}</td>
                      <td className="p-3">
                        <Badge variant="outline">{ENV_LABELS[row.env]}</Badge>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground flex items-center gap-1">
                        {row.maskedValue}
                        <span className="text-muted-foreground" title="Values are never exposed">
                          <EyeOff className="h-4 w-4 inline" />
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{row.lastRotated}</td>
                      <td className="p-3">
                        <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              Full key values are never displayed. Rotate or add keys via your secure vault or CI/CD.
            </p>
          </CardContent>
        </Card>

        {/* Deployment status (basic) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Deployment status
            </CardTitle>
            <CardDescription>
              Basic view of current deployment and health. Detailed logs and rollback are handled in your deployment pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Environment</p>
                <p className="text-lg font-semibold mt-1">Production</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="text-lg font-semibold mt-1 font-mono">1.2.0</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Last deployed</p>
                <p className="text-lg font-semibold mt-1">2025-01-28 14:32 UTC</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-lg font-semibold">Healthy</span>
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
