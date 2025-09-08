import { useReducer, useCallback, useMemo, useEffect } from 'react';
import { 
  receiptFlowReducer, 
  initialReceiptFlowState, 
  ReceiptFlowState, 
  ReceiptFlowAction,
  FlowStage,
  ProgressStage 
} from '@/reducers/receiptFlowReducer';
import type { OCRResult, LineItem } from '@/types/ocr';

// Storage key for persistence
const STORAGE_KEY = 'receipt-flow-state';

// Session storage utilities with debouncing
let saveTimeout: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 300;

const saveStateToStorage = (state: ReceiptFlowState) => {
  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Debounce storage writes to prevent excessive writes during rapid state changes
  saveTimeout = setTimeout(() => {
    try {
      // Don't save intermediate processing states
      if (state.progress.stage === 'uploading' || state.progress.stage === 'processing') {
        console.log('🔄 Skipping storage save for intermediate state:', state.progress.stage);
        return;
      }

      // Don't persist sensitive data like files or streams
      const persistableState = {
        ...state,
        receipt: {
          ...state.receipt,
          file: null, // Don't persist File objects
        },
        ui: {
          ...state.ui,
          cameraStream: null, // Don't persist MediaStream objects
        },
      };
      
      console.log('💾 Saving stable state to storage:', { 
        stage: state.stage, 
        progressStage: state.progress.stage,
        hasOCR: !!state.ocr.data 
      });
      
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persistableState));
    } catch (error) {
      console.warn('Failed to save receipt flow state to storage:', error);
    }
  }, SAVE_DEBOUNCE_MS);
};

const loadStateFromStorage = (): Partial<ReceiptFlowState> | null => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const parsedState = JSON.parse(stored);
    
    // Enhanced validation for state consistency
    if (typeof parsedState !== 'object' || !parsedState.stage || !parsedState.meta) {
      console.log('🔄 Storage validation failed: Missing required fields');
      return null;
    }

    // Validate stage transitions and data consistency
    if (parsedState.stage === 'review') {
      // If stage is 'review', we must have OCR data or be in manual entry mode
      if (!parsedState.ocr?.data && parsedState.stage !== 'manual-entry') {
        console.log('🔄 Storage validation failed: Review stage without OCR data');
        return null;
      }
    }

    // Check if state is too old (older than 1 hour)
    if (parsedState.meta?.lastUpdated) {
      const lastUpdated = new Date(parsedState.meta.lastUpdated);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (lastUpdated < oneHourAgo) {
        console.log('🔄 Storage validation failed: State too old');
        return null;
      }
    }

    console.log('✅ Storage validation passed:', { 
      stage: parsedState.stage, 
      hasOCR: !!parsedState.ocr?.data,
      lastUpdated: parsedState.meta?.lastUpdated
    });
    
    return parsedState;
  } catch (error) {
    console.warn('Failed to load receipt flow state from storage:', error);
    return null;
  }
};

const clearStateFromStorage = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear receipt flow state from storage:', error);
  }
};

// Custom hook for receipt flow state management
export function useReceiptFlow() {
  // Initialize reducer with hydrated state if available
  const [state, dispatch] = useReducer(receiptFlowReducer, initialReceiptFlowState, (initial) => {
    const storedState = loadStateFromStorage();
    if (storedState) {
      console.log('🔄 Hydrating initial state from storage');
      return receiptFlowReducer(initial, { type: 'HYDRATE_STATE', payload: storedState });
    }
    console.log('🔄 Starting with fresh initial state');
    return initial;
  });

  // Auto-save state to storage when it changes
  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  // Action dispatchers with type safety
  const actions = useMemo(() => ({
    startCapture: () => {
      dispatch({ type: 'START_CAPTURE' });
    },

    setFile: (file: File, preview?: string, filename?: string, fileSize?: number) => {
      dispatch({ 
        type: 'SET_FILE', 
        payload: { file, preview, filename, fileSize } 
      });
    },

    removeFile: () => {
      dispatch({ type: 'REMOVE_FILE' });
    },

    startOCRProcessing: () => {
      dispatch({ type: 'START_OCR_PROCESSING' });
    },

    updateOCRProgress: (stage: ProgressStage, value: number, message?: string) => {
      dispatch({ 
        type: 'UPDATE_OCR_PROGRESS', 
        payload: { stage, value, message } 
      });
    },

    setOCRSuccess: (data: OCRResult, confidence: Record<string, number>) => {
      dispatch({ 
        type: 'SET_OCR_SUCCESS', 
        payload: { data, confidence } 
      });
    },

    setOCRError: (error: string) => {
      dispatch({ 
        type: 'SET_OCR_ERROR', 
        payload: { error } 
      });
    },

    retryOCR: () => {
      dispatch({ type: 'RETRY_OCR' });
    },

    startManualEntry: () => {
      dispatch({ type: 'START_MANUAL_ENTRY' });
    },

    startSubmission: () => {
      dispatch({ type: 'START_SUBMISSION' });
    },

    completeSubmission: () => {
      dispatch({ type: 'COMPLETE_SUBMISSION' });
    },

    showSuccess: (show: boolean) => {
      dispatch({ 
        type: 'SHOW_SUCCESS', 
        payload: { show } 
      });
    },

    showDraftSaved: (show: boolean) => {
      dispatch({ 
        type: 'SHOW_DRAFT_SAVED', 
        payload: { show } 
      });
    },

    setCameraState: (show: boolean, stream?: MediaStream | null) => {
      dispatch({ 
        type: 'SET_CAMERA_STATE', 
        payload: { show, stream } 
      });
    },

    cleanupCameraStream: () => {
      dispatch({ type: 'CLEANUP_CAMERA_STREAM' });
    },

    lockOCRProcessing: () => {
      dispatch({ type: 'LOCK_OCR_PROCESSING' });
    },

    unlockOCRProcessing: () => {
      dispatch({ type: 'UNLOCK_OCR_PROCESSING' });
    },

    cancelOCRProcessing: () => {
      dispatch({ type: 'CANCEL_OCR_PROCESSING' });
    },

    setAllocationMode: (mode: 'single' | 'split') => {
      dispatch({
        type: 'SET_ALLOCATION_MODE',
        payload: { mode }
      });
    },
    
    updateAllocations: (allocations: Array<{work_order_id: string; allocated_amount: number; allocation_notes?: string}>) => {
      dispatch({
        type: 'UPDATE_ALLOCATIONS',
        payload: { allocations }
      });
    },
    
    setSingleAllocation: (workOrderId: string, amount: number) => {
      dispatch({
        type: 'SET_SINGLE_ALLOCATION',
        payload: { workOrderId, amount }
      });
    },
    
    resetAllocations: () => {
      dispatch({ type: 'RESET_ALLOCATIONS' });
    },

    resetFlow: () => {
      dispatch({ type: 'RESET_FLOW' });
      clearStateFromStorage();
    },

    hydrateState: (partialState: Partial<ReceiptFlowState>) => {
      // Prevent hydration during active OCR processing or intermediate states
      if (state.ocr.isProcessing || 
          state.progress.stage === 'processing' || 
          state.progress.stage === 'uploading' ||
          state.progress.stage === 'extracting') {
        console.log('🚫 Hydration blocked - OCR processing active:', {
          isProcessing: state.ocr.isProcessing,
          progressStage: state.progress.stage
        });
        return;
      }
      
      console.log('🔄 Hydrating state:', { 
        fromStage: state.stage, 
        toStage: partialState.stage,
        hasOCRData: !!partialState.ocr?.data 
      });
      
      dispatch({ 
        type: 'HYDRATE_STATE', 
        payload: partialState 
      });
    },
  }), []);

  // Computed values derived from state
  const computed = useMemo(() => ({
    // Flow stage checks
    isCapturing: state.stage === 'capture',
    isProcessing: state.stage === 'processing',
    isReviewing: state.stage === 'review' || state.stage === 'manual-entry',
    isSubmitting: state.stage === 'submitting',
    isComplete: state.stage === 'complete',

    // UI state helpers
    canProceedToReview: state.receipt.file !== null,
    isFormVisible: state.stage === 'review' || state.stage === 'manual-entry',
    shouldShowFloatingBar: state.stage === 'review' || state.stage === 'manual-entry',
    hasReceiptFile: state.receipt.file !== null,
    isInErrorState: state.ocr.error !== null,
    canRetryOCR: state.ocr.error !== null && state.ocr.retryCount < 3,

    // OCR state helpers
    hasOCRData: state.ocr.data !== null,
    isOCRProcessing: state.ocr.isProcessing,
    isProcessingLocked: state.ocr.isProcessingLocked,
    ocrConfidenceKeys: Object.keys(state.ocr.confidence),
    hasLowConfidenceFields: Object.values(state.ocr.confidence).some(conf => conf < 0.7),

    // Progress helpers
    isProgressComplete: state.progress.stage === 'complete',
    isProgressError: state.progress.stage === 'error',
    progressPercentage: Math.round(state.progress.value),

    // File helpers
    hasImagePreview: state.receipt.imagePreview !== null,
    fileSize: state.receipt.fileSize,
    filename: state.receipt.filename,

    // Camera helpers
    isCameraActive: state.ui.showCameraCapture,
    hasCameraStream: state.ui.cameraStream !== null,

    // Success state helpers
    shouldShowSuccess: state.ui.showSuccess,
    shouldShowDraftSaved: state.ui.showDraftSaved,
  }), [state]);

  // State persistence utilities
  const persistence = useMemo(() => ({
    saveDraft: () => {
      saveStateToStorage(state);
      actions.showDraftSaved(true);
      setTimeout(() => actions.showDraftSaved(false), 2000);
    },

    loadDraft: () => {
      const storedState = loadStateFromStorage();
      if (storedState) {
        actions.hydrateState(storedState);
        return true;
      }
      return false;
    },

    clearDraft: () => {
      clearStateFromStorage();
    },

    hasDraft: () => {
      return loadStateFromStorage() !== null;
    },
  }), [state, actions]);

  // Debug helpers (only in development)
  const debug = useMemo(() => {
    if (process.env.NODE_ENV !== 'development') {
      return {};
    }

    return {
      currentState: state,
      stateSize: JSON.stringify(state).length,
      sessionId: state.meta.sessionId,
      lastUpdated: state.meta.lastUpdated,
      logState: () => console.log('Receipt Flow State:', state),
      exportState: () => JSON.stringify(state, null, 2),
    };
  }, [state]);

  return {
    // Current state
    state,

    // Action dispatchers
    actions,

    // Computed values
    computed,

    // State persistence
    persistence,

    // Debug utilities (development only)
    ...(process.env.NODE_ENV === 'development' && { debug }),
  };
}

// Type exports for external use
export type { ReceiptFlowState, FlowStage, ProgressStage };
export type UseReceiptFlowReturn = ReturnType<typeof useReceiptFlow>;