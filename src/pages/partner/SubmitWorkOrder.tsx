import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, ArrowRight, CheckCircle, MapPin, Wrench, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateWorkOrder } from '@/hooks/usePartnerWorkOrders';
import { useTrades } from '@/hooks/useWorkOrders';
import { useUserOrganization } from '@/hooks/useUserOrganization';
import { useLocationHistory } from '@/hooks/useLocationHistory';
import { useWorkOrderNumberGeneration } from '@/hooks/useWorkOrderNumberGeneration';
import { LocationFields } from '@/components/LocationFields';
import { OrganizationValidationAlert } from '@/components/OrganizationValidationAlert';

const SubmitWorkOrder = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [submittedWorkOrder, setSubmittedWorkOrder] = useState<any>(null);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const createWorkOrder = useCreateWorkOrder();
  const { data: trades } = useTrades();
  const { organization, loading: organizationLoading } = useUserOrganization();
  const { data: locationHistory } = useLocationHistory();

  const workOrderSchema = useMemo(() => {
    const baseSchema = z.object({
      store_location: z.string().min(1, 'Store location is required'),
      street_address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip_code: z.string().optional(),
      // New structured location fields - conditionally required based on form state
      location_street_address: z.string().optional(),
      location_city: z.string().optional(),
      location_state: z.string().optional(),
      location_zip_code: z.string().optional(),
      trade_id: z.string().min(1, 'Trade selection is required'),
      description: z.string().min(10, 'Description must be at least 10 characters'),
      organization_id: z.string().min(1, 'Organization is required'),
      partner_po_number: z.string().optional(),
      partner_location_number: z.string().optional(),
      due_date: z.string().optional(),
    });

    // Add validation logic for when location details are required
    return baseSchema.superRefine((data, ctx) => {
      // Check if we're in new location mode (manual entry or no partner location)
      const hasPartnerLocation = data.partner_location_number && !data.location_street_address;
      const isNewLocation = !hasPartnerLocation && (data.location_street_address || data.location_city || data.location_state || data.location_zip_code);
      
      if (isNewLocation) {
        // If any location field is filled, all required fields must be filled
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
  }, [organization?.uses_partner_location_numbers]);

  type WorkOrderFormData = z.infer<typeof workOrderSchema>;

  const steps = [
    { id: 1, title: 'Location Details', icon: MapPin },
    { id: 2, title: 'Trade & Description', icon: Wrench },
    { id: 3, title: 'Review & Submit', icon: FileText },
  ];

  const form = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      store_location: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      trade_id: '',
      description: '',
      organization_id: organization?.id || '',
      partner_po_number: '',
      partner_location_number: '',
    },
  });

  // Update organization_id when organization data loads
  useEffect(() => {
    if (organization?.id) {
      form.setValue('organization_id', organization.id);
    }
  }, [organization?.id, form]);

  // Auto-populate store_location based on location entry method
  useEffect(() => {
    const locationNum = form.watch('partner_location_number');
    const street = form.watch('location_street_address');
    const currentStore = form.watch('store_location');
    
    if (!currentStore && (locationNum || street)) {
      const autoStore = locationNum 
        ? `Location ${locationNum}`
        : street || 'New Location';
      form.setValue('store_location', autoStore);
    }
  }, [form.watch('partner_location_number'), form.watch('location_street_address')]);

  // Watch form values for work order number generation
  const organizationId = form.watch('organization_id');
  const locationNumber = form.watch('partner_location_number');
  
  const { 
    workOrderNumber, 
    isLoading: isGeneratingNumber, 
    error: numberError,
    isFallback,
    warning,
    requiresInitials,
    organizationName
  } = useWorkOrderNumberGeneration({
    organizationId,
    locationNumber,
  });

  const handleNext = async () => {
    const currentStepFields = getCurrentStepFields();
    const isValid = await form.trigger(currentStepFields);
    
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const getCurrentStepFields = (): (keyof WorkOrderFormData)[] => {
    switch (currentStep) {
      case 1:
        if (!organization?.uses_partner_location_numbers) {
          return ['trade_id', 'store_location'];
        }
        return ['trade_id', 'partner_location_number', 'store_location'];
      case 2:
        return ['trade_id', 'description'];
      case 3:
        return []; // No validation needed for step 3 since organization is auto-set
      default:
        return [];
    }
  };

  const onSubmit = async (data: WorkOrderFormData) => {
    try {
      const selectedTrade = trades?.find(t => t.id === data.trade_id);
      const autoTitle = `${selectedTrade?.name || 'Work'} at ${data.store_location}`;
      
      const result = await createWorkOrder.mutateAsync({
        title: autoTitle,
        store_location: data.store_location || `Location ${data.partner_location_number || 'Manual'}`,
        street_address: data.street_address || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
        location_street_address: data.location_street_address || '',
        location_city: data.location_city || '',
        location_state: data.location_state || '',
        location_zip_code: data.location_zip_code || '',
        trade_id: data.trade_id,
        description: data.description,
        organization_id: data.organization_id,
        partner_po_number: data.partner_po_number || null,
        partner_location_number: data.partner_location_number || null,
      });
      setSubmittedWorkOrder(result);
      setCurrentStep(4); // Success step
    } catch (error) {
      console.error('Error submitting work order:', error);
    }
  };

  if (submittedWorkOrder) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <CardTitle className="text-2xl">Work Order Submitted Successfully!</CardTitle>
            <CardDescription>
              Your work order has been received and assigned number:
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-3xl font-bold text-primary">
                {submittedWorkOrder.work_order_number}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Location:</h4>
                <p className="text-muted-foreground">{submittedWorkOrder.store_location}</p>
                <p className="text-muted-foreground text-sm">
                  {submittedWorkOrder.street_address}, {submittedWorkOrder.city}, {submittedWorkOrder.state} {submittedWorkOrder.zip_code}
                </p>
                {(submittedWorkOrder.partner_po_number || submittedWorkOrder.partner_location_number) && (
                  <div className="mt-2 text-sm">
                    {submittedWorkOrder.partner_po_number && (
                      <p className="text-muted-foreground">PO: {submittedWorkOrder.partner_po_number}</p>
                    )}
                    {submittedWorkOrder.partner_location_number && (
                      <p className="text-muted-foreground">Location #: {submittedWorkOrder.partner_location_number}</p>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="font-medium">Status:</h4>
                <p className="text-muted-foreground capitalize">{submittedWorkOrder.status}</p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/partner/work-orders')}>
                View All Work Orders
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Submit Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/partner/dashboard')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold mb-2">Submit New Work Order</h1>
        <p className="text-muted-foreground">Submit a new work order request for your organization</p>
      </div>

      {/* Organization Validation Alert */}
      <OrganizationValidationAlert className="mb-6" />

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.id 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'border-muted-foreground text-muted-foreground'
              }`}>
                <step.icon className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  Step {step.id}
                </p>
                <p className={`text-xs ${
                  currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 w-20 mx-4 ${
                  currentStep > step.id ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Location Details */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Location Details</CardTitle>
                <CardDescription>
                  Provide the store location and complete address information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <LocationFields
                  form={form}
                  organizationId={organizationId}
                  showPoNumber={true}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Trade & Description */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Trade & Description</CardTitle>
                <CardDescription>
                  Select the type of work needed and provide detailed description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="trade_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trade Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select the type of work needed" />
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detailed Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide detailed description of the work needed, including any specific requirements, issues observed, or special instructions"
                          rows={6}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review & Submit */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Submit</CardTitle>
                <CardDescription>
                  Review your work order details before submission
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Organization Display */}
                {organization && (
                  <div className="bg-muted/50 border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Organization</h4>
                    <p className="font-semibold">{organization.name}</p>
                    {organization.initials && (
                      <p className="text-sm text-muted-foreground">({organization.initials})</p>
                    )}
                  </div>
                )}

                {/* Work Order Number Preview */}
                {organizationId && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <h4 className="font-medium mb-2 text-primary">Generated Work Order Number</h4>
                    {isGeneratingNumber ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                        <span className="text-sm text-muted-foreground">Generating number...</span>
                      </div>
                    ) : warning ? (
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-primary">
                          {workOrderNumber}
                        </div>
                        <div className="text-warning text-sm border-l-2 border-warning pl-2">
                          <p>{warning}</p>
                          {requiresInitials && organizationName && (
                            <p className="text-xs mt-1">
                              Contact an admin to add initials for "{organizationName}" to enable smart numbering.
                            </p>
                          )}
                        </div>
                        {isFallback && (
                          <div className="text-xs text-muted-foreground">
                            Using fallback numbering format
                          </div>
                        )}
                      </div>
                    ) : numberError ? (
                      <div className="text-destructive text-sm">
                        <p>Error generating work order number: {numberError}</p>
                        <p className="text-xs mt-1">A fallback number will be assigned upon submission.</p>
                      </div>
                    ) : workOrderNumber ? (
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-primary">
                          {workOrderNumber}
                        </div>
                        {isFallback && (
                          <div className="text-xs text-muted-foreground">
                            Using fallback numbering format
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Select organization to generate number</span>
                    )}
                  </div>
                )}

                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-medium mb-3">Work Order Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Work Order Title:</span>
                      <p className="text-muted-foreground">
                        {trades?.find(t => t.id === form.watch('trade_id'))?.name || 'Work'} at {form.watch('store_location') || 'Location'}
                      </p>
                      <p className="text-sm text-muted-foreground">(Auto-generated)</p>
                    </div>
                    <div>
                      <span className="font-medium">Location:</span> {form.watch('store_location')}
                    </div>
                    <div>
                      <span className="font-medium">Address:</span> {form.watch('street_address')}, {form.watch('city')}, {form.watch('state')} {form.watch('zip_code')}
                    </div>
                    {(form.watch('partner_po_number') || form.watch('partner_location_number')) && (
                      <div>
                        <span className="font-medium">Partner References:</span>
                        <div className="mt-1 text-muted-foreground">
                          {form.watch('partner_po_number') && <p>PO: {form.watch('partner_po_number')}</p>}
                          {form.watch('partner_location_number') && <p>Location #: {form.watch('partner_location_number')}</p>}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Trade:</span> {trades?.find(t => t.id === form.watch('trade_id'))?.name}
                    </div>
                    <div>
                      <span className="font-medium">Description:</span> 
                      <p className="mt-1 text-muted-foreground">{form.watch('description')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={createWorkOrder.isPending}>
                {createWorkOrder.isPending ? 'Submitting...' : 'Submit Work Order'}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default SubmitWorkOrder;