import React, { useRef, useEffect, useMemo, useCallback } from "react";
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
import { useReceipts } from "@/hooks/useReceipts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { isIOS, isAndroid, getCameraAttribute } from "@/utils/mobileDetection";
import { isSupportedFileType, formatFileSize, SUPPORTED_IMAGE_TYPES } from "@/utils/fileUtils";
import { validateField, type FieldType } from "@/utils/receiptValidation";
import { FieldGroup } from "./FieldGroup";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { InlineEditField } from "./InlineEditField";
import { SmartWorkOrderSelector } from "./SmartWorkOrderSelector";
import { FloatingActionBar } from "./FloatingActionBar";
import { FloatingProgress } from "./FloatingProgress";
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
  RefreshCw
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
  console.log('SmartReceiptFlow component mounted');
  
  // Centralized state management with useReceiptFlow hook
  const { state, actions, computed, persistence } = useReceiptFlow();
  
  // Hooks
  const isMobile = useIsMobile();
  const { toast } = useToast();
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
  const ocrData = state.ocr.data;
  const ocrConfidence = state.ocr.confidence;
  const showSuccess = state.ui.showSuccess;
  const progressStage = state.progress.stage;
  const progressValue = state.progress.value;
  const showDraftSaved = state.ui.showDraftSaved;
  const ocrError = state.ocr.error;
  const showCameraCapture = state.ui.showCameraCapture;
  const cameraStream = state.ui.cameraStream;

  // Memoized file handling functions
  const removeFile = useCallback(() => {
    onSwipeAction(); // Haptic feedback
    actions.resetFlow();
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

  // Memoized OCR processing function with progress tracking
  const processWithOCR = useCallback(async (file: File) => {
    actions.startOCRProcessing();
    
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
      
      const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('process-receipt', {
        body: { imageUrl: publicUrl }
      });

      if (ocrError) throw ocrError;
      actions.updateOCRProgress('extracting', 90);

      // Stage 4: Complete (90-100%)
      if (ocrResult) {
        if (ocrResult.vendor) form.setValue('vendor_name', ocrResult.vendor);
        if (ocrResult.total) form.setValue('amount', ocrResult.total);
        if (ocrResult.date) form.setValue('receipt_date', ocrResult.date);
        
        actions.setOCRSuccess(ocrResult, ocrResult.confidence || {});
        
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
      console.error('OCR processing error:', error);
      
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
    }
  }, [actions, form, toast]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File validation
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File Too Large',
        description: `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`,
        variant: 'destructive',
      });
      return;
    }

    if (!isSupportedFileType(file) && !SUPPORTED_IMAGE_TYPES.includes(file.type) && file.type !== 'application/pdf') {
      toast({
        title: 'Unsupported File Type',
        description: 'Please upload an image (JPEG, PNG, WebP, HEIC) or PDF file',
        variant: 'destructive',
      });
      return;
    }

    // Create image preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        actions.setFile(file, preview);
      };
      reader.readAsDataURL(file);

      // Process with OCR
      await processWithOCR(file);
    } else {
      // For PDFs, no preview but still process OCR
      actions.setFile(file);
      await processWithOCR(file);
    }
  }, [toast, actions, processWithOCR]);

  const handleCameraCapture = useCallback(async () => {
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
      toast({
        title: "Camera error",
        description: "Unable to access camera. Please try again.",
        variant: "destructive"
      });
    }
  }, [checkCameraPermission, requestCameraPermission, toast, onError, actions]);

  const captureFromCamera = useCallback(async () => {
    try {
      if (!cameraStream) return;
      
      const file = await captureImageFromCamera();
      if (file) {
        onImageCapture();
        actions.setCameraState(false);
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
        }
        
        // Create image preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          actions.setFile(file, preview);
        };
        reader.readAsDataURL(file);
        
        // Process with OCR
        processWithOCR(file);
      }
    } catch (error) {
      console.error('Image capture error:', error);
      onError();
      toast({
        title: "Capture failed",
        description: "Failed to capture image. Please try again.",
        variant: "destructive"
      });
    }
  }, [cameraStream, captureImageFromCamera, onImageCapture, onError, toast, actions, processWithOCR]);

  const closeCameraCapture = useCallback(() => {
    actions.setCameraState(false);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
  }, [actions, cameraStream]);

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
      actions.retryOCR();
      processWithOCR(receiptFile);
    }
  }, [receiptFile, actions, processWithOCR]);

  // Memoized form submission
  const onSubmit = useCallback(async (data: SmartReceiptFormData) => {
    try {
      const receiptData = {
        vendor_name: data.vendor_name,
        amount: data.amount,
        description: data.description || '',
        receipt_date: data.receipt_date,
        notes: data.notes || '',
        allocations: data.work_order_id ? [{ 
          work_order_id: data.work_order_id, 
          allocated_amount: data.amount 
        }] : [],
        receipt_image: receiptFile,
      };

      await createReceipt.mutateAsync(receiptData);
      
      onSubmitSuccess(); // Haptic feedback

      // Success state
      actions.completeSubmission();
      setTimeout(() => {
        // Reset form and state
        form.reset();
        actions.resetFlow();
      }, 2000);

      toast({
        title: 'Receipt Saved!',
        description: 'Your receipt has been processed and saved.',
      });

    } catch (error: any) {
      console.error('Receipt submission error:', error);
      onError(); // Haptic feedback
      toast({
        title: 'Error',
        description: error.message || 'Failed to save receipt',
        variant: 'destructive',
      });
    }
  }, [receiptFile, createReceipt, onSubmitSuccess, actions, form, toast, onError]);

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
    <div ref={containerRef as any} className="max-w-2xl mx-auto space-y-6 relative">
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

      {/* Camera/Upload Capture Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Smart Receipt Capture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!imagePreview && !computed.hasReceiptFile ? (
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

              {/* OCR Processing Status */}
              {isProcessingOCR && (
                <div className="flex items-center justify-center py-4 space-x-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Reading receipt with AI...</span>
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
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="font-medium text-destructive">OCR Processing Failed</h4>
                      <p className="text-sm text-muted-foreground">
                        {ocrError}
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>💡 <strong>Tips for better results:</strong></p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Ensure good lighting and clear image</li>
                          <li>Avoid shadows or reflections on the receipt</li>
                          <li>Make sure text is straight and readable</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  confidence={ocrConfidence.vendor}
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
                  confidence={ocrConfidence.total}
                  enableRealtimeValidation={true}
                />

                <InlineEditField
                  value={form.watch('receipt_date') || format(new Date(), "yyyy-MM-dd")}
                  onSave={(value) => {
                    const dateStr = value instanceof Date ? value.toISOString().split('T')[0] : value;
                    form.setValue('receipt_date', dateStr, { shouldValidate: true });
                  }}
                  inputType="date"
                  fieldType="date"
                  label="Receipt Date"
                  confidence={ocrConfidence.date}
                  enableRealtimeValidation={true}
                />
              </div>
            </FieldGroup>

            {/* Assign to Project */}
            {availableWorkOrders.data && availableWorkOrders.data.length > 0 && (
              <FieldGroup
                title="Assign to Project"
                icon={<Briefcase className="h-4 w-4" />}
                badge={form.watch('work_order_id') && (
                  <Badge variant="secondary" className="ml-2">
                    Assigned
                  </Badge>
                )}
              >
                <FormField
                  control={form.control}
                  name="work_order_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Order (Optional)</FormLabel>
                      <SmartWorkOrderSelector
                        availableWorkOrders={availableWorkOrders.data || []}
                        recentWorkOrders={recentWorkOrders}
                        selectedWorkOrderId={field.value}
                        onSelect={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldGroup>
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

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isUploading || isProcessingOCR}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving Receipt...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Receipt
                  </>
                )}
              </Button>
            </div>
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
          showDraftSaved={showDraftSaved}
          flowStage={flowStage}
        />
      )}

    </div>
  );
}
