import { useState, useMemo, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import {
  useAllCounties,
  useUpdateCountyConfig,
  getCountyConfigFromSettings,
  type CountyRevenueCommercialConfig,
  type CountyRevenueModelConfig,
  type PlatformFeeModelConfig,
  type RevenueSharingRuleConfig,
  type RevenueSharingVisibilityConfig,
} from '@/hooks/useData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Map, Loader2, Save, DollarSign, Percent, Users, Eye, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { TEXTAREA_MAX_CHARS, isOverCharLimit } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const DEFAULT_COUNTY_REVENUE_MODEL: CountyRevenueModelConfig = {
  chargeAmountCents: 0,
  frequency: 'monthly',
  effectiveFrom: new Date().toISOString().slice(0, 10),
  description: '',
};

export default function RevenueCommercialConfigPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCountyId, setSelectedCountyId] = useState<string | null>(null);
  const { data: counties = [], isLoading: countiesLoading } = useAllCounties();

  const selectedCounty = useMemo(
    () => counties.find(c => c.id === selectedCountyId) ?? null,
    [counties, selectedCountyId]
  );

  const config = useMemo(
    () => getCountyConfigFromSettings(selectedCounty?.settings as Record<string, unknown> | undefined),
    [selectedCounty]
  );

  const revConfig = config.revenueCommercialConfig ?? {
    countyRevenueModel: { chargeAmountCents: 0, frequency: 'monthly', effectiveFrom: new Date().toISOString().slice(0, 10), description: '' },
    platformFeeModel: { modelType: 'fixed', fixedFeeCentsPerRider: 0, notes: '' },
    saccoWelfareRevenueSharing: {
      enabled: false,
      rules: [],
      visibility: {
        saccosSeeAmounts: true,
        saccosSeeBreakdown: false,
        countiesSeeAmounts: true,
        countiesSeeBreakdown: true,
        ridersNeverSeeRevenueShare: true,
      },
    },
  };

  const [countyRevenueModel, setCountyRevenueModel] = useState<CountyRevenueModelConfig>(revConfig.countyRevenueModel);
  const [platformFeeModel, setPlatformFeeModel] = useState<PlatformFeeModelConfig>(revConfig.platformFeeModel);
  const [saccoWelfare, setSaccoWelfare] = useState(revConfig.saccoWelfareRevenueSharing);

  useEffect(() => {
    setCountyRevenueModel(revConfig.countyRevenueModel);
    setPlatformFeeModel(revConfig.platformFeeModel);
    setSaccoWelfare(revConfig.saccoWelfareRevenueSharing);
  }, [revConfig]);

  useEffect(() => {
    if (counties.length > 0 && !selectedCountyId) {
      const countyFromUrl = searchParams.get('county');
      if (countyFromUrl && counties.some(c => c.id === countyFromUrl)) {
        setSelectedCountyId(countyFromUrl);
      } else {
        setSelectedCountyId(counties[0].id);
      }
    }
  }, [counties, searchParams, selectedCountyId]);

  const updateMutation = useUpdateCountyConfig();

  const hasActiveCountyRevenue = (countyRevenueModel.chargeAmountCents ?? 0) > 0;

  const handleRemoveCountyRevenue = () => {
    if (!selectedCountyId) return;
    const configToSave: CountyRevenueCommercialConfig = {
      ...buildRevenueConfig(),
      countyRevenueModel: { ...DEFAULT_COUNTY_REVENUE_MODEL },
    };
    updateMutation.mutate(
      {
        countyId: selectedCountyId,
        config: { revenueCommercialConfig: configToSave },
        section: 'revenueCommercialConfig',
      },
      {
        onSuccess: () => {
          setCountyRevenueModel({ ...DEFAULT_COUNTY_REVENUE_MODEL });
          toast.success('County revenue model removed. It will no longer appear in Finance view.');
        },
        onError: () => {},
      }
    );
  };

  const buildRevenueConfig = (): CountyRevenueCommercialConfig => ({
    countyRevenueModel: {
      ...countyRevenueModel,
      chargeAmountCents: countyRevenueModel.chargeAmountCents ?? 0,
    },
    platformFeeModel: {
      ...platformFeeModel,
      fixedFeeCentsPerRider: platformFeeModel.fixedFeeCentsPerRider ?? 0,
      percentageFee: platformFeeModel.percentageFee ?? 0,
      hybridFixedCents: platformFeeModel.hybridFixedCents ?? 0,
      hybridPercentage: platformFeeModel.hybridPercentage ?? 0,
    },
    saccoWelfareRevenueSharing: {
      enabled: saccoWelfare.enabled,
      rules: saccoWelfare.rules.map(r => ({
        ...r,
        percentageShare: r.percentageShare ?? 0,
        fixedAmountCents: r.fixedAmountCents ?? 0,
        complianceThresholdPercent: r.complianceThresholdPercent ?? 0,
      })),
      visibility: { ...saccoWelfare.visibility },
    },
  });

  const handleSaveRevenue = () => {
    if (!selectedCountyId) return;
    if (isOverCharLimit(countyRevenueModel.description ?? '')) {
      toast.error(`Maximum ${TEXTAREA_MAX_CHARS} characters allowed.`);
      return;
    }
    if (isOverCharLimit(platformFeeModel.notes ?? '')) {
      toast.error(`Maximum ${TEXTAREA_MAX_CHARS} characters allowed.`);
      return;
    }
    updateMutation.mutate(
      {
        countyId: selectedCountyId,
        config: { revenueCommercialConfig: buildRevenueConfig() },
        section: 'revenueCommercialConfig',
      },
      { onError: () => {} }
    );
  };

  const addRevenueSharingRule = () => {
    const rule: RevenueSharingRuleConfig = {
      applyBy: 'sacco',
      shareType: 'percentage',
      percentageShare: 0,
      activePermitsOnly: true,
      complianceThresholdRequired: false,
    };
    setSaccoWelfare(prev => ({ ...prev, rules: [...prev.rules, rule] }));
  };

  const updateRevenueSharingRule = (index: number, patch: Partial<RevenueSharingRuleConfig>) => {
    setSaccoWelfare(prev => ({
      ...prev,
      rules: prev.rules.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  };

  const removeRevenueSharingRule = (index: number) => {
    setSaccoWelfare(prev => ({ ...prev, rules: prev.rules.filter((_, i) => i !== index) }));
  };

  const setVisibility = (patch: Partial<RevenueSharingVisibilityConfig>) => {
    setSaccoWelfare(prev => ({
      ...prev,
      visibility: { ...prev.visibility, ...patch },
    }));
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Revenue & Commercial Configuration</h1>
          <p className="text-muted-foreground">
            Platform-critical settings per county: county revenue model, platform fee model, and sacco & welfare revenue sharing. Configure charge amounts, frequencies, effective dates, fee models, and visibility.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select county</CardTitle>
            <CardDescription>Revenue and commercial settings are configured per county.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedCountyId ?? ''}
              onValueChange={v => setSelectedCountyId(v || null)}
              disabled={countiesLoading}
            >
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Select a county" />
              </SelectTrigger>
              <SelectContent>
                {counties.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <Map className="h-4 w-4 text-muted-foreground" />
                      {c.name} ({c.code})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {!selectedCountyId ? (
          <p className="text-muted-foreground">Select a county to configure revenue and commercial settings.</p>
        ) : (
          <Tabs defaultValue="county-revenue" className="space-y-4">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 p-1 h-auto gap-1 sm:gap-0 rounded-lg [&>button]:min-h-[44px] [&>button]:min-w-0">
              <TabsTrigger value="county-revenue" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
                <DollarSign className="h-4 w-4 shrink-0" /> <span className="truncate">County Revenue</span>
              </TabsTrigger>
              <TabsTrigger value="platform-fee" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
                <Percent className="h-4 w-4 shrink-0" /> <span className="truncate">Platform Fee</span>
              </TabsTrigger>
              <TabsTrigger value="sacco-welfare" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
                <Users className="h-4 w-4 shrink-0" /> <span className="truncate">Sacco & Welfare</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="county-revenue" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>A. County Revenue Model</CardTitle>
                  <CardDescription>
                    County charge amounts, frequency (weekly/monthly), and effective dates. Effective: shown in Super Admin Finance View per county and used for reporting.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Charge amount (KES)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      value={countyRevenueModel.chargeAmountCents != null ? countyRevenueModel.chargeAmountCents / 100 : ''}
                      onChange={e => setCountyRevenueModel(prev => ({ ...prev, chargeAmountCents: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100) }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Frequency</Label>
                    <Select
                      value={countyRevenueModel.frequency}
                      onValueChange={v => setCountyRevenueModel(prev => ({ ...prev, frequency: v as 'weekly' | 'monthly' }))}
                    >
                      <SelectTrigger className="max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label>Effective from (date)</Label>
                      <Input
                        type="date"
                        value={countyRevenueModel.effectiveFrom}
                        onChange={e => setCountyRevenueModel(prev => ({ ...prev, effectiveFrom: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Effective to (date, optional)</Label>
                      <Input
                        type="date"
                        value={countyRevenueModel.effectiveTo ?? ''}
                        onChange={e => setCountyRevenueModel(prev => ({ ...prev, effectiveTo: e.target.value || undefined }))}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={countyRevenueModel.description ?? ''}
                      onChange={e => setCountyRevenueModel(prev => ({ ...prev, description: e.target.value || undefined }))}
                      placeholder="e.g. Monthly county levy per rider"
                      rows={2}
                      className={cn(isOverCharLimit(countyRevenueModel.description ?? '') && 'border-destructive')}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button
                      onClick={handleSaveRevenue}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span className="ml-2">Save</span>
                    </Button>
                    {hasActiveCountyRevenue && (
                      <Button
                        type="button"
                        variant="outline"
                        className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                        onClick={handleRemoveCountyRevenue}
                        disabled={updateMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="ml-2">Remove county revenue model</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="platform-fee" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>B. Platform Fee Model</CardTitle>
                  <CardDescription>
                    Fixed fee per rider, percentage-based fee, or hybrid. When set, this overrides County Monetization platform fee for permit payments. Effective: used in payment breakdown and stored as platform_fee; visible in Finance View.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Fee model type</Label>
                    <Select
                      value={platformFeeModel.modelType}
                      onValueChange={v => setPlatformFeeModel(prev => ({ ...prev, modelType: v as 'fixed' | 'percentage' | 'hybrid' }))}
                    >
                      <SelectTrigger className="max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed fee per rider</SelectItem>
                        <SelectItem value="percentage">Percentage-based</SelectItem>
                        <SelectItem value="hybrid">Hybrid (fixed + percentage)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(platformFeeModel.modelType === 'fixed' || platformFeeModel.modelType === 'hybrid') && (
                    <div className="grid gap-2">
                      <Label>{platformFeeModel.modelType === 'hybrid' ? 'Fixed amount per rider (KES)' : 'Fixed fee per rider (KES)'}</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        value={
                          platformFeeModel.modelType === 'hybrid'
                            ? (platformFeeModel.hybridFixedCents != null ? platformFeeModel.hybridFixedCents / 100 : '')
                            : (platformFeeModel.fixedFeeCentsPerRider != null ? platformFeeModel.fixedFeeCentsPerRider / 100 : '')
                        }
                        onChange={e => {
                          if (e.target.value === '') {
                            if (platformFeeModel.modelType === 'hybrid') setPlatformFeeModel(prev => ({ ...prev, hybridFixedCents: undefined }));
                            else setPlatformFeeModel(prev => ({ ...prev, fixedFeeCentsPerRider: undefined }));
                          } else {
                            const cents = Math.round(Number(e.target.value) * 100);
                            if (platformFeeModel.modelType === 'hybrid') setPlatformFeeModel(prev => ({ ...prev, hybridFixedCents: cents }));
                            else setPlatformFeeModel(prev => ({ ...prev, fixedFeeCentsPerRider: cents }));
                          }
                        }}
                      />
                    </div>
                  )}
                  {(platformFeeModel.modelType === 'percentage' || platformFeeModel.modelType === 'hybrid') && (
                    <div className="grid gap-2">
                      <Label>{platformFeeModel.modelType === 'hybrid' ? 'Percentage (%)' : 'Percentage-based fee (%)'}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        placeholder="0"
                        value={platformFeeModel.modelType === 'hybrid' ? (platformFeeModel.hybridPercentage ?? '') : (platformFeeModel.percentageFee ?? '')}
                        onChange={e => {
                          if (e.target.value === '') {
                            if (platformFeeModel.modelType === 'hybrid') setPlatformFeeModel(prev => ({ ...prev, hybridPercentage: undefined }));
                            else setPlatformFeeModel(prev => ({ ...prev, percentageFee: undefined }));
                          } else {
                            const pct = Number(e.target.value);
                            if (platformFeeModel.modelType === 'hybrid') setPlatformFeeModel(prev => ({ ...prev, hybridPercentage: pct }));
                            else setPlatformFeeModel(prev => ({ ...prev, percentageFee: pct }));
                          }
                        }}
                      />
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label>Fee review date (optional)</Label>
                    <Input
                      type="date"
                      value={platformFeeModel.feeReviewDate ?? ''}
                      onChange={e => setPlatformFeeModel(prev => ({ ...prev, feeReviewDate: e.target.value || undefined }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      value={platformFeeModel.notes ?? ''}
                      onChange={e => setPlatformFeeModel(prev => ({ ...prev, notes: e.target.value || undefined }))}
                      placeholder="e.g. Reviewed quarterly"
                      rows={2}
                      className={cn(isOverCharLimit(platformFeeModel.notes ?? '') && 'border-destructive')}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sacco-welfare" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>C. Sacco & Welfare Revenue Sharing</CardTitle>
                  <CardDescription>Enable/disable revenue sharing per county. Configure percentage or fixed amount per rider, apply by sacco or welfare group, tie to active permits and compliance. Control what Saccos, counties, and riders see.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={saccoWelfare.enabled}
                      onCheckedChange={v => setSaccoWelfare(prev => ({ ...prev, enabled: v }))}
                    />
                    <Label>Enable revenue sharing for this county</Label>
                  </div>

                  {saccoWelfare.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label>Revenue sharing rules</Label>
                        {saccoWelfare.rules.map((rule, i) => (
                          <div key={i} className="rounded-lg border p-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Label className="text-muted-foreground shrink-0">Apply by:</Label>
                              <Select
                                value={rule.applyBy}
                                onValueChange={v => updateRevenueSharingRule(i, { applyBy: v as 'sacco' | 'welfare_group' })}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sacco">Sacco</SelectItem>
                                  <SelectItem value="welfare_group">Welfare group</SelectItem>
                                </SelectContent>
                              </Select>
                              <Label className="text-muted-foreground shrink-0">Share type:</Label>
                              <Select
                                value={rule.shareType}
                                onValueChange={v => updateRevenueSharingRule(i, { shareType: v as 'percentage' | 'fixed_per_rider' })}
                              >
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percentage">Percentage</SelectItem>
                                  <SelectItem value="fixed_per_rider">Fixed per rider</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeRevenueSharingRule(i)}>
                                Remove
                              </Button>
                            </div>
                            {rule.shareType === 'percentage' ? (
                              <div className="flex items-center gap-2">
                                <Label className="text-muted-foreground shrink-0">Share %:</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.01}
                                  className="w-24"
                                  placeholder="0"
                                  value={rule.percentageShare ?? ''}
                                  onChange={e => updateRevenueSharingRule(i, { percentageShare: e.target.value === '' ? undefined : Number(e.target.value) })}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Label className="text-muted-foreground shrink-0">Fixed amount (KES) per rider:</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  className="w-32"
                                  placeholder="0"
                                  value={rule.fixedAmountCents != null ? rule.fixedAmountCents / 100 : ''}
                                  onChange={e => updateRevenueSharingRule(i, { fixedAmountCents: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100) })}
                                />
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={rule.activePermitsOnly}
                                  onCheckedChange={v => updateRevenueSharingRule(i, { activePermitsOnly: v })}
                                />
                                <Label className="text-muted-foreground text-sm">Active permits only</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={rule.complianceThresholdRequired}
                                  onCheckedChange={v => updateRevenueSharingRule(i, { complianceThresholdRequired: v })}
                                />
                                <Label className="text-muted-foreground text-sm">Compliance threshold required</Label>
                              </div>
                              {rule.complianceThresholdRequired && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-muted-foreground text-sm">Threshold %:</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    className="w-20"
                                    placeholder="0"
                                    value={rule.complianceThresholdPercent ?? ''}
                                    onChange={e => updateRevenueSharingRule(i, { complianceThresholdPercent: e.target.value === '' ? undefined : Number(e.target.value) })}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addRevenueSharingRule}>
                          Add rule
                        </Button>
                      </div>

                      <div className="space-y-3 pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Eye className="h-4 w-4" />
                          Control visibility
                        </div>
                        <p className="text-sm text-muted-foreground">What Saccos see, what counties see, and that riders never see revenue share details.</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label className="text-sm">Saccos see amounts</Label>
                            <Switch
                              checked={saccoWelfare.visibility.saccosSeeAmounts}
                              onCheckedChange={v => setVisibility({ saccosSeeAmounts: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label className="text-sm">Saccos see breakdown</Label>
                            <Switch
                              checked={saccoWelfare.visibility.saccosSeeBreakdown}
                              onCheckedChange={v => setVisibility({ saccosSeeBreakdown: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label className="text-sm">Counties see amounts</Label>
                            <Switch
                              checked={saccoWelfare.visibility.countiesSeeAmounts}
                              onCheckedChange={v => setVisibility({ countiesSeeAmounts: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label className="text-sm">Counties see breakdown</Label>
                            <Switch
                              checked={saccoWelfare.visibility.countiesSeeBreakdown}
                              onCheckedChange={v => setVisibility({ countiesSeeBreakdown: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                            <Label className="text-sm">Riders never see revenue share (platform policy)</Label>
                            <Switch
                              checked={saccoWelfare.visibility.ridersNeverSeeRevenueShare}
                              onCheckedChange={v => setVisibility({ ridersNeverSeeRevenueShare: v })}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <div className="flex justify-end">
              <Button
              onClick={handleSaveRevenue}
              disabled={updateMutation.isPending || isOverCharLimit(countyRevenueModel.description ?? '') || isOverCharLimit(platformFeeModel.notes ?? '')}
            >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save revenue & commercial config
              </Button>
            </div>
          </Tabs>
        )}
      </div>
    </SuperAdminLayout>
  );
}
