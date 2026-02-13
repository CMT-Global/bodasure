import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCountyConfigFromSettings } from '@/hooks/useData';

export interface PermitSettings {
  gracePeriodDays: number; // Grace period before penalties apply for expired permits
  defaultFrequency: 'weekly' | 'monthly' | 'annual'; // Default permit frequency
}

export interface PenaltyType {
  id: string;
  name: string;
  description: string;
  amount: number;
  isActive: boolean;
}

export interface EscalationRule {
  offenseCount: number; // Number of offenses before escalation applies
  multiplier: number; // Penalty multiplier (e.g., 1.5x, 2x)
  description: string;
}

export interface PenaltySettings {
  autoPenaltyEnabled: boolean;
  penaltyTypes: PenaltyType[];
  escalationRules: EscalationRule[];
}

export type RevenueShareType = 'percentage' | 'fixed_per_rider' | 'none';

export interface RevenueShareRule {
  saccoId: string;
  saccoName: string;
  shareType: RevenueShareType;
  percentage?: number; // For percentage-based (e.g., 5%)
  fixedAmount?: number; // For fixed amount per rider (e.g., KES 10)
  period?: 'weekly' | 'monthly' | 'annual'; // For fixed amount per rider
  activePermitsOnly: boolean; // Apply only to riders with active permits
  complianceThreshold?: number; // Optional: minimum compliance percentage (e.g., 80)
  isActive: boolean;
}

export interface RevenueSharingSettings {
  rules: RevenueShareRule[];
}

export interface CountySettings {
  permitSettings: PermitSettings;
  penaltySettings: PenaltySettings;
  revenueSharingSettings: RevenueSharingSettings;
}

// Default settings
const defaultPermitSettings: PermitSettings = {
  gracePeriodDays: 7,
  defaultFrequency: 'monthly',
};

const defaultPenaltySettings: PenaltySettings = {
  autoPenaltyEnabled: true,
  penaltyTypes: [
    { id: '1', name: 'Expired Permit', description: 'Penalty for operating with expired permit', amount: 5000, isActive: true },
    { id: '2', name: 'No Permit', description: 'Penalty for operating without valid permit', amount: 10000, isActive: true },
    { id: '3', name: 'Traffic Violation', description: 'General traffic violation penalty', amount: 3000, isActive: true },
  ],
  escalationRules: [
    { offenseCount: 2, multiplier: 1.5, description: 'Second offense - 1.5x penalty' },
    { offenseCount: 3, multiplier: 2.0, description: 'Third offense - 2x penalty' },
    { offenseCount: 5, multiplier: 3.0, description: 'Fifth offense - 3x penalty' },
  ],
};

// Fetch county settings
export function useCountySettings(countyId?: string) {
  return useQuery({
    queryKey: ['county-settings', countyId],
    queryFn: async () => {
      if (!countyId) return null;

      const { data: county, error } = await supabase
        .from('counties')
        .select('settings')
        .eq('id', countyId)
        .single();

      if (error) throw error;

      const settings = (county?.settings as Record<string, unknown>) || {};
      const countyConfig = getCountyConfigFromSettings(settings);

      // Prefer penalty and escalation from super-admin county-config when present
      let penaltySettings: PenaltySettings = {
        ...defaultPenaltySettings,
        ...(settings.penaltySettings as Partial<PenaltySettings> | undefined),
      };
      if (countyConfig.penaltyConfig.categories?.length > 0) {
        penaltySettings = {
          autoPenaltyEnabled: countyConfig.penaltyConfig.autoPenaltyEnabled ?? penaltySettings.autoPenaltyEnabled,
          penaltyTypes: countyConfig.penaltyConfig.categories.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description ?? '',
            amount: c.amountCents / 100,
            isActive: true,
          })),
          escalationRules:
            countyConfig.penaltyConfig.escalationLogic?.length > 0
              ? countyConfig.penaltyConfig.escalationLogic.map((r) => ({
                  offenseCount: r.repeatCount,
                  multiplier: r.multiplier,
                  description: `Repeat ${r.repeatCount}: ${r.multiplier}x${r.maxAmountCents != null ? ` (max KES ${r.maxAmountCents / 100})` : ''}`,
                }))
              : penaltySettings.escalationRules,
        };
      }

      return {
        permitSettings: {
          ...defaultPermitSettings,
          ...(settings.permitSettings as Partial<PermitSettings> | undefined),
        },
        penaltySettings,
        revenueSharingSettings: {
          rules: (settings.revenueSharingSettings as { rules?: RevenueShareRule[] } | undefined)?.rules || [],
        },
      } as CountySettings;
    },
    enabled: !!countyId,
  });
}

// Update county settings
export function useUpdateCountySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ countyId, settings }: { countyId: string; settings: Partial<CountySettings> }) => {
      // Get current settings
      const { data: county, error: fetchError } = await supabase
        .from('counties')
        .select('settings')
        .eq('id', countyId)
        .single();

      if (fetchError) throw fetchError;

      const currentSettings = (county?.settings as any) || {};
      
      // Merge new settings with existing
      const updatedSettings = {
        ...currentSettings,
        permitSettings: {
          ...currentSettings.permitSettings,
          ...settings.permitSettings,
        },
        penaltySettings: {
          ...currentSettings.penaltySettings,
          ...settings.penaltySettings,
        },
        revenueSharingSettings: {
          ...currentSettings.revenueSharingSettings,
          ...settings.revenueSharingSettings,
        },
      };

      const { error } = await supabase
        .from('counties')
        .update({ settings: updatedSettings })
        .eq('id', countyId);

      if (error) throw error;
      return updatedSettings;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['county-settings', variables.countyId] });
      toast.success('Settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });
}
