import { checkForDuplicates, type DuplicationCheckResult } from '@/utils/receiptDuplication';
import { analyzeImageQuality, type ImageQualityResult } from '@/utils/imageQuality';

// Define the state interface
export interface ReceiptFlowState {
  // Core state machine
  stage: 'idle' | 'capturing' | 'processing' | 'reviewing' | 'submitting' | 'complete';
  
  // Receipt data
  receipt: {
    file: File | null;
    imagePreview: string | null;
    ocrData: OCRResult | null;
    ocrConfidence: Record<string, number>;
  };
  
  // Processing state
  processing: {
    isActive: boolean;
    stage: 'uploading' | 'processing' | 'extracting' | 'complete' | 'error';
    progress: number;
    error: string | null;
  };
  
  // UI state
  ui: {
    showSuccess: boolean;
    showSuccessAnimation: boolean;
    showDraftSaved: boolean;
    showCameraCapture: boolean;
    cameraStream: MediaStream | null;
  };
  
  // Error recovery
  errors: {
    duplicateCheck: DuplicationCheckResult | null;
    imageQuality: ImageQualityResult | null;
    recoveryStage: 'none' | 'quality-check' | 'duplicate-detection' | 'partial-extraction';
  };
  
  // Metadata
  meta: {
    lastUpdated: string;
    persistenceKey: string;
  };
}

// OCR Result interface (matching existing interface)
export interface OCRResult {
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
  lineItems: Array<{
    description: string;
    quantity?: number;
    unit_price?: number;
    total_price?: number;
  }>;
}

// Define action types
export type ReceiptFlowAction =
  | { type: 'START_CAPTURE' }
  | { type: 'SET_FILE'; payload: { file: File; imagePreview?: string } }
  | { type: 'START_OCR_PROCESSING' }
  | { type: 'SET_OCR_PROGRESS'; payload: { stage: ReceiptFlowState['processing']['stage']; progress: number } }
  | { type: 'SET_OCR_SUCCESS'; payload: { data: OCRResult; confidence: Record<string, number> } }
  | { type: 'SET_OCR_ERROR'; payload: { error: string } }
  | { type: 'START_MANUAL_ENTRY' }
  | { type: 'START_SUBMISSION' }
  | { type: 'COMPLETE_SUBMISSION' }
  | { type: 'SET_SUCCESS_STATE'; payload: { showAnimation: boolean } }
  | { type: 'SET_CAMERA_CAPTURE'; payload: { show: boolean; stream?: MediaStream } }
  | { type: 'SET_DRAFT_SAVED'; payload: { saved: boolean } }
  | { type: 'SET_DUPLICATE_CHECK'; payload: { result: DuplicationCheckResult } }
  | { type: 'SET_IMAGE_QUALITY'; payload: { result: ImageQualityResult } }
  | { type: 'SET_ERROR_RECOVERY_STAGE'; payload: { stage: ReceiptFlowState['errors']['recoveryStage'] } }
  | { type: 'REMOVE_FILE' }
  | { type: 'RESET' }
  | { type: 'HYDRATE'; payload: { state: Partial<ReceiptFlowState> } };

// Initial state
export const initialState: ReceiptFlowState = {
  stage: 'idle',
  receipt: {
    file: null,
    imagePreview: null,
    ocrData: null,
    ocrConfidence: {},
  },
  processing: {
    isActive: false,
    stage: 'uploading',
    progress: 0,
    error: null,
  },
  ui: {
    showSuccess: false,
    showSuccessAnimation: false,
    showDraftSaved: false,
    showCameraCapture: false,
    cameraStream: null,
  },
  errors: {
    duplicateCheck: null,
    imageQuality: null,
    recoveryStage: 'none',
  },
  meta: {
    lastUpdated: new Date().toISOString(),
    persistenceKey: 'receipt-flow-state',
  },
};

// State machine transitions - defines valid transitions
const validTransitions: Record<ReceiptFlowState['stage'], ReceiptFlowState['stage'][]> = {
  idle: ['capturing'],
  capturing: ['processing', 'reviewing', 'idle'],
  processing: ['reviewing', 'capturing', 'idle'],
  reviewing: ['submitting', 'capturing', 'idle'],
  submitting: ['complete', 'reviewing'],
  complete: ['idle'],
};

// Validate state transition
function isValidTransition(from: ReceiptFlowState['stage'], to: ReceiptFlowState['stage']): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}

// Middleware for side effects
export interface ReceiptFlowMiddleware {
  onStateChange?: (prevState: ReceiptFlowState, nextState: ReceiptFlowState, action: ReceiptFlowAction) => void;
  onStageTransition?: (from: ReceiptFlowState['stage'], to: ReceiptFlowState['stage']) => void;
  onError?: (error: string, state: ReceiptFlowState) => void;
}

// Create reducer with middleware support
export function createReceiptFlowReducer(middleware?: ReceiptFlowMiddleware) {
  return function receiptFlowReducer(state: ReceiptFlowState, action: ReceiptFlowAction): ReceiptFlowState {
    const prevState = state;
    let nextState = state;

    switch (action.type) {
      case 'START_CAPTURE':
        if (isValidTransition(state.stage, 'capturing')) {
          nextState = {
            ...state,
            stage: 'capturing',
            meta: { ...state.meta, lastUpdated: new Date().toISOString() },
          };
        }
        break;

      case 'SET_FILE':
        nextState = {
          ...state,
          receipt: {
            ...state.receipt,
            file: action.payload.file,
            imagePreview: action.payload.imagePreview || null,
          },
          meta: { ...state.meta, lastUpdated: new Date().toISOString() },
        };
        break;

      case 'START_OCR_PROCESSING':
        if (isValidTransition(state.stage, 'processing')) {
          nextState = {
            ...state,
            stage: 'processing',
            processing: {
              isActive: true,
              stage: 'uploading',
              progress: 0,
              error: null,
            },
            meta: { ...state.meta, lastUpdated: new Date().toISOString() },
          };
        }
        break;

      case 'SET_OCR_PROGRESS':
        nextState = {
          ...state,
          processing: {
            ...state.processing,
            stage: action.payload.stage,
            progress: action.payload.progress,
          },
          meta: { ...state.meta, lastUpdated: new Date().toISOString() },
        };
        break;

      case 'SET_OCR_SUCCESS':
        if (isValidTransition(state.stage, 'reviewing')) {
          nextState = {
            ...state,
            stage: 'reviewing',
            receipt: {
              ...state.receipt,
              ocrData: action.payload.data,
              ocrConfidence: action.payload.confidence,
            },
            processing: {
              ...state.processing,
              stage: 'complete',
              progress: 100,
              error: null,
            },
            meta: { ...state.meta, lastUpdated: new Date().toISOString() },
          };
        }
        break;

      case 'SET_OCR_ERROR':
        nextState = {
          ...state,
          processing: {
            ...state.processing,
            stage: 'error',
            error: action.payload.error,
          },
          meta: { ...state.meta, lastUpdated: new Date().toISOString() },
        };
        break;

      case 'START_MANUAL_ENTRY':
        if (isValidTransition(state.stage, 'reviewing')) {
          nextState = {
            ...state,
            stage: 'reviewing',
            processing: {
              ...state.processing,
              isActive: false,
              error: null,
            },
            meta: { ...state.meta, lastUpdated: new Date().toISOString() },
          };
        }
        break;

      case 'START_SUBMISSION':
        if (isValidTransition(state.stage, 'submitting')) {
          nextState = {
            ...state,
            stage: 'submitting',
            meta: { ...state.meta, lastUpdated: new Date().toISOString() },
          };
        }
        break;

      case 'COMPLETE_SUBMISSION':
        if (isValidTransition(state.stage, 'complete')) {
          nextState = {
            ...state,
            stage: 'complete',
            ui: {
              ...state.ui,
              showSuccess: true,
            },
            meta: { ...state.meta, lastUpdated: new Date().toISOString() },
          };
        }
        break;

      case 'SET_SUCCESS_STATE':
        nextState = {
          ...state,
          ui: {
            ...state.ui,
            showSuccess: true,
            showSuccessAnimation: action.payload.showAnimation,
          },
          meta: { ...state.meta, lastUpdated: new Date().toISOString() },
        };
        break;

      case 'SET_CAMERA_CAPTURE':
        nextState = {
          ...state,
          ui: {
            ...state.ui,
            showCameraCapture: action.payload.show,
            cameraStream: action.payload.stream || null,
          },
          meta: { ...state.meta, lastUpdated: new Date().toISOString() },
        };
        break;

      case 'SET_DRAFT_SAVED':
        nextState = {
          ...state,
          ui: {
            ...state.ui,
            showDraftSaved: action.payload.saved,
          },
          meta: { ...state.meta, lastUpdated: new Date().toISOString() },
        };
        break;

      case 'SET_DUPLICATE_CHECK':
        nextState = {
          ...state,
          errors: {
            ...state.errors,
            duplicateCheck: action.payload.result,
          },
          meta: { ...state.meta, lastUpdated: new Date().toISOString() },
        };
        break;

      case 'SET_IMAGE_QUALITY':
        nextState = {
          ...state,
          errors: {
            ...state.errors,
            imageQuality: action.payload.result,
          },
          meta: { ...state.meta, lastUpdated: new Date().toISOString() },
        };
        break;

      case 'SET_ERROR_RECOVERY_STAGE':
        nextState = {
          ...state,
          errors: {
            ...state.errors,
            recoveryStage: action.payload.stage,
          },
          meta: { ...state.meta, lastUpdated: new Date().toISOString() },
        };
        break;

      case 'REMOVE_FILE':
        nextState = {
          ...state,
          stage: 'idle',
          receipt: {
            file: null,
            imagePreview: null,
            ocrData: null,
            ocrConfidence: {},
          },
          processing: {
            isActive: false,
            stage: 'uploading',
            progress: 0,
            error: null,
          },
          errors: {
            duplicateCheck: null,
            imageQuality: null,
            recoveryStage: 'none',
          },
          meta: { ...state.meta, lastUpdated: new Date().toISOString() },
        };
        break;

      case 'RESET':
        nextState = {
          ...initialState,
          meta: { ...initialState.meta, lastUpdated: new Date().toISOString() },
        };
        break;

      case 'HYDRATE':
        nextState = {
          ...state,
          ...action.payload.state,
          meta: { ...state.meta, lastUpdated: new Date().toISOString() },
        };
        break;

      default:
        nextState = state;
        break;
    }

    // Call middleware
    if (middleware) {
      middleware.onStateChange?.(prevState, nextState, action);
      
      if (prevState.stage !== nextState.stage) {
        middleware.onStageTransition?.(prevState.stage, nextState.stage);
      }
      
      if (nextState.processing.error && !prevState.processing.error) {
        middleware.onError?.(nextState.processing.error, nextState);
      }
    }

    return nextState;
  };
}

// Action creators for type safety
export const receiptFlowActions = {
  startCapture: (): ReceiptFlowAction => ({ type: 'START_CAPTURE' }),
  
  setFile: (file: File, imagePreview?: string): ReceiptFlowAction => ({
    type: 'SET_FILE',
    payload: { file, imagePreview },
  }),
  
  startOCRProcessing: (): ReceiptFlowAction => ({ type: 'START_OCR_PROCESSING' }),
  
  setOCRProgress: (stage: ReceiptFlowState['processing']['stage'], progress: number): ReceiptFlowAction => ({
    type: 'SET_OCR_PROGRESS',
    payload: { stage, progress },
  }),
  
  setOCRSuccess: (data: OCRResult, confidence: Record<string, number>): ReceiptFlowAction => ({
    type: 'SET_OCR_SUCCESS',
    payload: { data, confidence },
  }),
  
  setOCRError: (error: string): ReceiptFlowAction => ({
    type: 'SET_OCR_ERROR',
    payload: { error },
  }),
  
  startManualEntry: (): ReceiptFlowAction => ({ type: 'START_MANUAL_ENTRY' }),
  
  startSubmission: (): ReceiptFlowAction => ({ type: 'START_SUBMISSION' }),
  
  completeSubmission: (): ReceiptFlowAction => ({ type: 'COMPLETE_SUBMISSION' }),
  
  setSuccessState: (showAnimation: boolean): ReceiptFlowAction => ({
    type: 'SET_SUCCESS_STATE',
    payload: { showAnimation },
  }),
  
  setCameraCapture: (show: boolean, stream?: MediaStream): ReceiptFlowAction => ({
    type: 'SET_CAMERA_CAPTURE',
    payload: { show, stream },
  }),
  
  setDraftSaved: (saved: boolean): ReceiptFlowAction => ({
    type: 'SET_DRAFT_SAVED',
    payload: { saved },
  }),
  
  setDuplicateCheck: (result: DuplicationCheckResult): ReceiptFlowAction => ({
    type: 'SET_DUPLICATE_CHECK',
    payload: { result },
  }),
  
  setImageQuality: (result: ImageQualityResult): ReceiptFlowAction => ({
    type: 'SET_IMAGE_QUALITY',
    payload: { result },
  }),
  
  setErrorRecoveryStage: (stage: ReceiptFlowState['errors']['recoveryStage']): ReceiptFlowAction => ({
    type: 'SET_ERROR_RECOVERY_STAGE',
    payload: { stage },
  }),
  
  removeFile: (): ReceiptFlowAction => ({ type: 'REMOVE_FILE' }),
  
  reset: (): ReceiptFlowAction => ({ type: 'RESET' }),
  
  hydrate: (state: Partial<ReceiptFlowState>): ReceiptFlowAction => ({
    type: 'HYDRATE',
    payload: { state },
  }),
};