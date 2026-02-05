import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateRiderQRCode } from '@/lib/qrCode';
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
import { useSaccos, useStages, useOwners, Rider, useCounties } from '@/hooks/useData';
import { riderFormSchema, RiderFormValues } from '@/lib/zod';

type WizardStepGroup = {
  label: string;
  fields: { name: keyof RiderFormValues; label: string; placeholder?: string; description?: string }[];
};

function getRiderWizardStepGroups(needsCountySelection: boolean): WizardStepGroup[] {
  const base: WizardStepGroup[] = [
    {
      label: 'Personal & Contact',
      fields: [
        { name: 'full_name', label: 'Full Name', placeholder: 'John Doe' },
        { name: 'phone', label: 'Phone Number', placeholder: '+254700000000' },
        { name: 'email', label: 'Email', placeholder: 'email@example.com' },
        { name: 'date_of_birth', label: 'Date of Birth' },
      ],
    },
    {
      label: 'Driver Licence & Additional',
      fields: [
        { name: 'id_number', label: 'ID Number', placeholder: '12345678' },
        { name: 'license_number', label: 'License Number (DL)', placeholder: 'DL-123456' },
        { name: 'license_expiry', label: 'License Expiry' },
        { name: 'address', label: 'Address', placeholder: 'Kisumu, Kenya' },
      ],
    },
    {
      label: 'Sacco & Stage',
      fields: [
        { name: 'sacco_id', label: 'Sacco', description: "Select the rider's Sacco" },
        { name: 'stage_id', label: 'Stage', description: "Select the rider's stage" },
        { name: 'owner_id', label: 'Bike Owner', description: 'Select bike owner or Self-owned' },
        { name: 'status', label: 'Initial Status', description: 'Set initial status' },
      ],
    },
  ];
  if (needsCountySelection) {
    return [
      { label: 'County', fields: [{ name: 'county_id', label: 'County', description: 'Select the county for this rider' }] },
      ...base,
    ];
  }
  return base;
}

interface RiderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rider?: Rider | null;
  countyId?: string;
}

export function RiderFormDialog({ open, onOpenChange, rider, countyId }: RiderFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!rider;
  const [selectedCountyId, setSelectedCountyId] = useState<string | undefined>(countyId);
  const [wizardStep, setWizardStep] = useState(0);
  const stepFieldsRef = useRef<HTMLDivElement>(null);

  // For superadmins, allow county selection
  const needsCountySelection = !countyId;
  const stepGroups = useMemo(() => getRiderWizardStepGroups(needsCountySelection), [needsCountySelection]);
  const { data: counties = [] } = useCounties();
  
  // Use selected county or provided countyId
  const effectiveCountyId = selectedCountyId || countyId;
  
  const { data: saccos = [] } = useSaccos(effectiveCountyId);
  const { data: stages = [] } = useStages(effectiveCountyId);
  const { data: owners = [] } = useOwners(effectiveCountyId);

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

  const form = useForm<RiderFormValues>({
    resolver: zodResolver(riderFormSchema(needsCountySelection)),
    defaultValues: {
      full_name: '',
      id_number: '',
      phone: '',
      email: '',
      date_of_birth: '',
      address: '',
      license_number: '',
      license_expiry: '',
      sacco_id: '',
      stage_id: '',
      owner_id: '',
      status: 'pending',
      county_id: '',
    },
  });

  // When dialog opens (add or edit), reset form with current rider. Same Zod schema validates both add and edit.
  useEffect(() => {
    if (open) {
      form.reset({
        full_name: rider?.full_name || '',
        id_number: rider?.id_number || '',
        phone: rider?.phone || '',
        email: rider?.email || '',
        date_of_birth: rider?.date_of_birth || '',
        address: rider?.address || '',
        license_number: rider?.license_number || '',
        license_expiry: rider?.license_expiry || '',
        sacco_id: rider?.sacco_id || '',
        stage_id: rider?.stage_id || '',
        owner_id: rider?.owner_id || '',
        status: rider?.status || 'pending',
        county_id: countyId || rider?.county_id || '',
      });
      // Trigger validation when editing so invalid existing data (e.g. DOB in future) shows errors immediately
      if (rider) {
        void form.trigger();
      }
    }
  }, [open, rider, countyId]);

  const mutation = useMutation({
    mutationFn: async (values: RiderFormValues) => {
      // Determine the county_id to use
      const finalCountyId = values.county_id || selectedCountyId || countyId || rider?.county_id;
      
      if (!finalCountyId) {
        throw new Error('County is required. Please select a county.');
      }

      const payload = {
        full_name: values.full_name,
        id_number: values.id_number,
        phone: values.phone,
        status: values.status,
        county_id: finalCountyId,
        email: (values.email || '').trim().toLowerCase() || null,
        date_of_birth: values.date_of_birth || null,
        address: values.address || null,
        license_number: values.license_number || null,
        license_expiry: values.license_expiry || null,
        sacco_id: values.sacco_id === 'none' ? null : values.sacco_id || null,
        stage_id: values.stage_id === 'none' ? null : values.stage_id || null,
        owner_id: values.owner_id === 'none' ? null : values.owner_id || null,
        ...(isEditing ? {} : { qr_code: generateRiderQRCode() }),
      };

      if (isEditing && rider) {
        const { error } = await supabase
          .from('riders')
          .update(payload)
          .eq('id', rider.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('riders')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      toast.success(isEditing ? 'Rider updated successfully' : 'Rider added successfully');
      onOpenChange(false);
      form.reset();
      setWizardStep(0);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred');
    },
  });

  const onSubmit = (values: RiderFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Rider' : 'Add New Rider'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update rider information' : 'Register a new rider in the system'}
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
                  {fieldDef.name === 'full_name' && (
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" className="text-base min-h-[48px]" maxLength={40} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'id_number' && (
                <FormField
                  control={form.control}
                  name="id_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678" className="text-base min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'phone' && (
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="+254700000000" className="text-base min-h-[48px]" inputMode="tel" minLength={5} maxLength={16} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'email' && (
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" type="email" className="text-base min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'date_of_birth' && (
                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" className="date-input-visible text-base min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'address' && (
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Kisumu, Kenya" className="text-base min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'license_number' && (
                <FormField
                  control={form.control}
                  name="license_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Number</FormLabel>
                      <FormControl>
                        <Input placeholder="DL-123456" className="text-base min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'license_expiry' && (
                <FormField
                  control={form.control}
                  name="license_expiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Expiry</FormLabel>
                      <FormControl>
                        <Input type="date" className="date-input-visible text-base min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
                  {fieldDef.name === 'sacco_id' && (
                <FormField
                  control={form.control}
                  name="sacco_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sacco</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="min-h-[48px] text-base">
                            <SelectValue placeholder="Select a Sacco" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {saccos.map((sacco) => (
                            <SelectItem key={sacco.id} value={sacco.id}>
                              {sacco.name}
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
                  {fieldDef.name === 'stage_id' && (
                <FormField
                  control={form.control}
                  name="stage_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="min-h-[48px] text-base">
                            <SelectValue placeholder="Select a Stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
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
                  {fieldDef.name === 'owner_id' && (
                <FormField
                  control={form.control}
                  name="owner_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bike Owner</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="min-h-[48px] text-base">
                            <SelectValue placeholder="Select an Owner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Self-owned</SelectItem>
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
                  {isEditing ? 'Update Rider' : 'Add Rider'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
