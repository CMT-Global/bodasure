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

  useEffect(() => {
    setPermitConfig(config.permitConfig);
    setPenaltyConfig(config.penaltyConfig);
    setComplianceRules(config.complianceRules);
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
    updateMutation.mutate(
      { countyId: selectedCountyId, config: { permitConfig: permitConfig }, section: 'permitConfig' },
      { onError: () => {} }
    );
  };
  const handleSavePenalty = () => {
    if (!selectedCountyId) return;
    updateMutation.mutate(
      { countyId: selectedCountyId, config: { penaltyConfig: penaltyConfig }, section: 'penaltyConfig' },
      { onError: () => {} }
    );
  };
  const handleSaveCompliance = () => {
    if (!selectedCountyId) return;
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">County-Specific Configuration</h1>
          <p className="text-muted-foreground">
            Each county has independent permit, penalty, and compliance settings. Editable anytime; changes apply prospectively and are logged with version history.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select county</CardTitle>
            <CardDescription>Configure permit types, fees, penalties, and compliance rules for the selected county.</CardDescription>
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
          <p className="text-muted-foreground">Select a county to edit its configuration.</p>
        ) : (
          <Tabs defaultValue="permit" className="space-y-4">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="permit" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" /> Permit
              </TabsTrigger>
              <TabsTrigger value="penalty" className="flex items-center gap-2">
                <Scale className="h-4 w-4" /> Penalty
              </TabsTrigger>
              <TabsTrigger value="compliance" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Compliance
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" /> History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="permit" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Permit configuration</CardTitle>
                  <CardDescription>Permit types, fees, validity rules, grace periods, and auto-renew.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Permit types & fees</Label>
                    {/* Table header */}
                    {permitConfig.permitTypes.length > 0 && (
                      <div className="grid gap-3 px-3 py-2.5 text-xs font-medium text-muted-foreground border rounded-t-lg bg-muted/50 grid-cols-[2fr_1fr_1fr_1fr_auto]">
                        <span>Name</span>
                        <span>Type</span>
                        <span>Fee (KES)</span>
                        <span>Validity (days)</span>
                        <span className="text-right">Actions</span>
                      </div>
                    )}
                    {permitConfig.permitTypes.map((pt, i) => (
                      <div
                        key={pt.id}
                        className="grid gap-3 items-center rounded-lg border p-3 grid-cols-[2fr_1fr_1fr_1fr_auto] last:rounded-b-lg"
                      >
                        <Input
                          className="w-full min-w-0"
                          placeholder="e.g. Weekly, Monthly"
                          value={pt.name}
                          onChange={e => updatePermitType(i, { name: e.target.value })}
                        />
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
                        <Input
                          type="number"
                          className="w-full min-w-0"
                          placeholder="0"
                          value={pt.feeCents / 100}
                          onChange={e => updatePermitType(i, { feeCents: Math.round(Number(e.target.value) * 100) })}
                        />
                        <Input
                          type="number"
                          className="w-full min-w-0"
                          placeholder="0"
                          value={pt.validityDays}
                          onChange={e => updatePermitType(i, { validityDays: Number(e.target.value) || 0 })}
                        />
                        <div className="flex justify-end">
                          <Button type="button" variant="ghost" size="sm" onClick={() => removePermitType(i)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addPermitType}>
                      Add permit type
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    <Label>Grace period (days)</Label>
                    <Input
                      type="number"
                      value={permitConfig.gracePeriodDays}
                      onChange={e => setPermitConfig(prev => ({ ...prev, gracePeriodDays: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={permitConfig.autoRenewEnabled}
                      onCheckedChange={v => setPermitConfig(prev => ({ ...prev, autoRenewEnabled: v }))}
                    />
                    <Label>Auto-renew permits (when enabled)</Label>
                  </div>
                  <div className="grid gap-2">
                    <Label>Validity rules note (optional)</Label>
                    <Textarea
                      value={permitConfig.validityRulesNote ?? ''}
                      onChange={e => setPermitConfig(prev => ({ ...prev, validityRulesNote: e.target.value || undefined }))}
                      placeholder="e.g. Applied prospectively to new and renewed permits."
                      rows={2}
                    />
                  </div>
                  <Button onClick={handleSavePermit} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save permit config
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="penalty" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Penalty configuration</CardTitle>
                  <CardDescription>Penalty categories, amounts, auto-penalty rules, escalation logic, and waiver rules.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-2">
                    <Label>Penalty categories & amounts</Label>
                    {penaltyConfig.categories.map((cat, i) => (
                      <div key={cat.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                        <Input
                          className="flex-1 min-w-[200px]"
                          placeholder="Category name"
                          value={cat.name}
                          onChange={e => updatePenaltyCategory(i, { name: e.target.value })}
                        />
                        <Label className="text-muted-foreground shrink-0">Amount (KES):</Label>
                        <Input
                          type="number"
                          className="w-28"
                          value={cat.amountCents / 100}
                          onChange={e => updatePenaltyCategory(i, { amountCents: Math.round(Number(e.target.value) * 100) })}
                        />
                        <Input
                          className="flex-1 min-w-[120px]"
                          placeholder="Description (optional)"
                          value={cat.description ?? ''}
                          onChange={e => updatePenaltyCategory(i, { description: e.target.value || undefined })}
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removePenaltyCategory(i)}>
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
                    <Textarea
                      value={penaltyConfig.autoPenaltyRulesNote ?? ''}
                      onChange={e => setPenaltyConfig(prev => ({ ...prev, autoPenaltyRulesNote: e.target.value || undefined }))}
                      placeholder="When to apply penalties automatically."
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Escalation logic (repeat offenders)</Label>
                    {penaltyConfig.escalationLogic.map((rule, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                        <Label className="text-muted-foreground shrink-0">After</Label>
                        <Input
                          type="number"
                          className="w-20"
                          value={rule.repeatCount}
                          onChange={e => updateEscalationRule(i, { repeatCount: Number(e.target.value) || 0 })}
                        />
                        <Label className="text-muted-foreground shrink-0">offenses, multiply by</Label>
                        <Input
                          type="number"
                          step="0.5"
                          className="w-20"
                          value={rule.multiplier}
                          onChange={e => updateEscalationRule(i, { multiplier: Number(e.target.value) || 1 })}
                        />
                        <Label className="text-muted-foreground shrink-0">Max (KES, optional):</Label>
                        <Input
                          type="number"
                          className="w-28"
                          value={rule.maxAmountCents != null ? rule.maxAmountCents / 100 : ''}
                          onChange={e =>
                            updateEscalationRule(i, {
                              maxAmountCents: e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100),
                            })
                          }
                          placeholder="—"
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeEscalationRule(i)}>
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
                      className="max-w-xs"
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
                  <Button onClick={handleSavePenalty} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save penalty config
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance rules</CardTitle>
                  <CardDescription>What defines non-compliant, suspension/blacklist thresholds, and optional compliance scoring.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-2">
                    <Label>What defines &quot;non-compliant&quot;</Label>
                    <Textarea
                      value={complianceRules.nonCompliantDefinition}
                      onChange={e => setComplianceRules(prev => ({ ...prev, nonCompliantDefinition: e.target.value }))}
                      placeholder="e.g. Rider with expired permit, unpaid penalty, or suspended status."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Suspension threshold (number of penalties)</Label>
                      <Input
                        type="number"
                        value={complianceRules.suspensionThresholdPenalties}
                        onChange={e =>
                          setComplianceRules(prev => ({ ...prev, suspensionThresholdPenalties: Number(e.target.value) || 0 }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Blacklist threshold (number of penalties)</Label>
                      <Input
                        type="number"
                        value={complianceRules.blacklistThresholdPenalties}
                        onChange={e =>
                          setComplianceRules(prev => ({ ...prev, blacklistThresholdPenalties: Number(e.target.value) || 0 }))
                        }
                      />
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
                    <Textarea
                      value={complianceRules.complianceScoringLogic ?? ''}
                      onChange={e => setComplianceRules(prev => ({ ...prev, complianceScoringLogic: e.target.value || undefined }))}
                      placeholder="e.g. Score 0–100 based on permit validity, penalty history, and payments."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleSaveCompliance} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save compliance rules
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Version history</CardTitle>
                  <CardDescription>Recent changes to this county&apos;s configuration. All edits are logged and applied prospectively.</CardDescription>
                </CardHeader>
                <CardContent>
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
                                className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
                              >
                                <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                                <span className="font-medium text-foreground">{log.action}</span>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                )}
                              </button>
                              {isExpanded && (
                                <div className="border-t px-3 pb-3 pt-2">
                                  <div className="max-h-[280px] overflow-y-auto overflow-x-auto rounded bg-muted">
                                    <pre className="min-w-min p-2 text-xs">
                                      {JSON.stringify(log.new_values, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                        <p className="text-sm text-muted-foreground">
                          Showing {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(historyPage * HISTORY_PAGE_SIZE, history.length)} of {history.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={historyPage <= 1}
                            onClick={() => {
                              setHistoryPage(p => p - 1);
                              setExpandedHistoryId(null);
                            }}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
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
