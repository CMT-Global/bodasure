import { useState, useEffect, useMemo, useRef } from 'react';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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

type WizardStepGroup = {
  label: string;
  fields: { name: keyof MotorbikeFormValues; label: string; placeholder?: string; description?: string }[];
};

function getMotorbikeWizardStepGroups(needsCountySelection: boolean): WizardStepGroup[] {
  const base: WizardStepGroup[] = [
    {
      label: 'Registration & Assignment',
      fields: [
        { name: 'registration_number', label: 'Registration Number', placeholder: 'KCA 123A' },
        { name: 'owner_id', label: 'Owner', description: 'Select the bike owner' },
        { name: 'rider_id', label: 'Rider', description: 'Optionally assign a rider' },
      ],
    },
    {
      label: 'Vehicle Details',
      fields: [
        { name: 'make', label: 'Make', placeholder: 'Honda' },
        { name: 'model', label: 'Model', placeholder: 'CG 125' },
        { name: 'year', label: 'Year', placeholder: '2020' },
        { name: 'color', label: 'Color', placeholder: 'Red' },
      ],
    },
    {
      label: 'Identification & Status',
      fields: [
        { name: 'chassis_number', label: 'Chassis Number', placeholder: 'CH123456789' },
        { name: 'engine_number', label: 'Engine Number', placeholder: 'EN123456789' },
        { name: 'photo_url', label: 'Photo URL', placeholder: 'https://example.com/photo.jpg' },
        { name: 'status', label: 'Status', description: 'Set initial status' },
      ],
    },
  ];
  if (needsCountySelection) {
    return [
      { label: 'County', fields: [{ name: 'county_id', label: 'County', description: 'Select the county for this motorbike' }] },
      ...base,
    ];
  }
  return base;
}

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
  const [wizardStep, setWizardStep] = useState(0);
  const stepFieldsRef = useRef<HTMLDivElement>(null);

  // For superadmins, allow county selection
  const needsCountySelection = !countyId;
  const stepGroups = useMemo(() => getMotorbikeWizardStepGroups(needsCountySelection), [needsCountySelection]);
  const { data: counties = [] } = useCounties();
  
  // Use selected county or provided countyId
  const effectiveCountyId = selectedCountyId || countyId;
  
  const { data: owners = [] } = useOwners(effectiveCountyId);
  const { data: riders = [] } = useRiders(effectiveCountyId);

  // Reset selected county and wizard step when dialog opens or countyId changes
  useEffect(() => {
    if (open) {
      setSelectedCountyId(countyId);
      setWizardStep(0);
    }
  }, [open, countyId]);

  // Focus first field when step changes
  useEffect(() => {
    const el = stepFieldsRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>(
      'input:not([type=hidden]), select, [role="combobox"]'
    );
    if (first && 'focus' in first) {
      const t = setTimeout(() => (first as HTMLElement).focus({ preventScroll: true }), 0);
      return () => clearTimeout(t);
    }
  }, [wizardStep]);

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
      await queryClient.invalidateQueries({ queryKey: ['motorbikes'] });
      queryClient.refetchQueries({ queryKey: ['motorbikes'] });
      toast.success(isEditing ? 'Motorbike updated successfully' : 'Motorbike added successfully');
      onOpenChange(false);
      form.reset();
      setWizardStep(0);
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (wizardStep === stepGroups.length - 1) {
                form.handleSubmit(onSubmit)();
              }
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              const target = e.target as HTMLElement;
              if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
                e.preventDefault();
              }
            }}
            className="space-y-6"
          >
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">
                  Step {wizardStep + 1} of {stepGroups.length}
                </span>
                <span className="text-muted-foreground">{stepGroups[wizardStep].label}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((wizardStep + 1) / stepGroups.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Current step fields (grouped) */}
            <div ref={stepFieldsRef} className="min-h-[120px] space-y-4">
              {stepGroups[wizardStep].fields.map((fieldDef) => (
                <div key={fieldDef.name}>
                  {fieldDef.name === 'county_id' && (
                <FormField
                  control={form.control}
                  name="county_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>County *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedCountyId(value);
                        }}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger className="min-h-[48px] text-base">
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
                      {fieldDef.description && (
                        <FormDescription>{fieldDef.description}</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  )}
                  {fieldDef.name === 'registration_number' && (
                <FormField
                  control={form.control}
                  name="registration_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="KCA 123A" className="text-base min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'owner_id' && (
                <FormField
                  control={form.control}
                  name="owner_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="min-h-[48px] text-base">
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
                      {fieldDef.description && (
                        <FormDescription>{fieldDef.description}</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  )}
                  {fieldDef.name === 'rider_id' && (
                <FormField
                  control={form.control}
                  name="rider_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rider</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="min-h-[48px] text-base">
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
                      {fieldDef.description && (
                        <FormDescription>{fieldDef.description}</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  )}
                  {fieldDef.name === 'make' && (
                <FormField
                  control={form.control}
                  name="make"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Make</FormLabel>
                      <FormControl>
                        <Input placeholder="Honda" className="text-base min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'model' && (
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="CG 125" className="text-base min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'year' && (
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="2020" className="text-base min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'color' && (
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input placeholder="Red" className="text-base min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'chassis_number' && (
                <FormField
                  control={form.control}
                  name="chassis_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chassis Number</FormLabel>
                      <FormControl>
                        <Input placeholder="CH123456789" className="text-base min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'engine_number' && (
                <FormField
                  control={form.control}
                  name="engine_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Engine Number</FormLabel>
                      <FormControl>
                        <Input placeholder="EN123456789" className="text-base min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'photo_url' && (
                <FormField
                  control={form.control}
                  name="photo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Photo URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/photo.jpg" className="text-base min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'status' && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="min-h-[48px] text-base">
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
                      {fieldDef.description && (
                        <FormDescription>{fieldDef.description}</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  )}
                </div>
              ))}
            </div>

            {/* Wizard navigation */}
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
              <div className="flex gap-2 flex-1">
                {wizardStep > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWizardStep((s) => s - 1)}
                    className="min-h-[44px]"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="min-h-[44px]">
                    Cancel
                  </Button>
                )}
              </div>
              {wizardStep < stepGroups.length - 1 ? (
                <Button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const fieldNames = stepGroups[wizardStep].fields.map((f) => f.name);
                    const valid = await form.trigger(fieldNames);
                    if (valid) setWizardStep((s) => s + 1);
                  }}
                  className="min-h-[44px]"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => form.handleSubmit(onSubmit)()}
                  className="min-h-[44px]"
                >
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Update Motorbike' : 'Add Motorbike'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
