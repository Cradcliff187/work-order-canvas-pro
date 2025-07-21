import { useState, useEffect, useMemo } from 'react';
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
import { useOrganization } from '@/hooks/useOrganizations';
import { useLocationHistory } from '@/hooks/useLocationHistory';
import { useUserOrganization } from '@/hooks/useUserOrganization';
import { LocationFields } from '@/components/LocationFields';
import { useWorkOrderNumberGeneration } from '@/hooks/useWorkOrderNumberGeneration';
import { AlertCircle, Loader2 } from 'lucide-react';

type CreateWorkOrderForm = {
  title: string;
  description?: string;
  organization_id: string;
  trade_id: string;
  store_location?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  location_street_address?: string;
  location_city?: string;
  location_state?: string;
  location_zip_code?: string;
  partner_po_number?: string;
  partner_location_number?: string;
};

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
  const { organization, loading: organizationLoading } = useUserOrganization();

  // Watch form values for work order number generation
  const [organizationId, setOrganizationId] = useState('');
  const [locationNumber, setLocationNumber] = useState('');
  const { data: selectedOrg } = useOrganization(organizationId);

  // Create dynamic schema with conditional partner_location_number validation
  const createWorkOrderSchema = useMemo(() => {
    const baseSchema = z.object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().optional(),
      organization_id: z.string().min(1, 'Organization is required'),
      trade_id: z.string().min(1, 'Trade is required'),
      store_location: z.string().optional(),
      street_address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip_code: z.string().optional(),
      location_street_address: z.string().optional(),
      location_city: z.string().optional(),
      location_state: z.string().optional(),
      location_zip_code: z.string().optional(),
      partner_po_number: z.string().optional(),
      partner_location_number: selectedOrg?.uses_partner_location_numbers === true
        ? z.string().min(1, 'Location number is required')
        : z.string().optional(),
    });

    return baseSchema.superRefine((data, ctx) => {
      // Check if we're in new location mode
      const hasPartnerLocation = data.partner_location_number && !data.location_street_address;
      const isNewLocation = !hasPartnerLocation && (data.location_street_address || data.location_city || data.location_state || data.location_zip_code);
      
      if (isNewLocation) {
        if (!data.store_location) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Store/Location Name is required',
            path: ['store_location'],
          });
        }
        if (!data.location_street_address) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Street Address is required',
            path: ['location_street_address'],
          });
        }
        if (!data.location_city) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'City is required',
            path: ['location_city'],
          });
        }
        if (!data.location_state) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'State is required',
            path: ['location_state'],
          });
        }
        if (!data.location_zip_code) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'ZIP Code is required',
            path: ['location_zip_code'],
          });
        }
      }
    });
  }, [selectedOrg?.uses_partner_location_numbers]);

  // Create dynamic schema based on user type
  const createWorkOrderSchemaForUser = useMemo(() => {
    if (profile?.user_type === 'admin') {
      return createWorkOrderSchema;
    }
    
    const partnerBaseSchema = z.object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().optional(),
      organization_id: z.string().optional(), // Auto-populated for partners
      trade_id: z.string().min(1, 'Trade is required'),
      store_location: z.string().optional(),
      street_address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip_code: z.string().optional(),
      location_street_address: z.string().optional(),
      location_city: z.string().optional(),
      location_state: z.string().optional(),
      location_zip_code: z.string().optional(),
      partner_po_number: z.string().optional(),
      partner_location_number: selectedOrg?.uses_partner_location_numbers === true
        ? z.string().min(1, 'Location number is required')
        : z.string().optional(),
    });

    return partnerBaseSchema.superRefine((data, ctx) => {
      // Same validation logic for partners
      const hasPartnerLocation = data.partner_location_number && !data.location_street_address;
      const isNewLocation = !hasPartnerLocation && (data.location_street_address || data.location_city || data.location_state || data.location_zip_code);
      
      if (isNewLocation) {
        if (!data.store_location) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Store/Location Name is required',
            path: ['store_location'],
          });
        }
        if (!data.location_street_address) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Street Address is required',
            path: ['location_street_address'],
          });
        }
        if (!data.location_city) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'City is required',
            path: ['location_city'],
          });
        }
        if (!data.location_state) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'State is required',
            path: ['location_state'],
          });
        }
        if (!data.location_zip_code) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'ZIP Code is required',
            path: ['location_zip_code'],
          });
        }
      }
    });
  }, [profile?.user_type, createWorkOrderSchema, selectedOrg?.uses_partner_location_numbers]);

  const form = useForm<CreateWorkOrderForm>({
    resolver: zodResolver(createWorkOrderSchemaForUser),
    defaultValues: {
      title: '',
      description: '',
      organization_id: profile?.user_type === 'partner' ? (organization?.id || '') : '',
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

  // Auto-set organization for partners when organization data loads
  useEffect(() => {
    if (profile?.user_type === 'partner' && organization?.id) {
      form.setValue('organization_id', organization.id);
      setOrganizationId(organization.id);
    }
  }, [profile?.user_type, organization?.id, form]);

  // Watch for organization and location changes
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.organization_id !== organizationId) {
        setOrganizationId(values.organization_id || '');
      }
      if (values.partner_location_number !== locationNumber) {
        setLocationNumber(values.partner_location_number || '');
      }
    });
    return () => subscription.unsubscribe();
  }, [form, organizationId, locationNumber]);

  // Trigger validation when schema changes
  useEffect(() => {
    form.trigger();
  }, [createWorkOrderSchemaForUser, form]);
  
  // Find selected organization to get organization type
  const selectedOrganization = profile?.user_type === 'admin' 
    ? organizations?.find(org => org.id === organizationId)
    : organization;
  
  const { 
    workOrderNumber, 
    isLoading: isGeneratingNumber, 
    error: numberError,
    isFallback,
    warning,
    requiresInitials,
    organizationName,
    locationNumber: generatedLocationNumber
  } = useWorkOrderNumberGeneration({
    organizationId,
    locationNumber,
  });


  const onSubmit = async (data: CreateWorkOrderForm) => {
    if (!profile?.id) return;

    // For partners, ensure organization is set
    if (profile.user_type === 'partner' && !data.organization_id) {
      console.error('Partner user must have an organization');
      return;
    }

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
        location_street_address: data.location_street_address,
        location_city: data.location_city,
        location_state: data.location_state,
        location_zip_code: data.location_zip_code,
        partner_po_number: data.partner_po_number || null,
        partner_location_number: data.partner_location_number || generatedLocationNumber || null,
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
              
              {/* Enhanced error and warning display */}
              {warning && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {warning}
                    {requiresInitials && organizationName && (
                      <div className="mt-2 text-xs">
                        <strong>Action needed:</strong> Contact an admin to add initials for "{organizationName}" to enable smart numbering.
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Fallback number indicator */}
              {isFallback && workOrderNumber && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Using fallback numbering format
                </div>
              )}
              
              {/* Hard error fallback */}
              {numberError && !warning && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {numberError}. A fallback number will be assigned automatically.
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

              {/* Organization - Conditional rendering based on user type */}
              {profile?.user_type === 'admin' ? (
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
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organization</label>
                  {organizationLoading ? (
                    <div className="bg-muted border rounded-md p-3 flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-muted-foreground">Loading organization...</span>
                    </div>
                  ) : organization ? (
                    <div className="bg-muted/50 border rounded-md p-3">
                      <p className="font-medium">{organization.name}</p>
                      {organization.initials && (
                        <p className="text-sm text-muted-foreground">({organization.initials})</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3">
                      <p className="text-sm text-destructive">Organization not found</p>
                    </div>
                  )}
                </div>
              )}

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

            {/* Location Information - Always show for admin modal */}
            <LocationFields 
              form={form}
              organizationId={form.watch('organization_id')}
              organizationType={selectedOrganization?.organization_type}
              showPoNumber={true}
            />

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