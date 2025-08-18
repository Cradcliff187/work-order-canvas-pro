import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { useReceipts } from "@/hooks/useReceipts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useAnalytics } from "@/utils/analytics";
import { ErrorDisplay, getErrorForToast } from '@/components/receipts/ErrorDisplay';
import { getErrorMessage, canRetryError, shouldOfferManualEntry } from '@/utils/errorMessages';
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { isIOS, isAndroid, getCameraAttribute } from "@/utils/mobileDetection";
import { isSupportedFileType, formatFileSize, SUPPORTED_IMAGE_TYPES } from "@/utils/fileUtils";
import { validateField, type FieldType } from "@/utils/receiptValidation";
import { compressImage, isSupportedImageType, isValidFileSize } from "@/utils/imageCompression";
import { FieldGroup } from "./FieldGroup";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { InlineEditField } from "./InlineEditField";
import { mapOCRConfidenceToForm, type OCRConfidence, type FormConfidence } from '@/utils/ocr-confidence-mapper';
import { SmartWorkOrderSelector } from "./SmartWorkOrderSelector";
import { EnhancedAllocationPanel } from "./EnhancedAllocationPanel";
import { FloatingActionBar } from "./FloatingActionBar";
import { FloatingProgress } from "./FloatingProgress";
import { ReceiptTour, useReceiptTour } from "./ReceiptTour";
import { useReceiptFlow } from "@/hooks/useReceiptFlow";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  Upload, 
  CheckCircle, 
  DollarSign, 
  FileText, 
  Calendar,
  Camera,
  X,
  Sparkles,
  Building2,
  AlertCircle,
  Plus,
  Calculator,
  Briefcase,
  List,
  PenTool,
  Edit,
  RefreshCw,
  HelpCircle,
  Info,
  Zap,
  Target,
  Copy,
  Bug,
  Eye,
  EyeOff
} from "lucide-react";
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useCamera } from '@/hooks/useCamera';
import { format } from "date-fns";

// TypeScript interfaces
interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
}

interface OCRResult {
  vendor: string;
  total: number;
  date: string;
  confidence: {
    vendor: number;
    total: number;
    lineItems: number;
    date: number;
  };
  subtotal?: number;
  tax?: number;
  lineItems: LineItem[];
  from_cache?: boolean;        // ADD THIS LINE
  processing_time?: number;     // ADD THIS LINE
}

interface SmartReceiptFormData {
  vendor_name: string;
  amount: number;
  description?: string;
  receipt_date: string;
  notes?: string;
  work_order_id?: string;
}

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

// Quick amount buttons for mobile
const QUICK_AMOUNTS = [20, 50, 100, 200, 500];

// File size limit (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function SmartReceiptFlow() {
  
  // Centralized state management with useReceiptFlow hook
  const { state, actions, computed, persistence } = useReceiptFlow();
  
  // ADD DEBUG MODE STATE - only available in development
  const [debugMode, setDebugMode] = useState(false);
  const [rawOCRText, setRawOCRText] = useState<string | null>(null);
  const [debugOCRData, setDebugOCRData] = useState<any>(null);
  const [showRawText, setShowRawText] = useState(false);
  
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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

  // Debug logging for form visibility and stage transitions
  useEffect(() => {
    console.log('🔍 Form visibility state:', {
      flowStage,
      isFormVisible: computed.isFormVisible,
      hasOCRData: computed.hasOCRData,
      ocrData: ocrData ? 'Present' : 'None',
      ocrError: ocrError ? 'Present' : 'None',
      confidence: ocrConfidence
    });
  }, [flowStage, computed.isFormVisible, computed.hasOCRData, ocrData, ocrError, ocrConfidence]);

  // Memoized file handling functions
  const removeFile = useCallback(() => {
    onSwipeAction(); // Haptic feedback
    actions.resetFlow();
    setRawOCRText(null); // Clear debug data
    setDebugOCRData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, [onSwipeAction, actions]);

  // Swipe gesture for image removal
  const swipeGesture = useSwipeGesture({
    threshold: 75,
    verticalCancelThreshold: 10
  });

  // Handle swipe gesture completion
  useEffect(() => {
    if (!swipeGesture.isSwipeing && swipeGesture.distance > 75 && swipeGesture.direction) {
      // Swipe completed with sufficient distance
      removeFile();
    }
  }, [swipeGesture.isSwipeing, swipeGesture.distance, swipeGesture.direction]);
  
  // Pull to refresh for form reset
  const { containerRef, pullDistance, isPulling, isRefreshable } = usePullToRefresh({
    queryKey: ['receipts'],
    onFormReset: () => {
      form.reset();
      actions.resetFlow();
      setRawOCRText(null);
      setDebugOCRData(null);
    },
    enableTouchGesture: isMobile
  });
  
  const { receipts, availableWorkOrders, createReceipt, isUploading } = useReceipts();

  // Memoize recent work orders calculation for performance
  const recentWorkOrders = useMemo(() => {
    if (!receipts.data || !availableWorkOrders.data) return [];
    
    // Extract work order IDs from recent receipts
    const recentWorkOrderIds = receipts.data
      .slice(0, 10) // Last 10 receipts
      .flatMap(receipt => receipt.receipt_work_orders?.map(rwo => rwo.work_order_id) || [])
      .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates
    
    // Map to actual work order objects
    return recentWorkOrderIds
      .map(id => availableWorkOrders.data?.find(wo => wo.id === id))
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
  
  // Update allocation amount when form amount changes
  useEffect(() => {
    if (allocationMode === 'single' && allocations.length > 0 && currentAmount > 0) {
      actions.updateAllocations([{
        ...allocations[0],
        allocated_amount: currentAmount,
      }]);
    }
  }, [currentAmount, allocationMode, allocations, actions]);

  // AbortController for cancelling OCR
  const abortControllerRef = useRef<AbortController | null>(null);

  // ENHANCED OCR processing function with DEBUG MODE
  const processWithOCR = useCallback(async (file: File) => {
    // Check if already processing
    if (isProcessingLocked) {
      console.warn('OCR processing rejected - already locked');
      toast({
        title: 'Processing in Progress',
        description: 'Please wait for current processing to complete',
        variant: 'destructive',
      });
      return;
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    actions.startOCRProcessing();
    const startTime = Date.now();
    trackOCRPerformance('started', { fileName: file.name, fileSize: file.size });

    // Set up timeout (30 seconds)
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('Processing timeout');
      }
    }, 30000);
    
    try {
      // Stage 1: Upload (0-30%)
      actions.updateOCRProgress('uploading', 10);
      const timestamp = Date.now();
      const fileName = `temp_ocr_${timestamp}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('work-order-attachments')
        .upload(`receipts/temp/${fileName}`, file);

      if (uploadError) throw uploadError;
      actions.updateOCRProgress('uploading', 30);

      // Stage 2: Processing (30-70%)
      actions.updateOCRProgress('processing', 40);
      
      const { data: { publicUrl } } = supabase.storage
        .from('work-order-attachments')
        .getPublicUrl(uploadData.path);

      actions.updateOCRProgress('processing', 60);

      // Stage 3: OCR Extraction (70-90%)
      actions.updateOCRProgress('extracting', 70);
      
      // DEBUG MODE: Get raw OCR text first if enabled
      if (debugMode) {
        console.log('🔍 DEBUG MODE ENABLED - Getting raw OCR text...');
        
        const { data: debugData, error: debugError } = await supabase.functions.invoke('process-receipt', {
          body: { imageUrl: publicUrl, testMode: 'debug' }
        });
        
        if (debugData && !debugError) {
          console.log('================== RAW OCR TEXT ==================');
          console.log(debugData.raw_text);
          console.log('================== FIRST 10 LINES ==================');
          console.log(debugData.first_10_lines);
          console.log('================== OCR STATS ==================');
          console.log('Text length:', debugData.text_length);
          console.log('Has DOCUMENT_TEXT:', debugData.has_doc_text);
          console.log('Has SIMPLE_TEXT:', debugData.has_simple_text);
          console.log('==================================================');
          
          // Store raw text and debug data for display
          setRawOCRText(debugData.raw_text);
          setDebugOCRData(debugData);
          
          // Show debug info in toast
          toast({
            title: '🔍 Debug: Raw OCR Text Captured',
            description: `Extracted ${debugData.text_length} characters. Check debug panel for details.`,
          });
        }
      }
      
      // Regular OCR processing
      const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('process-receipt', {
        body: { imageUrl: publicUrl }
      });

      if (ocrError) throw ocrError;
      actions.updateOCRProgress('extracting', 90);

      // Stage 4: Complete (90-100%)
      if (ocrResult) {
        const processingTime = Date.now() - startTime;
        
        // Enhanced debug logging
        if (debugMode) {
          console.group('🎯 OCR EXTRACTION RESULTS');
          console.log('Vendor:', ocrResult.vendor || 'NOT FOUND');
          console.log('Total:', ocrResult.total || 'NOT FOUND');
          console.log('Date:', ocrResult.date || 'NOT FOUND');
          console.log('Processing Time:', processingTime + 'ms');
          console.log('From Cache:', ocrResult.from_cache || false);
          console.log('Confidence:', ocrResult.confidence);
          console.groupEnd();
        }
        
        trackOCRPerformance('completed', { 
          processingTime,
          confidence: ocrResult.confidence,
          extractedFields: {
            vendor: !!ocrResult.vendor,
            amount: !!ocrResult.total,
            date: !!ocrResult.date,
            lineItems: ocrResult.lineItems?.length || 0
          }
        });
        
        if (ocrResult.vendor) form.setValue('vendor_name', ocrResult.vendor);
        if (ocrResult.total) form.setValue('amount', ocrResult.total);
        if (ocrResult.date) form.setValue('receipt_date', ocrResult.date);
        
        const mappedConfidence = mapOCRConfidenceToForm(ocrResult.confidence || {});
        actions.setOCRSuccess(ocrResult, mappedConfidence);
        
        const successMessage = `Found ${ocrResult.vendor || 'vendor'} - $${ocrResult.total || 0}`;
        
        toast({
          title: '✨ Receipt Scanned!',
          description: successMessage,
        });
      }

      // Clean up temp file
      await supabase.storage
        .from('work-order-attachments')
        .remove([uploadData.path]);

    } catch (error: any) {
      // Clear timeout on completion
      clearTimeout(timeoutId);
      
      // Handle cancellation gracefully
      if (signal.aborted) {
        console.log('OCR processing was cancelled');
        actions.cancelOCRProcessing();
        return; // Don't show error toast for user-initiated cancellation
      }
      console.error('OCR processing error:', error);
      const processingTime = Date.now() - startTime;
      
      trackOCRPerformance('failed', { 
        processingTime,
        errorMessage: error.message,
        errorType: error.code || 'unknown'
      });
      trackError(error, { context: 'OCR processing', fileName: file.name });
      
      // Enhanced error messages based on error type
      let errorMessage = 'Unable to extract data from receipt';
      if (error.message?.includes('network')) {
        errorMessage = 'Network issue - check your connection';
      } else if (error.message?.includes('file') || error.message?.includes('format')) {
        errorMessage = 'Image quality too low or unsupported format';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Processing took too long - try a clearer image';
      }
      
      actions.setOCRError(errorMessage);
      
      // Don't show toast - let the FloatingProgress handle error display
    } finally {
      // Always clear timeout and abort controller
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
    }
  }, [actions, form, toast, trackOCRPerformance, trackError, isProcessingLocked, debugMode]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear previous debug data
    setRawOCRText(null);
    setDebugOCRData(null);

    // File validation
    if (!isValidFileSize(file, MAX_FILE_SIZE)) {
      toast({
        title: 'File Too Large',
        description: `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`,
        variant: 'destructive',
      });
      return;
    }

    if (!isSupportedImageType(file) && file.type !== 'application/pdf') {
      toast({
        title: 'Unsupported File Type',
        description: 'Please upload an image (JPEG, PNG, WebP, HEIC) or PDF file',
        variant: 'destructive',
      });
      return;
    }

    // For images, compress before processing
    if (file.type.startsWith('image/')) {
      try {
        // Show compression progress
        actions.updateOCRProgress('uploading', 5);
        
        const compressionStartTime = Date.now();
        const compressionResult = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8
        }, (progress) => {
          // Map compression progress to 5-25% of total progress
          actions.updateOCRProgress('uploading', 5 + (progress * 0.2));
        });

        const compressedFile = compressionResult.file;
        const compressionTime = Date.now() - compressionStartTime;
        
        // Track compression performance
        trackImageCompression(file.size, compressedFile.size, compressionTime);
        
        // Show compression results
        if (compressionResult.compressionRatio > 1.1) {
          toast({
            title: 'Image Optimized',
            description: `Reduced size by ${Math.round((1 - 1/compressionResult.compressionRatio) * 100)}%`,
          });
        }

        // Create image preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          actions.setFile(compressedFile, preview);
        };
        reader.readAsDataURL(compressedFile);

        // Process with OCR using compressed file
        await processWithOCR(compressedFile);
      } catch (error: any) {
        console.error('Image compression error:', error);
        const toastError = getErrorForToast(error);
        toast({
          title: toastError.title,
          description: toastError.description,
          variant: toastError.variant,
        });
        
        // Fall back to original file if compression fails
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          actions.setFile(file, preview);
        };
        reader.readAsDataURL(file);
        await processWithOCR(file);
      }
    } else {
      // For PDFs, no preview but still process OCR
      actions.setFile(file);
      await processWithOCR(file);
    }
  }, [toast, actions, processWithOCR, isProcessingLocked]);

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
        
        // Clear debug data
        setRawOCRText(null);
        setDebugOCRData(null);
        
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
    
    // Hide draft saved indicator after 3 seconds
    setTimeout(() => actions.showDraftSaved(false), 3000);
  }, [onFormSave, persistence, actions, toast]);

  // Memoized OCR retry function
  const retryOCR = useCallback(() => {
    if (receiptFile) {
      setRawOCRText(null);
      setDebugOCRData(null);
      actions.retryOCR();
      processWithOCR(receiptFile);
    }
  }, [receiptFile, actions, processWithOCR]);

  // Cancel OCR processing
  const cancelOCR = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('User cancelled');
    }
    actions.cancelOCRProcessing();
    toast({
      title: 'Processing Cancelled',
      description: 'OCR processing has been cancelled',
    });
  }, [actions, toast]);

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
        setRawOCRText(null);
        setDebugOCRData(null);
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

  // Render confidence badge
  const renderConfidenceBadge = (field: string, value: any) => {
    if (!ocrData || !ocrConfidence[field]) return null;
    
    const confidence = ocrConfidence[field];
    const variant = confidence >= 0.8 ? 'default' : confidence >= 0.5 ? 'secondary' : 'destructive';
    
    return (
      <Badge variant={variant} className="ml-2 text-xs">
        {Math.round(confidence * 100)}% confident
      </Badge>
    );
  };

  if (showSuccess) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Receipt Saved!</h3>
          <p className="text-muted-foreground">Your receipt has been processed and saved successfully.</p>
        </CardContent>
      </Card>
    );
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

      {/* DEBUG MODE TOGGLE - Only show in development */}
      {import.meta.env.MODE === 'development' && (
        <Card className="border-dashed border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Debug OCR Mode</span>
                <Badge variant="outline" className="text-xs">Dev Only</Badge>
              </div>
               <Switch
                checked={debugMode}
                onCheckedChange={(checked) => {
                  if (import.meta.env.MODE === 'development') {
                    setDebugMode(checked);
                  }
                }}
                className="data-[state=checked]:bg-yellow-600"
              />
            </div>
            {debugMode && (
              <p className="text-xs text-muted-foreground mt-2">
                Raw OCR text and parsing details will be captured
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Camera/Upload Capture Section */}
      <Card data-tour="upload-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Smart Receipt Capture
            </div>
            {hasCompletedTour && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={startTour}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Restart tutorial</p>
                </TooltipContent>
              </Tooltip>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(!imagePreview && !computed.hasReceiptFile) ? (
            <div className="space-y-4">
              {/* Mobile-optimized capture buttons */}
              {isMobile ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-20 flex-col min-h-[80px]"
                    onClick={cameraSupported ? handleCameraCapture : () => cameraInputRef.current?.click()}
                    disabled={isProcessingLocked}
                  >
                    <Camera className="h-6 w-6 mb-2" />
                    <span className="text-sm">
                      {cameraSupported ? "Camera Preview" : "Camera"}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-20 flex-col min-h-[80px]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6 mb-2" />
                    <span className="text-sm">Upload</span>
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Upload Receipt or Invoice</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Drag and drop or click to select files
                    </p>
                    <div className="space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Browse Files
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Take Photo
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Supports images (JPEG, PNG, WebP, HEIC) and PDF files up to {formatFileSize(MAX_FILE_SIZE)}
              </p>
            </div>
          ) : (
            /* Image Preview Section */
            <div className="space-y-4" {...(isMobile ? swipeGesture : {})}>
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Receipt preview"
                    className="w-full max-h-64 object-contain rounded-lg border"
                    style={{
                      transform: isMobile && swipeGesture.isSwipeing 
                        ? `translateX(${swipeGesture.direction === 'left' ? -swipeGesture.distance : swipeGesture.distance}px)` 
                        : 'none',
                      opacity: isMobile && swipeGesture.isSwipeing && swipeGesture.distance > 50 
                        ? Math.max(0.3, 1 - swipeGesture.distance / 200) 
                        : 1,
                      transition: swipeGesture.isSwipeing ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out'
                    }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 min-h-[48px] min-w-[48px]"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {/* Swipe instruction for mobile */}
                  {isMobile && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Swipe left or right to remove
                    </p>
                  )}
                </div>
              ) : receiptFile ? (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{receiptFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(receiptFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="min-h-[48px] min-w-[48px]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}

              {/* DEBUG: Raw OCR Text Display */}
              {import.meta.env.MODE === 'development' && debugMode && rawOCRText && (
                <Card className="border-dashed border-blue-400 bg-blue-50 dark:bg-blue-900/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Raw OCR Text (Debug)
                      </h4>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowRawText(!showRawText)}
                        >
                          {showRawText ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {showRawText ? 'Hide' : 'Show'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(rawOCRText);
                            toast({ title: 'Copied to clipboard!' });
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {showRawText && (
                    <CardContent>
                      <div className="p-3 bg-white dark:bg-gray-900 rounded-lg max-h-48 overflow-auto">
                        <pre className="text-xs font-mono whitespace-pre-wrap">{rawOCRText}</pre>
                      </div>
                      {debugOCRData && (
                        <div className="mt-3 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Text Length:</span>
                            <span>{debugOCRData.text_length} characters</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Detection Method:</span>
                            <span>{debugOCRData.has_doc_text ? 'DOCUMENT_TEXT' : 'TEXT_DETECTION'}</span>
                          </div>
                          {debugOCRData.parsed_result && (
                            <>
                              <div className="border-t pt-2 mt-2">
                                <p className="font-medium mb-1">Parsed Results:</p>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Vendor:</span>
                                    <span className="font-mono">{debugOCRData.parsed_result.vendor || 'NOT FOUND'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total:</span>
                                    <span className="font-mono">${debugOCRData.parsed_result.total || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-mono">{debugOCRData.parsed_result.date || 'NOT FOUND'}</span>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )}

            {/* OCR Processing Status */}
              {isProcessingOCR && (
                <div className="flex items-center justify-center py-4 space-x-3" data-tour="ocr-section">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <div className="flex items-center gap-2">
                    <span>Reading receipt with AI...</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>AI is extracting vendor, amount, date, and line items from your receipt</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}

              {/* Enhanced Confidence Display with Debug Info */}
              {ocrConfidence && Object.keys(ocrConfidence).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    OCR Confidence
                    {debugMode && ocrData && (
                      <Badge variant="outline" className="text-xs">
                        {(ocrData as any).from_cache ? 'From Cache' : 'Fresh Scan'}
                        {(ocrData as any).processing_time && ` (${(ocrData as any).processing_time}ms)`}
                      </Badge>
                    )}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ocrConfidence).map(([field, confidence]) => (
                      <Badge
                        key={field}
                        variant={confidence > 0.7 ? 'default' : confidence > 0.4 ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {field}: {Math.round(confidence * 100)}%
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Enhanced Error Recovery Section - Show when OCR fails */}
              {computed.isInErrorState && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border border-destructive/20 bg-destructive/5 rounded-lg p-4 space-y-4"
                >
                <ErrorDisplay
                  error={ocrError}
                  onRetry={retryOCR}
                  onManualEntry={startManualEntry}
                  className="border-0 p-0"
                />
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={retryOCR}
                      className="flex-1 gap-2 bg-background hover:bg-muted"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try Again
                    </Button>
                    <Button
                      type="button"
                      onClick={startManualEntry}
                      className="flex-1 gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Enter Manually
                    </Button>
                  </div>
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
            </div>
          )}

          {/* Camera Viewfinder Modal for Mobile */}
          <AnimatePresence>
            {showCameraCapture && cameraStream && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black"
              >
                <div className="relative w-full h-full">
                  <video
                    ref={(video) => {
                      if (video && cameraStream) {
                        video.srcObject = cameraStream;
                        video.play();
                      }
                    }}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                  
                  {/* Camera controls overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-center gap-6">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={closeCameraCapture}
                        className="bg-black/50 border-white/20 text-white hover:bg-black/70 min-h-[56px] min-w-[56px]"
                      >
                        <X className="h-6 w-6" />
                      </Button>
                      
                      <Button
                        type="button"
                        size="lg"
                        onClick={captureFromCamera}
                        className="bg-primary text-primary-foreground min-w-[80px] min-h-[80px] rounded-full"
                      >
                        <Camera className="h-8 w-8" />
                      </Button>
                      
                      <div className="w-16" /> {/* Spacer for symmetry */}
                    </div>
                    
                    <p className="text-center text-white/80 text-sm mt-4">
                      Position receipt in frame and tap to capture
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
          />
          <input
            ref={cameraInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            capture={getCameraAttribute() === 'camera' ? 'user' : getCameraAttribute() === 'environment' ? 'environment' : undefined}
            onChange={handleFileSelect}
          />
        </CardContent>
      </Card>

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
            
            {/* Enhanced Debug Panel with Better Info */}
            {import.meta.env.MODE === 'development' && debugMode && (
              <Card className="border-dashed border-orange-400 bg-orange-50 dark:bg-orange-900/20">
                <CardHeader className="pb-3">
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200 flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Debug Info
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="text-xs space-y-1 text-orange-700 dark:text-orange-300">
                    <div>Stage: <strong>{flowStage}</strong></div>
                    <div>Form Visible: <strong>{computed.isFormVisible ? 'YES' : 'NO'}</strong></div>
                    <div>Has OCR Data: <strong>{computed.hasOCRData ? 'YES' : 'NO'}</strong></div>
                     <div>OCR Error: <strong>{ocrError ? 'YES' : 'NO'}</strong></div>
                     {ocrData && (
                       <div className="mt-2 border-t pt-2">
                         <div className="mb-2 text-sm font-medium text-orange-700 dark:text-orange-300">OCR Detected vs Form Values</div>
                         <div className="space-y-1 text-xs">
                           <div>Vendor: <strong>{ocrData.vendor || 'None'}</strong> → <em>{form.watch('vendor_name') || 'Empty'}</em> ({((ocrConfidence.vendor_name || 0) * 100).toFixed(1)}%)</div>
                           <div>Amount: <strong>${ocrData.total || 'None'}</strong> → <em>${form.watch('amount') || '0'}</em> ({((ocrConfidence.amount || 0) * 100).toFixed(1)}%)</div>
                           <div>Date: <strong>{ocrData.date || 'None'}</strong> → <em>{form.watch('receipt_date') || 'Empty'}</em> ({((ocrConfidence.receipt_date || 0) * 100).toFixed(1)}%)</div>
                           <div>Line Items: <strong>{ocrData.lineItems?.length || 0}</strong></div>
                         </div>
                         {(ocrData as any).from_cache && (
                           <div className="text-green-600 dark:text-green-400 font-medium text-xs mt-1">✅ From Cache</div>
                         )}
                         {(ocrData as any).processing_time && (
                           <div className="text-xs">Processing Time: <strong>{(ocrData as any).processing_time}ms</strong></div>
                         )}
                       </div>
                     )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rest of the form remains exactly the same... */}
            {/* Essential Details - Always Open */}
            <FieldGroup
              title="Essential Details"
              icon={<FileText className="h-4 w-4" />}
              defaultOpen={true}
            >
              <div className="space-y-4">
                <InlineEditField
                  value={form.watch('vendor_name') || ''}
                  onSave={(value) => {
                    form.setValue('vendor_name', value, { shouldValidate: true });
                  }}
                  inputType="text"
                  fieldType="vendor"
                  label="Vendor Name"
                  placeholder="Enter vendor name"
                  confidence={ocrConfidence.vendor_name}
                  suggestions={COMMON_VENDORS}
                  enableRealtimeValidation={true}
                />

                <InlineEditField
                  value={form.watch('amount') || 0}
                  onSave={(value) => {
                    form.setValue('amount', parseFloat(value) || 0, { shouldValidate: true });
                  }}
                  inputType="currency"
                  fieldType="amount"
                  label="Amount"
                  placeholder="0.00"
                  confidence={ocrConfidence.amount}
                  enableRealtimeValidation={true}
                />

                 <InlineEditField
                   value={form.watch('receipt_date') || (ocrData?.date ? ocrData.date : format(new Date(), "yyyy-MM-dd"))}
                   onSave={(value) => {
                     const dateStr = value instanceof Date ? value.toISOString().split('T')[0] : value;
                     form.setValue('receipt_date', dateStr, { shouldValidate: true });
                   }}
                   inputType="date"
                   fieldType="date"
                   label="Receipt Date"
                   confidence={ocrConfidence.receipt_date}
                   enableRealtimeValidation={true}
                 />
              </div>
            </FieldGroup>

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
            {ocrData?.lineItems && ocrData.lineItems.length > 0 && (
              <FieldGroup
                title="Line Items"
                icon={<List className="h-4 w-4" />}
                badge={
                  <Badge variant="secondary" className="ml-2">
                    {ocrData.lineItems.length} items
                  </Badge>
                }
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                    <span>Description</span>
                    <span>Quantity × Price</span>
                    <span className="text-right">Total</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {ocrData.lineItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-3 gap-4 text-sm p-2 bg-muted rounded">
                        <span className="font-medium">{item.description}</span>
                        <span className="text-muted-foreground">
                          {item.quantity && item.unit_price 
                            ? `${item.quantity} × $${item.unit_price.toFixed(2)}`
                            : 'N/A'
                          }
                        </span>
                        <span className="text-right font-medium">
                          ${item.total_price?.toFixed(2) || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {(ocrData.subtotal || ocrData.tax || ocrData.total) && (
                    <div className="border-t pt-4 space-y-2">
                      {ocrData.subtotal && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span>${ocrData.subtotal.toFixed(2)}</span>
                        </div>
                      )}
                      {ocrData.tax && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tax:</span>
                          <span>${ocrData.tax.toFixed(2)}</span>
                        </div>
                      )}
                      {ocrData.total && (
                        <div className="flex justify-between font-medium border-t pt-2">
                          <span>Total:</span>
                          <span>${ocrData.total.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick correction buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const item = prompt('Enter item description:');
                        const price = prompt('Enter price:');
                        if (item && price && ocrData) {
                          const newLineItem = {
                            description: item,
                            total_price: parseFloat(price)
                          };
                          actions.setOCRSuccess({
                            ...ocrData,
                            lineItems: [...ocrData.lineItems, newLineItem]
                          }, ocrConfidence);
                        }
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Item
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (ocrData?.subtotal && ocrData?.tax) {
                          const correct = ocrData.subtotal + ocrData.tax;
                          form.setValue('amount', correct, { shouldValidate: true });
                          actions.setOCRSuccess({
                            ...ocrData,
                            total: correct
                          }, ocrConfidence);
                          toast({
                            title: 'Total Recalculated',
                            description: `New total: $${correct.toFixed(2)}`,
                          });
                        }
                      }}
                    >
                      <Calculator className="h-3 w-3 mr-1" />
                      Recalculate
                    </Button>
                  </div>
                </div>
              </FieldGroup>
            )}

            {/* Additional Details */}
            <FieldGroup
              title="Additional Details"
              icon={<PenTool className="h-4 w-4" />}
              badge={form.watch('notes') && (
                <Badge variant="secondary" className="ml-2">
                  Notes added
                </Badge>
              )}
            >
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this receipt..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FieldGroup>

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