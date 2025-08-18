import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useReceipts } from "@/hooks/useReceipts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useAnalytics } from "@/utils/analytics";
import { ErrorDisplay, getErrorForToast } from '@/components/receipts/ErrorDisplay';
import { compressImage } from "@/utils/imageCompression";
import { validateField } from "@/utils/receiptValidation";
import { validateAllocations, canSubmitAllocations } from "@/utils/allocationValidation";
import { mapOCRConfidenceToForm, type FormConfidence } from '@/utils/ocr-confidence-mapper';
import { cn } from "@/lib/utils";
import { DebugPanel } from "./DebugPanel";
import { FileUploadSection } from "./FileUploadSection";
import { CameraCapture } from "./CameraCapture";
import { FilePreview } from "./FilePreview";
import { ReceiptFormFields } from "./ReceiptFormFields";
import { useOCRProcessor } from '@/hooks/useOCRProcessor';
import { EnhancedAllocationPanel } from "./EnhancedAllocationPanel";
import { FloatingActionBar } from "./FloatingActionBar";
import { FloatingProgress } from "./FloatingProgress";
import { ReceiptTour, useReceiptTour } from "./ReceiptTour";
import { ReceiptSuccessCard } from "./ReceiptSuccessCard";
import { LineItemsDisplay } from "./LineItemsDisplay";
import { useReceiptFlow } from "@/hooks/useReceiptFlow";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Edit } from "lucide-react";
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useCamera } from '@/hooks/useCamera';
import { format } from "date-fns";
import type { LineItem, OCRResult, SmartReceiptFormData } from '@/types/receipt';

// Progressive validation schema - allows submission with warnings
const receiptSchema = z.object({
  vendor_name: z.string().min(1, "Vendor name is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
  receipt_date: z.string().min(1, "Receipt date is required"),
  notes: z.string().optional(),
  work_order_id: z.string().optional(),
});

// Helper function to check if form can be submitted (allows warnings, blocks only errors)
const canSubmitForm = (formData: SmartReceiptFormData, confidence: Record<string, number>) => {
  const vendorValidation = validateField('vendor', formData.vendor_name, confidence.vendor);
  const amountValidation = validateField('amount', formData.amount, confidence.total);
  const dateValidation = validateField('date', formData.receipt_date, confidence.date);
  
  // Only block submission for actual errors, not warnings
  return vendorValidation.severity !== 'error' && 
         amountValidation.severity !== 'error' && 
         dateValidation.severity !== 'error';
};

// Common vendors for quick selection
const COMMON_VENDORS = [
  'Home Depot', 'Lowes', 'Menards', 'Harbor Freight',
  'Grainger', 'Ferguson', 'Shell', 'BP', 'Speedway',
  'Circle K', 'McDonald\'s', 'Subway', 'Jimmy Johns'
];


// File size limit (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function SmartReceiptFlow() {
  
  // Centralized state management with useReceiptFlow hook
  const { state, actions, computed, persistence } = useReceiptFlow();
  
  // Debug state moved to DebugPanel component
  
  // Hooks
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { 
    track, 
    trackPerformance, 
    trackError, 
    trackImageCompression, 
    trackOCRPerformance, 
    trackFormInteraction 
  } = useAnalytics();
  
  // Track component mount and cleanup MediaStream on unmount
  useEffect(() => {
    track('receipt_flow_started');
    
    // Safety timeout to clear processing locks (prevent permanent locks)
    const lockSafetyTimeout = setTimeout(() => {
      if (computed.isProcessingLocked) {
        console.warn('Auto-clearing stuck OCR processing lock');
        actions.cancelOCRProcessing();
      }
    }, 45000); // 45 seconds safety timeout
    
    // Cleanup function
    return () => {
      actions.cleanupCameraStream();
      clearTimeout(lockSafetyTimeout);
    };
  }, []); // Empty deps - only track on initial mount and cleanup on unmount
  
  const { showTour, hasCompletedTour, completeTour, skipTour, startTour } = useReceiptTour();
  const { onImageCapture, onFormSave, onSubmitSuccess, onError, onSwipeAction } = useHapticFeedback();
  
  // Camera functionality
  const { 
    isSupported: cameraSupported,
    captureImageFromCamera,
    checkCameraPermission,
    requestCameraPermission 
  } = useCamera();
  
  // Extract commonly used state for readability
  const flowStage = state.stage;
  const receiptFile = state.receipt.file;
  const imagePreview = state.receipt.imagePreview;
  const isProcessingOCR = computed.isOCRProcessing;
  const isProcessingLocked = computed.isProcessingLocked;
  const ocrData = state.ocr.data;
  const ocrConfidence = state.ocr.confidence;
  const showSuccess = state.ui.showSuccess;
  const progressStage = state.progress.stage;
  const progressValue = state.progress.value;
  const showDraftSaved = state.ui.showDraftSaved;
  const ocrError = state.ocr.error;
  const showCameraCapture = state.ui.showCameraCapture;
  const cameraStream = state.ui.cameraStream;
  
  // Allocation state
  const allocationMode = state.allocation.mode;
  const allocations = state.allocation.allocations;

  // Debug logging for form visibility and stage transitions (debounced)
  useEffect(() => {
    let mounted = true;
    
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.log('🔍 Form visibility state:', {
          flowStage,
          isFormVisible: computed.isFormVisible,
          hasOCRData: computed.hasOCRData,
          ocrData: ocrData ? 'Present' : 'None',
          ocrError: ocrError ? 'Present' : 'None',
          confidence: ocrConfidence
        });
      }
    }, 300); // 300ms debounce
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [flowStage, computed.isFormVisible, computed.hasOCRData, ocrData, ocrError, ocrConfidence]);

  // Memoized file handling functions
  const removeFile = useCallback(() => {
    onSwipeAction(); // Haptic feedback
    actions.resetFlow();
    // Debug data handled by DebugPanel
  }, [onSwipeAction, actions]);

  // Swipe gesture for image removal
  const swipeGesture = useSwipeGesture({
    threshold: 75,
    verticalCancelThreshold: 10
  });

  // Handle swipe gesture completion (stabilized)
  useEffect(() => {
    let mounted = true;
    
    if (!swipeGesture.isSwipeing && swipeGesture.distance > 75 && swipeGesture.direction) {
      const timeoutId = setTimeout(() => {
        if (mounted) {
          removeFile();
        }
      }, 50); // Small delay to prevent rapid firing
      
      return () => {
        mounted = false;
        clearTimeout(timeoutId);
      };
    }
  }, [swipeGesture.isSwipeing, swipeGesture.distance, swipeGesture.direction, removeFile]);
  
  // Pull to refresh for form reset
  const { containerRef, pullDistance, isPulling, isRefreshable } = usePullToRefresh({
    queryKey: ['receipts'],
    onFormReset: () => {
      form.reset();
      actions.resetFlow();
      // Debug data handled by DebugPanel
    },
    enableTouchGesture: isMobile
  });
  
  const { receipts, availableWorkOrders, createReceipt, isUploading } = useReceipts();

  // Memoize recent work orders calculation for performance
  const recentWorkOrders = useMemo(() => {
    if (!receipts.data || !availableWorkOrders.data) return [];
    
    // Extract work order IDs from recent receipts
    const recentWorkOrderIds = (receipts.data || [])
      .slice(0, 10) // Last 10 receipts
      .flatMap(receipt => receipt.receipt_work_orders?.map(rwo => rwo.work_order_id) || [])
      .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates
    
    // Map to actual work order objects
    return recentWorkOrderIds
      .map(id => (availableWorkOrders.data || []).find(wo => wo.id === id))
      .filter(Boolean) // Remove undefined
      .slice(0, 3); // Top 3
  }, [receipts.data, availableWorkOrders.data]);

  // Form setup
  const form = useForm<SmartReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      vendor_name: "",
      amount: 0,
      description: "",
      receipt_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      work_order_id: "",
    },
  });

  // Watch form values with debounce for performance
  const watchedValues = form.watch();
  const debouncedValues = useDebounce(watchedValues, 300);
  
  // Memoize form validation for performance
  const isFormValid = useMemo(() => {
    return canSubmitForm(debouncedValues, ocrConfidence) && 
           debouncedValues.vendor_name && 
           debouncedValues.amount > 0 && 
           debouncedValues.receipt_date;
  }, [debouncedValues, ocrConfidence]);
  
  const isDirty = form.formState.isDirty || computed.hasReceiptFile;
  
  // Determine if allocation mode toggle should be shown
  const currentAmount = form.watch('amount') || 0;
  const showAllocationToggle = useMemo(() => {
    return currentAmount > 100 || (availableWorkOrders.data && availableWorkOrders.data.length > 1);
  }, [currentAmount, availableWorkOrders.data]);
  
  // Handle allocation changes
  const handleAllocationModeChange = useCallback((mode: 'single' | 'split') => {
    actions.setAllocationMode(mode);
  }, [actions]);
  
  const handleAllocationsChange = useCallback((newAllocations: typeof allocations) => {
    actions.updateAllocations(newAllocations);
  }, [actions]);
  
  const handleSingleAllocationChange = useCallback((workOrderId: string) => {
    actions.setSingleAllocation(workOrderId, currentAmount);
  }, [actions, currentAmount]);
  
  // Update allocation amount when form amount changes (debounced)
  useEffect(() => {
    let mounted = true;
    
    if (allocationMode === 'single' && (allocations || []).length > 0 && currentAmount > 0) {
      const timeoutId = setTimeout(() => {
        if (mounted) {
          actions.updateAllocations([{
            ...(allocations || [])[0],
            allocated_amount: currentAmount,
          }]);
        }
      }, 200); // 200ms debounce for form updates
      
      return () => {
        mounted = false;
        clearTimeout(timeoutId);
      };
    }
  }, [currentAmount, allocationMode, allocations, actions]);

  // OCR Processing Hook
  const { processWithOCR, cancelOCR: cancelOCRProcessor } = useOCRProcessor({
    onOCRStart: () => {
      actions.startOCRProcessing();
      trackOCRPerformance('started', { fileName: receiptFile?.name || 'unknown', fileSize: receiptFile?.size || 0 });
    },
    onOCRProgress: (stage: string, progress: number) => {
      actions.updateOCRProgress(stage as any, progress);
    },
    onOCRSuccess: (ocrResult) => {
      // Set form values
      if (ocrResult.vendor) form.setValue('vendor_name', ocrResult.vendor);
      if (ocrResult.total) form.setValue('amount', ocrResult.total);
      if (ocrResult.date) {
        form.setValue('receipt_date', ocrResult.date);
        console.log('📅 Date OCR Success:', {
          ocrDate: ocrResult.date,
          formDateAfterSet: form.getValues('receipt_date'),
          dateType: typeof ocrResult.date,
          isValidDate: ocrResult.date ? !isNaN(new Date(ocrResult.date).getTime()) : false
        });
      }
      
      // Map and set confidence values
      const mappedConfidence = mapOCRConfidenceToForm(ocrResult.confidence || {});
      
      // Convert hook's OCRResult to component's OCRResult format with required properties
      const componentOCRResult: OCRResult = {
        vendor: ocrResult.vendor || '',
        total: ocrResult.total || 0,
        date: ocrResult.date || '',
        confidence: {
          vendor: ocrResult.confidence?.vendor || 0,
          total: ocrResult.confidence?.total || 0,
          lineItems: 0,
          date: ocrResult.confidence?.date || 0,
        },
        lineItems: ocrResult.line_items?.map(item => ({
          description: item.description,
          quantity: 1,
          unit_price: item.amount,
          total_price: item.amount
        })) || []
      };
      
      actions.setOCRSuccess(componentOCRResult, mappedConfidence);
      
      const successMessage = `Found ${ocrResult.vendor || 'vendor'} - $${ocrResult.total || 0}`;
      toast({
        title: '✨ Receipt Scanned!',
        description: successMessage,
      });
      
      trackOCRPerformance('completed', { 
        confidence: ocrResult.confidence,
        extractedFields: {
          vendor: !!ocrResult.vendor,
          amount: !!ocrResult.total,
          date: !!ocrResult.date,
          lineItems: ocrResult.line_items?.length || 0
        }
      });
    },
    onOCRError: (error) => {
      trackOCRPerformance('failed', { 
        errorMessage: error.message,
        errorType: error.code || 'unknown'
      });
      trackError(error, { context: 'OCR processing', fileName: receiptFile?.name || 'unknown' });
      
      let errorMessage = 'Unable to extract data from receipt';
      if (error.message?.includes('network')) {
        errorMessage = 'Network issue - check your connection';
      } else if (error.message?.includes('file') || error.message?.includes('format')) {
        errorMessage = 'Image quality too low or unsupported format';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Processing took too long - try a clearer image';
      }
      
      actions.setOCRError(errorMessage);
    },
    setRawOCRText: () => {}, // No-op, handled by DebugPanel
    setDebugOCRData: () => {}, // No-op, handled by DebugPanel
    isProcessingLocked,
  });

  // File selection handler for extracted components
  const handleFileSelect = useCallback(async (file: File, preview?: string) => {
    actions.setFile(file, preview);
    await processWithOCR(file);
  }, [actions, processWithOCR]);

  const handleCameraCapture = useCallback(async () => {
    // Prevent camera capture if processing is locked
    if (isProcessingLocked) {
      toast({
        title: 'Processing in Progress',
        description: 'Please wait for current processing to complete or cancel it',
        variant: 'destructive',
      });
      return;
    }

    try {
      const permission = await checkCameraPermission();
      if (!permission.granted) {
        const granted = await requestCameraPermission();
        if (!granted) {
          toast({
            title: "Camera access required",
            description: "Please allow camera access to capture receipts",
            variant: "destructive"
          });
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use rear camera for documents
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      actions.setCameraState(true, stream);
    } catch (error) {
      console.error('Camera access error:', error);
      onError();
      const toastError = getErrorForToast(error);
      toast({
        title: toastError.title,
        description: toastError.description,
        variant: toastError.variant
      });
    }
  }, [checkCameraPermission, requestCameraPermission, toast, onError, actions, isProcessingLocked]);

  const captureFromCamera = useCallback(async () => {
    try {
      if (!cameraStream) return;
      
      const file = await captureImageFromCamera();
      if (file) {
        onImageCapture();
        // Camera cleanup is handled by the reducer
        actions.setCameraState(false);
        
        // Debug data handled by DebugPanel
        
        // Compress captured image
        try {
          const compressionResult = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.8
          });
          
          const compressedFile = compressionResult.file;
          
          // Create image preview
          const reader = new FileReader();
          reader.onload = (e) => {
            const preview = e.target?.result as string;
            actions.setFile(compressedFile, preview);
          };
          reader.readAsDataURL(compressedFile);
          
          // Process with OCR using compressed file
          processWithOCR(compressedFile);
        } catch (error: any) {
          console.error('Image compression error:', error);
          
          // Fall back to original file if compression fails
          const reader = new FileReader();
          reader.onload = (e) => {
            const preview = e.target?.result as string;
            actions.setFile(file, preview);
          };
          reader.readAsDataURL(file);
          processWithOCR(file);
        }
      }
    } catch (error) {
      console.error('Image capture error:', error);
      onError();
      const toastError = getErrorForToast(error);
      toast({
        title: toastError.title,
        description: toastError.description,
        variant: toastError.variant
      });
    }
  }, [cameraStream, captureImageFromCamera, onImageCapture, onError, toast, actions, processWithOCR]);

  const closeCameraCapture = useCallback(() => {
    // Camera cleanup is handled by the reducer
    actions.setCameraState(false);
  }, [actions]);

  // Memoized manual entry function
  const startManualEntry = useCallback(() => {
    actions.startManualEntry();
  }, [actions]);

  // Memoized draft save functionality
  const saveDraft = useCallback(() => {
    onFormSave(); // Haptic feedback
    persistence.saveDraft();
    actions.showDraftSaved(true);
    
    toast({
      title: 'Draft Saved',
      description: 'Your receipt draft has been saved locally.',
    });
    
    // Hide draft saved indicator after 3 seconds (with cleanup)
    const timeoutId = setTimeout(() => actions.showDraftSaved(false), 3000);
    return () => clearTimeout(timeoutId);
  }, [onFormSave, persistence, actions, toast]);

  // Memoized OCR retry function
  const retryOCR = useCallback(() => {
    if (receiptFile) {
      // Debug data handled by DebugPanel
      actions.retryOCR();
      processWithOCR(receiptFile);
    }
  }, [receiptFile, actions, processWithOCR]);

  // Cancel OCR processing
  const cancelOCR = useCallback(() => {
    cancelOCRProcessor();
    actions.cancelOCRProcessing();
    toast({
      title: 'Processing Cancelled',
      description: 'OCR processing has been cancelled',
    });
  }, [cancelOCRProcessor, actions, toast]);

  // Memoized form submission
  const onSubmit = useCallback(async (data: SmartReceiptFormData) => {
    const submitStartTime = Date.now();
    
    try {
      // Use allocation system for work order assignment
      const finalAllocations = allocations.length > 0 
        ? allocations 
        : (data.work_order_id ? [{ 
            work_order_id: data.work_order_id, 
            allocated_amount: data.amount 
          }] : []);
      
      // Validate allocations before submission
      if (!canSubmitAllocations(finalAllocations, data.amount)) {
        const validationResult = validateAllocations(finalAllocations, {
          totalAmount: data.amount,
          allowPartialAllocation: true
        });
        
        toast({
          title: "Invalid Allocations",
          description: validationResult.errors[0] || "Please fix allocation errors before submitting",
          variant: "destructive"
        });
        return;
      }

      // Check if allocations are empty
      if (finalAllocations.length === 0) {
        toast({
          title: "Work Order Required",
          description: "Please select at least one work order for allocation",
          variant: "destructive"
        });
        return;
      }
      
      const receiptData = {
        vendor_name: data.vendor_name,
        amount: data.amount,
        description: data.description || '',
        receipt_date: data.receipt_date,
        notes: data.notes || '',
        allocations: finalAllocations,
        receipt_image: receiptFile,
      };

      await createReceipt.mutateAsync(receiptData);
      
      const submissionTime = Date.now() - submitStartTime;
      track('receipt_submitted', {
        submissionTime,
        hasWorkOrder: !!data.work_order_id,
        hasNotes: !!data.notes,
        amount: data.amount,
        vendor: data.vendor_name,
        hasOCRData: !!ocrData
      });
      
      onSubmitSuccess(); // Haptic feedback

      // Success state
      actions.completeSubmission();
      setTimeout(() => {
        // Reset form and state
        form.reset();
        actions.resetFlow();
        // Debug data handled by DebugPanel
      }, 2000);

      toast({
        title: 'Receipt Saved!',
        description: 'Your receipt has been processed and saved.',
      });

    } catch (error: any) {
      console.error('Receipt submission error:', error);
      const submissionTime = Date.now() - submitStartTime;
      trackError(error, { 
        context: 'Receipt submission',
        submissionTime,
        formData: data
      });
      onError(); // Haptic feedback
      toast({
        title: 'Error',
        description: error.message || 'Failed to save receipt',
        variant: 'destructive',
      });
    }
  }, [receiptFile, createReceipt, onSubmitSuccess, actions, form, toast, onError, track, trackError, ocrData, allocations]);

  // Memoized confidence indicator
  const getConfidenceColor = useCallback((field: string) => {
    const confidence = ocrConfidence[field] || 0;
    if (confidence >= 0.8) return 'text-success';
    if (confidence >= 0.5) return 'text-warning';
    return 'text-destructive';
  }, [ocrConfidence]);


  if (showSuccess) {
    return <ReceiptSuccessCard />;
  }

  return (
    <TooltipProvider>
      <div ref={containerRef as any} className="max-w-2xl mx-auto space-y-6 relative" data-tour="main-container">
      {/* Pull-to-refresh indicator for mobile */}
      <AnimatePresence>
        {isPulling && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-10 text-center py-2"
            style={{ transform: `translateY(${pullDistance}px)` }}
          >
            <div className={cn(
              "inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm border",
              isRefreshable ? "text-primary border-primary/20" : "text-muted-foreground border-border"
            )}>
              <RefreshCw className={cn(
                "h-4 w-4",
                isPulling && "animate-spin"
              )} />
              {isRefreshable ? "Release to refresh" : "Pull to refresh"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug Panel Component */}
      <DebugPanel 
        ocrResult={ocrData}
        formData={form.getValues()}
        confidenceValues={ocrConfidence}
      />

      {/* File Upload Section */}
      <FileUploadSection
        onFileSelect={handleFileSelect}
        onCameraCapture={handleCameraCapture}
        cameraSupported={cameraSupported}
        isProcessingLocked={isProcessingLocked}
        hasFile={computed.hasReceiptFile}
        hasCompletedTour={hasCompletedTour}
        onStartTour={startTour}
        dataTour="upload-section"
      />

      {/* File Preview Section */}
      {(imagePreview || receiptFile) && (
        <Card>
          <CardContent className="pt-6">
            <FilePreview
              file={receiptFile}
              imagePreview={imagePreview}
              onRemove={removeFile}
              swipeGesture={isMobile ? swipeGesture : undefined}
              ocrConfidence={ocrConfidence}
            />

            {/* Error Recovery Section - Show when OCR fails */}
            {computed.isInErrorState && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4"
              >
                <ErrorDisplay
                  error={ocrError}
                  onRetry={retryOCR}
                  onManualEntry={startManualEntry}
                />
              </motion.div>
            )}

            {/* Manual Entry Option - Always available in capture stage */}
            {flowStage === 'capture' && !computed.hasReceiptFile && (
              <div className="text-center pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={startManualEntry}
                  className="gap-2 text-muted-foreground"
                >
                  <Edit className="h-4 w-4" />
                  Skip OCR - Enter Manually
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={showCameraCapture}
        cameraStream={cameraStream}
        onCapture={captureFromCamera}
        onClose={closeCameraCapture}
      />

      {/* Form sections remain the same... */}
      {/* Progressive Review Form Section - Only show in review or manual-entry stages */}
      <AnimatePresence>
        {computed.isFormVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-tour="form-section">
            
            {/* Main Receipt Details */}
            <ReceiptFormFields
              form={form}
              ocrConfidence={ocrConfidence}
              isMobile={isMobile}
            />

            {/* Enhanced Work Order Assignment */}
            {availableWorkOrders.data && availableWorkOrders.data.length > 0 && (
              <div data-tour="work-order-section">
                <EnhancedAllocationPanel
                  availableWorkOrders={availableWorkOrders.data}
                  recentWorkOrders={recentWorkOrders}
                  totalAmount={currentAmount}
                  mode={allocationMode}
                  allocations={allocations}
                  onModeChange={handleAllocationModeChange}
                  onAllocationsChange={handleAllocationsChange}
                  onSingleAllocationChange={handleSingleAllocationChange}
                  showModeToggle={showAllocationToggle}
                />
              </div>
            )}

            {/* Line Items */}
            <LineItemsDisplay
              ocrData={ocrData}
              ocrConfidence={ocrConfidence}
              onUpdateOCRData={(newData, confidence) => actions.setOCRSuccess(newData, confidence)}
              form={form}
            />


            {/* Bottom padding to account for FloatingActionBar */}
            <div className="pb-32" />
          </form>
        </Form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Progress Indicator */}
      <FloatingProgress
        isVisible={isProcessingOCR}
        stage={progressStage}
        progress={progressValue}
        message={progressStage === 'complete' && ocrData ? 
          `Found ${ocrData.vendor || 'vendor'} - $${ocrData.total || 0}` : 
          ocrError || undefined
        }
        onRetry={retryOCR}
        onManualEntry={startManualEntry}
        onCancel={cancelOCR}
        showCancel={isProcessingLocked && progressStage !== 'complete' && progressStage !== 'error'}
      />

      {/* Floating Action Bar - Only show in review or manual-entry stages */}
      {(flowStage === 'review' || flowStage === 'manual-entry') && (
        <FloatingActionBar
          vendorName={watchedValues.vendor_name}
          amount={watchedValues.amount}
          workOrderAssigned={!!watchedValues.work_order_id}
          isFormValid={!!isFormValid}
          isDirty={isDirty}
          isSubmitting={isUploading}
          onSaveDraft={saveDraft}
          onSubmit={form.handleSubmit(onSubmit)}
          onStartOver={actions.resetFlow}
          showDraftSaved={showDraftSaved}
          flowStage={flowStage}
        />
      )}

      {/* Receipt Tour */}
      <ReceiptTour 
        isVisible={showTour}
        onComplete={completeTour}
        onSkip={skipTour}
      />

      </div>
    </TooltipProvider>
  );
}