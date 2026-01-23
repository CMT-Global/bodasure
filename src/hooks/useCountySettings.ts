import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export interface CountySettings {
  permitSettings: PermitSettings;
  penaltySettings: PenaltySettings;
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

      const settings = (county?.settings as any) || {};
      
      return {
        permitSettings: {
          ...defaultPermitSettings,
          ...settings.permitSettings,
        },
        penaltySettings: {
          ...defaultPenaltySettings,
          ...settings.penaltySettings,
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
