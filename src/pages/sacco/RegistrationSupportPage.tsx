import { useState, useMemo, useEffect, useRef } from 'react';
import { SaccoPortalLayout } from '@/components/layout/SaccoPortalLayout';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateRiderQRCode } from '@/lib/qrCode';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSaccos, useStages, RiderWithDetails } from '@/hooks/useData';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  UserPlus,
  Search,
  Users,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { RegistrationTable } from '@/components/registration/RegistrationTable';
import { RiderDetailDialog } from '@/components/registration/RiderDetailDialog';
import {
  riderNameSchema,
  riderPhoneSchema,
  riderDateOfBirthSchema,
  riderLicenseExpirySchema,
  riderLicenseNumberSchema,
  riderIdNumberSchema,
  riderAddressSchema,
} from '@/lib/riderValidation';

const createRegistrationSchema = (hasSaccos: boolean) => z.object({
  full_name: riderNameSchema,
  id_number: riderIdNumberSchema,
  phone: riderPhoneSchema,
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  date_of_birth: riderDateOfBirthSchema,
  address: riderAddressSchema,
  license_number: riderLicenseNumberSchema,
  license_expiry: riderLicenseExpirySchema,
  sacco_id: hasSaccos ? z.string().min(1, 'Sacco is required') : z.string().optional(),
  stage_id: z.string().optional(),
  status: z.enum(['pending', 'approved']),
});

type RegistrationFormValues = z.infer<ReturnType<typeof createRegistrationSchema>>;

interface DuplicateCheck {
  id_number: boolean;
  phone: boolean;
  existingRider?: RiderWithDetails;
}

// Step 1: Personal & Contact + DOB | Step 2: ID + DL, expiry + address | Step 3: Sacco, Stage + Initial Status
const REGISTRATION_WIZARD_STEP_GROUPS: {
  label: string;
  fields: { name: keyof RegistrationFormValues; label: string; placeholder?: string; description?: string }[];
}[] = [
  {
    label: 'Personal & Contact',
    fields: [
      { name: 'full_name', label: 'Full Name', placeholder: 'John Doe' },
      { name: 'phone', label: 'Phone Number', placeholder: '+254700000000' },
      { name: 'date_of_birth', label: 'Date of Birth' },
      { name: 'email', label: 'Email', placeholder: 'email@example.com' },
     
    ],
  },
  {
    label: 'Driver Licence & Additional',
    fields: [
      { name: 'id_number', label: 'ID Number', placeholder: '12345678', description: 'Checking for duplicates...' },
      { name: 'license_number', label: 'License Number (DL)', placeholder: 'DL-123456' },
      { name: 'license_expiry', label: 'License Expiry' },
      { name: 'address', label: 'Address', placeholder: 'Kisumu, Kenya' },
    ],
  },
  {
    label: 'Sacco & Stage',
    fields: [
      { name: 'sacco_id', label: 'Sacco/Welfare Membership', description: "Confirm the rider's Sacco/Welfare membership" },
      { name: 'stage_id', label: 'Stage' },
      { name: 'status', label: 'Initial Status', description: 'Choose to approve immediately or mark for review' },
    ],
  },
];

export default function RegistrationSupportPage() {
  const { profile, roles } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRider, setSelectedRider] = useState<RiderWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheck | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const stepFieldsRef = useRef<HTMLDivElement>(null);

  const countyId = useMemo(
    () => profile?.county_id ?? roles.find((r) => r.county_id)?.county_id ?? undefined,
    [profile, roles]
  );

  const { data: saccos = [], isLoading: saccosLoading } = useSaccos(countyId);
  const [saccoId, setSaccoId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (saccos.length > 0 && !saccoId) {
      setSaccoId(saccos[0].id);
    }
    if (saccos.length === 0) {
      setSaccoId(undefined);
    }
  }, [saccos, saccoId]);

  const { data: stages = [] } = useStages(countyId, saccoId);

  // Fetch pending riders for the selected sacco
  const { data: pendingRiders = [], isLoading: ridersLoading } = useQuery({
    queryKey: ['sacco-pending-riders', saccoId, countyId],
    queryFn: async () => {
      if (!saccoId || !countyId) return [];

      const { data, error } = await supabase
        .from('riders')
        .select(
          `
          *,
          owner:owners(full_name),
          sacco:saccos(name),
          stage:stages(name)
        `
        )
        .eq('sacco_id', saccoId)
        .eq('county_id', countyId)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get motorbikes and permits
      const riderIds = (data || []).map((r) => r.id);
      if (riderIds.length === 0) return [];

      const [motorbikesResult, permitsResult] = await Promise.all([
        supabase
          .from('motorbikes')
          .select('id, registration_number, rider_id')
          .in('rider_id', riderIds),
        supabase
          .from('permits')
          .select('id, permit_number, status, expires_at, rider_id')
          .in('rider_id', riderIds)
          .in('status', ['active', 'pending'])
          .order('created_at', { ascending: false }),
      ]);

      const motorbikeMap = new Map(
        (motorbikesResult.data || []).map((m) => [m.rider_id, { id: m.id, registration_number: m.registration_number }])
      );

      const permitMap = new Map<string, typeof permitsResult.data[0]>();
      (permitsResult.data || []).forEach((p) => {
        if (!permitMap.has(p.rider_id)) {
          permitMap.set(p.rider_id, p);
        }
      });

      return (data || []).map((rider) => ({
        ...rider,
        motorbike: motorbikeMap.get(rider.id) || null,
        permit: permitMap.get(rider.id)
          ? {
              id: permitMap.get(rider.id)!.id,
              permit_number: permitMap.get(rider.id)!.permit_number,
              status: permitMap.get(rider.id)!.status as 'active' | 'expired' | 'pending' | 'suspended' | 'cancelled',
              expires_at: permitMap.get(rider.id)!.expires_at,
            }
          : null,
      })) as RiderWithDetails[];
    },
    enabled: !!saccoId && !!countyId,
  });

  const registrationSchema = useMemo(() => createRegistrationSchema(saccos.length > 0), [saccos.length]);

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
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
      status: 'pending',
    },
    mode: 'onChange',
  });

  // Watch form values for duplicate checking
  const idNumber = form.watch('id_number');
  const phone = form.watch('phone');
  const formSaccoId = form.watch('sacco_id');

  // Check for duplicates when ID number or phone changes
  useEffect(() => {
    const checkDuplicates = async () => {
      if (!countyId) {
        setDuplicateCheck(null);
        return;
      }

      if (!idNumber && !phone) {
        setDuplicateCheck(null);
        return;
      }

      if (idNumber.length < 2 && !/^\+?\d{5,15}$/.test(phone)) {
        setDuplicateCheck(null);
        return;
      }

      setIsCheckingDuplicate(true);
      try {
        let query = supabase.from('riders').select('*').eq('county_id', countyId);

        if (idNumber.length >= 2) {
          query = query.eq('id_number', idNumber);
        } else if (/^\+?\d{5,15}$/.test(phone)) {
          query = query.eq('phone', phone);
        }

        const { data, error } = await query.limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const existing = data[0];
          setDuplicateCheck({
            id_number: existing.id_number === idNumber,
            phone: existing.phone === phone,
            existingRider: existing as any,
          });
        } else {
          setDuplicateCheck({
            id_number: false,
            phone: false,
          });
        }
      } catch (error) {
        console.error('Error checking duplicates:', error);
        setDuplicateCheck(null);
      } finally {
        setIsCheckingDuplicate(false);
      }
    };

    const timeoutId = setTimeout(checkDuplicates, 500);
    return () => clearTimeout(timeoutId);
  }, [idNumber, phone, countyId]);

  // Update sacco_id in form when saccoId changes
  useEffect(() => {
    if (saccoId && formSaccoId !== saccoId) {
      form.setValue('sacco_id', saccoId);
    }
  }, [saccoId, formSaccoId, form]);

  // Focus first field when step changes so submit button doesn't receive focus (avoids auto-submit on step 4)
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

  const registrationMutation = useMutation({
    mutationFn: async (values: RegistrationFormValues) => {
      if (!countyId) {
        throw new Error('County is required');
      }

      if (!values.sacco_id) {
        throw new Error('Sacco is required');
      }

      // Check for duplicates one more time before submitting
      if (duplicateCheck?.existingRider) {
        throw new Error('Duplicate registration detected. Please review the existing rider.');
      }

      const payload = {
        full_name: values.full_name,
        id_number: values.id_number,
        phone: values.phone,
        status: values.status,
        county_id: countyId,
        email: (values.email || '').trim().toLowerCase() || null,
        date_of_birth: values.date_of_birth || null,
        address: values.address || null,
        license_number: values.license_number || null,
        license_expiry: values.license_expiry || null,
        sacco_id: values.sacco_id,
        stage_id: values.stage_id || null,
        qr_code: generateRiderQRCode(),
      };

      const { error } = await supabase.from('riders').insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sacco-pending-riders'] });
      queryClient.invalidateQueries({ queryKey: ['sacco-members'] });
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      toast.success('Rider registered successfully');
      form.reset();
      setDuplicateCheck(null);
      setWizardStep(0);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Registration failed');
    },
  });

  const onSubmit = (values: RegistrationFormValues) => {
    if (duplicateCheck?.existingRider) {
      toast.error('Duplicate registration detected. Please review the existing rider.');
      return;
    }
    registrationMutation.mutate(values);
  };

  const filteredRiders = useMemo(() => {
    if (!searchQuery) return pendingRiders;
    const query = searchQuery.toLowerCase();
    return pendingRiders.filter(
      (rider) =>
        rider.full_name.toLowerCase().includes(query) ||
        rider.id_number.toLowerCase().includes(query) ||
        rider.phone.includes(query) ||
        rider.motorbike?.registration_number.toLowerCase().includes(query)
    );
  }, [pendingRiders, searchQuery]);

  const hasDuplicate = duplicateCheck?.existingRider !== undefined;
  const isSuspicious = duplicateCheck?.id_number || duplicateCheck?.phone;

  if (!countyId) {
    return (
      <SaccoPortalLayout>
        <div className="space-y-4 sm:space-y-6 px-3 sm:px-0 max-w-full min-w-0">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">Registration Support</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              Assist with rider registration • Validate identity • Confirm membership • Flag duplicates
            </p>
          </div>
          <Alert className="text-sm sm:text-base">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <AlertDescription>
              County information is required to access registration support. Please ensure your account is associated with a county.
            </AlertDescription>
          </Alert>
        </div>
      </SaccoPortalLayout>
    );
  }

  return (
    <SaccoPortalLayout>
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-0 max-w-full min-w-0">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">Registration Support</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              Assist with rider registration • Validate identity • Confirm membership • Flag duplicates
            </p>
          </div>

          {/* Sacco selector */}
          <div className="w-full sm:max-w-xs">
            <Select
              value={saccoId ?? ''}
              onValueChange={(v) => setSaccoId(v || undefined)}
              disabled={saccosLoading || saccos.length === 0}
            >
              <SelectTrigger className="min-h-[44px] w-full touch-manipulation">
                <SelectValue placeholder={saccosLoading ? 'Loading…' : saccos.length === 0 ? 'No saccos available' : 'Select sacco'} />
              </SelectTrigger>
              <SelectContent>
                {saccos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {saccos.length === 0 && !saccosLoading && (
              <p className="text-sm text-muted-foreground mt-2">
                No saccos available. Please create a sacco first.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Registration Form */}
          <Card className="overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <UserPlus className="h-5 w-5 shrink-0" />
                Register New Rider
              </CardTitle>
              <CardDescription className="text-sm">
                Step through each field one at a time. The system will automatically check for duplicates.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <Form {...form}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (wizardStep === REGISTRATION_WIZARD_STEP_GROUPS.length - 1) {
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
                        Step {wizardStep + 1} of {REGISTRATION_WIZARD_STEP_GROUPS.length}
                      </span>
                      <span className="text-muted-foreground">
                        {REGISTRATION_WIZARD_STEP_GROUPS[wizardStep].label}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${((wizardStep + 1) / REGISTRATION_WIZARD_STEP_GROUPS.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Duplicate Alert */}
                  {hasDuplicate && duplicateCheck?.existingRider && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-semibold mb-2">Duplicate Registration Detected!</div>
                        <div className="text-sm space-y-1">
                          <p>
                            A rider with{' '}
                            {duplicateCheck.id_number && duplicateCheck.phone
                              ? 'this ID number and phone number'
                              : duplicateCheck.id_number
                              ? 'this ID number'
                              : 'this phone number'}{' '}
                            already exists:
                          </p>
                          <p className="font-medium">
                            {duplicateCheck.existingRider.full_name} (ID: {duplicateCheck.existingRider.id_number})
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              setSelectedRider(duplicateCheck.existingRider!);
                              setIsDetailOpen(true);
                            }}
                          >
                            View Existing Rider
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Suspicious Warning */}
                  {isSuspicious && !hasDuplicate && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Potential duplicate detected. Please verify this is a new registration.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Validation Status */}
                  {!isCheckingDuplicate && !hasDuplicate && idNumber.length >= 2 && /^\+?\d{5,15}$/.test(phone) && (
                    <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-950">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        No duplicates found. Ready to register.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Current step fields (grouped) */}
                  <div ref={stepFieldsRef} className="min-h-[120px] space-y-4">
                    {REGISTRATION_WIZARD_STEP_GROUPS[wizardStep].fields.map((fieldDef) => (
                      <div key={fieldDef.name}>
                        {fieldDef.name === 'full_name' && (
                          <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder={fieldDef.placeholder ?? 'John Doe'} className="text-base min-h-[48px]" maxLength={40} {...field} />
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
                                  <div className="relative">
                                    <Input placeholder={fieldDef.placeholder ?? '12345678'} className="text-base min-h-[48px]" {...field} />
                                    {isCheckingDuplicate && (
                                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                                {fieldDef.description && <FormDescription>{fieldDef.description}</FormDescription>}
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
                                  <Input placeholder={fieldDef.placeholder ?? '+254700000000'} className="text-base min-h-[48px]" inputMode="tel" minLength={5} maxLength={16} {...field} />
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
                                  <Input placeholder={fieldDef.placeholder ?? 'email@example.com'} type="email" className="text-base min-h-[48px]" {...field} />
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
                                  <Input placeholder={fieldDef.placeholder ?? 'Kisumu, Kenya'} className="text-base min-h-[48px]" {...field} />
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
                                <FormLabel>License Number (DL)</FormLabel>
                                <FormControl>
                                  <Input placeholder={fieldDef.placeholder ?? 'DL-123456'} className="text-base min-h-[48px]" {...field} />
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
                                <FormLabel>Sacco/Welfare Membership *</FormLabel>
                                <Select
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    setSaccoId(value);
                                  }}
                                  value={field.value || saccoId || ''}
                                  disabled={saccosLoading}
                                >
                                  <FormControl>
                                    <SelectTrigger className="min-h-[48px] text-base">
                                      <SelectValue placeholder="Select Sacco" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {saccos.map((sacco) => (
                                      <SelectItem key={sacco.id} value={sacco.id}>
                                        {sacco.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                                {fieldDef.description && <FormDescription>{fieldDef.description}</FormDescription>}
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
                                <Select
                                  onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                                  value={field.value || '__none__'}
                                >
                                  <FormControl>
                                    <SelectTrigger className="min-h-[48px] text-base">
                                      <SelectValue placeholder="Select Stage (Optional)" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="__none__">None</SelectItem>
                                    {stages
                                      .filter((s) => s.sacco_id === (form.watch('sacco_id') || saccoId))
                                      .map((stage) => (
                                        <SelectItem key={stage.id} value={stage.id}>
                                          {stage.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
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
                                <FormLabel>Initial Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="min-h-[48px] text-base">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending Review</SelectItem>
                                    <SelectItem value="approved">Approve Immediately</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                                {fieldDef.description && <FormDescription>{fieldDef.description}</FormDescription>}
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Wizard navigation */}
                  <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                    <div className="flex gap-2 flex-1">
                      {wizardStep > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setWizardStep((s) => s - 1)}
                          className="min-h-[44px] touch-manipulation"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Back
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            form.reset();
                            setDuplicateCheck(null);
                            setWizardStep(0);
                          }}
                          className="min-h-[44px] touch-manipulation"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    {wizardStep < REGISTRATION_WIZARD_STEP_GROUPS.length - 1 ? (
                      <Button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const fieldNames = REGISTRATION_WIZARD_STEP_GROUPS[wizardStep].fields.map((f) => f.name);
                          const valid = await form.trigger(fieldNames);
                          if (valid) setWizardStep((s) => s + 1);
                        }}
                        className="min-h-[44px] touch-manipulation"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        disabled={registrationMutation.isPending || hasDuplicate || isCheckingDuplicate}
                        onClick={() => form.handleSubmit(onSubmit)()}
                        className="min-h-[44px] touch-manipulation"
                      >
                        {registrationMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Registering...
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Register Rider
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Recent Registrations */}
          <Card className="overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-5 w-5 shrink-0" />
                Recent Registrations
              </CardTitle>
              <CardDescription className="text-sm">
                View and manage recently registered riders for this sacco
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-4">
                {/* Search */}
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, ID, phone, or plate..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 min-h-[44px] w-full text-base sm:text-sm touch-manipulation"
                  />
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-3 sm:gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{filteredRiders.length}</Badge>
                    <span className="text-muted-foreground">Total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      {filteredRiders.filter((r) => r.status === 'pending').length}
                    </Badge>
                    <span className="text-muted-foreground">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {filteredRiders.filter((r) => r.status === 'approved').length}
                    </Badge>
                    <span className="text-muted-foreground">Approved</span>
                  </div>
                </div>

                {/* Registration Table */}
                <div className="max-h-[500px] sm:max-h-[600px] overflow-y-auto overflow-x-hidden -mx-1 px-1 sm:mx-0 sm:px-0">
                  <RegistrationTable
                    riders={filteredRiders}
                    onView={(rider) => {
                      setSelectedRider(rider);
                      setIsDetailOpen(true);
                    }}
                    isLoading={ridersLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rider Detail Dialog */}
      <RiderDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        rider={selectedRider}
      />
    </SaccoPortalLayout>
  );
}
