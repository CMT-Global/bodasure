import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Loader2, CreditCard, Smartphone } from 'lucide-react';
import { usePermitTypes, useInitializePayment } from '@/hooks/usePayments';
import { useRiders, useMotorbikes } from '@/hooks/useData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const paymentFormSchema = z.object({
  rider_id: z.string().min(1, 'Please select a rider'),
  motorbike_id: z.string().min(1, 'Please select a motorbike'),
  permit_type_id: z.string().min(1, 'Please select a permit type'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  payment_method: z.enum(['card', 'mobile_money']),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countyId: string;
  preselectedRiderId?: string;
  preselectedMotorbikeId?: string;
}

export function PaymentDialog({
  open,
  onOpenChange,
  countyId,
  preselectedRiderId,
  preselectedMotorbikeId,
}: PaymentDialogProps) {
  const [selectedPermitType, setSelectedPermitType] = useState<string | null>(null);
  
  const { data: permitTypes = [], isLoading: loadingPermitTypes } = usePermitTypes(countyId);
  const { data: riders = [], isLoading: loadingRiders } = useRiders(countyId);
  const { data: motorbikes = [], isLoading: loadingMotorbikes } = useMotorbikes(countyId);
  const initializePayment = useInitializePayment();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      rider_id: preselectedRiderId || '',
      motorbike_id: preselectedMotorbikeId || '',
      permit_type_id: '',
      email: '',
      phone: '',
      payment_method: 'mobile_money',
    },
  });

  const selectedType = permitTypes.find(pt => pt.id === form.watch('permit_type_id'));
  const paymentMethod = form.watch('payment_method');

  const onSubmit = async (values: PaymentFormValues) => {
    if (!selectedType) return;

    await initializePayment.mutateAsync({
      amount: selectedType.amount,
      email: values.email,
      phone: values.payment_method === 'mobile_money' ? values.phone : undefined,
      permit_type_id: values.permit_type_id,
      rider_id: values.rider_id,
      motorbike_id: values.motorbike_id,
      county_id: countyId,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Purchase Permit</DialogTitle>
          <DialogDescription>
            Select a permit type and complete payment via M-Pesa or Card
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Rider & Motorbike Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rider_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rider *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {riders.map((rider) => (
                          <SelectItem key={rider.id} value={rider.id}>
                            {rider.full_name} - {rider.id_number}
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
                name="motorbike_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motorbike *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select motorbike" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {motorbikes.map((bike) => (
                          <SelectItem key={bike.id} value={bike.id}>
                            {bike.registration_number} - {bike.make} {bike.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Permit Type Selection */}
            <FormField
              control={form.control}
              name="permit_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permit Type *</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {loadingPermitTypes ? (
                      <div className="col-span-2 flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : permitTypes.length === 0 ? (
                      <div className="col-span-2 text-center py-4 text-muted-foreground">
                        No permit types available
                      </div>
                    ) : (
                      permitTypes.map((type) => (
                        <Card
                          key={type.id}
                          className={`cursor-pointer transition-all ${
                            field.value === type.id
                              ? 'ring-2 ring-primary border-primary'
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => field.onChange(type.id)}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{type.name}</CardTitle>
                              <Badge variant="secondary">
                                {type.duration_days} days
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold text-primary">
                              {formatCurrency(type.amount)}
                            </p>
                            {type.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {type.description}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="mobile_money" id="mobile_money" />
                        <Label htmlFor="mobile_money" className="flex items-center gap-2 cursor-pointer">
                          <Smartphone className="h-4 w-4" />
                          M-Pesa
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer">
                          <CreditCard className="h-4 w-4" />
                          Card
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input placeholder="email@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {paymentMethod === 'mobile_money' && (
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>M-Pesa Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="254708374149" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Summary */}
            {selectedType && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-2xl font-bold">{formatCurrency(selectedType.amount)}</p>
                    </div>
                    <Badge variant="outline" className="text-primary">
                      {selectedType.name} - {selectedType.duration_days} days
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={initializePayment.isPending || !selectedType}>
                {initializePayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {paymentMethod === 'mobile_money' ? 'Pay with M-Pesa' : 'Pay with Card'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
