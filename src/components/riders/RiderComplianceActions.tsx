import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export type ComplianceStatus = 'compliant' | 'non_compliant' | 'pending_review' | 'blacklisted';

export interface RiderComplianceActionsRider {
  id: string;
  full_name: string;
  compliance_status: ComplianceStatus;
}

interface RiderComplianceActionsProps {
  rider: RiderComplianceActionsRider | null;
  onSuccess?: () => void;
  disabled?: boolean;
}

const COMPLIANCE_OPTIONS: { value: ComplianceStatus; label: string }[] = [
  { value: 'compliant', label: 'Compliant' },
  { value: 'non_compliant', label: 'Non-compliant' },
  { value: 'pending_review', label: 'Under review' },
  { value: 'blacklisted', label: 'Blacklisted' },
];

export function RiderComplianceActions({
  rider,
  onSuccess,
  disabled = false,
}: RiderComplianceActionsProps) {
  const queryClient = useQueryClient();

  const updateComplianceMutation = useMutation({
    mutationFn: async ({
      riderId,
      compliance_status,
    }: {
      riderId: string;
      compliance_status: ComplianceStatus;
    }) => {
      const { error } = await supabase
        .from('riders')
        .update({ compliance_status, updated_at: new Date().toISOString() })
        .eq('id', riderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      queryClient.invalidateQueries({ queryKey: ['riders-with-details'] });
      queryClient.invalidateQueries({ queryKey: ['sacco-members'] });
      toast.success('Compliance status updated');
      onSuccess?.();
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Update failed');
    },
  });

  const handleValueChange = (value: ComplianceStatus) => {
    if (!rider) return;
    updateComplianceMutation.mutate({
      riderId: rider.id,
      compliance_status: value,
    });
  };

  if (!rider) return null;

  const busy = updateComplianceMutation.isPending;
  const currentStatus = rider.compliance_status ?? 'pending_review';

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Compliance</h4>
      <div className="flex items-center gap-2">
        <Select
          value={currentStatus}
          onValueChange={handleValueChange}
          disabled={disabled || busy}
        >
          <SelectTrigger className="w-full min-w-[180px]">
            <SelectValue placeholder="Set status" />
          </SelectTrigger>
          <SelectContent>
            {COMPLIANCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />}
      </div>
    </div>
  );
}
