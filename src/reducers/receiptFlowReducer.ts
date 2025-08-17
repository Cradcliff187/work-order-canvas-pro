// OCR Result interface
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

// Flow stage definitions
export type FlowStage = 'idle' | 'capture' | 'processing' | 'review' | 'manual-entry' | 'submitting' | 'complete';

// Progress stage definitions
export type ProgressStage = 'uploading' | 'processing' | 'extracting' | 'complete' | 'error';

// Receipt flow state interface
export interface ReceiptFlowState {
  // Core state machine
  stage: FlowStage;
  
  // File and preview data
  receipt: {
    file: File | null;
    imagePreview: string | null;
    filename: string | null;
    fileSize: number | null;
  };
  
  // OCR processing state
  ocr: {
    isProcessing: boolean;
    isProcessingLocked: boolean;
    data: OCRResult | null;
    confidence: Record<string, number>;
    error: string | null;
    retryCount: number;
  };
  
  // Progress tracking
  progress: {
    stage: ProgressStage;
    value: number;
    message?: string;
  };
  
  // UI state
  ui: {
    showSuccess: boolean;
    showDraftSaved: boolean;
    showCameraCapture: boolean;
    cameraStream: MediaStream | null;
  };
  
  // Metadata
  meta: {
    lastUpdated: string;
    sessionId: string;
  };
}

// MediaStream cleanup utility
const cleanupMediaStream = (stream: MediaStream | null): void => {
  if (!stream) return;
  
  try {
    // Stop all tracks
    stream.getTracks().forEach(track => {
      try {
        track.stop();
        console.log('Stopped media track:', track.kind);
      } catch (error) {
        console.warn('Error stopping media track:', error);
      }
    });
  } catch (error) {
    console.warn('Error cleaning up MediaStream:', error);
  }
};

// Action types
export type ReceiptFlowAction = 
  | { type: 'START_CAPTURE' }
  | { type: 'SET_FILE'; payload: { file: File; preview?: string; filename?: string; fileSize?: number } }
  | { type: 'REMOVE_FILE' }
  | { type: 'START_OCR_PROCESSING' }
  | { type: 'LOCK_OCR_PROCESSING' }
  | { type: 'UNLOCK_OCR_PROCESSING' }
  | { type: 'CANCEL_OCR_PROCESSING' }
  | { type: 'UPDATE_OCR_PROGRESS'; payload: { stage: ProgressStage; value: number; message?: string } }
  | { type: 'SET_OCR_SUCCESS'; payload: { data: OCRResult; confidence: Record<string, number> } }
  | { type: 'SET_OCR_ERROR'; payload: { error: string } }
  | { type: 'RETRY_OCR' }
  | { type: 'START_MANUAL_ENTRY' }
  | { type: 'START_SUBMISSION' }
  | { type: 'COMPLETE_SUBMISSION' }
  | { type: 'SHOW_SUCCESS'; payload: { show: boolean } }
  | { type: 'SHOW_DRAFT_SAVED'; payload: { show: boolean } }
  | { type: 'SET_CAMERA_STATE'; payload: { show: boolean; stream?: MediaStream | null } }
  | { type: 'CLEANUP_CAMERA_STREAM' }
  | { type: 'RESET_FLOW' }
  | { type: 'HYDRATE_STATE'; payload: Partial<ReceiptFlowState> };

// Initial state
export const initialReceiptFlowState: ReceiptFlowState = {
  stage: 'capture',
  receipt: {
    file: null,
    imagePreview: null,
    filename: null,
    fileSize: null,
  },
  ocr: {
    isProcessing: false,
    isProcessingLocked: false,
    data: null,
    confidence: {},
    error: null,
    retryCount: 0,
  },
  progress: {
    stage: 'uploading',
    value: 0,
  },
  ui: {
    showSuccess: false,
    showDraftSaved: false,
    showCameraCapture: false,
    cameraStream: null,
  },
  meta: {
    lastUpdated: new Date().toISOString(),
    sessionId: crypto.randomUUID(),
  },
};

// Reducer function
export function receiptFlowReducer(
  state: ReceiptFlowState,
  action: ReceiptFlowAction
): ReceiptFlowState {
  const newState: ReceiptFlowState = (() => {
    switch (action.type) {
      case 'START_CAPTURE':
        // Clean up any existing camera stream
        cleanupMediaStream(state.ui.cameraStream);
        return {
          ...state,
          stage: 'capture' as FlowStage,
          receipt: {
            file: null,
            imagePreview: null,
            filename: null,
            fileSize: null,
          },
          ocr: {
            ...state.ocr,
            isProcessing: false,
            data: null,
            confidence: {},
            error: null,
            retryCount: 0,
          },
          ui: {
            ...state.ui,
            showSuccess: false,
            showCameraCapture: false,
            cameraStream: null,
          },
        };

      case 'SET_FILE':
        // Reject file selection if OCR is locked (processing)
        if (state.ocr.isProcessingLocked) {
          console.warn('Rejected file selection - OCR processing is locked');
          return state;
        }
        return {
          ...state,
          stage: 'processing' as FlowStage,
          receipt: {
            file: action.payload.file,
            imagePreview: action.payload.preview || null,
            filename: action.payload.filename || action.payload.file.name,
            fileSize: action.payload.fileSize || action.payload.file.size,
          },
          ocr: {
            ...state.ocr,
            error: null,
            retryCount: 0,
          },
        };

      case 'REMOVE_FILE':
        // Clean up camera stream when removing file
        cleanupMediaStream(state.ui.cameraStream);
        return {
          ...state,
          stage: 'capture' as FlowStage,
          receipt: {
            file: null,
            imagePreview: null,
            filename: null,
            fileSize: null,
          },
          ocr: {
            isProcessing: false,
            isProcessingLocked: false,
            data: null,
            confidence: {},
            error: null,
            retryCount: 0,
          },
          progress: {
            stage: 'uploading',
            value: 0,
          },
          ui: {
            ...state.ui,
            showCameraCapture: false,
            cameraStream: null,
          },
        };

      case 'START_OCR_PROCESSING':
        return {
          ...state,
          stage: 'processing' as FlowStage,
          ocr: {
            ...state.ocr,
            isProcessing: true,
            isProcessingLocked: true,
            error: null,
          },
          progress: {
            stage: 'processing',
            value: 10,
            message: 'Starting OCR processing...',
          },
        };

      case 'LOCK_OCR_PROCESSING':
        return {
          ...state,
          ocr: {
            ...state.ocr,
            isProcessingLocked: true,
          },
        };

      case 'UNLOCK_OCR_PROCESSING':
        return {
          ...state,
          ocr: {
            ...state.ocr,
            isProcessingLocked: false,
          },
        };

      case 'CANCEL_OCR_PROCESSING':
        return {
          ...state,
          stage: 'capture' as FlowStage,
          ocr: {
            ...state.ocr,
            isProcessing: false,
            isProcessingLocked: false,
            error: null,
          },
          progress: {
            stage: 'uploading',
            value: 0,
            message: 'OCR processing cancelled',
          },
        };

      case 'UPDATE_OCR_PROGRESS':
        return {
          ...state,
          progress: {
            stage: action.payload.stage as ProgressStage,
            value: action.payload.value,
            message: action.payload.message,
          },
        };

      case 'SET_OCR_SUCCESS':
        return {
          ...state,
          stage: 'review' as FlowStage,
          ocr: {
            ...state.ocr,
            isProcessing: false,
            isProcessingLocked: false,
            data: action.payload.data,
            confidence: action.payload.confidence,
            error: null,
          },
          progress: {
            stage: 'complete',
            value: 100,
            message: 'OCR processing complete',
          },
        };

      case 'SET_OCR_ERROR':
        return {
          ...state,
          stage: 'review' as FlowStage,
          ocr: {
            ...state.ocr,
            isProcessing: false,
            isProcessingLocked: false,
            error: action.payload.error,
            retryCount: state.ocr.retryCount + 1,
          },
          progress: {
            stage: 'error',
            value: 0,
            message: action.payload.error,
          },
        };

      case 'RETRY_OCR':
        return {
          ...state,
          stage: 'processing' as FlowStage,
          ocr: {
            ...state.ocr,
            isProcessing: true,
            isProcessingLocked: true,
            error: null,
          },
          progress: {
            stage: 'processing',
            value: 10,
            message: 'Retrying OCR processing...',
          },
        };

      case 'START_MANUAL_ENTRY':
        return {
          ...state,
          stage: 'manual-entry' as FlowStage,
          ocr: {
            ...state.ocr,
            isProcessing: false,
            isProcessingLocked: false,
            error: null,
          },
          progress: {
            stage: 'complete',
            value: 100,
            message: 'Manual entry mode',
          },
        };

      case 'START_SUBMISSION':
        return {
          ...state,
          stage: 'submitting' as FlowStage,
          ui: {
            ...state.ui,
            showSuccess: false,
          },
        };

      case 'COMPLETE_SUBMISSION':
        return {
          ...state,
          stage: 'complete' as FlowStage,
          ui: {
            ...state.ui,
            showSuccess: true,
          },
        };

      case 'SHOW_SUCCESS':
        return {
          ...state,
          ui: {
            ...state.ui,
            showSuccess: action.payload.show,
          },
        };

      case 'SHOW_DRAFT_SAVED':
        return {
          ...state,
          ui: {
            ...state.ui,
            showDraftSaved: action.payload.show,
          },
        };

      case 'SET_CAMERA_STATE':
        // Clean up previous stream when setting a new one or closing camera
        if (!action.payload.show || action.payload.stream) {
          cleanupMediaStream(state.ui.cameraStream);
        }
        return {
          ...state,
          ui: {
            ...state.ui,
            showCameraCapture: action.payload.show,
            cameraStream: action.payload.stream || null,
          },
        };

      case 'CLEANUP_CAMERA_STREAM':
        cleanupMediaStream(state.ui.cameraStream);
        return {
          ...state,
          ui: {
            ...state.ui,
            cameraStream: null,
          },
        };

      case 'RESET_FLOW':
        // Clean up camera stream when resetting flow
        cleanupMediaStream(state.ui.cameraStream);
        return {
          ...initialReceiptFlowState,
          meta: {
            lastUpdated: new Date().toISOString(),
            sessionId: crypto.randomUUID(),
          },
        };

      case 'HYDRATE_STATE':
        // Carefully merge payload while preserving type safety
        const sanitizedPayload: Partial<ReceiptFlowState> = { ...action.payload };
        
        // Sanitize progress stage if present
        if (sanitizedPayload.progress?.stage) {
          const validStages: ProgressStage[] = ['uploading', 'processing', 'extracting', 'complete', 'error'];
          if (!validStages.includes(sanitizedPayload.progress.stage as ProgressStage)) {
            sanitizedPayload.progress = {
              ...sanitizedPayload.progress,
              stage: 'uploading' as ProgressStage,
            };
          }
        }
        
        return {
          ...state,
          ...sanitizedPayload,
          meta: {
            ...state.meta,
            lastUpdated: new Date().toISOString(),
          },
        };

      default:
        return state;
    }
  })();

  // Update lastUpdated timestamp for all actions
  return {
    ...newState,
    meta: {
      ...newState.meta,
      lastUpdated: new Date().toISOString(),
    },
  };
}

// State machine validation helpers
export const getValidTransitions = (currentStage: FlowStage): FlowStage[] => {
  switch (currentStage) {
    case 'idle':
      return ['capture'];
    case 'capture':
      return ['processing', 'manual-entry'];
    case 'processing':
      return ['review', 'manual-entry', 'capture'];
    case 'review':
      return ['submitting', 'manual-entry', 'capture'];
    case 'manual-entry':
      return ['submitting', 'capture'];
    case 'submitting':
      return ['complete', 'review', 'capture'];
    case 'complete':
      return ['capture'];
    default:
      return [];
  }
};

export const isValidTransition = (from: FlowStage, to: FlowStage): boolean => {
  return getValidTransitions(from).includes(to);
};