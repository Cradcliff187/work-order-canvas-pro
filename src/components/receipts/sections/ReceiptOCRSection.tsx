import React, { useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Edit } from "lucide-react";
import { FileUploadSection } from "../FileUploadSection";
import { FilePreview } from "../FilePreview";
import { CameraCapture } from "../CameraCapture";
import { FloatingProgress } from "../FloatingProgress";
import { ErrorDisplay } from "../ErrorDisplay";
import { useCamera } from '@/hooks/useCamera';
import { useOCRProcessor } from '@/hooks/useOCRProcessor';
import { useToast } from '@/hooks/use-toast';
import { getErrorForToast } from '../ErrorDisplay';
import { compressImage } from "@/utils/imageCompression";
import { mapOCRConfidenceToForm, type FormConfidence } from '@/utils/ocrUtils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useAnalytics } from "@/utils/analytics";
import type { ReceiptFlowState, UseReceiptFlowReturn } from "@/hooks/useReceiptFlow";
import type { OCRResult, SmartReceiptFormData } from '@/types/receipt';

interface ReceiptOCRSectionProps {
  state: ReceiptFlowState;
  actions: UseReceiptFlowReturn['actions'];
  computed: UseReceiptFlowReturn['computed'];
  form: UseFormReturn<SmartReceiptFormData>;
  onOCRSuccess: (ocrResult: OCRResult, confidence: FormConfidence) => void;
  onManualEntry: () => void;
  hasCompletedTour: boolean;
  onStartTour: () => void;
}

export function ReceiptOCRSection({
  state,
  actions,
  computed,
  form,
  onOCRSuccess,
  onManualEntry,
  hasCompletedTour,
  onStartTour
}: ReceiptOCRSectionProps) {
  const { toast } = useToast();
  const { onImageCapture, onError } = useHapticFeedback();
  const { trackOCRPerformance, trackError } = useAnalytics();

  // Camera functionality
  const { 
    isSupported: cameraSupported,
    captureImageFromCamera,
    checkCameraPermission,
    requestCameraPermission 
  } = useCamera();

  // Extract state values
  const receiptFile = state.receipt.file;
  const imagePreview = state.receipt.imagePreview;
  const isProcessingOCR = computed.isOCRProcessing;
  const isProcessingLocked = computed.isProcessingLocked;
  const ocrData = state.ocr.data;
  const ocrConfidence = state.ocr.confidence;
  const progressStage = state.progress.stage;
  const progressValue = state.progress.value;
  const ocrError = state.ocr.error;
  const showCameraCapture = state.ui.showCameraCapture;
  const cameraStream = state.ui.cameraStream;
  const flowStage = state.stage;

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
      }
      
      // Map and set confidence values
      const mappedConfidence = mapOCRConfidenceToForm(ocrResult.confidence || {});
      
      // Convert hook's OCRResult to component's OCRResult format
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
      
      onOCRSuccess(componentOCRResult, mappedConfidence);
      
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
      // Prevent error state after successful completion
      if (progressStage === 'complete' || computed.hasOCRData) {
        return;
      }
      
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

  // File selection handler
  const handleFileSelect = useCallback(async (file: File, preview?: string) => {
    if (isProcessingLocked) {
      toast({
        title: 'Processing in Progress',
        description: 'Please wait for current processing to complete',
        variant: 'destructive',
      });
      return;
    }
    
    actions.setFile(file, preview);
    await processWithOCR(file);
  }, [actions, processWithOCR, isProcessingLocked, toast]);

  // Camera capture handlers
  const handleCameraCapture = useCallback(async () => {
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
          facingMode: 'environment',
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
        actions.setCameraState(false);
        
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
    actions.setCameraState(false);
  }, [actions]);

  // File removal handler
  const removeFile = useCallback(() => {
    actions.resetFlow();
  }, [actions]);

  // OCR retry function
  const retryOCR = useCallback(() => {
    if (receiptFile) {
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

  return (
    <div data-tour="ocr-section">
      {/* File Upload Section */}
      <FileUploadSection
        onFileSelect={handleFileSelect}
        onCameraCapture={handleCameraCapture}
        cameraSupported={cameraSupported}
        isProcessingLocked={isProcessingLocked}
        hasFile={computed.hasReceiptFile}
        hasCompletedTour={hasCompletedTour}
        onStartTour={onStartTour}
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
              swipeGesture={undefined}
              ocrConfidence={ocrConfidence}
            />

            {/* Error Recovery Section */}
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
                  onManualEntry={onManualEntry}
                />
              </motion.div>
            )}

            {/* Manual Entry Option */}
            {flowStage === 'capture' && !computed.hasReceiptFile && (
              <div className="text-center pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onManualEntry}
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

      {/* Floating Progress Indicator */}
      <FloatingProgress
        isVisible={isProcessingOCR && progressStage !== 'complete' && !(ocrData && progressStage === 'error')}
        stage={progressStage}
        progress={progressValue}
        message={progressStage === 'complete' && ocrData ? 
          `Found ${ocrData.vendor || 'vendor'} - $${ocrData.total || 0}` : 
          (progressStage === 'error' ? ocrError : undefined)
        }
        onRetry={retryOCR}
        onManualEntry={onManualEntry}
        onCancel={cancelOCR}
        showCancel={isProcessingLocked && progressStage !== 'complete' && progressStage !== 'error'}
      />
    </div>
  );
}