import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreatePenalty } from '@/hooks/usePenalties';
import { useRiders } from '@/hooks/useData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const penaltyFormSchema = z.object({
  rider_id: z.string().min(1, 'Rider is required'),
  penalty_type: z.string().min(1, 'Penalty type is required'),
  description: z.string().optional(),
  amount: z.number().min(0, 'Amount must be positive'),
  due_date: z.string().optional(),
});

type PenaltyFormValues = z.infer<typeof penaltyFormSchema>;

interface PenaltyIssuanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countyId: string;
  preselectedRiderId?: string;
}

const PENALTY_TYPES = [
  'Expired permit',
  'No permit',
  'Other county-defined violations',
];

export function PenaltyIssuanceDialog({
  open,
  onOpenChange,
  countyId,
  preselectedRiderId,
}: PenaltyIssuanceDialogProps) {
  const { data: riders = [], isLoading: ridersLoading } = useRiders(countyId);
  const createPenalty = useCreatePenalty();

  const form = useForm<PenaltyFormValues>({
    resolver: zodResolver(penaltyFormSchema),
    defaultValues: {
      rider_id: preselectedRiderId || '',
      penalty_type: '',
      description: '',
      amount: 0,
      due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    },
  });

  const onSubmit = async (values: PenaltyFormValues) => {
    try {
      await createPenalty.mutateAsync({
        county_id: countyId,
        rider_id: values.rider_id,
        penalty_type: values.penalty_type,
        description: values.description || undefined,
        amount: values.amount,
        due_date: values.due_date ? new Date(values.due_date).toISOString() : undefined,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Issue Penalty</DialogTitle>
          <DialogDescription>
            Issue a penalty to a rider for a violation
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="rider_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rider</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!!preselectedRiderId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a rider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ridersLoading ? (
                        <div className="p-4 text-center">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        </div>
                      ) : (
                        riders.map((rider) => (
                          <SelectItem key={rider.id} value={rider.id}>
                            {rider.full_name} ({rider.id_number})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="penalty_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Penalty Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select penalty type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PENALTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (KES)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about the violation..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createPenalty.isPending}>
                {createPenalty.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Issue Penalty
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
