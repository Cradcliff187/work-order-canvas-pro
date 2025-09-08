import React, { useRef, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useReceipts } from "@/hooks/useReceipts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useAnalytics } from "@/utils/analytics";
import { validateField } from "@/utils/receiptValidation";
import { AllocationWorkflowValidator, type WorkflowAllocation } from "@/utils/allocationWorkflow";
import { mapOCRConfidenceToForm, type FormConfidence } from '@/utils/ocr-confidence-mapper';
import { cn } from "@/lib/utils";
import { DebugPanel } from "./DebugPanel";
import { FloatingActionBar } from "./FloatingActionBar";
import { ReceiptTour, useReceiptTour } from "./ReceiptTour";
import { ReceiptSuccessCard } from "./ReceiptSuccessCard";
import { useReceiptFlow } from "@/hooks/useReceiptFlow";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { format } from "date-fns";
import type { OCRResult, SmartReceiptFormData } from '@/types/receipt';

// Section Components
import { ReceiptOCRSection } from "./sections/ReceiptOCRSection";
import { ReceiptFormSection } from "./sections/ReceiptFormSection";
import { ReceiptAllocationSection } from "./sections/ReceiptAllocationSection";

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
  // Centralized state management
  const { state, actions, computed, persistence } = useReceiptFlow();
  
  // Hooks
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { track, trackError, trackFormInteraction } = useAnalytics();
  
  // Track component mount and cleanup
  useEffect(() => {
    track('receipt_flow_started');
    
    // Safety timeout to clear processing locks
    const lockSafetyTimeout = setTimeout(() => {
      if (computed.isProcessingLocked) {
        console.warn('Auto-clearing stuck OCR processing lock');
        actions.cancelOCRProcessing();
      }
    }, 45000);
    
    return () => {
      actions.cleanupCameraStream();
      clearTimeout(lockSafetyTimeout);
    };
  }, []);
  
  const { showTour, hasCompletedTour, completeTour, skipTour, startTour } = useReceiptTour();
  const { onFormSave, onSubmitSuccess, onError } = useHapticFeedback();
  
  // Extract commonly used state for readability
  const flowStage = state.stage;
  const receiptFile = state.receipt.file;
  const ocrData = state.ocr.data;
  const ocrConfidence = state.ocr.confidence;
  const showSuccess = state.ui.showSuccess;
  const showDraftSaved = state.ui.showDraftSaved;
  const allocations = state.allocation.allocations;
  
  // Pull to refresh for form reset
  const { containerRef, pullDistance, isPulling, isRefreshable } = usePullToRefresh({
    queryKey: ['receipts'],
    onFormReset: () => {
      form.reset();
      actions.resetFlow();
    },
    enableTouchGesture: isMobile
  });
  
  const { createReceipt, isUploading, availableWorkOrders } = useReceipts();

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
  
  // Handle allocation changes
  const handleAllocationsChange = useCallback((newAllocations: typeof allocations) => {
    actions.updateAllocations(newAllocations);
  }, [actions]);
  
  const workflowAllocations = allocations || [];
  const currentAmount = form.watch('amount') || 0;

  // OCR Success handler
  const handleOCRSuccess = useCallback((ocrResult: OCRResult, confidence: FormConfidence) => {
    actions.setOCRSuccess(ocrResult, confidence);
  }, [actions]);

  // Manual entry handler
  const startManualEntry = useCallback(() => {
    actions.startManualEntry();
  }, [actions]);

  // Draft save functionality
  const saveDraft = useCallback(() => {
    onFormSave();
    persistence.saveDraft();
    actions.showDraftSaved(true);
    
    toast({
      title: 'Draft Saved',
      description: 'Your receipt draft has been saved locally.',
    });
    
    setTimeout(() => actions.showDraftSaved(false), 3000);
  }, [onFormSave, persistence, actions, toast]);

  // Memoized form submission with new workflow validation
  const onSubmit = useCallback(async (data: SmartReceiptFormData) => {
    trackFormInteraction('form_submit', { 
      vendor: data.vendor_name,
      amount: data.amount,
      ocrConfidence,
      allocationsCount: workflowAllocations.length 
    });
    
    // Enhanced pre-submission validation with new workflow
    const validator = new AllocationWorkflowValidator(data.amount, availableWorkOrders.data || []);
    const validationResult = validator.validateWorkflow({
      selectedWorkOrderIds: workflowAllocations.map(a => a.work_order_id),
      allocations: workflowAllocations,
      totalAmount: data.amount,
      mode: 'confirm'
    });

    if (!validationResult.canSubmit) {
      const primaryError = validationResult.errors[0];
      toast({
        title: "Allocation Error",
        description: primaryError?.message || "Please fix allocation issues before submitting",
        variant: "destructive"
      });
      trackError(new Error('Validation failed'), { 
        context: 'form_submit_validation',
        errors: validationResult.errors.map(e => e.message)
      });
      return;
    }

    if (workflowAllocations.length === 0) {
      toast({
        title: "Allocation Required",
        description: "Please select and allocate this receipt to at least one work order",
        variant: "destructive"
      });
      return;
    }

    try {
      const submitStartTime = Date.now();
      
      const receiptData = {
        vendor_name: data.vendor_name,
        amount: data.amount,
        description: data.description || '',
        receipt_date: data.receipt_date,
        notes: data.notes || '',
        allocations: workflowAllocations.map(a => ({
          work_order_id: a.work_order_id,
          allocated_amount: a.allocated_amount,
          allocation_notes: a.allocation_notes || ""
        })),
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
        form.reset();
        actions.resetFlow();
      }, 2000);

      toast({
        title: 'Receipt Saved!',
        description: 'Your receipt has been processed and saved.',
      });

    } catch (error: any) {
      console.error('Receipt submission error:', error);
      trackError(error, { context: 'Receipt submission', formData: data });
      onError();
      toast({
        title: 'Error',
        description: error.message || 'Failed to save receipt',
        variant: 'destructive',
      });
    }
  }, [workflowAllocations, receiptFile, createReceipt, onSubmitSuccess, actions, form, toast, onError, track, trackError, trackFormInteraction, ocrData, ocrConfidence]);


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

      {/* OCR Section - File upload, camera, and processing */}
      <ReceiptOCRSection
        state={state}
        actions={actions}
        computed={computed}
        form={form}
        onOCRSuccess={handleOCRSuccess}
        onManualEntry={startManualEntry}
        hasCompletedTour={hasCompletedTour}
        onStartTour={startTour}
      />

      {/* Form Section - Receipt form fields and line items */}
      <ReceiptFormSection
        form={form}
        ocrData={ocrData}
        ocrConfidence={ocrConfidence}
        actions={actions}
        isMobile={isMobile}
        isFormVisible={computed.isFormVisible}
        onSubmit={onSubmit}
      />

      {/* Allocation Section - Work order allocation */}
      <ReceiptAllocationSection
        availableWorkOrders={availableWorkOrders.data || []}
        allocations={workflowAllocations}
        totalAmount={currentAmount}
        vendorName={watchedValues.vendor_name}
        onAllocationsChange={handleAllocationsChange}
        showAllocationSection={computed.isFormVisible && availableWorkOrders.data && availableWorkOrders.data.length > 0}
      />

      {/* Floating Action Bar */}
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