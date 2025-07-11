import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrganizationsForWorkOrders, useTrades, useWorkOrderMutations } from '@/hooks/useWorkOrders';
import { useAuth } from '@/contexts/AuthContext';
import { useLocationHistory } from '@/hooks/useLocationHistory';
import { useWorkOrderNumberGeneration } from '@/hooks/useWorkOrderNumberGeneration';
import { AlertCircle, Loader2 } from 'lucide-react';

const createWorkOrderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  organization_id: z.string().min(1, 'Organization is required'),
  trade_id: z.string().min(1, 'Trade is required'),
  store_location: z.string().optional(),
  street_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  partner_po_number: z.string().optional(),
  partner_location_number: z.string().optional(),
});

type CreateWorkOrderForm = z.infer<typeof createWorkOrderSchema>;

interface CreateWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkOrderModal({ isOpen, onClose }: CreateWorkOrderModalProps) {
  const { profile } = useAuth();
  const { data: organizations } = useOrganizationsForWorkOrders();
  const { data: trades } = useTrades();
  const { createWorkOrder } = useWorkOrderMutations();
  const { data: locationHistory } = useLocationHistory();

  const form = useForm<CreateWorkOrderForm>({
    resolver: zodResolver(createWorkOrderSchema),
    defaultValues: {
      title: '',
      description: '',
      organization_id: '',
      trade_id: '',
      store_location: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      partner_po_number: '',
      partner_location_number: '',
    },
  });

  // Watch form values for work order number generation
  const organizationId = form.watch('organization_id');
  const locationNumber = form.watch('partner_location_number');
  
  const { workOrderNumber, isLoading: isGeneratingNumber, error: numberError } = useWorkOrderNumberGeneration({
    organizationId,
    locationNumber,
  });

  // Find selected organization to check for initials
  const selectedOrganization = organizations?.find(org => org.id === organizationId);

  const onSubmit = async (data: CreateWorkOrderForm) => {
    if (!profile?.id) return;

    try {
      await createWorkOrder.mutateAsync({
        title: data.title,
        description: data.description,
        organization_id: data.organization_id,
        trade_id: data.trade_id,
        store_location: data.store_location,
        street_address: data.street_address,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code,
        partner_po_number: data.partner_po_number || null,
        partner_location_number: data.partner_location_number || null,
        work_order_number: workOrderNumber || null,
        created_by: profile.id,
        status: 'received',
        date_submitted: new Date().toISOString(),
      });
      
      form.reset();
      onClose();
    } catch (error) {
      console.error('Error creating work order:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Work Order</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new work order. A work order number will be automatically generated.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Work Order Number */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Work Order Number</label>
              <div className="relative">
                <Input
                  value={workOrderNumber || 'Will be generated automatically...'}
                  disabled
                  className="bg-muted"
                />
                {isGeneratingNumber && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </div>
              
              {/* Organization initials warning */}
              {organizationId && selectedOrganization && !selectedOrganization.initials && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Organization needs initials for smart numbering. Work order will use fallback numbering.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Number generation error */}
              {numberError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {numberError}. Work order will use fallback numbering.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter work order title" {...field} />
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
                    <FormLabel>Organization *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <FormLabel>Trade *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            </div>

            {/* Location Information */}
            <div className="space-y-4">
              <h4 className="font-medium">Location Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="store_location"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Store Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Store #123, Main Branch" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="street_address"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Partner References */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="partner_po_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partner PO Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., PO-2024-001234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partner_location_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., LOC-001, Store-123"
                          list="admin-location-history"
                          {...field}
                        />
                      </FormControl>
                      <datalist id="admin-location-history">
                        {locationHistory?.map((location, index) => (
                          <option key={index} value={location.partner_location_number || ''}>
                            {location.store_location} - {location.partner_location_number}
                          </option>
                        ))}
                      </datalist>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the work that needs to be done..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createWorkOrder.isPending}>
                {createWorkOrder.isPending ? 'Creating...' : 'Create Work Order'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}