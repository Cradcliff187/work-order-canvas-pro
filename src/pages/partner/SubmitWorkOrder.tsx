import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Plus, ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle2, Building2, FileText, Clock, MapPin, Check } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import StandardFormLayout from '@/components/layout/StandardFormLayout';
import { LocationFields } from '@/components/LocationFields';
import { WorkOrderNumberPreview } from '@/components/WorkOrderNumberPreview';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCreateWorkOrder } from '@/hooks/usePartnerWorkOrders';
import { useWorkOrderNumberGeneration } from '@/hooks/useWorkOrderNumberGeneration';
import { useUserOrganization } from '@/hooks/useUserOrganization';
import { useOrganizations } from '@/hooks/useOrganizations';

// Unified form schema that includes all fields
const workOrderFormSchema = z.object({
  title: z.string().max(200, 'Title must be less than 200 characters').optional(),
  description: z.string().optional(),
  trade_id: z.string().min(1, 'Trade is required'),
  organization_id: z.string().min(1, 'Organization is required'),
  store_location: z.string().min(1, 'Location name is required'),
  street_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  location_street_address: z.string().optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
  location_zip_code: z.string().optional(),
  location_name: z.string().optional(),
  location_contact_name: z.string().optional(),
  location_contact_phone: z.string().optional(),
  location_contact_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  partner_po_number: z.string().optional(),
  partner_location_number: z.string().optional(),
  partner_location_selection: z.string().optional(),
  // Admin-only fields - always included in schema but conditionally validated
  due_date: z.string().optional(),
  estimated_hours: z.string().optional(),
});

type FormData = z.infer<typeof workOrderFormSchema>;

// Step component for progress indicator
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  const steps = [
    { number: 1, title: 'Location Details' },
    { number: 2, title: 'Trade & Description' },
    { number: 3, title: 'Preview & Submit' }
  ];

  return (
    <div className="flex items-center justify-center space-x-8 mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
              step.number < currentStep 
                ? 'bg-primary text-primary-foreground' 
                : step.number === currentStep 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
            }`}>
              {step.number < currentStep ? (
                <Check className="h-5 w-5" />
              ) : (
                step.number
              )}
            </div>
            <span className={`mt-2 text-xs font-medium ${
              step.number === currentStep ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {step.title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-16 h-0.5 mx-4 ${
              step.number < currentStep ? 'bg-primary' : 'bg-muted'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
};

export default function SubmitWorkOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(true);
  const [tradesError, setTradesError] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');

  // Determine if user is admin
  const isAdmin = profile?.user_type === 'admin';

  // User organization hook
  const { organization: userOrganization, loading: loadingUserOrg } = useUserOrganization();
  
  // For admin users, load all organizations and filter for partners
  const { data: allOrganizations, isLoading: loadingAllOrganizations } = useOrganizations();
  const partnerOrganizations = allOrganizations?.filter(org => org.organization_type === 'partner') || [];

  // Work order creation hook
  const createWorkOrderMutation = useCreateWorkOrder();

  // Determine effective organization ID
  const effectiveOrganizationId = userOrganization?.id || selectedOrganizationId;

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: {
      title: '',
      description: '',
      trade_id: '',
      organization_id: effectiveOrganizationId || '',
      store_location: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      location_street_address: '',
      location_city: '',
      location_state: '',
      location_zip_code: '',
      location_name: '',
      location_contact_name: '',
      location_contact_phone: '',
      location_contact_email: '',
      partner_po_number: '',
      partner_location_number: '',
      partner_location_selection: '',
      due_date: '',
      estimated_hours: '',
    }
  });

  // Watch form values for auto-generation
  const watchedStoreLocation = form.watch('store_location');
  const watchedTradeId = form.watch('trade_id');
  const watchedTitle = form.watch('title');

  // Auto-generate title when store_location and trade are selected
  useEffect(() => {
    if (watchedStoreLocation && watchedTradeId && !watchedTitle) {
      const selectedTrade = trades.find(trade => trade.id === watchedTradeId);
      if (selectedTrade) {
        const autoGeneratedTitle = `${watchedStoreLocation} - ${selectedTrade.name} Work`;
        form.setValue('title', autoGeneratedTitle);
      }
    }
  }, [watchedStoreLocation, watchedTradeId, watchedTitle, trades, form]);

  // Work order number generation - watch for partner_location_number changes
  const {
    workOrderNumber,
    isLoading: isLoadingWorkOrderNumber,
    error: workOrderNumberError,
    isFallback,
    warning: workOrderNumberWarning,
    requiresInitials,
    organizationName,
    locationNumber: generatedLocationNumber,
  } = useWorkOrderNumberGeneration({
    organizationId: effectiveOrganizationId,
    locationNumber: form.watch('partner_location_number'),
  });

  // Load trades
  useEffect(() => {
    const loadTrades = async () => {
      try {
        setIsLoadingTrades(true);
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setTrades(data || []);
      } catch (error: any) {
        console.error('Error loading trades:', error);
        setTradesError(error.message || 'Failed to load trades');
      } finally {
        setIsLoadingTrades(false);
      }
    };

    loadTrades();
  }, []);

  // Update organization in form when effective organization changes
  useEffect(() => {
    if (effectiveOrganizationId && form.getValues('organization_id') !== effectiveOrganizationId) {
      form.setValue('organization_id', effectiveOrganizationId);
    }
  }, [effectiveOrganizationId, form]);

  // Step validation functions
  const validateStep = async (step: number) => {
    switch (step) {
      case 1:
        // For admin users, organization selection is required first
        if (isAdmin && !selectedOrganizationId) {
          toast({
            variant: "destructive",
            title: "Organization Required",
            description: "Please select an organization first.",
          });
          return false;
        }

        const storeLocation = form.getValues('store_location');
        const partnerLocationSelection = form.getValues('partner_location_selection');
        const partnerLocationNumber = form.getValues('partner_location_number');
        
        // Check if organization uses partner location codes
        const selectedOrg = partnerOrganizations.find(org => org.id === selectedOrganizationId);
        const usesPartnerLocationNumbers = userOrganization?.uses_partner_location_numbers || selectedOrg?.uses_partner_location_numbers;
        
        // Scenario 1: Partner location selected from dropdown
        if (partnerLocationSelection && partnerLocationSelection !== 'add_new') {
          return true;
        }
        
        // Scenario 2: Manual entry mode - store location must be filled
        if (storeLocation) {
          // If organization uses partner location codes, require location code
          if (usesPartnerLocationNumbers && !partnerLocationNumber) {
            toast({
              variant: "destructive",
              title: "Location Code Required",
              description: "This organization requires a location code. Please enter a location code.",
            });
            return false;
          }
          return true;
        }
        
        // Scenario 3: Location code entered but no store location
        if (partnerLocationNumber && !storeLocation) {
          toast({
            variant: "destructive",
            title: "Location Name Required",
            description: "Please enter a location name to continue.",
          });
          return false;
        }
        
        // Scenario 4: No location information provided at all
        if (usesPartnerLocationNumbers) {
          toast({
            variant: "destructive",
            title: "Location Required",
            description: "Please select a location from the dropdown or enter location details with a location code.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Location Required",
            description: "Please select a location or enter location details to continue.",
          });
        }
        return false;
        
      case 2:
        // Only require trade_id for step 2 since title is now optional
        const tradeFields: (keyof FormData)[] = ['trade_id'];
        const tradeValid = await form.trigger(tradeFields);
        return tradeValid;
      case 3:
        return true;
      default:
        return true;
    }
  };

  // Navigation functions
  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      // Prepare submission data - only include fields that should be submitted
      const submissionData = {
        title: data.title,
        description: data.description || '',
        trade_id: data.trade_id,
        organization_id: effectiveOrganizationId,
        store_location: data.store_location,
        street_address: data.street_address || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
        location_street_address: data.location_street_address || '',
        location_city: data.location_city || '',
        location_state: data.location_state || '',
        location_zip_code: data.location_zip_code || '',
        location_name: data.location_name || '',
        location_contact_name: data.location_contact_name || '',
        location_contact_phone: data.location_contact_phone || '',
        location_contact_email: data.location_contact_email || '',
        partner_po_number: data.partner_po_number || '',
        partner_location_number: data.partner_location_number || generatedLocationNumber || '',
        // Only include admin fields if user is admin
        ...(isAdmin && { due_date: data.due_date }),
        ...(isAdmin && { estimated_hours: data.estimated_hours }),
      };

      await createWorkOrderMutation.mutateAsync(submissionData);
      
      // Navigate back to work orders list
      navigate('/partner/work-orders');
    } catch (error: any) {
      console.error('Error submitting work order:', error);
      toast({
        variant: "destructive",
        title: "Submission error",
        description: error.message || "Failed to submit the work order.",
      });
    }
  };

  // Loading states
  if (loadingUserOrg || isLoadingTrades || (isAdmin && loadingAllOrganizations)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/partner/work-orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Submit Work Order</h1>
            <p className="text-muted-foreground">Create a new work order request</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading form data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error states
  if (tradesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/partner/work-orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Submit Work Order</h1>
            <p className="text-muted-foreground">Create a new work order request</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load form data. Please refresh the page and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/partner/work-orders">
          <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work Orders
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Submit Work Order</h1>
          <p className="text-muted-foreground">Create a new work order request</p>
        </div>
      </div>

      {/* Organization Selection for Admin Users */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Select Organization
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose which partner organization this work order is for
            </p>
          </CardHeader>
          <CardContent>
            <Select onValueChange={setSelectedOrganizationId} value={selectedOrganizationId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select a partner organization" />
              </SelectTrigger>
              <SelectContent>
                {partnerOrganizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {org.initials}
                      </Badge>
                      <span>{org.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Work Order Number Preview - Show on all steps */}
      {effectiveOrganizationId && (
        <WorkOrderNumberPreview
          workOrderNumber={workOrderNumber}
          isLoading={isLoadingWorkOrderNumber}
          error={workOrderNumberError}
          isFallback={isFallback}
          warning={workOrderNumberWarning}
          organizationName={organizationName || userOrganization?.name || partnerOrganizations.find(org => org.id === selectedOrganizationId)?.name}
          organizationInitials={userOrganization?.initials || partnerOrganizations.find(org => org.id === selectedOrganizationId)?.initials}
          locationNumber={generatedLocationNumber}
          usesPartnerLocationNumbers={userOrganization?.uses_partner_location_numbers || partnerOrganizations.find(org => org.id === selectedOrganizationId)?.uses_partner_location_numbers}
          typedLocationCode={form.watch('partner_location_number')}
          className="sticky top-4 z-10"
        />
      )}

      {/* Step Progress Indicator */}
      <StepIndicator currentStep={currentStep} totalSteps={3} />

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Location Details */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Location Details
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enter the location information for this work order
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <LocationFields
                  form={form}
                  organizationId={effectiveOrganizationId}
                  showPoNumber={true}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Trade & Description */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Trade & Description
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Provide details about the work to be performed
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Order Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Auto-generated from location and trade selection"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Title will be auto-generated when you select a location and trade. You can edit it if needed.
                        </FormDescription>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select a trade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {trades.map((trade) => (
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Detailed description of the work to be performed..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Admin-only fields */}
                  {isAdmin && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="due_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                className="h-11"
                                {...field}
                              />
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
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                placeholder="Estimated hours"
                                className="h-11"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Preview & Submit */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Enhanced Work Order Number Preview */}
              <Card className="border-2 border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Work Order Number Preview
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    This is the work order number that will be assigned to your request
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-sm text-muted-foreground mb-3">
                      Your work order number will be:
                    </div>
                    <div className="font-mono text-3xl font-bold text-primary mb-4 p-4 bg-background rounded-lg border-2 border-primary/20">
                      {isLoadingWorkOrderNumber ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="text-lg">Generating...</span>
                        </div>
                      ) : workOrderNumberError ? (
                        <div className="flex items-center justify-center gap-2 text-destructive">
                          <AlertCircle className="h-6 w-6" />
                          <span className="text-lg">Error generating number</span>
                        </div>
                      ) : (
                        workOrderNumber || 'Will be generated automatically'
                      )}
                    </div>
                    {isFallback && workOrderNumber && (
                      <Badge variant="outline" className="text-xs">
                        Fallback format
                      </Badge>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      This number will be used for tracking and reference
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Organization Info */}
              {(userOrganization || selectedOrganizationId) && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">
                          {userOrganization?.name || partnerOrganizations.find(org => org.id === selectedOrganizationId)?.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {userOrganization?.contact_email || partnerOrganizations.find(org => org.id === selectedOrganizationId)?.contact_email}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Review Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Review Work Order Details
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Please review your work order details before submitting
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                      <p className="text-sm">{form.watch('store_location') || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Title</Label>
                      <p className="text-sm">{form.watch('title') || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Trade</Label>
                      <p className="text-sm">
                        {trades.find(t => t.id === form.watch('trade_id'))?.name || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">PO Number</Label>
                      <p className="text-sm">{form.watch('partner_po_number') || 'Not specified'}</p>
                    </div>
                    {isAdmin && (
                      <>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                          <p className="text-sm">{form.watch('due_date') || 'Not specified'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Estimated Hours</Label>
                          <p className="text-sm">{form.watch('estimated_hours') || 'Not specified'}</p>
                        </div>
                      </>
                    )}
                  </div>
                  {form.watch('description') && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                      <p className="text-sm">{form.watch('description')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/partner/work-orders')}
                className="min-h-[44px]"
              >
                Cancel
              </Button>

              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="min-h-[44px]"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createWorkOrderMutation.isPending || isLoadingWorkOrderNumber}
                  className="min-h-[44px]"
                >
                  {createWorkOrderMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Work Order
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
