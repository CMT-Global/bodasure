import { useState, useMemo, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { Button } from '@/components/ui/button';
import {
  useAllCounties,
  useUpdateCountyConfig,
  useCountyConfigHistory,
  getCountyConfigFromSettings,
  type PermitTypeConfig,
  type PenaltyCategoryConfig,
  type EscalationRule,
  type CountyPermitConfig,
  type CountyPenaltyConfig,
  type CountyComplianceRules,
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
import { Map, Loader2, Save, History, FileCheck, Scale, ShieldCheck, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { TEXTAREA_MAX_CHARS, isOverCharLimit } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  countyPermitConfigFormSchema,
  countyPenaltyConfigFormSchema,
  countyComplianceRulesFormSchema,
  getZodErrorsByPath,
} from '@/lib/zod';

export default function CountyConfigurationPage() {
  const [selectedCountyId, setSelectedCountyId] = useState<string | null>(null);
  const { data: counties = [], isLoading: countiesLoading } = useAllCounties();

  const selectedCounty = useMemo(
    () => counties.find(c => c.id === selectedCountyId) ?? null,
    [counties, selectedCountyId]
  );

  useEffect(() => {
    if (counties.length > 0 && !selectedCountyId) setSelectedCountyId(counties[0].id);
  }, [counties, selectedCountyId]);

  const config = useMemo(
    () => getCountyConfigFromSettings(selectedCounty?.settings as Record<string, unknown> | undefined),
    [selectedCounty]
  );

  const [permitConfig, setPermitConfig] = useState<CountyPermitConfig>(config.permitConfig);
  const [penaltyConfig, setPenaltyConfig] = useState<CountyPenaltyConfig>(config.penaltyConfig);
  const [complianceRules, setComplianceRules] = useState<CountyComplianceRules>(config.complianceRules);
  const [permitErrors, setPermitErrors] = useState<Record<string, string>>({});
  const [penaltyErrors, setPenaltyErrors] = useState<Record<string, string>>({});
  const [complianceErrors, setComplianceErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setPermitConfig(config.permitConfig);
    setPenaltyConfig(config.penaltyConfig);
    setComplianceRules(config.complianceRules);
    setPermitErrors({});
    setPenaltyErrors({});
    setComplianceErrors({});
  }, [config]);

  const updateMutation = useUpdateCountyConfig();
  const { data: history = [] } = useCountyConfigHistory(selectedCountyId);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  const HISTORY_PAGE_SIZE = 12;
  const historyTotalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const paginatedHistory = history.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  );

  useEffect(() => {
    if (historyPage > historyTotalPages) setHistoryPage(1);
  }, [history.length, historyPage, historyTotalPages]);

  const handleSavePermit = () => {
    if (!selectedCountyId) return;
    const sanitized: CountyPermitConfig = {
      ...permitConfig,
      gracePeriodDays: permitConfig.gracePeriodDays ?? 0,
      permitTypes: permitConfig.permitTypes.map(pt => ({
        ...pt,
        feeCents: pt.feeCents ?? 0,
        validityDays: pt.validityDays ?? 0,
      })),
    };
    const result = countyPermitConfigFormSchema.safeParse(sanitized);
    if (!result.success) {
      setPermitErrors(getZodErrorsByPath(result.error.issues));
      toast.error('Please fix the validation errors before saving.');
      return;
    }
    setPermitErrors({});
    updateMutation.mutate(
      { countyId: selectedCountyId, config: { permitConfig: sanitized }, section: 'permitConfig' },
      { onError: () => {} }
    );
  };
  const handleSavePenalty = () => {
    if (!selectedCountyId) return;
    const sanitized: CountyPenaltyConfig = {
      ...penaltyConfig,
      categories: penaltyConfig.categories.map(c => ({ ...c, amountCents: c.amountCents ?? 0 })),
      escalationLogic: penaltyConfig.escalationLogic.map(r => ({
        ...r,
        multiplier: r.multiplier ?? 1,
        maxAmountCents: r.maxAmountCents ?? undefined,
      })),
      waiverRules: {
        ...penaltyConfig.waiverRules,
        maxWaiverAmountCents: penaltyConfig.waiverRules.maxWaiverAmountCents ?? undefined,
      },
    };
    const result = countyPenaltyConfigFormSchema.safeParse(sanitized);
    if (!result.success) {
      setPenaltyErrors(getZodErrorsByPath(result.error.issues));
      toast.error('Please fix the validation errors before saving.');
      return;
    }
    setPenaltyErrors({});
    updateMutation.mutate(
      { countyId: selectedCountyId, config: { penaltyConfig: sanitized }, section: 'penaltyConfig' },
      { onError: () => {} }
    );
  };
  const handleSaveCompliance = () => {
    if (!selectedCountyId) return;
    const result = countyComplianceRulesFormSchema.safeParse(complianceRules);
    if (!result.success) {
      setComplianceErrors(getZodErrorsByPath(result.error.issues));
      toast.error('Please fix the validation errors before saving.');
      return;
    }
    setComplianceErrors({});
    updateMutation.mutate(
      { countyId: selectedCountyId, config: { complianceRules: complianceRules }, section: 'complianceRules' },
      { onError: () => {} }
    );
  };

  const addPermitType = () => {
    const id = `custom-${Date.now()}`;
    setPermitConfig(prev => ({
      ...prev,
      permitTypes: [...prev.permitTypes, { id, name: 'Custom', type: 'custom', feeCents: 0, validityDays: 30, description: '' }],
    }));
  };
  const updatePermitType = (index: number, patch: Partial<PermitTypeConfig>) => {
    setPermitConfig(prev => ({
      ...prev,
      permitTypes: prev.permitTypes.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));
  };
  const removePermitType = (index: number) => {
    setPermitConfig(prev => ({
      ...prev,
      permitTypes: prev.permitTypes.filter((_, i) => i !== index),
    }));
  };

  const addPenaltyCategory = () => {
    const id = `cat-${Date.now()}`;
    setPenaltyConfig(prev => ({
      ...prev,
      categories: [...prev.categories, { id, name: '', amountCents: 0, description: '' }],
    }));
  };
  const updatePenaltyCategory = (index: number, patch: Partial<PenaltyCategoryConfig>) => {
    setPenaltyConfig(prev => ({
      ...prev,
      categories: prev.categories.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  };
  const removePenaltyCategory = (index: number) => {
    setPenaltyConfig(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  };

  const addEscalationRule = () => {
    setPenaltyConfig(prev => ({
      ...prev,
      escalationLogic: [...prev.escalationLogic, { repeatCount: 2, multiplier: 1.5, maxAmountCents: undefined }],
    }));
  };
  const updateEscalationRule = (index: number, patch: Partial<EscalationRule>) => {
    setPenaltyConfig(prev => ({
      ...prev,
      escalationLogic: prev.escalationLogic.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }));
  };
  const removeEscalationRule = (index: number) => {
    setPenaltyConfig(prev => ({
      ...prev,
      escalationLogic: prev.escalationLogic.filter((_, i) => i !== index),
    }));
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 min-w-0 overflow-x-hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">County-Specific Configuration</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Each county has independent permit, penalty, and compliance settings. Editable anytime; changes apply prospectively and are logged with version history.
          </p>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base">Select county</CardTitle>
            <CardDescription>Configure permit types, fees, penalties, and compliance rules for the selected county.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <Select
              value={selectedCountyId ?? ''}
              onValueChange={v => setSelectedCountyId(v || null)}
              disabled={countiesLoading}
            >
              <SelectTrigger className="w-full sm:max-w-sm">
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
          <p className="text-muted-foreground">Select a county to edit its configuration.</p>
        ) : (
          <Tabs defaultValue="permit" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 p-1 h-auto gap-1 sm:gap-0 rounded-lg [&>button]:min-h-[44px] [&>button]:min-w-0">
              <TabsTrigger value="permit" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
                <FileCheck className="h-4 w-4 shrink-0" /> <span className="truncate">Permit</span>
              </TabsTrigger>
              <TabsTrigger value="penalty" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
                <Scale className="h-4 w-4 shrink-0" /> <span className="truncate">Penalty</span>
              </TabsTrigger>
              <TabsTrigger value="compliance" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
                <ShieldCheck className="h-4 w-4 shrink-0" /> <span className="truncate">Compliance</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
                <History className="h-4 w-4 shrink-0" /> <span className="truncate">History</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="permit" className="space-y-4">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle>Permit configuration</CardTitle>
                  <CardDescription>Permit types, fees, validity rules, grace periods, and auto-renew.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="space-y-2 min-w-0">
                    <Label>Permit types & fees</Label>
                    {permitErrors.permitTypes && (
                      <p className="text-xs text-destructive">{permitErrors.permitTypes}</p>
                    )}
                    {permitConfig.permitTypes.length > 0 && (
                      <div className="hidden sm:grid gap-3 px-3 py-2.5 text-xs font-medium text-muted-foreground border rounded-t-lg bg-muted/50 grid-cols-[2fr_1fr_1fr_1fr_auto]">
                        <span>Name</span>
                        <span>Type</span>
                        <span>Fee (KES)</span>
                        <span>Validity (days)</span>
                        <span className="text-right">Actions</span>
                      </div>
                    )}
                    <div className="space-y-3 sm:space-y-0">
                      {permitConfig.permitTypes.map((pt, i) => (
                        <div
                          key={pt.id}
                          className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-start sm:items-center rounded-lg border p-3 sm:rounded-none sm:border-t-0 sm:border-x first:sm:rounded-t-none last:sm:rounded-b-lg"
                        >
                          <div className="flex flex-col gap-1 sm:contents">
                            <span className="text-xs text-muted-foreground sm:hidden">Name</span>
                            <div className="space-y-1">
                              <Input
                                className={cn('w-full min-w-0', permitErrors[`permitTypes.${i}.name`] && 'border-destructive')}
                                placeholder="e.g. Weekly, Monthly"
                                value={pt.name}
                                onChange={e => updatePermitType(i, { name: e.target.value })}
                              />
                              {permitErrors[`permitTypes.${i}.name`] && (
                                <p className="text-xs text-destructive">{permitErrors[`permitTypes.${i}.name`]}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 sm:contents">
                            <span className="text-xs text-muted-foreground sm:hidden">Type</span>
                            <Select
                              value={pt.type}
                              onValueChange={v => updatePermitType(i, { type: v as PermitTypeConfig['type'] })}
                            >
                              <SelectTrigger className="w-full min-w-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="annual">Annual</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1 sm:contents">
                            <span className="text-xs text-muted-foreground sm:hidden">Fee (KES)</span>
                            <div className="space-y-1">
                              <Input
                                type="number"
                                className={cn('w-full min-w-0', permitErrors[`permitTypes.${i}.feeCents`] && 'border-destructive')}
                                placeholder="0"
                                value={pt.feeCents != null ? pt.feeCents / 100 : ''}
                                onChange={e => updatePermitType(i, { feeCents: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100) } as Partial<PermitTypeConfig>)}
                              />
                              {permitErrors[`permitTypes.${i}.feeCents`] && (
                                <p className="text-xs text-destructive">{permitErrors[`permitTypes.${i}.feeCents`]}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 sm:contents">
                            <span className="text-xs text-muted-foreground sm:hidden">Validity (days)</span>
                            <div className="space-y-1">
                              <Input
                                type="number"
                                className={cn('w-full min-w-0', permitErrors[`permitTypes.${i}.validityDays`] && 'border-destructive')}
                                placeholder="0"
                                value={pt.validityDays ?? ''}
                                onChange={e => updatePermitType(i, { validityDays: e.target.value === '' ? undefined : Number(e.target.value) } as Partial<PermitTypeConfig>)}
                              />
                              {permitErrors[`permitTypes.${i}.validityDays`] && (
                                <p className="text-xs text-destructive">{permitErrors[`permitTypes.${i}.validityDays`]}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-end sm:contents">
                            <Button type="button" variant="ghost" size="sm" onClick={() => removePermitType(i)} className="min-h-[44px] sm:min-h-0 touch-manipulation">
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {permitConfig.permitTypes.length > 0 && <div className="hidden sm:block rounded-b-lg border border-t-0" />}
                    <Button type="button" variant="outline" size="sm" onClick={addPermitType} className="w-full sm:w-auto min-h-[44px] touch-manipulation">
                      Add permit type
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    <Label>Grace period (days)</Label>
                    <div className="space-y-1">
                      <Input
                        type="number"
                        className={cn('min-h-[44px]', permitErrors.gracePeriodDays && 'border-destructive')}
                        placeholder="0"
                        value={permitConfig.gracePeriodDays ?? ''}
                        onChange={e => setPermitConfig(prev => ({ ...prev, gracePeriodDays: e.target.value === '' ? undefined : Number(e.target.value) }))}
                      />
                      {permitErrors.gracePeriodDays && (
                        <p className="text-xs text-destructive">{permitErrors.gracePeriodDays}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 min-h-[44px]">
                    <Switch
                      checked={permitConfig.autoRenewEnabled}
                      onCheckedChange={v => setPermitConfig(prev => ({ ...prev, autoRenewEnabled: v }))}
                    />
                    <Label className="flex-1">Auto-renew permits (when enabled)</Label>
                  </div>
                  <div className="grid gap-2">
                    <Label>Validity rules note (optional)</Label>
                    <div className="space-y-1">
                      <Textarea
                        value={permitConfig.validityRulesNote ?? ''}
                        onChange={e => setPermitConfig(prev => ({ ...prev, validityRulesNote: e.target.value || undefined }))}
                        placeholder="e.g. Applied prospectively to new and renewed permits."
                        rows={2}
                        className={cn(
                          (isOverCharLimit(permitConfig.validityRulesNote ?? '') || permitErrors.validityRulesNote) && 'border-destructive'
                        )}
                      />
                      {permitErrors.validityRulesNote &&
                        permitErrors.validityRulesNote !== `Maximum ${TEXTAREA_MAX_CHARS} characters allowed.` && (
                          <p className="text-xs text-destructive">{permitErrors.validityRulesNote}</p>
                        )}
                    </div>
                  </div>
                  <Button
                    onClick={handleSavePermit}
                    disabled={updateMutation.isPending || isOverCharLimit(permitConfig.validityRulesNote ?? '')}
                    className="w-full sm:w-auto min-h-[44px] touch-manipulation"
                  >
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save permit config
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="penalty" className="space-y-4">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle>Penalty configuration</CardTitle>
                  <CardDescription>Penalty categories, amounts, auto-penalty rules, escalation logic, and waiver rules.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="grid gap-2">
                    <Label>Penalty categories & amounts</Label>
                    {penaltyConfig.categories.map((cat, i) => (
                      <div key={cat.id} className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-2 sm:items-start rounded-lg border p-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <Input
                            className={cn('w-full', penaltyErrors[`categories.${i}.name`] && 'border-destructive')}
                            placeholder="Category name"
                            value={cat.name}
                            onChange={e => updatePenaltyCategory(i, { name: e.target.value })}
                          />
                          {penaltyErrors[`categories.${i}.name`] && (
                            <p className="text-xs text-destructive">{penaltyErrors[`categories.${i}.name`]}</p>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <Label className="text-muted-foreground text-sm">Amount (KES):</Label>
                          <div className="space-y-1">
                            <Input
                              type="number"
                              className={cn('w-full sm:w-28 min-h-[44px] sm:min-h-0', penaltyErrors[`categories.${i}.amountCents`] && 'border-destructive')}
                              placeholder="0"
                              value={cat.amountCents != null ? cat.amountCents / 100 : ''}
                              onChange={e => updatePenaltyCategory(i, { amountCents: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100) } as Partial<PenaltyCategoryConfig>)}
                            />
                            {penaltyErrors[`categories.${i}.amountCents`] && (
                              <p className="text-xs text-destructive">{penaltyErrors[`categories.${i}.amountCents`]}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <Input
                            className={cn(
                              'w-full',
                              (isOverCharLimit(cat.description ?? '') || penaltyErrors[`categories.${i}.description`]) && 'border-destructive'
                            )}
                            placeholder="Description (optional)"
                            value={cat.description ?? ''}
                            onChange={e => updatePenaltyCategory(i, { description: e.target.value || undefined })}
                          />
                          {penaltyErrors[`categories.${i}.description`] &&
                            penaltyErrors[`categories.${i}.description`] !== `Maximum ${TEXTAREA_MAX_CHARS} characters allowed.` && (
                              <p className="text-xs text-destructive">{penaltyErrors[`categories.${i}.description`]}</p>
                            )}
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removePenaltyCategory(i)} className="min-h-[44px] sm:min-h-0 touch-manipulation w-full sm:w-auto">
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addPenaltyCategory}>
                      Add category
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={penaltyConfig.autoPenaltyEnabled}
                      onCheckedChange={v => setPenaltyConfig(prev => ({ ...prev, autoPenaltyEnabled: v }))}
                    />
                    <Label>Auto-penalty rules enabled</Label>
                  </div>
                  <div className="grid gap-2">
                    <Label>Auto-penalty rules note (optional)</Label>
                    <div className="space-y-1">
                      <Textarea
                        value={penaltyConfig.autoPenaltyRulesNote ?? ''}
                        onChange={e => setPenaltyConfig(prev => ({ ...prev, autoPenaltyRulesNote: e.target.value || undefined }))}
                        placeholder="When to apply penalties automatically."
                        rows={2}
                        className={cn(
                          (isOverCharLimit(penaltyConfig.autoPenaltyRulesNote ?? '') || penaltyErrors.autoPenaltyRulesNote) && 'border-destructive'
                        )}
                      />
                      {penaltyErrors.autoPenaltyRulesNote &&
                        penaltyErrors.autoPenaltyRulesNote !== `Maximum ${TEXTAREA_MAX_CHARS} characters allowed.` && (
                          <p className="text-xs text-destructive">{penaltyErrors.autoPenaltyRulesNote}</p>
                        )}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Escalation logic (repeat offenders)</Label>
                    {penaltyConfig.escalationLogic.map((rule, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-2 sm:items-start rounded-lg border p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <Label className="text-muted-foreground text-sm">After</Label>
                          <div className="space-y-1">
                            <Input
                              type="number"
                              className={cn('w-full sm:w-20 min-h-[44px] sm:min-h-0', penaltyErrors[`escalationLogic.${i}.repeatCount`] && 'border-destructive')}
                              value={rule.repeatCount}
                              onChange={e => updateEscalationRule(i, { repeatCount: Number(e.target.value) || 0 })}
                            />
                            {penaltyErrors[`escalationLogic.${i}.repeatCount`] && (
                              <p className="text-xs text-destructive">{penaltyErrors[`escalationLogic.${i}.repeatCount`]}</p>
                            )}
                          </div>
                        </div>
                        <Label className="text-muted-foreground text-sm">offenses, multiply by</Label>
                        <div className="space-y-1">
                          <Input
                            type="number"
                            step="0.5"
                            className={cn('w-full sm:w-20 min-h-[44px] sm:min-h-0', penaltyErrors[`escalationLogic.${i}.multiplier`] && 'border-destructive')}
                            placeholder="1"
                            value={rule.multiplier ?? ''}
                            onChange={e => updateEscalationRule(i, { multiplier: e.target.value === '' ? undefined : Number(e.target.value) })}
                          />
                          {penaltyErrors[`escalationLogic.${i}.multiplier`] && (
                            <p className="text-xs text-destructive">{penaltyErrors[`escalationLogic.${i}.multiplier`]}</p>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <Label className="text-muted-foreground text-sm">Max (KES, optional):</Label>
                          <Input
                            type="number"
                            className="w-full sm:w-28 min-h-[44px] sm:min-h-0"
                            value={rule.maxAmountCents != null ? rule.maxAmountCents / 100 : ''}
                            onChange={e =>
                              updateEscalationRule(i, {
                                maxAmountCents: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100),
                              })
                            }
                            placeholder="—"
                          />
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeEscalationRule(i)} className="min-h-[44px] sm:min-h-0 touch-manipulation w-full sm:w-auto sm:ml-auto">
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addEscalationRule}>
                      Add escalation rule
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    <Label>Waiver rules — roles that can waive</Label>
                    <Input
                      className="min-h-[44px]"
                      value={penaltyConfig.waiverRules.roles.join(', ')}
                      onChange={e =>
                        setPenaltyConfig(prev => ({
                          ...prev,
                          waiverRules: { ...prev.waiverRules, roles: e.target.value.split(',').map(r => r.trim()).filter(Boolean) },
                        }))
                      }
                      placeholder="county_super_admin, county_admin"
                    />
                    <Label className="text-muted-foreground text-xs">Max waiver amount (KES, optional)</Label>
                    <Input
                      type="number"
                      className="w-full sm:max-w-xs min-h-[44px] sm:min-h-0"
                      value={
                        penaltyConfig.waiverRules.maxWaiverAmountCents != null
                          ? penaltyConfig.waiverRules.maxWaiverAmountCents / 100
                          : ''
                      }
                      onChange={e =>
                        setPenaltyConfig(prev => ({
                          ...prev,
                          waiverRules: {
                            ...prev.waiverRules,
                            maxWaiverAmountCents: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100),
                          },
                        }))
                      }
                      placeholder="—"
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={penaltyConfig.waiverRules.requireApproval}
                        onCheckedChange={v =>
                          setPenaltyConfig(prev => ({
                            ...prev,
                            waiverRules: { ...prev.waiverRules, requireApproval: v },
                          }))
                        }
                      />
                      <Label>Require approval for waiver</Label>
                    </div>
                  </div>
                  <Button
                    onClick={handleSavePenalty}
                    disabled={
                      updateMutation.isPending ||
                      penaltyConfig.categories.some(c => isOverCharLimit(c.description ?? '')) ||
                      isOverCharLimit(penaltyConfig.autoPenaltyRulesNote ?? '')
                    }
                    className="w-full sm:w-auto min-h-[44px] touch-manipulation"
                  >
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save penalty config
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle>Compliance rules</CardTitle>
                  <CardDescription>What defines non-compliant, suspension/blacklist thresholds, and optional compliance scoring.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="grid gap-2">
                    <Label>What defines &quot;non-compliant&quot;</Label>
                    <div className="space-y-1">
                      <Textarea
                        value={complianceRules.nonCompliantDefinition}
                        onChange={e => setComplianceRules(prev => ({ ...prev, nonCompliantDefinition: e.target.value }))}
                        placeholder="e.g. Rider with expired permit, unpaid penalty, or suspended status."
                        rows={3}
                        className={cn(
                          (isOverCharLimit(complianceRules.nonCompliantDefinition) || complianceErrors.nonCompliantDefinition) && 'border-destructive'
                        )}
                      />
                      {complianceErrors.nonCompliantDefinition && (
                        <p className="text-xs text-destructive">{complianceErrors.nonCompliantDefinition}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Suspension threshold (number of penalties)</Label>
                      <div className="space-y-1">
                        <Input
                          type="number"
                          className={cn(complianceErrors.suspensionThresholdPenalties && 'border-destructive')}
                          value={complianceRules.suspensionThresholdPenalties}
                          onChange={e =>
                            setComplianceRules(prev => ({ ...prev, suspensionThresholdPenalties: Number(e.target.value) || 0 }))
                          }
                        />
                        {complianceErrors.suspensionThresholdPenalties && (
                          <p className="text-xs text-destructive">{complianceErrors.suspensionThresholdPenalties}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Blacklist threshold (number of penalties)</Label>
                      <div className="space-y-1">
                        <Input
                          type="number"
                          className={cn(complianceErrors.blacklistThresholdPenalties && 'border-destructive')}
                          value={complianceRules.blacklistThresholdPenalties}
                          onChange={e =>
                            setComplianceRules(prev => ({ ...prev, blacklistThresholdPenalties: Number(e.target.value) || 0 }))
                          }
                        />
                        {complianceErrors.blacklistThresholdPenalties && (
                          <p className="text-xs text-destructive">{complianceErrors.blacklistThresholdPenalties}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Suspension threshold — unpaid days (optional)</Label>
                      <Input
                        type="number"
                        value={complianceRules.suspensionThresholdUnpaidDays ?? ''}
                        onChange={e =>
                          setComplianceRules(prev => ({
                            ...prev,
                            suspensionThresholdUnpaidDays: e.target.value === '' ? undefined : Number(e.target.value),
                          }))
                        }
                        placeholder="e.g. 30"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Blacklist threshold — unpaid days (optional)</Label>
                      <Input
                        type="number"
                        value={complianceRules.blacklistThresholdUnpaidDays ?? ''}
                        onChange={e =>
                          setComplianceRules(prev => ({
                            ...prev,
                            blacklistThresholdUnpaidDays: e.target.value === '' ? undefined : Number(e.target.value),
                          }))
                        }
                        placeholder="e.g. 90"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={complianceRules.complianceScoringEnabled}
                      onCheckedChange={v => setComplianceRules(prev => ({ ...prev, complianceScoringEnabled: v }))}
                    />
                    <Label>Compliance scoring enabled (optional per county)</Label>
                  </div>
                  <div className="grid gap-2">
                    <Label>Compliance scoring logic (optional)</Label>
                    <div className="space-y-1">
                      <Textarea
                        value={complianceRules.complianceScoringLogic ?? ''}
                        onChange={e => setComplianceRules(prev => ({ ...prev, complianceScoringLogic: e.target.value || undefined }))}
                        placeholder="e.g. Score 0–100 based on permit validity, penalty history, and payments."
                        rows={3}
                        className={cn(
                          (isOverCharLimit(complianceRules.complianceScoringLogic ?? '') || complianceErrors.complianceScoringLogic) && 'border-destructive'
                        )}
                      />
                      {complianceErrors.complianceScoringLogic &&
                        complianceErrors.complianceScoringLogic !== `Maximum ${TEXTAREA_MAX_CHARS} characters allowed.` && (
                          <p className="text-xs text-destructive">{complianceErrors.complianceScoringLogic}</p>
                        )}
                    </div>
                  </div>
                  <Button
                    onClick={handleSaveCompliance}
                    disabled={
                      updateMutation.isPending ||
                      isOverCharLimit(complianceRules.nonCompliantDefinition) ||
                      isOverCharLimit(complianceRules.complianceScoringLogic ?? '')
                    }
                    className="w-full sm:w-auto min-h-[44px] touch-manipulation"
                  >
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save compliance rules
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle>Version history</CardTitle>
                  <CardDescription>Recent changes to this county&apos;s configuration. All edits are logged and applied prospectively.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  {history.length === 0 ? (
                    <p className="text-muted-foreground">No configuration changes recorded yet.</p>
                  ) : (
                    <>
                      <ul className="space-y-3">
                        {paginatedHistory.map(log => {
                          const isExpanded = expandedHistoryId === log.id;
                          return (
                            <li key={log.id} className="rounded-lg border text-sm">
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedHistoryId(prev => (prev === log.id ? null : log.id));
                                }}
                                className="flex w-full flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 text-left hover:bg-muted/50 transition-colors rounded-lg min-h-[44px] touch-manipulation"
                              >
                                <span className="text-muted-foreground text-sm order-2 sm:order-1">{new Date(log.created_at).toLocaleString()}</span>
                                <span className="font-medium text-foreground order-1 sm:order-2 flex items-center justify-between sm:justify-start gap-2">
                                  {log.action}
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  )}
                                </span>
                              </button>
                              {isExpanded && (
                                <div className="border-t px-3 pb-3 pt-2">
                                  <div className="max-h-[280px] overflow-y-auto overflow-x-auto rounded bg-muted -mx-1 px-1 sm:mx-0 sm:px-0">
                                    <pre className="min-w-min p-2 text-xs break-all sm:break-normal">
                                      {JSON.stringify(log.new_values, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 border-t pt-4">
                        <p className="text-sm text-muted-foreground order-2 sm:order-1">
                          Showing {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(historyPage * HISTORY_PAGE_SIZE, history.length)} of {history.length}
                        </p>
                        <div className="flex items-center justify-between sm:justify-end gap-2 order-1 sm:order-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={historyPage <= 1}
                            onClick={() => {
                              setHistoryPage(p => p - 1);
                              setExpandedHistoryId(null);
                            }}
                            className="min-h-[44px] flex-1 sm:flex-initial touch-manipulation"
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground px-2 shrink-0">
                            Page {historyPage} of {historyTotalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={historyPage >= historyTotalPages}
                            onClick={() => {
                              setHistoryPage(p => p + 1);
                              setExpandedHistoryId(null);
                            }}
                            className="min-h-[44px] flex-1 sm:flex-initial touch-manipulation"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </SuperAdminLayout>
  );
}
