import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FormattedInput } from '@/components/ui/formatted-input';
import { useOrganizationsForWorkOrders, useTrades } from '@/hooks/useWorkOrders';
import { Loader2, Flame } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { WorkOrder } from '@/hooks/useWorkOrders';
import { US_STATES } from '@/constants/states';
import { LocationSyncCard } from './LocationSyncCard';
import { usePartnerLocationsForOrganization } from '@/hooks/usePartnerLocationsForOrganization';

const workOrderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  organization_id: z.string().min(1, 'Organization is required'),
  trade_id: z.string().min(1, 'Trade is required'),
  priority: z.enum(['standard', 'urgent']).default('standard'),
  store_location: z.string().optional(),
  location_street_address: z.string().optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional().refine((val) => !val || /^[A-Z]{2}$/.test(val), {
    message: 'State must be a valid 2-character code'
  }),
  location_zip_code: z.string().optional().refine((val) => !val || /^\d{5}(-\d{4})?$/.test(val), {
    message: 'ZIP code must be in format 12345 or 12345-6789'
  }),
  partner_po_number: z.string().optional(),
  partner_location_number: z.string().optional(),
  estimated_hours: z.string().optional(),
  due_date: z.string().optional().transform((val) => val === '' ? undefined : val),
  locationSyncAction: z.enum(['work_order_only', 'update_partner', 'create_new']).optional(),
});

type WorkOrderFormData = z.infer<typeof workOrderSchema>;

interface WorkOrderFormProps {
  workOrder?: WorkOrder;
  onSubmit: (data: WorkOrderFormData & { locationSyncAction?: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function WorkOrderForm({ workOrder, onSubmit, onCancel, isLoading }: WorkOrderFormProps) {
  const { data: organizations, isLoading: orgsLoading } = useOrganizationsForWorkOrders();
  const { data: trades, isLoading: tradesLoading } = useTrades();
  const [isManualMode, setIsManualMode] = useState(false);
  const [locationSyncAction, setLocationSyncAction] = useState<'work_order_only' | 'update_partner' | 'create_new'>('work_order_only');

  const form = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      title: workOrder?.title || '',
      description: workOrder?.description || '',
      organization_id: workOrder?.organization_id || '',
      trade_id: workOrder?.trade_id || '',
      priority: workOrder?.priority || 'standard',
      store_location: workOrder?.store_location || '',
      location_street_address: workOrder?.location_street_address || '',
      location_city: workOrder?.location_city || '',
      location_state: workOrder?.location_state || '',
      location_zip_code: workOrder?.location_zip_code || '',
      partner_po_number: workOrder?.partner_po_number || '',
      partner_location_number: workOrder?.partner_location_number || '',
      estimated_hours: workOrder?.estimated_hours?.toString() || '',
      due_date: workOrder?.due_date || '',
    },
  });

  const organizationId = form.watch('organization_id');
  const { data: partnerLocations } = usePartnerLocationsForOrganization(organizationId);
  
  // Watch partner location number changes to auto-populate address
  const partnerLocationNumber = form.watch('partner_location_number');
  
  useEffect(() => {
    if (partnerLocationNumber && partnerLocationNumber !== 'manual' && partnerLocations) {
      const selectedLocation = partnerLocations.find(loc => loc.location_number === partnerLocationNumber);
      if (selectedLocation) {
        form.setValue('location_street_address', selectedLocation.street_address || '');
        form.setValue('location_city', selectedLocation.city || '');
        form.setValue('location_state', selectedLocation.state || '');
        form.setValue('location_zip_code', selectedLocation.zip_code || '');
      }
    } else if (partnerLocationNumber === 'manual') {
      // Clear partner location number when manual is selected
      form.setValue('partner_location_number', '');
    }
  }, [partnerLocationNumber, partnerLocations, form]);

  const handleFormSubmit = (data: WorkOrderFormData) => {
    onSubmit({ ...data, locationSyncAction });
  };

  const handleLocationSync = (partnerLocationId: string, syncAction: 'work_order_only' | 'update_partner' | 'create_new') => {
    setLocationSyncAction(syncAction);
  };

  if (orgsLoading || tradesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        
        <LocationSyncCard
          organizationId={organizationId}
          workOrderData={{
            street_address: form.watch('location_street_address'),
            city: form.watch('location_city'),
            state: form.watch('location_state'),
            zip_code: form.watch('location_zip_code'),
            store_location: form.watch('store_location'),
            partner_location_number: form.watch('partner_location_number'),
          }}
          onLocationSync={handleLocationSync}
          onManualModeChange={setIsManualMode}
          isManualMode={isManualMode}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="organization_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {organizations?.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
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
            name="trade_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trade</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {trades?.map((trade) => (
                      <SelectItem key={trade.id} value={trade.id}>
                        {trade.name}
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
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-row space-x-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="standard" id="standard" />
                      <Label htmlFor="standard" className="flex items-center gap-2">
                        Standard
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="urgent" id="urgent" />
                      <Label htmlFor="urgent" className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-destructive" />
                        Urgent
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="store_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Store Location</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="partner_po_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PO Number</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estimated_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Hours</FormLabel>
                <FormControl>
                  <Input type="number" step="0.5" {...field} />
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
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Location Details</h3>
          
          <FormField
            control={form.control}
            name="partner_location_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Partner Location</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select partner location or manual entry" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                    {partnerLocations?.map((location) => (
                      <SelectItem key={location.id} value={location.location_number}>
                        {location.location_number} - {location.location_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="location_street_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <FormattedInput 
                      {...field} 
                      formatter="streetAddress" 
                      placeholder="123 Main Street" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="location_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <FormattedInput 
                        {...field} 
                        formatter="city" 
                        placeholder="City" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
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
                name="location_zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <FormattedInput 
                        {...field} 
                        formatter="zip" 
                        placeholder="12345 or 12345-6789" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {workOrder ? 'Update' : 'Create'} Work Order
          </Button>
        </div>
      </form>
    </Form>
  );
}