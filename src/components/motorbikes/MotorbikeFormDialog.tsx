import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOwners, useRiders, Motorbike, useCounties } from '@/hooks/useData';

// Base schema - county_id will be conditionally required
const createMotorbikeFormSchema = (needsCountySelection: boolean) => z.object({
  registration_number: z.string().min(1, 'Registration number is required'),
  owner_id: z.string().min(1, 'Owner is required'),
  rider_id: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional(),
  color: z.string().optional(),
  chassis_number: z.string().optional(),
  engine_number: z.string().optional(),
  photo_url: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
  county_id: needsCountySelection 
    ? z.string().min(1, 'County is required')
    : z.string().optional(),
});

type MotorbikeFormValues = z.infer<ReturnType<typeof createMotorbikeFormSchema>>;

interface MotorbikeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorbike?: Motorbike | null;
  countyId?: string;
}

export function MotorbikeFormDialog({ open, onOpenChange, motorbike, countyId }: MotorbikeFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!motorbike;
  const [selectedCountyId, setSelectedCountyId] = useState<string | undefined>(countyId);
  
  // For superadmins, allow county selection
  const needsCountySelection = !countyId;
  const { data: counties = [] } = useCounties();
  
  // Use selected county or provided countyId
  const effectiveCountyId = selectedCountyId || countyId;
  
  const { data: owners = [] } = useOwners(effectiveCountyId);
  const { data: riders = [] } = useRiders(effectiveCountyId);

  // Reset selected county when dialog opens or countyId changes
  useEffect(() => {
    if (open) {
      setSelectedCountyId(countyId);
    }
  }, [open, countyId]);

  const form = useForm<MotorbikeFormValues>({
    resolver: zodResolver(createMotorbikeFormSchema(needsCountySelection)),
    defaultValues: {
      registration_number: motorbike?.registration_number || '',
      owner_id: motorbike?.owner_id || '',
      rider_id: motorbike?.rider_id || '',
      make: motorbike?.make || '',
      model: motorbike?.model || '',
      year: motorbike?.year?.toString() || '',
      color: motorbike?.color || '',
      chassis_number: motorbike?.chassis_number || '',
      engine_number: motorbike?.engine_number || '',
      photo_url: motorbike?.photo_url || '',
      status: (motorbike?.status as 'pending' | 'approved' | 'rejected' | 'suspended') || 'pending',
      county_id: countyId || motorbike?.county_id || '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: MotorbikeFormValues) => {
      // Determine the county_id to use
      const finalCountyId = values.county_id || selectedCountyId || countyId || motorbike?.county_id;
      
      if (!finalCountyId) {
        throw new Error('County is required. Please select a county.');
      }

      const payload = {
        registration_number: values.registration_number,
        owner_id: values.owner_id,
        rider_id: values.rider_id === 'none' || !values.rider_id ? null : values.rider_id,
        make: values.make || null,
        model: values.model || null,
        year: values.year ? parseInt(values.year, 10) : null,
        color: values.color || null,
        chassis_number: values.chassis_number || null,
        engine_number: values.engine_number || null,
        photo_url: values.photo_url || null,
        status: values.status,
        county_id: finalCountyId,
      };

      if (isEditing && motorbike) {
        const { error } = await supabase
          .from('motorbikes')
          .update(payload)
          .eq('id', motorbike.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('motorbikes')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      // Invalidate and refetch all motorbike queries to ensure the list refreshes
      await queryClient.invalidateQueries({ queryKey: ['motorbikes'] });
      queryClient.refetchQueries({ queryKey: ['motorbikes'] });
      toast.success(isEditing ? 'Motorbike updated successfully' : 'Motorbike added successfully');
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred');
    },
  });

  const onSubmit = (values: MotorbikeFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Motorbike' : 'Add New Motorbike'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update motorbike information' : 'Register a new motorbike in the system'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* County selection for superadmins */}
              {needsCountySelection && (
                <FormField
                  control={form.control}
                  name="county_id"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>County *</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedCountyId(value);
                        }} 
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a County" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {counties.map((county) => (
                            <SelectItem key={county.id} value={county.id}>
                              {county.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="registration_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="KCA 123A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="owner_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an Owner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {owners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.full_name}
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
                name="rider_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rider</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a Rider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {riders.map((rider) => (
                          <SelectItem key={rider.id} value={rider.id}>
                            {rider.full_name}
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
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl>
                      <Input placeholder="Honda" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="CG 125" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2020" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input placeholder="Red" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="chassis_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chassis Number</FormLabel>
                    <FormControl>
                      <Input placeholder="CH123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="engine_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engine Number</FormLabel>
                    <FormControl>
                      <Input placeholder="EN123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="photo_url"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Photo URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/photo.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Update Motorbike' : 'Add Motorbike'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
