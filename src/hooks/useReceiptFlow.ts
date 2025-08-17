import { useReducer, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ReceiptFlowState, 
  ReceiptFlowAction, 
  receiptFlowActions, 
  createReceiptFlowReducer, 
  initialState,
  OCRResult,
  ReceiptFlowMiddleware
} from '@/reducers/receiptFlowReducer';
import { analyzeImageQuality } from '@/utils/imageQuality';
import { formatFileSize } from '@/utils/fileUtils';

// Storage key for persistence
const STORAGE_KEY = 'receipt-flow-state';

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function useReceiptFlow() {
  const { toast } = useToast();
  
  // Create middleware for side effects
  const middleware: ReceiptFlowMiddleware = useMemo(() => ({
    onStateChange: (prevState, nextState, action) => {
      // Auto-save state to localStorage on changes (excluding sensitive data)
      if (action.type !== 'HYDRATE') {
        const persistableState = {
          stage: nextState.stage,
          receipt: {
            // Don't persist the actual file, just metadata
            file: null,
            imagePreview: null, // Don't persist large base64 strings
            ocrData: nextState.receipt.ocrData,
            ocrConfidence: nextState.receipt.ocrConfidence,
          },
          processing: nextState.processing,
          errors: nextState.errors,
          meta: nextState.meta,
        };
        
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(persistableState));
        } catch (error) {
          console.warn('Failed to persist state:', error);
        }
      }
    },
    onStageTransition: (from, to) => {
      console.log(`Stage transition: ${from} → ${to}`);
    },
    onError: (error, state) => {
      console.error('Receipt flow error:', error);
    },
  }), []);

  // Create reducer with middleware
  const reducer = useMemo(() => createReceiptFlowReducer(middleware), [middleware]);
  
  // Initialize reducer
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Only hydrate if the saved state is relatively recent (within 24 hours)
        const savedTime = new Date(parsedState.meta?.lastUpdated || 0);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate < 24) {
          dispatch(receiptFlowActions.hydrate(parsedState));
        }
      }
    } catch (error) {
      console.warn('Failed to hydrate state:', error);
    }
  }, []);

  // Action dispatchers with validation and side effects
  const actions = useMemo(() => ({
    startCapture: () => {
      dispatch(receiptFlowActions.startCapture());
    },

    setFile: async (file: File) => {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File Too Large',
          description: `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`,
          variant: 'destructive',
        });
        return;
      }

      // Check image quality
      const qualityResult = await analyzeImageQuality(file);
      dispatch(receiptFlowActions.setImageQuality(qualityResult));
      
      if (qualityResult.recommendation === 'retake') {
        dispatch(receiptFlowActions.setErrorRecoveryStage('quality-check'));
        toast({
          title: 'Image Quality Too Low',
          description: qualityResult.suggestions[0],
          variant: 'destructive',
        });
        return;
      }

      // Create image preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imagePreview = e.target?.result as string;
          dispatch(receiptFlowActions.setFile(file, imagePreview));
        };
        reader.readAsDataURL(file);
      } else {
        dispatch(receiptFlowActions.setFile(file));
      }
    },

    startOCRProcessing: () => {
      dispatch(receiptFlowActions.startOCRProcessing());
    },

    setOCRProgress: (stage: ReceiptFlowState['processing']['stage'], progress: number) => {
      dispatch(receiptFlowActions.setOCRProgress(stage, progress));
    },

    setOCRSuccess: (data: OCRResult, confidence: Record<string, number>) => {
      dispatch(receiptFlowActions.setOCRSuccess(data, confidence));
      
      const successMessage = `Found ${data.vendor || 'vendor'} - $${data.total || 0}`;
      toast({
        title: '✨ Receipt Scanned!',
        description: successMessage,
      });
    },

    setOCRError: (error: string) => {
      dispatch(receiptFlowActions.setOCRError(error));
      toast({
        title: 'OCR Failed',
        description: 'Could not read receipt. Please enter details manually.',
        variant: 'destructive',
      });
    },

    startManualEntry: () => {
      dispatch(receiptFlowActions.startManualEntry());
    },

    startSubmission: () => {
      dispatch(receiptFlowActions.startSubmission());
    },

    completeSubmission: () => {
      dispatch(receiptFlowActions.completeSubmission());
      
      toast({
        title: 'Receipt Saved!',
        description: 'Your receipt has been processed and saved.',
      });

      // Auto-reset after delay
      setTimeout(() => {
        dispatch(receiptFlowActions.reset());
      }, 2500);
    },

    setSuccessState: (showAnimation: boolean) => {
      dispatch(receiptFlowActions.setSuccessState(showAnimation));
    },

    setCameraCapture: (show: boolean, stream?: MediaStream) => {
      dispatch(receiptFlowActions.setCameraCapture(show, stream));
    },

    setDraftSaved: (saved: boolean) => {
      dispatch(receiptFlowActions.setDraftSaved(saved));
      
      if (saved) {
        toast({
          title: 'Draft Saved',
          description: 'Your receipt draft has been saved locally.',
        });

        // Hide draft saved indicator after 3 seconds
        setTimeout(() => {
          dispatch(receiptFlowActions.setDraftSaved(false));
        }, 3000);
      }
    },

    removeFile: () => {
      dispatch(receiptFlowActions.removeFile());
    },

    reset: () => {
      dispatch(receiptFlowActions.reset());
      // Clear localStorage
      localStorage.removeItem(STORAGE_KEY);
    },
  }), [toast]);

  // Computed values for UI state
  const computed = useMemo(() => ({
    // Form visibility - show form in reviewing stage or manual-entry flow
    isFormVisible: state.stage === 'reviewing',
    
    // Can proceed to review if we have OCR data or are in manual entry
    canProceedToReview: !!state.receipt.ocrData || state.stage === 'reviewing',
    
    // FloatingActionBar visibility - only show in review stage
    shouldShowFloatingBar: state.stage === 'reviewing',
    
    // Current stage progress for UI indicators
    currentStageProgress: (() => {
      switch (state.stage) {
        case 'idle': return 0;
        case 'capturing': return 25;
        case 'processing': return 50 + (state.processing.progress * 0.4); // 50-90%
        case 'reviewing': return 90;
        case 'submitting': return 95;
        case 'complete': return 100;
        default: return 0;
      }
    })(),

    // Error states
    hasQualityIssue: state.errors.imageQuality?.recommendation === 'retake',
    hasDuplicates: (state.errors.duplicateCheck?.matches.length || 0) > 0,
    hasOCRError: !!state.processing.error,

    // Processing states
    isProcessingOCR: state.processing.isActive && state.stage === 'processing',
    isSubmitting: state.stage === 'submitting',

    // Legacy compatibility - map to original flow stage names
    flowStage: (() => {
      switch (state.stage) {
        case 'idle': return 'capture';
        case 'capturing': return 'capture';
        case 'processing': return 'processing';
        case 'reviewing': return 'review';
        case 'submitting': return 'review';
        case 'complete': return 'review';
        default: return 'capture';
      }
    })() as 'capture' | 'processing' | 'review' | 'manual-entry',
  }), [state]);

  // Side effects for OCR processing
  const effects = useMemo(() => ({
    processOCR: async (file: File) => {
      actions.startOCRProcessing();
      
      try {
        // Stage 1: Upload (0-30%)
        actions.setOCRProgress('uploading', 10);
        const timestamp = Date.now();
        const fileName = `temp_ocr_${timestamp}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('work-order-attachments')
          .upload(`receipts/temp/${fileName}`, file);

        if (uploadError) throw uploadError;
        actions.setOCRProgress('uploading', 30);

        // Stage 2: Processing (30-70%)
        actions.setOCRProgress('processing', 40);
        
        const { data: { publicUrl } } = supabase.storage
          .from('work-order-attachments')
          .getPublicUrl(uploadData.path);

        actions.setOCRProgress('processing', 60);

        // Stage 3: OCR Extraction (70-90%)
        actions.setOCRProgress('extracting', 70);
        
        const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('process-receipt', {
          body: { imageUrl: publicUrl }
        });

        if (ocrError) throw ocrError;
        actions.setOCRProgress('extracting', 90);

        // Stage 4: Complete (90-100%)
        if (ocrResult) {
          actions.setOCRProgress('complete', 100);
          actions.setOCRSuccess(ocrResult, ocrResult.confidence || {});
          
          // Hide progress after delay
          setTimeout(() => {
            dispatch(receiptFlowActions.setOCRProgress('complete', 100));
          }, 2000);
        }

        // Clean up temp file
        await supabase.storage
          .from('work-order-attachments')
          .remove([uploadData.path]);

      } catch (error: any) {
        console.error('OCR processing error:', error);
        actions.setOCRError(error.message || 'Could not read receipt');
        
        // Hide error progress after delay
        setTimeout(() => {
          dispatch(receiptFlowActions.setOCRProgress('error', 0));
        }, 3000);
      }
    },

    saveDraft: (formData: any) => {
      const draftData = {
        ...formData,
        receiptFile: state.receipt.file?.name,
        savedAt: new Date().toISOString(),
      };
      
      localStorage.setItem('receipt-draft', JSON.stringify(draftData));
      actions.setDraftSaved(true);
    },

    loadDraft: () => {
      try {
        const savedDraft = localStorage.getItem('receipt-draft');
        if (savedDraft) {
          return JSON.parse(savedDraft);
        }
      } catch (error) {
        console.warn('Failed to load draft:', error);
      }
      return null;
    },
  }), [actions, state.receipt.file]);

  return {
    // State
    state,
    
    // Actions
    actions,
    
    // Computed values
    computed,
    
    // Side effects
    effects,
    
    // Legacy compatibility - expose individual state properties
    flowStage: computed.flowStage,
    receiptFile: state.receipt.file,
    imagePreview: state.receipt.imagePreview,
    isProcessingOCR: computed.isProcessingOCR,
    ocrData: state.receipt.ocrData,
    ocrConfidence: state.receipt.ocrConfidence,
    showSuccess: state.ui.showSuccess,
    progressStage: state.processing.stage,
    progressValue: state.processing.progress,
    showDraftSaved: state.ui.showDraftSaved,
    ocrError: state.processing.error,
    showSuccessAnimation: state.ui.showSuccessAnimation,
    duplicateCheck: state.errors.duplicateCheck,
    imageQuality: state.errors.imageQuality,
    errorRecoveryStage: state.errors.recoveryStage,
    showCameraCapture: state.ui.showCameraCapture,
    cameraStream: state.ui.cameraStream,
  };
}