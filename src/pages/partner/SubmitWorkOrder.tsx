import React, { useState, useEffect, useCallback } from 'react';
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle2, Building2, FileText, Clock, MapPin, Check, RefreshCw, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import StandardFormLayout from '@/components/layout/StandardFormLayout';
import { LocationFields } from '@/components/LocationFields';
import { WorkOrderReviewSummary } from '@/components/WorkOrderReviewSummary';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCreateWorkOrder } from '@/hooks/usePartnerWorkOrders';
import { useWorkOrderNumberGeneration } from '@/hooks/useWorkOrderNumberGeneration';
import { useUserOrganization } from '@/hooks/useUserOrganization';
import { useOrganizations } from '@/hooks/useOrganizations';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useIsMobile } from '@/hooks/use-mobile';
import { FileUpload } from '@/components/FileUpload';
import { MobileFileUpload } from '@/components/MobileFileUpload';
import { getFileTypeForStorage } from '@/utils/fileTypeUtils';
import { formatFileSize } from '@/utils/imageCompression';

// Unified form schema with improved error messages
const workOrderFormSchema = z.object({
  title: z.string().max(200, 'Title must be less than 200 characters').optional(),
  description: z.string().optional(),
  trade_id: z.string().min(1, 'Please select the type of work needed'),
  organization_id: z.string().min(1, 'Please choose an organization'),
  store_location: z.string().min(1, 'Please enter a location name'),
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
  location_contact_email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  partner_po_number: z.string().optional(),
  partner_location_number: z.string().optional(),
  partner_location_selection: z.string().optional(),
  // Admin-only fields - always included in schema but conditionally validated
  due_date: z.string().optional(),
  estimated_hours: z.string().optional(),
});

type FormData = z.infer<typeof workOrderFormSchema>;

// Enhanced Step component for progress indicator with better visual cues
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  const steps = [
    { number: 1, title: '1. Location', shortTitle: 'Location' },
    { number: 2, title: '2. Work Details', shortTitle: 'Work Details' },
    { number: 3, title: '3. Confirm', shortTitle: 'Confirm' }
  ];

  return (
    <div className="flex items-center justify-center space-x-4 sm:space-x-8 mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
              step.number < currentStep 
                ? 'bg-primary text-primary-foreground shadow-lg' 
                : step.number === currentStep 
                  ? 'bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20' 
                  : 'bg-muted text-muted-foreground border-2 border-muted-foreground/20'
            }`}>
              {step.number < currentStep ? (
                <Check className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                step.number
              )}
            </div>
            <span className={`mt-2 text-xs sm:text-sm font-medium transition-colors duration-300 ${
              step.number === currentStep ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              <span className="hidden sm:inline">{step.title}</span>
              <span className="sm:hidden">{step.shortTitle}</span>
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-8 sm:w-16 h-0.5 mx-2 sm:mx-4 transition-colors duration-300 ${
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
  const [isNavigating, setIsNavigating] = useState(false);
  
  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submissionPhase, setSubmissionPhase] = useState<'idle' | 'creating' | 'uploading'>('idle');

  // Touch gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

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

  // Fetch partner locations for the selected organization
  const { data: partnerLocations, isLoading: isLoadingLocations, error: locationsError } = usePartnerLocations(effectiveOrganizationId);

  // File upload handlers
  const handleUploadProgress = useCallback((progress: any[]) => {
    console.log('Upload progress:', progress);
  }, []);

  const handleUploadComplete = useCallback((files: any[]) => {
    toast({
      title: "Files uploaded successfully",
      description: `${files.length} file(s) uploaded.`,
    });
  }, [toast]);

  const handleUploadError = useCallback((error: string) => {
    toast({
      variant: "destructive",
      title: "Upload failed",
      description: error,
    });
  }, [toast]);

  // Initialize file upload hook
  const {
    uploadFiles,
    removeFile,
    reset: resetFileUploads,
    uploadProgress,
    isUploading,
    uploadedFiles,
    validateFiles
  } = useFileUpload({
    maxFiles: 10,
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    onProgress: handleUploadProgress,
    onComplete: handleUploadComplete,
    onError: handleUploadError
  });

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

  // Check if mobile for conditional rendering
  const isMobile = useIsMobile();

  // Watch form values for auto-generation and location selection
  const watchedStoreLocation = form.watch('store_location');
  const watchedTradeId = form.watch('trade_id');
  const watchedTitle = form.watch('title');
  const partnerLocationSelection = form.watch('partner_location_selection');
  const manualLocationNumber = form.watch('partner_location_number');

  // Find selected location from partner locations
  const selectedLocation = partnerLocations?.find(loc => loc.id === partnerLocationSelection) || null;

  // Auto-populate form fields when an existing partner location is selected
  useEffect(() => {
    if (selectedLocation && partnerLocationSelection && partnerLocationSelection !== 'add_new') {
      // Populate all location fields from the selected partner location
      form.setValue('store_location', selectedLocation.location_name || '');
      form.setValue('partner_location_number', selectedLocation.location_number || '');
      form.setValue('location_street_address', selectedLocation.street_address || '');
      form.setValue('location_city', selectedLocation.city || '');
      form.setValue('location_state', selectedLocation.state || '');
      form.setValue('location_zip_code', selectedLocation.zip_code || '');
      form.setValue('location_name', selectedLocation.location_name || '');
      form.setValue('location_contact_name', selectedLocation.contact_name || '');
      form.setValue('location_contact_phone', selectedLocation.contact_phone || '');
      form.setValue('location_contact_email', selectedLocation.contact_email || '');
    } else if (partnerLocationSelection === 'add_new' || !partnerLocationSelection) {
      // Clear location fields when switching to "add new" or no selection
      form.setValue('store_location', '');
      form.setValue('partner_location_number', '');
      form.setValue('location_street_address', '');
      form.setValue('location_city', '');
      form.setValue('location_state', '');
      form.setValue('location_zip_code', '');
      form.setValue('location_name', '');
      form.setValue('location_contact_name', '');
      form.setValue('location_contact_phone', '');
      form.setValue('location_contact_email', '');
    }
  }, [selectedLocation, partnerLocationSelection, form]);

  // Compute effective location number for work order generation
  const getEffectiveLocationNumber = () => {
    if (partnerLocationSelection && partnerLocationSelection !== 'add_new' && selectedLocation) {
      // Use existing location's number
      return selectedLocation.location_number;
    } else if (partnerLocationSelection === 'add_new') {
      // Use manual entry
      return manualLocationNumber;
    }
    // For auto-generated location codes or no selection
    return undefined;
  };

  const effectiveLocationNumber = getEffectiveLocationNumber();

  // Work order number generation - ONLY on step 3 (review step)
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
    organizationId: currentStep === 3 ? effectiveOrganizationId : undefined,
    locationNumber: currentStep === 3 ? effectiveLocationNumber : undefined,
  });

  // File handling functions
  const handleFilesSelected = useCallback((files: File[]) => {
    const { valid, errors } = validateFiles(files);
    
    if (errors.length > 0) {
      toast({
        variant: "destructive",
        title: "File validation failed",
        description: errors.join(', '),
      });
      return;
    }

    setSelectedFiles(prev => [...prev, ...valid]);
  }, [validateFiles, toast]);

  const handleRemoveFile = useCallback((fileIndex: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== fileIndex));
  }, []);

  const handleClearFiles = useCallback(() => {
    setSelectedFiles([]);
    resetFileUploads();
  }, [resetFileUploads]);

  // Auto-generate title when store_location and trade are selected
  useEffect(() => {
    if (watchedStoreLocation && watchedTradeId) {
      const selectedTrade = trades.find(trade => trade.id === watchedTradeId);
      if (selectedTrade) {
        const autoGeneratedTitle = `${watchedStoreLocation} - ${selectedTrade.name} Work`;
        form.setValue('title', autoGeneratedTitle);
      }
    }
  }, [watchedStoreLocation, watchedTradeId, watchedTitle, trades, form]);

  // Load trades with retry functionality
  const loadTrades = async () => {
    try {
      setIsLoadingTrades(true);
      setTradesError(null);
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

  // Initial trades load
  useEffect(() => {
    loadTrades();
  }, []);

  // Update organization in form when effective organization changes
  useEffect(() => {
    if (effectiveOrganizationId && form.getValues('organization_id') !== effectiveOrganizationId) {
      form.setValue('organization_id', effectiveOrganizationId);
    }
  }, [effectiveOrganizationId, form]);

  // Enhanced keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement || 
          event.target instanceof HTMLSelectElement) {
        return;
      }

      if (event.key === 'Enter' && currentStep < 3) {
        event.preventDefault();
        handleNext();
      } else if (event.key === 'Escape' && currentStep > 1) {
        event.preventDefault();
        handlePrevious();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  // Touch gesture handlers for mobile swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentStep < 3) {
      handleNext();
      toast({
        title: "Next step",
        description: "Swipe right to go back",
        duration: 1500,
      });
    }
    if (isRightSwipe && currentStep > 1) {
      handlePrevious();
      toast({
        title: "Previous step",
        description: "Swipe left to continue",
        duration: 1500,
      });
    }
  };

  // Step validation functions with improved error messages
  const validateStep = async (step: number) => {
    setIsNavigating(true);
    
    try {
      switch (step) {
        case 1:
          // For admin users, organization selection is required first
          if (isAdmin && !selectedOrganizationId) {
            toast({
              variant: "destructive",
              title: "Organization Required",
              description: "Please choose an organization first.",
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
                description: "Please enter a location code for this location.",
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
              description: "Please enter a location name.",
            });
            return false;
          }
          
          // Scenario 4: No location information provided at all
          toast({
            variant: "destructive",
            title: "Location Required",
            description: "Please choose a location.",
          });
          return false;
          
        case 2:
          // Only require trade_id for step 2 since title is no longer shown to partners
          const tradeFields: (keyof FormData)[] = ['trade_id'];
          const tradeValid = await form.trigger(tradeFields);
          return tradeValid;
        case 3:
          return true;
        default:
          return true;
      }
    } finally {
      setIsNavigating(false);
    }
  };

  // Navigation functions
  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1);
      // Add haptic feedback on mobile if available
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Add haptic feedback on mobile if available
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  // Handle form submission with file upload integration
  const onSubmit = async (data: FormData) => {
    console.log('🚀 SUBMIT BUTTON CLICKED - Starting form submission');
    console.log('📊 FORM SUBMISSION DEBUG DATA:');
    console.log('- Form data received:', data);
    console.log('- effectiveOrganizationId:', effectiveOrganizationId);
    console.log('- form.watch("trade_id"):', form.watch('trade_id'));
    console.log('- createWorkOrderMutation.isPending:', createWorkOrderMutation.isPending);
    console.log('- profile?.id:', profile?.id);
    console.log('- selectedOrganizationId (admin):', selectedOrganizationId);
    console.log('- userOrganization:', userOrganization);
    console.log('- isAdmin:', isAdmin);
    console.log('- selectedFiles.length:', selectedFiles.length);

    // Critical validation checks with detailed logging
    if (!effectiveOrganizationId) {
      console.error('❌ CRITICAL ERROR: No effective organization ID available');
      console.log('- userOrganization?.id:', userOrganization?.id);
      console.log('- selectedOrganizationId:', selectedOrganizationId);
      toast({
        variant: "destructive",
        title: "Organization Missing",
        description: "No organization selected. Please select an organization.",
      });
      return;
    }

    if (!data.trade_id) {
      console.error('❌ CRITICAL ERROR: No trade selected');
      console.log('- data.trade_id:', data.trade_id);
      console.log('- form.watch("trade_id"):', form.watch('trade_id'));
      toast({
        variant: "destructive",
        title: "Trade Missing",
        description: "Please select a trade category.",
      });
      return;
    }

    if (!profile?.id) {
      console.error('❌ CRITICAL ERROR: User profile not available');
      console.log('- profile:', profile);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "User profile not available. Please refresh and try again.",
      });
      return;
    }

    try {
      // Phase 1: Create the work order
      setSubmissionPhase('creating');
      
      // Ensure title exists before submission - use same logic as review
      let finalTitle = data.title;
      if (!finalTitle || !finalTitle.trim()) {
        if (data.store_location && watchedTradeId) {
          const selectedTrade = trades.find(trade => trade.id === watchedTradeId);
          if (selectedTrade) {
            finalTitle = `${data.store_location} - ${selectedTrade.name} Work`;
          } else {
            finalTitle = `${data.store_location} - Work Order`;
          }
        } else {
          finalTitle = `${data.store_location || 'New Location'} - Work Order`;
        }
      }

      // Prepare submission data - only include fields that should be submitted
      const submissionData = {
        title: finalTitle,
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
        location_state: data.location_state?.trim() || null,
        location_zip_code: data.location_zip_code?.trim() || null,
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

      console.log('📤 Attempting to submit work order with data:', submissionData);
      const workOrderResult = await createWorkOrderMutation.mutateAsync(submissionData);
      console.log('✅ Work order created successfully:', workOrderResult);

      let filesUploaded = 0;

      // Phase 2: Upload files if any are selected
      if (selectedFiles.length > 0) {
        setSubmissionPhase('uploading');
        console.log('📁 Starting file upload for', selectedFiles.length, 'files');

        try {
          // Upload files using the hook - it will handle both storage and database
          const uploadResults = await uploadFiles(
            selectedFiles,
            workOrderResult.id, // work order ID
            undefined // no report ID for work order attachments
          );

          console.log('✅ All files uploaded successfully:', uploadResults);
          filesUploaded = uploadResults.length;
        } catch (uploadError: any) {
          console.error('❌ File upload error:', uploadError);
          // Work order was created successfully, but file upload failed
          toast({
            variant: "destructive",
            title: "File upload failed",
            description: `Work order created successfully, but failed to upload files: ${uploadError.message}`,
          });
          // Still navigate since work order was created
          navigate('/partner/work-orders');
          return;
        }
      }

      // Success message with file count
      const successDescription = filesUploaded > 0 
        ? `Work order created with ${filesUploaded} files uploaded`
        : "Work order created successfully";

      toast({
        title: "Success",
        description: successDescription,
      });
      
      // Navigate back to work orders list
      navigate('/partner/work-orders');
    } catch (error: any) {
      console.error('❌ Error submitting work order:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
      
      const errorPhase = submissionPhase === 'creating' ? 'work order creation' : 'file upload';
      toast({
        variant: "destructive",
        title: `${errorPhase.charAt(0).toUpperCase() + errorPhase.slice(1)} error`,
        description: error.message || `Failed to complete ${errorPhase}.`,
      });
    } finally {
      setSubmissionPhase('idle');
    }
  };

  return (
    <div 
      className="space-y-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header with improved back button */}
      <div className="flex items-center gap-4">
        <Link to="/partner/work-orders">
          <Button variant="outline" size="sm" className="min-h-[48px] sm:min-h-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Work Orders</span>
            <span className="sm:hidden">Back</span>
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
            {loadingAllOrganizations ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <Select onValueChange={setSelectedOrganizationId} value={selectedOrganizationId}>
                <SelectTrigger className="h-12 sm:h-11">
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced Step Progress Indicator */}
      <StepIndicator currentStep={currentStep} totalSteps={3} />

      {/* Keyboard shortcuts hint */}
      <div className="hidden sm:block text-center text-xs text-muted-foreground mb-4">
        Use <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Enter</kbd> to continue, <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Esc</kbd> to go back
      </div>

      {/* Mobile swipe hint */}
      <div className="sm:hidden text-center text-xs text-muted-foreground mb-4">
        Swipe left or right to navigate between steps
      </div>

      {/* Form with enhanced step transitions */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 sm:space-y-6">
          {/* Step 1: Location Details */}
          {currentStep === 1 && (
            <div className="animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    1. Location Details
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
            </div>
          )}

          {/* Step 2: Trade & Description */}
          {currentStep === 2 && (
            <div className="animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    2. Work Details
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Provide details about the work to be performed
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:gap-4">
                    <FormField
                      control={form.control}
                      name="trade_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type of Work *</FormLabel>
                          {isLoadingTrades ? (
                            <div className="space-y-2">
                              <Skeleton className="h-12 w-full" />
                              <p className="text-sm text-muted-foreground">Loading trade options...</p>
                            </div>
                          ) : tradesError ? (
                            <div className="space-y-2">
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  Failed to load trade options. 
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="ml-2"
                                    onClick={loadTrades}
                                  >
                                    <RefreshCw className="h-4 w-4 mr-1" />
                                    Retry
                                  </Button>
                                </AlertDescription>
                              </Alert>
                            </div>
                          ) : (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 sm:h-11">
                                  <SelectValue placeholder="Select the type of work needed" />
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
                          )}
                          <FormDescription>
                            Choose the category that best describes the work needed
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe what needs to be done..."
                              className="min-h-[140px] sm:min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            The more details you provide, the better we can help you
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* File Upload Section */}
                    <div className="space-y-4">
                      <Label className="text-base font-medium">
                        Add photos to help explain the issue (optional)
                      </Label>
                      <div className="text-sm text-muted-foreground mb-4">
                        Upload images or PDFs to help explain the work needed. Maximum 10 files, 10MB each.
                      </div>
                      
                      {isMobile ? (
                        <MobileFileUpload
                          onFilesSelected={handleFilesSelected}
                          maxFiles={10}
                          maxSizeBytes={10 * 1024 * 1024}
                          uploadProgress={uploadProgress}
                          disabled={isUploading}
                          acceptedTypes={['image/*', '.pdf']}
                          showCameraButton={true}
                          showGalleryButton={true}
                          showDocumentButton={true}
                        />
                      ) : (
                        <FileUpload
                          onFilesSelected={handleFilesSelected}
                          maxFiles={10}
                          maxSizeBytes={10 * 1024 * 1024}
                          uploadProgress={uploadProgress}
                          disabled={isUploading}
                          acceptedTypes={['image/*', '.pdf']}
                        />
                      )}
                    </div>

                    {/* Admin-only fields */}
                    {isAdmin && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-4">
                        <FormField
                          control={form.control}
                          name="due_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Due Date</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  className="h-12 sm:h-11"
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
                                  className="h-12 sm:h-11"
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
            </div>
          )}

          {/* Step 3: Comprehensive Review */}
          {currentStep === 3 && (
            <div className="animate-fade-in">
              <WorkOrderReviewSummary
                trades={trades}
                workOrderNumber={workOrderNumber}
                isLoadingWorkOrderNumber={isLoadingWorkOrderNumber}
                workOrderNumberError={workOrderNumberError}
                organizationName={organizationName}
                userProfile={profile}
                selectedLocation={selectedLocation}
                generatedLocationNumber={generatedLocationNumber}
                isLoadingLocations={isLoadingLocations}
                locationsError={locationsError?.message || null}
                partnerLocationSelection={partnerLocationSelection}
              />
            </div>
          )}

          {/* Error alert for work order number generation */}
          {currentStep === 3 && workOrderNumberError && (
            <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Work order number preview unavailable, but submission will work normally
              </AlertDescription>
            </Alert>
          )}

          {/* Enhanced Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isNavigating}
              className="min-h-[56px] px-6 sm:min-h-[48px] transition-all duration-200 hover:scale-105"
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Back</span>
            </Button>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/partner/work-orders')}
                className="min-h-[56px] px-4 sm:min-h-[48px]"
              >
                Cancel
              </Button>

              {currentStep < 3 ? (
                <Button
                  type="button"
                  size="lg"
                  onClick={handleNext}
                  disabled={isNavigating}
                  className="min-h-[56px] px-6 sm:min-h-[48px] transition-all duration-200 hover:scale-105"
                >
                  {isNavigating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Continue</span>
                      <span className="sm:hidden">Next</span>
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <>
                  {/* DEBUG: Submit Button State */}
                  <div className="text-xs text-muted-foreground mb-2 p-2 bg-muted rounded">
                    <strong>🔍 DEBUG INFO:</strong><br/>
                    Current Step: {currentStep}/3<br/>
                    Organization ID: {effectiveOrganizationId || 'MISSING'}<br/>
                    Trade ID: {form.getValues('trade_id') || 'MISSING'}<br/>
                    Is Pending: {String(createWorkOrderMutation.isPending)}<br/>
                    Button Disabled: {String(createWorkOrderMutation.isPending || !effectiveOrganizationId || !form.getValues('trade_id'))}<br/>
                  </div>
                  
                  <Button
                    type="submit"
                    size="lg"
                    disabled={submissionPhase !== 'idle' || !effectiveOrganizationId || !form.getValues('trade_id')}
                    className="min-h-[56px] px-6 sm:min-h-[48px] bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105"
                    onClick={(e) => {
                      console.log('🚀 SUBMIT BUTTON CLICKED!');
                      console.log('Event type:', e.type);
                      console.log('Current step:', currentStep);
                      console.log('Form values:', form.getValues());
                      console.log('Organization ID:', effectiveOrganizationId);
                      console.log('Submission phase:', submissionPhase);
                      console.log('Selected files:', selectedFiles.length);
                    }}
                  >
                    {submissionPhase === 'creating' ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Creating Work Order...
                      </>
                    ) : submissionPhase === 'uploading' ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Uploading Files...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Submit Work Order
                        {selectedFiles.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            +{selectedFiles.length} files
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
