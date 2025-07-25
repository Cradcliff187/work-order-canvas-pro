import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle2, Building2, FileText, Clock, MapPin, Check } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import StandardFormLayout from '@/components/layout/StandardFormLayout';
import { LocationFields } from '@/components/LocationFields';
import { WorkOrderNumberPreview } from '@/components/WorkOrderNumberPreview';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCreateWorkOrder } from '@/hooks/useAdminWorkOrders';
import { useWorkOrderNumberGeneration } from '@/hooks/useWorkOrderNumberGeneration';
import { useUserOrganization } from '@/hooks/useUserOrganization';
import { useOrganizations } from '@/hooks/useOrganizations';

// Form schema with comprehensive validation
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
  due_date: z.string().optional(),
  estimated_hours: z.string().optional(),
});

type FormData = z.infer<typeof workOrderFormSchema>;

interface CreateWorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string;
  onWorkOrderCreated?: () => void;
}

export function CreateWorkOrderModal({ open, onOpenChange, organizationId, onWorkOrderCreated }: CreateWorkOrderModalProps) {
  const { toast } = useToast();
  const { viewingProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(true);
  const [tradesError, setTradesError] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [selectedOrganization, setSelectedOrganization] = useState<any | null>(null);

  // Work order creation hook
  const createWorkOrderMutation = useCreateWorkOrder();
  
  // Load organizations for admin users
  const { data: organizations, isLoading: isLoadingOrganizations } = useOrganizations();
  
  // Check if user is admin to show organization selection
  const isAdmin = viewingProfile?.user_type === 'admin';

  // Form setup with comprehensive validation
  const form = useForm<FormData>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: {
      title: '',
      description: '',
      trade_id: '',
      organization_id: organizationId || '',
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

  // Reset to appropriate step when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep(isAdmin ? 0 : 1);
      if (!organizationId) {
        setSelectedOrganizationId('');
        setSelectedOrganization(null);
      }
    }
  }, [open, isAdmin, organizationId]);

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
    organizationId: organizationId || selectedOrganizationId,
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

  // Load organization details when organizationId or selectedOrganizationId changes
  useEffect(() => {
    const loadOrganization = async () => {
      const targetOrgId = organizationId || selectedOrganizationId;
      if (targetOrgId) {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', targetOrgId)
          .single();

        if (error) {
          console.error('Error loading organization:', error);
          toast({
            variant: "destructive",
            title: "Error loading organization",
            description: error.message || "Failed to load organization details.",
          });
        } else {
          setSelectedOrganization(data);
        }
      }
    };

    loadOrganization();
  }, [organizationId, selectedOrganizationId, toast]);

  // Update organization in form when organizationId or selectedOrganizationId changes
  useEffect(() => {
    const targetOrgId = organizationId || selectedOrganizationId;
    if (targetOrgId && form.getValues('organization_id') !== targetOrgId) {
      form.setValue('organization_id', targetOrgId);
    }
  }, [organizationId, selectedOrganizationId, form]);

  const validateStep = async (step: number) => {
    switch (step) {
      case 0:
        // Organization selection step (admin only)
        if (!selectedOrganizationId) {
          toast({
            variant: "destructive",
            title: "Organization Required",
            description: "Please select an organization to continue.",
          });
          return false;
        }
        return true;
      case 1:
        // For admin users, check if organization is selected
        const targetOrgId = organizationId || selectedOrganizationId;
        if (isAdmin && !targetOrgId) {
          toast({
            variant: "destructive",
            title: "Organization Required",
            description: "Please select an organization first.",
          });
          return false;
        }

        // Work with LocationFields component state - check what it actually sets
        const storeLocation = form.getValues('store_location');
        const partnerLocationSelection = form.getValues('partner_location_selection');
        const partnerLocationNumber = form.getValues('partner_location_number');
        
        // Check if organization uses partner location codes
        const usesPartnerLocationNumbers = selectedOrganization?.uses_partner_location_numbers;
        
        // Scenario 1: Partner location selected from dropdown (this is what LocationFields sets)
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
          // If we have store location (and location code if required), we're good
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
        // Only require trade_id since title is now optional
        const tradeFields: (keyof FormData)[] = ['trade_id'];
        const tradeValid = await form.trigger(tradeFields);
        return tradeValid;
      case 3:
        return true; // Review step doesn't need validation
      default:
        return true;
    }
  };

  // Navigation functions
  const handleNext = async () => {
    console.log('🔄 HandleNext called - Current step:', currentStep);
    console.log('👤 ViewingProfile check:', viewingProfile);
    console.log('🏢 Organization IDs:', { organizationId, selectedOrganizationId });
    
    const isValid = await validateStep(currentStep);
    console.log('✅ Step validation result:', isValid);
    
    const maxStep = 2; // We only have steps 0, 1, 2 based on the UI
    if (isValid && currentStep < maxStep) {
      const nextStep = currentStep + 1;
      console.log('✅ Moving to step:', nextStep);
      setCurrentStep(nextStep);
    } else {
      console.log('❌ Validation failed or reached max step. Current:', currentStep, 'Max:', maxStep);
    }
  };

  const handlePrevious = () => {
    console.log('⬅️ HandlePrevious called - Current step:', currentStep);
    const minStep = isAdmin ? 0 : 1;
    if (currentStep > minStep) {
      const prevStep = currentStep - 1;
      console.log('⬅️ Moving to step:', prevStep);
      setCurrentStep(prevStep);
    } else {
      console.log('⬅️ Already at minimum step:', minStep);
    }
  };

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      console.log('🔧 Work Order Creation Debug - Starting submission...');
      console.log('📝 Form Data:', data);
      console.log('👤 ViewingProfile:', viewingProfile);
      console.log('🏢 Organization ID:', organizationId || selectedOrganizationId);
      console.log('🏪 Selected Organization:', selectedOrganization);

      // Validate critical fields
      if (!viewingProfile?.id) {
        throw new Error('User profile not found. Please refresh the page and try again.');
      }

      const targetOrgId = organizationId || selectedOrganizationId;
      if (!targetOrgId) {
        throw new Error('Organization ID is required but not found.');
      }

      if (!data.trade_id) {
        throw new Error('Trade selection is required.');
      }

      if (!data.store_location) {
        throw new Error('Store location is required.');
      }

      // Ensure title exists before submission
      const finalTitle = data.title || `${data.store_location || 'New Location'} - Work Order`;

      // Prepare submission data
      const submissionData = {
        title: finalTitle,
        description: data.description || '',
        trade_id: data.trade_id,
        organization_id: targetOrgId,
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
        created_by: viewingProfile.id,
      };

      console.log('📤 Submission Data:', submissionData);

      await createWorkOrderMutation.mutateAsync(submissionData);
      
      console.log('✅ Work order created successfully');
      
      toast({
        title: "Work order created",
        description: "The work order has been successfully created.",
      });

      // Reset form and steps
      form.reset();
      setCurrentStep(isAdmin ? 0 : 1);
      setSelectedOrganizationId('');
      setSelectedOrganization(null);
      onOpenChange(false);

      // Trigger callback
      if (onWorkOrderCreated) {
        onWorkOrderCreated();
      }
    } catch (error: any) {
      console.error('❌ Error submitting work order:', error);
      console.error('🔍 Error details:', {
        message: error.message,
        stack: error.stack,
        viewingProfile,
        organizationId: organizationId || selectedOrganizationId,
      });
      
      toast({
        variant: "destructive",
        title: "Submission error",
        description: error.message || "Failed to submit the work order. Please check the console for more details.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px]" aria-describedby="create-work-order-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Work Order
          </DialogTitle>
          <p id="create-work-order-description" className="text-sm text-muted-foreground">
            Create a new work order by filling out the required information in the steps below.
          </p>
        </DialogHeader>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 0: Organization Selection (Admin Only) */}
            {isAdmin && currentStep === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Select Organization
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose the organization for this work order
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoadingOrganizations ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading organizations...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Label>Organization *</Label>
                      <Select onValueChange={(value) => {
                        setSelectedOrganizationId(value);
                        const org = organizations?.find(o => o.id === value);
                        setSelectedOrganization(org);
                      }} value={selectedOrganizationId}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select an organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations?.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              <div className="flex items-center gap-2">
                                <span>{org.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {org.organization_type}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {selectedOrganization && (
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <h4 className="font-medium mb-2">{selectedOrganization.name}</h4>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Type: {selectedOrganization.organization_type}</p>
                            <p>Contact: {selectedOrganization.contact_email}</p>
                            {selectedOrganization.address && (
                              <p>Address: {selectedOrganization.address}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
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
                    organizationId={organizationId || selectedOrganizationId}
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
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === (isAdmin ? 0 : 1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentStep < 2 ? (
                <Button 
                  type="button" 
                  onClick={() => {
                    console.log('🔄 Next button clicked!');
                    handleNext();
                  }}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={createWorkOrderMutation.isPending}
                  onClick={() => {
                    console.log('📤 Submit button clicked!');
                    console.log('📊 Form state:', {
                      isValid: form.formState.isValid,
                      errors: form.formState.errors,
                      isDirty: form.formState.isDirty,
                      isSubmitting: form.formState.isSubmitting,
                    });
                  }}
                >
                  {createWorkOrderMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Create Work Order
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
