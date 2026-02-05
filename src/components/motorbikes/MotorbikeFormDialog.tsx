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

const currentYear = new Date().getFullYear();

function isBetween(c: string, start: string, end: string): boolean {
  return c >= start && c <= end;
}
function isLower(c: string): boolean {
  return isBetween(c, 'a', 'z');
}
function isUpper(c: string): boolean {
  return isBetween(c, 'A', 'Z');
}
function isDigit(c: string): boolean {
  return isBetween(c, '0', '9');
}

function isRegistrationChar(c: string): boolean {
  return isLower(c) || isUpper(c) || isDigit(c) || c === '-' || c === '/';
}
function isAlphanumericChar(c: string): boolean {
  return isLower(c) || isUpper(c) || isDigit(c);
}
function isAlphabeticChar(c: string): boolean {
  return isLower(c) || isUpper(c) || c === ' ';
}
function isMakeModelChar(c: string): boolean {
  return isLower(c) || isUpper(c) || isDigit(c) || c === ' ';
}

function optionalStringRefine(
  charCheck: (c: string) => boolean,
  minLen: number,
  maxLen: number
) {
  return (val: string | undefined) => {
    const s = val?.trim() ?? '';
    return !s || (s.length >= minLen && s.length <= maxLen && s.split('').every(charCheck));
  };
}

// Base schema - county_id will be conditionally required
function createMotorbikeFormSchema(
  needsCountySelection: boolean,
  ctx: { motorbikeId?: string; countyId?: string }
) {
  return z
    .object({
      registration_number: z
        .string()
        .min(1, 'Registration number is required')
        .transform((s) => s.trim().toUpperCase())
        .pipe(
          z
            .string()
            .refine(
              optionalStringRefine(isRegistrationChar, 5, 20),
              'Must be between 5 and 20 characters. Only letters, numbers, hyphens and slashes allowed'
            )
        ),
      owner_id: z.string().min(1, 'Owner is required'),
      rider_id: z.string().optional(),
      make: z
        .string()
        .optional()
        .refine(
          optionalStringRefine(isMakeModelChar, 2, 50),
          'Must be between 2 and 50 characters and may contain only letters, numbers, and spaces.'
        ),
      model: z
        .string()
        .optional()
        .refine(
          optionalStringRefine(isMakeModelChar, 1, 50),
          'Must be between 1 and 50 characters and contain only letters, numbers, and spaces.'
        ),
      year: z
        .string()
        .optional()
        .refine(
          (val) => {
            if (!val?.trim()) return true;
            const n = parseInt(val, 10);
            return !isNaN(n) && n >= 1980 && n <= currentYear;
          },
          `Year must be between 1980 and ${currentYear}`
        ),
      color: z
        .string()
        .optional()
        .refine(
          optionalStringRefine(isAlphabeticChar, 3, 30),
          'Must be between 3 and 30 characters and contain letters only.'
        ),
      chassis_number: z
        .string()
        .optional()
        .refine(
          optionalStringRefine(isAlphanumericChar, 5, 30),
          'Must be between 5 and 30 characters and contain only letters and numbers.'
        ),
      engine_number: z
        .string()
        .optional()
        .refine(
          optionalStringRefine(isAlphanumericChar, 5, 30),
          'Must be between 5 and 30 characters and contain only letters and numbers.'
        ),
      photo_url: z.string().optional(),
      status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
      county_id: needsCountySelection
        ? z.string().min(1, 'County is required')
        : z.string().optional(),
    })
    .superRefine(async (data, refineCtx) => {
      const countyId = data.county_id || ctx.countyId;
      const motorbikeId = ctx.motorbikeId;

      // 8. Either chassis_number or engine_number must be present
      const chassis = data.chassis_number?.trim();
      const engine = data.engine_number?.trim();
      if (!chassis && !engine) {
        refineCtx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Either chassis number or engine number is required',
          path: ['chassis_number'],
        });
        refineCtx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Either chassis number or engine number is required',
          path: ['engine_number'],
        });
      }

      // 1. Registration number must be unique (global check)
      const regTrimmed = data.registration_number?.trim().toUpperCase();
      if (regTrimmed) {
        let regQuery = supabase
          .from('motorbikes')
          .select('id')
          .ilike('registration_number', regTrimmed)
          .limit(1);
        if (motorbikeId) regQuery = regQuery.neq('id', motorbikeId);
        const { data: existingReg } = await regQuery.maybeSingle();
        if (existingReg) {
          refineCtx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Registration number is already in use',
            path: ['registration_number'],
          });
        }
      }

      // 6. Chassis number unique if provided
      if (chassis) {
        let chQuery = supabase
          .from('motorbikes')
          .select('id')
          .eq('chassis_number', chassis)
          .limit(1);
        if (motorbikeId) chQuery = chQuery.neq('id', motorbikeId);
        const { data: existing } = await chQuery.maybeSingle();
        if (existing) {
          refineCtx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Chassis number is already in use',
            path: ['chassis_number'],
          });
        }
      }

      // 7. Engine number unique if provided
      if (engine) {
        let enQuery = supabase
          .from('motorbikes')
          .select('id')
          .eq('engine_number', engine)
          .limit(1);
        if (motorbikeId) enQuery = enQuery.neq('id', motorbikeId);
        const { data: existing } = await enQuery.maybeSingle();
        if (existing) {
          refineCtx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Engine number is already in use',
            path: ['engine_number'],
          });
        }
      }

      // 9. Prevent assigning same rider to multiple active vehicles (requires county context)
      const riderId = data.rider_id === 'none' || !data.rider_id ? null : data.rider_id;
      if (countyId && riderId && ['approved', 'pending'].includes(data.status)) {
        let riderQuery = supabase
          .from('motorbikes')
          .select('id')
          .eq('rider_id', riderId)
          .in('status', ['approved', 'pending'])
          .eq('county_id', countyId)
          .limit(2);
        if (motorbikeId) riderQuery = riderQuery.neq('id', motorbikeId);
        const { data: existing } = await riderQuery;
        if (existing && existing.length > 0) {
          refineCtx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'This rider is already assigned to another active vehicle',
            path: ['rider_id'],
          });
        }
      }
    });
}

// Pass context through refinement - we need to inject ctx into superRefine
// Zod superRefine doesn't receive our custom ctx; we use a closure instead.
function createMotorbikeFormSchemaWithContext(
  needsCountySelection: boolean,
  motorbikeId?: string,
  countyId?: string
) {
  return createMotorbikeFormSchema(needsCountySelection, { motorbikeId, countyId });
}

type MotorbikeFormValues = z.output<ReturnType<typeof createMotorbikeFormSchemaWithContext>>;

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
        { name: 'chassis_number', label: 'Chassis Number', placeholder: 'CH123456789', description: 'At least one of Chassis or Engine number is required' },
        { name: 'engine_number', label: 'Engine Number', placeholder: 'EN123456789', description: 'At least one of Chassis or Engine number is required' },
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

  const getDefaultValues = (bike: Motorbike | null | undefined): MotorbikeFormValues => ({
    registration_number: bike?.registration_number || '',
    owner_id: bike?.owner_id || '',
    rider_id: bike?.rider_id || '',
    make: bike?.make || '',
    model: bike?.model || '',
    year: bike?.year?.toString() || '',
    color: bike?.color || '',
    chassis_number: bike?.chassis_number || '',
    engine_number: bike?.engine_number || '',
    photo_url: bike?.photo_url || '',
    status: (bike?.status as 'pending' | 'approved' | 'rejected' | 'suspended') || 'pending',
    county_id: countyId || bike?.county_id || '',
  });

  const schema = useMemo(
    () => createMotorbikeFormSchemaWithContext(needsCountySelection, motorbike?.id, effectiveCountyId),
    [needsCountySelection, motorbike?.id, effectiveCountyId]
  );

  const form = useForm<MotorbikeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(motorbike),
  });

  // When dialog opens (or selected motorbike changes), sync form so edit shows current data
  useEffect(() => {
    if (!open) return;
    form.reset(getDefaultValues(motorbike));
  }, [open, motorbike]);

  const mutation = useMutation({
    mutationFn: async (values: MotorbikeFormValues) => {
      // Determine the county_id to use
      const finalCountyId = values.county_id || selectedCountyId || countyId || motorbike?.county_id;
      
      if (!finalCountyId) {
        throw new Error('County is required. Please select a county.');
      }

      const payload = {
        registration_number: values.registration_number.trim().toUpperCase(),
        owner_id: values.owner_id,
        rider_id: values.rider_id === 'none' || !values.rider_id ? null : values.rider_id,
        make: values.make?.trim() || null,
        model: values.model?.trim() || null,
        year: values.year ? parseInt(values.year, 10) : null,
        color: values.color?.trim() || null,
        chassis_number: values.chassis_number?.trim() || null,
        engine_number: values.engine_number?.trim() || null,
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
                      {fieldDef.description && (
                        <FormDescription>{fieldDef.description}</FormDescription>
                      )}
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
                      {fieldDef.description && (
                        <FormDescription>{fieldDef.description}</FormDescription>
                      )}
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
