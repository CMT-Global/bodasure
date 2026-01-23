import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useCountySettings, useUpdateCountySettings, PermitSettings, PenaltySettings, PenaltyType, EscalationRule, RevenueSharingSettings, RevenueShareRule, RevenueShareType } from '@/hooks/useCountySettings';
import { usePermitTypes } from '@/hooks/usePayments';
import { useSaccos } from '@/hooks/useData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Plus, Trash2, AlertCircle, Shield, FileText, DollarSign, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const { profile, roles, hasRole } = useAuth();
  
  // Get county_id from profile or first role
  const countyId = useMemo(() => {
    return profile?.county_id || roles.find(r => r.county_id)?.county_id || undefined;
  }, [profile, roles]);

  // Check if user is County Super Admin
  // const isCountySuperAdmin = hasRole('county_super_admin') || hasRole('county_admin');
  const isCountySuperAdmin = true; // Temporarily allow all users to access settings

  const { data: settings, isLoading: settingsLoading } = useCountySettings(countyId);
  const { data: permitTypes = [], isLoading: permitTypesLoading } = usePermitTypes(countyId || '');
  const { data: saccos = [] } = useSaccos(countyId);
  const updateSettings = useUpdateCountySettings();
  const queryClient = useQueryClient();

  // Permit Settings State
  const [permitSettings, setPermitSettings] = useState<PermitSettings>({
    gracePeriodDays: 7,
    defaultFrequency: 'monthly',
  });

  // Penalty Settings State
  const [penaltySettings, setPenaltySettings] = useState<PenaltySettings>({
    autoPenaltyEnabled: true,
    penaltyTypes: [],
    escalationRules: [],
  });

  // Revenue Sharing Settings State
  const [revenueSharingSettings, setRevenueSharingSettings] = useState<RevenueSharingSettings>({
    rules: [],
  });

  // Dialog states
  const [isPermitTypeDialogOpen, setIsPermitTypeDialogOpen] = useState(false);
  const [isPenaltyTypeDialogOpen, setIsPenaltyTypeDialogOpen] = useState(false);
  const [isEscalationDialogOpen, setIsEscalationDialogOpen] = useState(false);
  const [isRevenueShareDialogOpen, setIsRevenueShareDialogOpen] = useState(false);
  const [isDeletePermitTypeOpen, setIsDeletePermitTypeOpen] = useState(false);
  const [selectedPermitType, setSelectedPermitType] = useState<any>(null);
  const [selectedPenaltyType, setSelectedPenaltyType] = useState<PenaltyType | null>(null);
  const [selectedEscalationIndex, setSelectedEscalationIndex] = useState<number | null>(null);
  const [selectedRevenueShareRule, setSelectedRevenueShareRule] = useState<RevenueShareRule | null>(null);

  // Form states
  const [permitTypeForm, setPermitTypeForm] = useState({
    name: '',
    description: '',
    amount: '',
    duration_days: '',
  });

  const [penaltyTypeForm, setPenaltyTypeForm] = useState({
    name: '',
    description: '',
    amount: '',
  });

  const [escalationForm, setEscalationForm] = useState({
    offenseCount: '',
    multiplier: '',
    description: '',
  });

  const [revenueShareForm, setRevenueShareForm] = useState({
    saccoId: '',
    shareType: 'none' as RevenueShareType,
    percentage: '',
    fixedAmount: '',
    period: 'weekly' as 'weekly' | 'monthly' | 'annual',
    activePermitsOnly: false,
    complianceThreshold: '',
    isActive: true,
  });

  // Load settings when available
  useEffect(() => {
    if (settings) {
      setPermitSettings(settings.permitSettings);
      setPenaltySettings(settings.penaltySettings);
      setRevenueSharingSettings(settings.revenueSharingSettings || { rules: [] });
    }
  }, [settings]);

  // Save Permit Settings
  const handleSavePermitSettings = async () => {
    if (!countyId) return;
    
    await updateSettings.mutateAsync({
      countyId,
      settings: { permitSettings: permitSettings },
    });
  };

  // Save Penalty Settings
  const handleSavePenaltySettings = async () => {
    if (!countyId) return;
    
    await updateSettings.mutateAsync({
      countyId,
      settings: { penaltySettings: penaltySettings },
    });
  };

  // Save Revenue Sharing Settings
  const handleSaveRevenueSharingSettings = async () => {
    if (!countyId) return;
    
    await updateSettings.mutateAsync({
      countyId,
      settings: { revenueSharingSettings: revenueSharingSettings },
    });
  };

  // Create/Update Permit Type
  const createPermitTypeMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; amount: number; duration_days: number }) => {
      if (!countyId) throw new Error('County ID required');
      
      if (selectedPermitType) {
        const { error } = await supabase
          .from('permit_types')
          .update(data)
          .eq('id', selectedPermitType.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('permit_types')
          .insert([{ ...data, county_id: countyId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permit_types', countyId] });
      toast.success(selectedPermitType ? 'Permit type updated' : 'Permit type created');
      setIsPermitTypeDialogOpen(false);
      setPermitTypeForm({ name: '', description: '', amount: '', duration_days: '' });
      setSelectedPermitType(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save permit type');
    },
  });

  // Delete Permit Type
  const deletePermitTypeMutation = useMutation({
    mutationFn: async (permitTypeId: string) => {
      const { error } = await supabase
        .from('permit_types')
        .update({ is_active: false })
        .eq('id', permitTypeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permit_types', countyId] });
      toast.success('Permit type deactivated');
      setIsDeletePermitTypeOpen(false);
      setSelectedPermitType(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete permit type');
    },
  });

  // Add/Update Penalty Type
  const handleSavePenaltyType = () => {
    if (!penaltyTypeForm.name || !penaltyTypeForm.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newPenaltyType: PenaltyType = {
      id: selectedPenaltyType?.id || Date.now().toString(),
      name: penaltyTypeForm.name,
      description: penaltyTypeForm.description,
      amount: parseFloat(penaltyTypeForm.amount),
      isActive: selectedPenaltyType?.isActive ?? true,
    };

    const updatedTypes = selectedPenaltyType
      ? penaltySettings.penaltyTypes.map(t => t.id === selectedPenaltyType.id ? newPenaltyType : t)
      : [...penaltySettings.penaltyTypes, newPenaltyType];

    setPenaltySettings({ ...penaltySettings, penaltyTypes: updatedTypes });
    setIsPenaltyTypeDialogOpen(false);
    setPenaltyTypeForm({ name: '', description: '', amount: '' });
    setSelectedPenaltyType(null);
  };

  // Delete Penalty Type
  const handleDeletePenaltyType = (id: string) => {
    setPenaltySettings({
      ...penaltySettings,
      penaltyTypes: penaltySettings.penaltyTypes.filter(t => t.id !== id),
    });
  };

  // Add/Update Escalation Rule
  const handleSaveEscalationRule = () => {
    if (!escalationForm.offenseCount || !escalationForm.multiplier) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newRule: EscalationRule = {
      offenseCount: parseInt(escalationForm.offenseCount),
      multiplier: parseFloat(escalationForm.multiplier),
      description: escalationForm.description,
    };

    const updatedRules = selectedEscalationIndex !== null
      ? penaltySettings.escalationRules.map((r, i) => i === selectedEscalationIndex ? newRule : r)
      : [...penaltySettings.escalationRules, newRule].sort((a, b) => a.offenseCount - b.offenseCount);

    setPenaltySettings({ ...penaltySettings, escalationRules: updatedRules });
    setIsEscalationDialogOpen(false);
    setEscalationForm({ offenseCount: '', multiplier: '', description: '' });
    setSelectedEscalationIndex(null);
  };

  // Delete Escalation Rule
  const handleDeleteEscalationRule = (index: number) => {
    setPenaltySettings({
      ...penaltySettings,
      escalationRules: penaltySettings.escalationRules.filter((_, i) => i !== index),
    });
  };

  // Open edit dialogs
  const openEditPermitType = (permitType: any) => {
    setSelectedPermitType(permitType);
    setPermitTypeForm({
      name: permitType.name,
      description: permitType.description || '',
      amount: permitType.amount.toString(),
      duration_days: permitType.duration_days.toString(),
    });
    setIsPermitTypeDialogOpen(true);
  };

  const openEditPenaltyType = (penaltyType: PenaltyType) => {
    setSelectedPenaltyType(penaltyType);
    setPenaltyTypeForm({
      name: penaltyType.name,
      description: penaltyType.description,
      amount: penaltyType.amount.toString(),
    });
    setIsPenaltyTypeDialogOpen(true);
  };

  const openEditEscalation = (rule: EscalationRule, index: number) => {
    setSelectedEscalationIndex(index);
    setEscalationForm({
      offenseCount: rule.offenseCount.toString(),
      multiplier: rule.multiplier.toString(),
      description: rule.description,
    });
    setIsEscalationDialogOpen(true);
  };

  // Add/Update Revenue Share Rule
  const handleSaveRevenueShareRule = () => {
    if (!revenueShareForm.saccoId || revenueShareForm.shareType === 'none') {
      toast.error('Please select a Sacco and revenue share type');
      return;
    }

    if (revenueShareForm.shareType === 'percentage' && !revenueShareForm.percentage) {
      toast.error('Please enter percentage amount');
      return;
    }

    if (revenueShareForm.shareType === 'fixed_per_rider' && !revenueShareForm.fixedAmount) {
      toast.error('Please enter fixed amount per rider');
      return;
    }

    const selectedSacco = saccos.find(s => s.id === revenueShareForm.saccoId);
    if (!selectedSacco) {
      toast.error('Selected Sacco not found');
      return;
    }

    const newRule: RevenueShareRule = {
      saccoId: revenueShareForm.saccoId,
      saccoName: selectedSacco.name,
      shareType: revenueShareForm.shareType,
      percentage: revenueShareForm.shareType === 'percentage' ? parseFloat(revenueShareForm.percentage) : undefined,
      fixedAmount: revenueShareForm.shareType === 'fixed_per_rider' ? parseFloat(revenueShareForm.fixedAmount) : undefined,
      period: revenueShareForm.shareType === 'fixed_per_rider' ? revenueShareForm.period : undefined,
      activePermitsOnly: revenueShareForm.activePermitsOnly,
      complianceThreshold: revenueShareForm.complianceThreshold ? parseFloat(revenueShareForm.complianceThreshold) : undefined,
      isActive: revenueShareForm.isActive,
    };

    const updatedRules = selectedRevenueShareRule
      ? revenueSharingSettings.rules.map(r => r.saccoId === selectedRevenueShareRule.saccoId ? newRule : r)
      : [...revenueSharingSettings.rules.filter(r => r.saccoId !== revenueShareForm.saccoId), newRule];

    setRevenueSharingSettings({ ...revenueSharingSettings, rules: updatedRules });
    setIsRevenueShareDialogOpen(false);
    setRevenueShareForm({
      saccoId: '',
      shareType: 'none',
      percentage: '',
      fixedAmount: '',
      period: 'weekly',
      activePermitsOnly: false,
      complianceThreshold: '',
      isActive: true,
    });
    setSelectedRevenueShareRule(null);
  };

  // Delete Revenue Share Rule
  const handleDeleteRevenueShareRule = (saccoId: string) => {
    setRevenueSharingSettings({
      ...revenueSharingSettings,
      rules: revenueSharingSettings.rules.filter(r => r.saccoId !== saccoId),
    });
  };

  // Open edit revenue share dialog
  const openEditRevenueShare = (rule: RevenueShareRule) => {
    setSelectedRevenueShareRule(rule);
    setRevenueShareForm({
      saccoId: rule.saccoId,
      shareType: rule.shareType,
      percentage: rule.percentage?.toString() || '',
      fixedAmount: rule.fixedAmount?.toString() || '',
      period: rule.period || 'weekly',
      activePermitsOnly: rule.activePermitsOnly,
      complianceThreshold: rule.complianceThreshold?.toString() || '',
      isActive: rule.isActive,
    });
    setIsRevenueShareDialogOpen(true);
  };

  // Temporarily commented out - access control will be re-enabled later
  // if (!isCountySuperAdmin) {
  //   return (
  //     <DashboardLayout>
  //       <div className="space-y-6">
  //         <div>
  //           <h1 className="text-2xl font-bold">Settings</h1>
  //           <p className="text-muted-foreground">Manage your account and county settings</p>
  //         </div>
  //         <Card>
  //           <CardContent className="pt-6">
  //             <div className="flex items-center gap-3 text-amber-600">
  //               <AlertCircle className="h-5 w-5" />
  //               <p>You need County Super Admin or County Admin privileges to access settings.</p>
  //             </div>
  //           </CardContent>
  //         </Card>
  //       </div>
  //     </DashboardLayout>
  //   );
  // }

  if (settingsLoading || permitTypesLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">County Settings & Configuration</h1>
          <p className="text-muted-foreground">Configure permit and penalty settings for your county</p>
        </div>

        <Tabs defaultValue="permits" className="space-y-6">
          <TabsList>
            <TabsTrigger value="permits">
              <Shield className="mr-2 h-4 w-4" />
              Permit Settings
            </TabsTrigger>
            <TabsTrigger value="penalties">
              <FileText className="mr-2 h-4 w-4" />
              Penalty Settings
            </TabsTrigger>
            <TabsTrigger value="revenue-sharing">
              <DollarSign className="mr-2 h-4 w-4" />
              Revenue Sharing
            </TabsTrigger>
          </TabsList>

          {/* Permit Settings Tab */}
          <TabsContent value="permits" className="space-y-6">
            {/* Permit Fee Amounts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Permit Fee Amounts</CardTitle>
                    <CardDescription>Manage permit types and their fee amounts</CardDescription>
                  </div>
                  <Button onClick={() => { setSelectedPermitType(null); setPermitTypeForm({ name: '', description: '', amount: '', duration_days: '' }); setIsPermitTypeDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Permit Type
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {permitTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No permit types configured. Add one to get started.</p>
                  ) : (
                    <div className="space-y-2">
                      {permitTypes.map((pt) => (
                        <div key={pt.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{pt.name}</h4>
                              {!pt.is_active && <Badge variant="secondary">Inactive</Badge>}
                            </div>
                            {pt.description && <p className="text-sm text-muted-foreground mt-1">{pt.description}</p>}
                            <div className="flex gap-4 mt-2 text-sm">
                              <span className="text-muted-foreground">Amount: <span className="font-medium text-foreground">KES {pt.amount.toLocaleString()}</span></span>
                              <span className="text-muted-foreground">Duration: <span className="font-medium text-foreground">{pt.duration_days} days</span></span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditPermitType(pt)}>Edit</Button>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedPermitType(pt); setIsDeletePermitTypeOpen(true); }}>Delete</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Permit Frequency & Grace Period */}
            <Card>
              <CardHeader>
                <CardTitle>Permit Frequency & Grace Period</CardTitle>
                <CardDescription>Configure default permit frequency and grace periods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Default Permit Frequency</Label>
                  <Select
                    value={permitSettings.defaultFrequency}
                    onValueChange={(value: 'weekly' | 'monthly' | 'annual') =>
                      setPermitSettings({ ...permitSettings, defaultFrequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Default frequency for new permit types</p>
                </div>

                <div className="space-y-2">
                  <Label>Grace Period (Days)</Label>
                  <Input
                    type="number"
                    value={permitSettings.gracePeriodDays}
                    onChange={(e) =>
                      setPermitSettings({ ...permitSettings, gracePeriodDays: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">Number of days after permit expiry before penalties apply</p>
                </div>

                <Button onClick={handleSavePermitSettings} disabled={updateSettings.isPending}>
                  {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Permit Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Penalty Settings Tab */}
          <TabsContent value="penalties" className="space-y-6">
            {/* Auto-Penalty Toggle */}
            <Card>
              <CardHeader>
                <CardTitle>Auto-Penalty Configuration</CardTitle>
                <CardDescription>Enable or disable automatic penalty generation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Auto-Penalty</Label>
                    <p className="text-sm text-muted-foreground">Automatically generate penalties for expired permits and violations</p>
                  </div>
                  <Switch
                    checked={penaltySettings.autoPenaltyEnabled}
                    onCheckedChange={(checked) =>
                      setPenaltySettings({ ...penaltySettings, autoPenaltyEnabled: checked })
                    }
                  />
                </div>
                <Button onClick={handleSavePenaltySettings} className="mt-4" disabled={updateSettings.isPending}>
                  {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Auto-Penalty Setting
                </Button>
              </CardContent>
            </Card>

            {/* Penalty Types */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Penalty Types & Amounts</CardTitle>
                    <CardDescription>Configure penalty types and their amounts</CardDescription>
                  </div>
                  <Button onClick={() => { setSelectedPenaltyType(null); setPenaltyTypeForm({ name: '', description: '', amount: '' }); setIsPenaltyTypeDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Penalty Type
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {penaltySettings.penaltyTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No penalty types configured. Add one to get started.</p>
                  ) : (
                    penaltySettings.penaltyTypes.map((pt) => (
                      <div key={pt.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{pt.name}</h4>
                            {!pt.isActive && <Badge variant="secondary">Inactive</Badge>}
                          </div>
                          {pt.description && <p className="text-sm text-muted-foreground mt-1">{pt.description}</p>}
                          <p className="text-sm mt-2">
                            <span className="text-muted-foreground">Amount: </span>
                            <span className="font-medium">KES {pt.amount.toLocaleString()}</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditPenaltyType(pt)}>Edit</Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeletePenaltyType(pt.id)}>Delete</Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Escalation Rules */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Escalation Rules for Repeat Offenders</CardTitle>
                    <CardDescription>Configure penalty multipliers for repeat offenses</CardDescription>
                  </div>
                  <Button onClick={() => { setSelectedEscalationIndex(null); setEscalationForm({ offenseCount: '', multiplier: '', description: '' }); setIsEscalationDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Escalation Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {penaltySettings.escalationRules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No escalation rules configured. Add one to get started.</p>
                  ) : (
                    penaltySettings.escalationRules.map((rule, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{rule.offenseCount} Offense(s) - {rule.multiplier}x Penalty</h4>
                          {rule.description && <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditEscalation(rule, index)}>Edit</Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteEscalationRule(index)}>Delete</Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSavePenaltySettings} disabled={updateSettings.isPending} className="w-full">
              {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save All Penalty Settings
            </Button>
          </TabsContent>

          {/* Revenue Sharing Tab */}
          <TabsContent value="revenue-sharing" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Revenue Sharing Configuration</CardTitle>
                    <CardDescription>Configure revenue sharing rules for each Sacco. Changes apply going forward (not retroactive).</CardDescription>
                  </div>
                  <Button onClick={() => { 
                    setSelectedRevenueShareRule(null); 
                    setRevenueShareForm({
                      saccoId: '',
                      shareType: 'none',
                      percentage: '',
                      fixedAmount: '',
                      period: 'weekly',
                      activePermitsOnly: false,
                      complianceThreshold: '',
                      isActive: true,
                    }); 
                    setIsRevenueShareDialogOpen(true); 
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Revenue Share Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueSharingSettings.rules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No revenue sharing rules configured. Add one to get started.</p>
                  ) : (
                    <div className="space-y-3">
                      {revenueSharingSettings.rules.map((rule) => {
                        const sacco = saccos.find(s => s.id === rule.saccoId);
                        return (
                          <div key={rule.saccoId} className="p-4 border rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{rule.saccoName || sacco?.name || 'Unknown Sacco'}</h4>
                                  {!rule.isActive && <Badge variant="secondary">Inactive</Badge>}
                                  {rule.shareType === 'none' && <Badge variant="outline">No Revenue Share</Badge>}
                                </div>
                                <div className="mt-2 space-y-1 text-sm">
                                  {rule.shareType === 'percentage' && (
                                    <p className="text-muted-foreground">
                                      <span className="font-medium text-foreground">Percentage-based:</span> {rule.percentage}% of permit fees
                                    </p>
                                  )}
                                  {rule.shareType === 'fixed_per_rider' && (
                                    <p className="text-muted-foreground">
                                      <span className="font-medium text-foreground">Fixed amount:</span> KES {rule.fixedAmount?.toLocaleString()} per registered rider per {rule.period}
                                    </p>
                                  )}
                                  {rule.shareType === 'none' && (
                                    <p className="text-muted-foreground">No revenue sharing configured</p>
                                  )}
                                  <div className="flex gap-4 mt-2">
                                    {rule.activePermitsOnly && (
                                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                        Active Permits Only
                                      </span>
                                    )}
                                    {rule.complianceThreshold && (
                                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                                        Min {rule.complianceThreshold}% Compliance
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditRevenueShare(rule)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDeleteRevenueShareRule(rule.saccoId)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSaveRevenueSharingSettings} disabled={updateSettings.isPending} className="w-full">
              {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Revenue Sharing Settings
            </Button>
          </TabsContent>
        </Tabs>

        {/* Permit Type Dialog */}
        <Dialog open={isPermitTypeDialogOpen} onOpenChange={setIsPermitTypeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedPermitType ? 'Edit Permit Type' : 'Add Permit Type'}</DialogTitle>
              <DialogDescription>Configure permit type details and pricing</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={permitTypeForm.name}
                  onChange={(e) => setPermitTypeForm({ ...permitTypeForm, name: e.target.value })}
                  placeholder="e.g., Monthly Permit"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={permitTypeForm.description}
                  onChange={(e) => setPermitTypeForm({ ...permitTypeForm, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (KES) *</Label>
                <Input
                  type="number"
                  value={permitTypeForm.amount}
                  onChange={(e) => setPermitTypeForm({ ...permitTypeForm, amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (Days) *</Label>
                <Input
                  type="number"
                  value={permitTypeForm.duration_days}
                  onChange={(e) => setPermitTypeForm({ ...permitTypeForm, duration_days: e.target.value })}
                  placeholder="30"
                  min="1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPermitTypeDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => createPermitTypeMutation.mutate({
                name: permitTypeForm.name,
                description: permitTypeForm.description,
                amount: parseFloat(permitTypeForm.amount),
                duration_days: parseInt(permitTypeForm.duration_days),
              })} disabled={!permitTypeForm.name || !permitTypeForm.amount || !permitTypeForm.duration_days || createPermitTypeMutation.isPending}>
                {createPermitTypeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedPermitType ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Penalty Type Dialog */}
        <Dialog open={isPenaltyTypeDialogOpen} onOpenChange={setIsPenaltyTypeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedPenaltyType ? 'Edit Penalty Type' : 'Add Penalty Type'}</DialogTitle>
              <DialogDescription>Configure penalty type details and amount</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={penaltyTypeForm.name}
                  onChange={(e) => setPenaltyTypeForm({ ...penaltyTypeForm, name: e.target.value })}
                  placeholder="e.g., Expired Permit"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={penaltyTypeForm.description}
                  onChange={(e) => setPenaltyTypeForm({ ...penaltyTypeForm, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (KES) *</Label>
                <Input
                  type="number"
                  value={penaltyTypeForm.amount}
                  onChange={(e) => setPenaltyTypeForm({ ...penaltyTypeForm, amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPenaltyTypeDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePenaltyType}>
                {selectedPenaltyType ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Escalation Rule Dialog */}
        <Dialog open={isEscalationDialogOpen} onOpenChange={setIsEscalationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEscalationIndex !== null ? 'Edit Escalation Rule' : 'Add Escalation Rule'}</DialogTitle>
              <DialogDescription>Configure penalty multiplier for repeat offenses</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Offense Count *</Label>
                <Input
                  type="number"
                  value={escalationForm.offenseCount}
                  onChange={(e) => setEscalationForm({ ...escalationForm, offenseCount: e.target.value })}
                  placeholder="2"
                  min="2"
                />
                <p className="text-xs text-muted-foreground">Number of offenses before this rule applies</p>
              </div>
              <div className="space-y-2">
                <Label>Multiplier *</Label>
                <Input
                  type="number"
                  value={escalationForm.multiplier}
                  onChange={(e) => setEscalationForm({ ...escalationForm, multiplier: e.target.value })}
                  placeholder="1.5"
                  min="1"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground">Penalty multiplier (e.g., 1.5 = 150% of base penalty)</p>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={escalationForm.description}
                  onChange={(e) => setEscalationForm({ ...escalationForm, description: e.target.value })}
                  placeholder="Brief description of this rule"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEscalationDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEscalationRule}>
                {selectedEscalationIndex !== null ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revenue Share Rule Dialog */}
        <Dialog open={isRevenueShareDialogOpen} onOpenChange={setIsRevenueShareDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedRevenueShareRule ? 'Edit Revenue Share Rule' : 'Add Revenue Share Rule'}</DialogTitle>
              <DialogDescription>Configure revenue sharing for a Sacco. Changes apply going forward (not retroactive).</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sacco *</Label>
                <Select
                  value={revenueShareForm.saccoId}
                  onValueChange={(value) => setRevenueShareForm({ ...revenueShareForm, saccoId: value })}
                  disabled={!!selectedRevenueShareRule}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Sacco" />
                  </SelectTrigger>
                  <SelectContent>
                    {saccos.map((sacco) => (
                      <SelectItem key={sacco.id} value={sacco.id}>
                        {sacco.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Applies only to riders registered under this Sacco</p>
              </div>

              <div className="space-y-2">
                <Label>Revenue Share Type *</Label>
                <Select
                  value={revenueShareForm.shareType}
                  onValueChange={(value: RevenueShareType) => setRevenueShareForm({ ...revenueShareForm, shareType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Revenue Share</SelectItem>
                    <SelectItem value="percentage">Percentage-based (e.g., 5% of permit fees)</SelectItem>
                    <SelectItem value="fixed_per_rider">Fixed Amount Per Rider (e.g., KES 10 per rider per week)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {revenueShareForm.shareType === 'percentage' && (
                <div className="space-y-2">
                  <Label>Percentage (%) *</Label>
                  <Input
                    type="number"
                    value={revenueShareForm.percentage}
                    onChange={(e) => setRevenueShareForm({ ...revenueShareForm, percentage: e.target.value })}
                    placeholder="5"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">Percentage of permit fees to share with this Sacco</p>
                </div>
              )}

              {revenueShareForm.shareType === 'fixed_per_rider' && (
                <>
                  <div className="space-y-2">
                    <Label>Amount Per Rider (KES) *</Label>
                    <Input
                      type="number"
                      value={revenueShareForm.fixedAmount}
                      onChange={(e) => setRevenueShareForm({ ...revenueShareForm, fixedAmount: e.target.value })}
                      placeholder="10"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground">Fixed amount per registered rider</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Period *</Label>
                    <Select
                      value={revenueShareForm.period}
                      onValueChange={(value: 'weekly' | 'monthly' | 'annual') => setRevenueShareForm({ ...revenueShareForm, period: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Frequency of payment per rider</p>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active Permits Only</Label>
                    <p className="text-sm text-muted-foreground">Apply revenue share only to riders with active permits</p>
                  </div>
                  <Switch
                    checked={revenueShareForm.activePermitsOnly}
                    onCheckedChange={(checked) => setRevenueShareForm({ ...revenueShareForm, activePermitsOnly: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Compliance Threshold (%) (Optional)</Label>
                  <Input
                    type="number"
                    value={revenueShareForm.complianceThreshold}
                    onChange={(e) => setRevenueShareForm({ ...revenueShareForm, complianceThreshold: e.target.value })}
                    placeholder="80"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <p className="text-xs text-muted-foreground">Minimum compliance percentage required (leave empty for no threshold)</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active</Label>
                    <p className="text-sm text-muted-foreground">Enable or disable this revenue share rule</p>
                  </div>
                  <Switch
                    checked={revenueShareForm.isActive}
                    onCheckedChange={(checked) => setRevenueShareForm({ ...revenueShareForm, isActive: checked })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRevenueShareDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveRevenueShareRule}>
                {selectedRevenueShareRule ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Permit Type Confirmation */}
        <AlertDialog open={isDeletePermitTypeOpen} onOpenChange={setIsDeletePermitTypeOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Permit Type</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate {selectedPermitType?.name}? This will prevent new permits from being issued with this type, but existing permits will remain valid.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => selectedPermitType && deletePermitTypeMutation.mutate(selectedPermitType.id)}>
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
