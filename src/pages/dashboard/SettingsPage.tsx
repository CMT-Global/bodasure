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
import { useSaccos, useCounties } from '@/hooks/useData';
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
  
  // Check if user is Platform Super Admin
  const isPlatformSuperAdmin = hasRole('platform_super_admin') || hasRole('platform_admin');
  
  // Get county_id from profile or first role
  const countyId = useMemo(() => {
    return profile?.county_id || roles.find(r => r.county_id)?.county_id || undefined;
  }, [profile, roles]);

  // Check if user is County Super Admin or Platform Super Admin
  const isCountySuperAdmin = hasRole('platform_super_admin') || hasRole('county_super_admin') || hasRole('county_admin');

  // County selection for super admins when creating permit types
  const [selectedCountyId, setSelectedCountyId] = useState<string | undefined>(countyId);
  const { data: counties = [] } = useCounties();
  
  // Use selected county or provided countyId for permit types
  const effectiveCountyId = selectedCountyId || countyId;

  const { data: settings, isLoading: settingsLoading } = useCountySettings(countyId);
  const { data: permitTypes = [], isLoading: permitTypesLoading } = usePermitTypes(effectiveCountyId || '');
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

  // Reset selected county when permit type dialog opens/closes
  useEffect(() => {
    if (isPermitTypeDialogOpen) {
      // When opening for new permit type, reset county selection for super admins
      if (!selectedPermitType && isPlatformSuperAdmin) {
        setSelectedCountyId(undefined);
      } else if (selectedPermitType) {
        // When editing, use the permit type's county
        setSelectedCountyId(selectedPermitType.county_id || countyId);
      } else {
        // For non-super admins, use their county
        setSelectedCountyId(countyId);
      }
    }
  }, [isPermitTypeDialogOpen, selectedPermitType, isPlatformSuperAdmin, countyId]);

  // Save Permit Settings
  const handleSavePermitSettings = async () => {
    if (!countyId) return;

    await updateSettings.mutateAsync({
      countyId,
      settings: {
        permitSettings: {
          ...permitSettings,
          gracePeriodDays: permitSettings.gracePeriodDays ?? 0,
        },
      },
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
    mutationFn: async (data: { name: string; description: string; amount: number; duration_days: number; county_id?: string }) => {
      // Determine the county_id to use
      const finalCountyId = data.county_id || selectedCountyId || countyId;
      
      if (!finalCountyId) {
        throw new Error('County ID required. Please select a county.');
      }
      
      if (selectedPermitType) {
        const { error } = await supabase
          .from('permit_types')
          .update(data)
          .eq('id', selectedPermitType.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('permit_types')
          .insert([{ ...data, county_id: finalCountyId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permit_types'] });
      toast.success(selectedPermitType ? 'Permit type updated' : 'Permit type created');
      setIsPermitTypeDialogOpen(false);
      setPermitTypeForm({ name: '', description: '', amount: '', duration_days: '' });
      setSelectedPermitType(null);
      // Reset selected county for next creation
      if (isPlatformSuperAdmin) {
        setSelectedCountyId(undefined);
      }
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

  // Access control - only County Super Admin and County Admin can access settings
  if (!isCountySuperAdmin) {
    return (
      <DashboardLayout>
        <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Settings</h1>
            <p className="text-muted-foreground text-sm mt-1 sm:text-base">Manage your account and county settings</p>
          </div>
          <Card>
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center text-amber-600">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm sm:text-base">You need Platform Super Admin, County Super Admin, or County Admin privileges to access settings.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (settingsLoading || permitTypesLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh] sm:h-64 px-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 px-1 sm:px-0 min-w-0 overflow-x-hidden">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">County Settings & Configuration</h1>
          <p className="text-muted-foreground text-sm mt-1 sm:text-base">Configure permit and penalty settings for your county</p>
        </div>

        <Tabs defaultValue="permits" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full grid grid-cols-3 h-auto min-h-[44px] p-1.5 gap-1 md:flex md:inline-flex md:h-10 md:flex-row md:rounded-md md:p-1">
            <TabsTrigger value="permits" className="flex flex-col sm:flex-row items-center justify-center gap-1 px-2 py-3 text-xs font-medium min-h-[44px] rounded-md data-[state=active]:shadow-sm sm:px-3 sm:py-1.5 sm:text-sm sm:min-h-0 md:flex-row md:gap-2">
              <Shield className="h-4 w-4 shrink-0 sm:mr-0 md:mr-2" />
              <span className="sm:hidden">Permits</span>
              <span className="hidden sm:inline">Permit Settings</span>
            </TabsTrigger>
            <TabsTrigger value="penalties" className="flex flex-col sm:flex-row items-center justify-center gap-1 px-2 py-3 text-xs font-medium min-h-[44px] rounded-md data-[state=active]:shadow-sm sm:px-3 sm:py-1.5 sm:text-sm sm:min-h-0 md:flex-row md:gap-2">
              <FileText className="h-4 w-4 shrink-0 sm:mr-0 md:mr-2" />
              <span className="sm:hidden">Penalties</span>
              <span className="hidden sm:inline">Penalty Settings</span>
            </TabsTrigger>
            <TabsTrigger value="revenue-sharing" className="flex flex-col sm:flex-row items-center justify-center gap-1 px-2 py-3 text-xs font-medium min-h-[44px] rounded-md data-[state=active]:shadow-sm sm:px-3 sm:py-1.5 sm:text-sm sm:min-h-0 md:flex-row md:gap-2">
              <DollarSign className="h-4 w-4 shrink-0 sm:mr-0 md:mr-2" />
              <span className="sm:hidden">Revenue</span>
              <span className="hidden sm:inline">Revenue Sharing</span>
            </TabsTrigger>
          </TabsList>

          {/* Permit Settings Tab */}
          <TabsContent value="permits" className="space-y-4 sm:space-y-6 mt-4 sm:mt-2">
            {/* Permit Fee Amounts */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg">Permit Fee Amounts</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-0.5">Manage permit types and their fee amounts</CardDescription>
                  </div>
                  <Button
                    onClick={() => { 
                      setSelectedPermitType(null); 
                      setPermitTypeForm({ name: '', description: '', amount: '', duration_days: '' }); 
                      if (isPlatformSuperAdmin) {
                        setSelectedCountyId(undefined);
                      }
                      setIsPermitTypeDialogOpen(true); 
                    }}
                    className="w-full sm:w-auto min-h-[44px] shrink-0"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Permit Type
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 sm:pt-0">
                <div className="space-y-4">
                  {permitTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6 sm:py-8">No permit types configured. Add one to get started.</p>
                  ) : (
                    <div className="space-y-3">
                      {permitTypes.map((pt) => (
                        <div key={pt.id} className="flex flex-col gap-3 p-3 border rounded-lg sm:flex-row sm:items-center sm:justify-between sm:p-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-medium text-sm sm:text-base">{pt.name}</h4>
                              {!pt.is_active && <Badge variant="secondary">Inactive</Badge>}
                            </div>
                            {pt.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{pt.description}</p>}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                              <span className="text-muted-foreground">Amount: <span className="font-medium text-foreground">KES {pt.amount.toLocaleString()}</span></span>
                              <span className="text-muted-foreground">Duration: <span className="font-medium text-foreground">{pt.duration_days} days</span></span>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button variant="outline" size="sm" onClick={() => openEditPermitType(pt)} className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0">Edit</Button>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedPermitType(pt); setIsDeletePermitTypeOpen(true); }} className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0">Delete</Button>
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
                <CardTitle className="text-base sm:text-lg">Permit Frequency & Grace Period</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Configure default permit frequency and grace periods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label>Default Permit Frequency</Label>
                  <Select
                    value={permitSettings.defaultFrequency}
                    onValueChange={(value: 'weekly' | 'monthly' | 'annual') =>
                      setPermitSettings({ ...permitSettings, defaultFrequency: value })
                    }
                  >
                    <SelectTrigger className="min-h-[44px]">
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
                    value={permitSettings.gracePeriodDays ?? ''}
                    onChange={(e) =>
                      setPermitSettings({
                        ...permitSettings,
                        gracePeriodDays: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                      })
                    }
                    min="0"
                    placeholder="0"
                    className="min-h-[44px]"
                  />
                  <p className="text-xs text-muted-foreground">Number of days after permit expiry before penalties apply</p>
                </div>

                <Button onClick={handleSavePermitSettings} disabled={updateSettings.isPending} className="w-full sm:w-auto min-h-[44px]">
                  {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Permit Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Penalty Settings Tab */}
          <TabsContent value="penalties" className="space-y-4 sm:space-y-6 mt-4 sm:mt-2">
            {/* Auto-Penalty Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Auto-Penalty Configuration</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Enable or disable automatic penalty generation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5 min-w-0">
                    <Label>Enable Auto-Penalty</Label>
                    <p className="text-sm text-muted-foreground">Automatically generate penalties for expired permits and violations</p>
                  </div>
                  <Switch
                    checked={penaltySettings.autoPenaltyEnabled}
                    onCheckedChange={(checked) =>
                      setPenaltySettings({ ...penaltySettings, autoPenaltyEnabled: checked })
                    }
                    className="self-start sm:self-center"
                  />
                </div>
                <Button onClick={handleSavePenaltySettings} className="mt-4 w-full sm:w-auto min-h-[44px]" disabled={updateSettings.isPending}>
                  {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Auto-Penalty Setting
                </Button>
              </CardContent>
            </Card>

            {/* Penalty Types */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg">Penalty Types & Amounts</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-0.5">Configure penalty types and their amounts</CardDescription>
                  </div>
                  <Button
                    onClick={() => { setSelectedPenaltyType(null); setPenaltyTypeForm({ name: '', description: '', amount: '' }); setIsPenaltyTypeDialogOpen(true); }}
                    className="w-full sm:w-auto min-h-[44px] shrink-0"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Penalty Type
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 sm:pt-0">
                <div className="space-y-3">
                  {penaltySettings.penaltyTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6 sm:py-8">No penalty types configured. Add one to get started.</p>
                  ) : (
                    penaltySettings.penaltyTypes.map((pt) => (
                      <div key={pt.id} className="flex flex-col gap-3 p-3 border rounded-lg sm:flex-row sm:items-center sm:justify-between sm:p-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium text-sm sm:text-base">{pt.name}</h4>
                            {!pt.isActive && <Badge variant="secondary">Inactive</Badge>}
                          </div>
                          {pt.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{pt.description}</p>}
                          <p className="text-sm mt-2">
                            <span className="text-muted-foreground">Amount: </span>
                            <span className="font-medium">KES {pt.amount.toLocaleString()}</span>
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button variant="outline" size="sm" onClick={() => openEditPenaltyType(pt)} className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0">Edit</Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeletePenaltyType(pt.id)} className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0">Delete</Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Escalation Rules */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg">Escalation Rules for Repeat Offenders</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-0.5">Configure penalty multipliers for repeat offenses</CardDescription>
                  </div>
                  <Button
                    onClick={() => { setSelectedEscalationIndex(null); setEscalationForm({ offenseCount: '', multiplier: '', description: '' }); setIsEscalationDialogOpen(true); }}
                    className="w-full sm:w-auto min-h-[44px] shrink-0"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Escalation Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 sm:pt-0">
                <div className="space-y-3">
                  {penaltySettings.escalationRules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6 sm:py-8">No escalation rules configured. Add one to get started.</p>
                  ) : (
                    penaltySettings.escalationRules.map((rule, index) => (
                      <div key={index} className="flex flex-col gap-3 p-3 border rounded-lg sm:flex-row sm:items-center sm:justify-between sm:p-4">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm sm:text-base">{rule.offenseCount} Offense(s) - {rule.multiplier}x Penalty</h4>
                          {rule.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{rule.description}</p>}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button variant="outline" size="sm" onClick={() => openEditEscalation(rule, index)} className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0">Edit</Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteEscalationRule(index)} className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0">Delete</Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSavePenaltySettings} disabled={updateSettings.isPending} className="w-full min-h-[44px]">
              {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save All Penalty Settings
            </Button>
          </TabsContent>

          {/* Revenue Sharing Tab */}
          <TabsContent value="revenue-sharing" className="space-y-4 sm:space-y-6 mt-4 sm:mt-2">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg">Revenue Sharing Configuration</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-0.5">Configure revenue sharing rules for each Sacco. Changes apply going forward (not retroactive).</CardDescription>
                  </div>
                  <Button
                    onClick={() => { 
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
                    }}
                    className="w-full sm:w-auto min-h-[44px] shrink-0"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Revenue Share Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 sm:pt-0">
                <div className="space-y-4">
                  {revenueSharingSettings.rules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6 sm:py-8">No revenue sharing rules configured. Add one to get started.</p>
                  ) : (
                    <div className="space-y-3">
                      {revenueSharingSettings.rules.map((rule) => {
                        const sacco = saccos.find(s => s.id === rule.saccoId);
                        return (
                          <div key={rule.saccoId} className="p-3 sm:p-4 border rounded-lg space-y-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-medium text-sm sm:text-base">{rule.saccoName || sacco?.name || 'Unknown Sacco'}</h4>
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
                                  <div className="flex flex-wrap gap-2 mt-2">
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
                              <div className="flex gap-2 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => openEditRevenueShare(rule)} className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0">
                                  <Edit className="h-4 w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Edit</span>
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDeleteRevenueShareRule(rule.saccoId)} className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0">
                                  <Trash2 className="h-4 w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Delete</span>
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

            <Button onClick={handleSaveRevenueSharingSettings} disabled={updateSettings.isPending} className="w-full min-h-[44px]">
              {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Revenue Sharing Settings
            </Button>
          </TabsContent>
        </Tabs>

        {/* Permit Type Dialog */}
        <Dialog open={isPermitTypeDialogOpen} onOpenChange={setIsPermitTypeDialogOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg mx-4 sm:mx-0">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{selectedPermitType ? 'Edit Permit Type' : 'Add Permit Type'}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">Configure permit type details and pricing</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* County selection for super admins */}
              {isPlatformSuperAdmin && !selectedPermitType && (
                <div className="space-y-2">
                  <Label>County *</Label>
                  <Select 
                    value={selectedCountyId || ''} 
                    onValueChange={(value) => setSelectedCountyId(value)}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select a County" />
                    </SelectTrigger>
                    <SelectContent>
                      {counties.map((county) => (
                        <SelectItem key={county.id} value={county.id}>
                          {county.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedCountyId && (
                    <p className="text-xs text-destructive">Please select a county</p>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={permitTypeForm.name}
                  onChange={(e) => setPermitTypeForm({ ...permitTypeForm, name: e.target.value })}
                  placeholder="e.g., Monthly Permit"
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={permitTypeForm.description}
                  onChange={(e) => setPermitTypeForm({ ...permitTypeForm, description: e.target.value })}
                  placeholder="Brief description"
                  className="min-h-[44px]"
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
                  className="min-h-[44px]"
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
                  className="min-h-[44px]"
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => {
                setIsPermitTypeDialogOpen(false);
                // Reset selected county when closing
                if (isPlatformSuperAdmin && !selectedPermitType) {
                  setSelectedCountyId(undefined);
                }
              }} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
              <Button onClick={() => {
                const finalCountyId = selectedCountyId || countyId;
                if (!finalCountyId && !selectedPermitType) {
                  toast.error('Please select a county');
                  return;
                }
                createPermitTypeMutation.mutate({
                  name: permitTypeForm.name,
                  description: permitTypeForm.description,
                  amount: parseFloat(permitTypeForm.amount),
                  duration_days: parseInt(permitTypeForm.duration_days),
                  county_id: finalCountyId,
                });
              }} disabled={!permitTypeForm.name || !permitTypeForm.amount || !permitTypeForm.duration_days || (!selectedCountyId && !countyId && !selectedPermitType) || createPermitTypeMutation.isPending} className="w-full sm:w-auto min-h-[44px]">
                {createPermitTypeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedPermitType ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Penalty Type Dialog */}
        <Dialog open={isPenaltyTypeDialogOpen} onOpenChange={setIsPenaltyTypeDialogOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg mx-4 sm:mx-0">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{selectedPenaltyType ? 'Edit Penalty Type' : 'Add Penalty Type'}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">Configure penalty type details and amount</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={penaltyTypeForm.name}
                  onChange={(e) => setPenaltyTypeForm({ ...penaltyTypeForm, name: e.target.value })}
                  placeholder="e.g., Expired Permit"
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={penaltyTypeForm.description}
                  onChange={(e) => setPenaltyTypeForm({ ...penaltyTypeForm, description: e.target.value })}
                  placeholder="Brief description"
                  className="min-h-[44px]"
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
                  className="min-h-[44px]"
                />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsPenaltyTypeDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
              <Button onClick={handleSavePenaltyType} className="w-full sm:w-auto min-h-[44px]">
                {selectedPenaltyType ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Escalation Rule Dialog */}
        <Dialog open={isEscalationDialogOpen} onOpenChange={setIsEscalationDialogOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg mx-4 sm:mx-0">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{selectedEscalationIndex !== null ? 'Edit Escalation Rule' : 'Add Escalation Rule'}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">Configure penalty multiplier for repeat offenses</DialogDescription>
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
                  className="min-h-[44px]"
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
                  className="min-h-[44px]"
                />
                <p className="text-xs text-muted-foreground">Penalty multiplier (e.g., 1.5 = 150% of base penalty)</p>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={escalationForm.description}
                  onChange={(e) => setEscalationForm({ ...escalationForm, description: e.target.value })}
                  placeholder="Brief description of this rule"
                  className="min-h-[44px]"
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsEscalationDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
              <Button onClick={handleSaveEscalationRule} className="w-full sm:w-auto min-h-[44px]">
                {selectedEscalationIndex !== null ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revenue Share Rule Dialog */}
        <Dialog open={isRevenueShareDialogOpen} onOpenChange={setIsRevenueShareDialogOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{selectedRevenueShareRule ? 'Edit Revenue Share Rule' : 'Add Revenue Share Rule'}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">Configure revenue sharing for a Sacco. Changes apply going forward (not retroactive).</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sacco *</Label>
                <Select
                  value={revenueShareForm.saccoId}
                  onValueChange={(value) => setRevenueShareForm({ ...revenueShareForm, saccoId: value })}
                  disabled={!!selectedRevenueShareRule}
                >
                  <SelectTrigger className="min-h-[44px]">
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
                  <SelectTrigger className="min-h-[44px]">
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
                    className="min-h-[44px]"
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
                      className="min-h-[44px]"
                    />
                    <p className="text-xs text-muted-foreground">Fixed amount per registered rider</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Period *</Label>
                    <Select
                      value={revenueShareForm.period}
                      onValueChange={(value: 'weekly' | 'monthly' | 'annual') => setRevenueShareForm({ ...revenueShareForm, period: value })}
                    >
                      <SelectTrigger className="min-h-[44px]">
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5 min-w-0">
                    <Label>Active Permits Only</Label>
                    <p className="text-sm text-muted-foreground">Apply revenue share only to riders with active permits</p>
                  </div>
                  <Switch
                    checked={revenueShareForm.activePermitsOnly}
                    onCheckedChange={(checked) => setRevenueShareForm({ ...revenueShareForm, activePermitsOnly: checked })}
                    className="self-start sm:self-center"
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
                    className="min-h-[44px]"
                  />
                  <p className="text-xs text-muted-foreground">Minimum compliance percentage required (leave empty for no threshold)</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5 min-w-0">
                    <Label>Active</Label>
                    <p className="text-sm text-muted-foreground">Enable or disable this revenue share rule</p>
                  </div>
                  <Switch
                    checked={revenueShareForm.isActive}
                    onCheckedChange={(checked) => setRevenueShareForm({ ...revenueShareForm, isActive: checked })}
                    className="self-start sm:self-center"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsRevenueShareDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
              <Button onClick={handleSaveRevenueShareRule} className="w-full sm:w-auto min-h-[44px]">
                {selectedRevenueShareRule ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Permit Type Confirmation */}
        <AlertDialog open={isDeletePermitTypeOpen} onOpenChange={setIsDeletePermitTypeOpen}>
          <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-lg mx-4 sm:mx-0 p-4 sm:p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base sm:text-lg">Deactivate Permit Type</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
                Are you sure you want to deactivate {selectedPermitType?.name}? This will prevent new permits from being issued with this type, but existing permits will remain valid.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialogCancel className="w-full sm:w-auto min-h-[44px]">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => selectedPermitType && deletePermitTypeMutation.mutate(selectedPermitType.id)} className="w-full sm:w-auto min-h-[44px]">
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
