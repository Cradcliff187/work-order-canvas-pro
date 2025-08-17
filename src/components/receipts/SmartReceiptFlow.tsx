import React, { useState, useRef, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { isIOS, isAndroid, getCameraAttribute } from "@/utils/mobileDetection";
import { isSupportedFileType, formatFileSize, SUPPORTED_IMAGE_TYPES } from "@/utils/fileUtils";
import { FieldGroup } from "./FieldGroup";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { InlineEditField } from "./InlineEditField";
import { SmartWorkOrderSelector } from "./SmartWorkOrderSelector";
import { FloatingActionBar } from "./FloatingActionBar";
import { FloatingProgress } from "./FloatingProgress";
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

// Form validation schema
const receiptSchema = z.object({
  vendor_name: z.string().min(1, "Vendor name is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
  receipt_date: z.string().min(1, "Receipt date is required"),
  notes: z.string().optional(),
  work_order_id: z.string().optional(),
});

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

type FlowStage = 'capture' | 'processing' | 'review' | 'manual-entry';

export function SmartReceiptFlow() {
  console.log('SmartReceiptFlow component mounted');
  
  // Progressive disclosure state
  const [flowStage, setFlowStage] = useState<FlowStage>('capture');
  
  // State management
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrData, setOcrData] = useState<OCRResult | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<Record<string, number>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Floating components state
  const [progressStage, setProgressStage] = useState<'uploading' | 'processing' | 'extracting' | 'complete' | 'error'>('uploading');
  const [progressValue, setProgressValue] = useState(0);
  const [showDraftSaved, setShowDraftSaved] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  
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
  
  // Camera state
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // File handling functions
  const removeFile = () => {
    onSwipeAction(); // Haptic feedback
    setReceiptFile(null);
    setImagePreview(null);
    setOcrData(null);
    setOcrConfidence({});
    setOcrError(null);
    setFlowStage('capture');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

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
      removeFile();
      setOcrError(null);
      setFlowStage('capture');
      setIsProcessingOCR(false);
    },
    enableTouchGesture: isMobile
  });
  
  const { receipts, availableWorkOrders, createReceipt, isUploading } = useReceipts();

  // Get recent work orders from receipts data for smart suggestions
  const getRecentWorkOrders = () => {
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
  };

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

  // Watch form values for floating action bar
  const watchedValues = form.watch();
  const isFormValid = form.formState.isValid && watchedValues.vendor_name && watchedValues.amount > 0 && watchedValues.receipt_date;
  const isDirty = form.formState.isDirty || !!receiptFile;

  // OCR processing function with progress tracking
  const processWithOCR = async (file: File) => {
    setFlowStage('processing');
    setIsProcessingOCR(true);
    setOcrError(null);
    setProgressStage('uploading');
    setProgressValue(0);
    
    try {
      // Stage 1: Upload (0-30%)
      setProgressValue(10);
      const timestamp = Date.now();
      const fileName = `temp_ocr_${timestamp}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('work-order-attachments')
        .upload(`receipts/temp/${fileName}`, file);

      if (uploadError) throw uploadError;
      setProgressValue(30);

      // Stage 2: Processing (30-70%)
      setProgressStage('processing');
      setProgressValue(40);
      
      const { data: { publicUrl } } = supabase.storage
        .from('work-order-attachments')
        .getPublicUrl(uploadData.path);

      setProgressValue(60);

      // Stage 3: OCR Extraction (70-90%)
      setProgressStage('extracting');
      setProgressValue(70);
      
      const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('process-receipt', {
        body: { imageUrl: publicUrl }
      });

      if (ocrError) throw ocrError;
      setProgressValue(90);

      // Stage 4: Complete (90-100%)
      if (ocrResult) {
        if (ocrResult.vendor) form.setValue('vendor_name', ocrResult.vendor);
        if (ocrResult.total) form.setValue('amount', ocrResult.total);
        if (ocrResult.date) form.setValue('receipt_date', ocrResult.date);
        
        setOcrData(ocrResult);
        setOcrConfidence(ocrResult.confidence || {});
        
        setProgressStage('complete');
        setProgressValue(100);
        
        const successMessage = `Found ${ocrResult.vendor || 'vendor'} - $${ocrResult.total || 0}`;
        
        toast({
          title: '✨ Receipt Scanned!',
          description: successMessage,
        });

        // Transition to review stage
        setFlowStage('review');
        
        // Hide progress after delay
        setTimeout(() => {
          setIsProcessingOCR(false);
        }, 2000);
      }

      // Clean up temp file
      await supabase.storage
        .from('work-order-attachments')
        .remove([uploadData.path]);

    } catch (error: any) {
      console.error('OCR processing error:', error);
      setProgressStage('error');
      setOcrError(error.message || 'Could not read receipt');
      
      toast({
        title: 'OCR Failed',
        description: 'Could not read receipt. Please enter details manually.',
        variant: 'destructive',
      });
      
      // Stay in processing stage to show manual entry option
      // Hide error progress after delay
      setTimeout(() => {
        setIsProcessingOCR(false);
      }, 3000);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setReceiptFile(file);

    // Create image preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Process with OCR
      await processWithOCR(file);
    } else {
      // For PDFs, no preview but still process OCR
      setImagePreview(null);
      await processWithOCR(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const permission = await checkCameraPermission();
      if (permission?.state !== 'granted') {
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

      setShowCameraCapture(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use rear camera for documents
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setCameraStream(stream);
    } catch (error) {
      console.error('Camera access error:', error);
      onError();
      toast({
        title: "Camera error",
        description: "Unable to access camera. Please try again.",
        variant: "destructive"
      });
    }
  };

  const captureFromCamera = async () => {
    try {
      if (!cameraStream) return;
      
      const file = await captureImageFromCamera();
      if (file) {
        onImageCapture();
        setReceiptFile(file);
        setShowCameraCapture(false);
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }
        
        // Create image preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
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
  };

  const closeCameraCapture = () => {
    setShowCameraCapture(false);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Manual entry function
  const startManualEntry = () => {
    setFlowStage('manual-entry');
    setOcrError(null);
  };

  // Draft save functionality
  const saveDraft = () => {
    onFormSave(); // Haptic feedback
    const draftData = {
      ...form.getValues(),
      receiptFile: receiptFile?.name,
      savedAt: new Date().toISOString(),
    };
    
    localStorage.setItem('receipt-draft', JSON.stringify(draftData));
    setShowDraftSaved(true);
    
    toast({
      title: 'Draft Saved',
      description: 'Your receipt draft has been saved locally.',
    });
    
    // Hide draft saved indicator after 3 seconds
    setTimeout(() => setShowDraftSaved(false), 3000);
  };

  // OCR retry function
  const retryOCR = () => {
    if (receiptFile) {
      processWithOCR(receiptFile);
    }
  };

  // Form submission
  const onSubmit = async (data: SmartReceiptFormData) => {
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
      setShowSuccess(true);
      setTimeout(() => {
        // Reset form and state
        form.reset();
        removeFile();
        setShowSuccess(false);
        setFlowStage('capture');
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
  };

  // Get confidence indicator
  const getConfidenceColor = (field: string) => {
    const confidence = ocrConfidence[field] || 0;
    if (confidence >= 0.8) return 'text-success';
    if (confidence >= 0.5) return 'text-warning';
    return 'text-destructive';
  };

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
          {!imagePreview && !receiptFile ? (
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

              {/* Manual Entry Option - Show when OCR fails or processing stage */}
              {(flowStage === 'processing' && !isProcessingOCR && ocrError) && (
                <div className="text-center py-4 space-y-3">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">OCR couldn't read this receipt</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startManualEntry}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Enter Details Manually
                  </Button>
                </div>
              )}

              {/* Manual Entry Option - Always available in capture stage */}
              {flowStage === 'capture' && !receiptFile && (
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
        {(flowStage === 'review' || flowStage === 'manual-entry') && (
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
                  label="Vendor Name"
                  placeholder="Enter vendor name"
                  confidence={ocrConfidence.vendor ? ocrConfidence.vendor * 100 : undefined}
                  suggestions={COMMON_VENDORS}
                  validation={(value) => {
                    if (!value || value.trim().length === 0) {
                      return 'Vendor name is required';
                    }
                    return null;
                  }}
                />

                <InlineEditField
                  value={form.watch('amount') || 0}
                  onSave={(value) => {
                    form.setValue('amount', parseFloat(value) || 0, { shouldValidate: true });
                  }}
                  inputType="currency"
                  label="Amount"
                  placeholder="0.00"
                  confidence={ocrConfidence.total ? ocrConfidence.total * 100 : undefined}
                  validation={(value) => {
                    const numValue = parseFloat(value);
                    if (isNaN(numValue) || numValue <= 0) {
                      return 'Amount must be greater than 0';
                    }
                    return null;
                  }}
                />

                <InlineEditField
                  value={form.watch('receipt_date') ? new Date(form.watch('receipt_date')) : new Date()}
                  onSave={(value) => {
                    const dateStr = value instanceof Date ? value.toISOString().split('T')[0] : value;
                    form.setValue('receipt_date', dateStr, { shouldValidate: true });
                  }}
                  inputType="date"
                  label="Receipt Date"
                  confidence={ocrConfidence.date ? ocrConfidence.date * 100 : undefined}
                  validation={(value) => {
                    if (!value) {
                      return 'Receipt date is required';
                    }
                    const date = value instanceof Date ? value : new Date(value);
                    if (date > new Date()) {
                      return 'Receipt date cannot be in the future';
                    }
                    return null;
                  }}
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
                        recentWorkOrders={getRecentWorkOrders()}
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
                        if (item && price) {
                          setOcrData(prev => ({
                            ...prev!,
                            lineItems: [...(prev?.lineItems || []), {
                              description: item,
                              total_price: parseFloat(price)
                            }]
                          }));
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
                          setOcrData(prev => ({ ...prev!, total: correct }));
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
