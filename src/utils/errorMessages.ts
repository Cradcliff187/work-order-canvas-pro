/**
 * Error Message Mapping Utility
 * Maps technical error codes to user-friendly messages with actionable guidance
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorMessage {
  title: string;
  description: string;
  severity: ErrorSeverity;
  action?: string;
  suggestions?: string[];
  canRetry?: boolean;
  allowManualEntry?: boolean;
  recoveryHint?: string;
}

export interface ErrorMapping {
  [key: string]: ErrorMessage;
}

/**
 * Comprehensive error message mapping
 */
export const ERROR_MESSAGES: ErrorMapping = {
  // Network and Connection Errors
  'NETWORK_ERROR': {
    title: 'Connection Problem',
    description: 'Unable to connect to our servers. Please check your internet connection.',
    severity: 'error',
    action: 'Check Connection',
    suggestions: [
      'Check your internet connection',
      'Try again in a few moments',
      'Switch to a more stable network if available'
    ],
    canRetry: true,
    allowManualEntry: true,
    recoveryHint: 'You can enter receipt details manually while offline'
  },
  
  'TIMEOUT_ERROR': {
    title: 'Request Timed Out',
    description: 'The request took too long to complete. This might be due to a slow connection.',
    severity: 'warning',
    action: 'Try Again',
    suggestions: [
      'Try again with a better connection',
      'Check if the image file is too large',
      'Consider using a smaller image'
    ],
    canRetry: true,
    allowManualEntry: true
  },

  'FETCH_FAILED': {
    title: 'Upload Failed',
    description: 'Could not upload your image. Please check your connection and try again.',
    severity: 'error',
    action: 'Retry Upload',
    suggestions: [
      'Check your internet connection',
      'Make sure the image file isn\'t corrupted',
      'Try taking a new photo'
    ],
    canRetry: true,
    allowManualEntry: true
  },

  // File Validation Errors
  'FILE_TOO_LARGE': {
    title: 'Image Too Large',
    description: 'Your image file is too large. Please use a smaller file under 10MB.',
    severity: 'warning',
    action: 'Choose Smaller File',
    suggestions: [
      'Reduce image quality in your camera settings',
      'Use image compression before uploading',
      'Take a new photo with lower resolution'
    ],
    canRetry: true,
    allowManualEntry: true,
    recoveryHint: 'Most phone cameras can be set to take smaller photos'
  },

  'INVALID_FILE_TYPE': {
    title: 'Unsupported File Format',
    description: 'Please upload an image file in JPG, PNG, WebP, or HEIC format.',
    severity: 'warning',
    action: 'Choose Different File',
    suggestions: [
      'Use JPG or PNG format',
      'Take a photo instead of selecting a file',
      'Convert your file to a supported format'
    ],
    canRetry: true,
    allowManualEntry: true,
    recoveryHint: 'Camera photos are automatically saved in supported formats'
  },

  'FILE_CORRUPTED': {
    title: 'Image Cannot Be Read',
    description: 'The image file appears to be corrupted or damaged.',
    severity: 'error',
    action: 'Take New Photo',
    suggestions: [
      'Take a new photo',
      'Try selecting a different image',
      'Check if the original image opens properly'
    ],
    canRetry: true,
    allowManualEntry: true
  },

  // OCR Processing Errors
  'OCR_SERVICE_ERROR': {
    title: 'Scanning Service Unavailable',
    description: 'Our receipt scanning service is temporarily unavailable. You can enter details manually.',
    severity: 'error',
    action: 'Enter Manually',
    suggestions: [
      'Enter receipt details manually',
      'Try scanning again later',
      'Save your work and return later'
    ],
    canRetry: true,
    allowManualEntry: true,
    recoveryHint: 'Manual entry is often faster for simple receipts'
  },

  'OCR_PROCESSING_FAILED': {
    title: 'Could Not Read Receipt',
    description: 'We couldn\'t automatically read your receipt. Try taking a clearer photo or enter details manually.',
    severity: 'warning',
    action: 'Take Clearer Photo',
    suggestions: [
      'Ensure good lighting when taking the photo',
      'Make sure the receipt is flat and fully visible',
      'Hold the camera steady and focus clearly',
      'Clean the camera lens if needed'
    ],
    canRetry: true,
    allowManualEntry: true,
    recoveryHint: 'Good lighting and a steady hand make all the difference'
  },

  'POOR_IMAGE_QUALITY': {
    title: 'Image Quality Too Low',
    description: 'The image quality is too low for automatic scanning. Please take a clearer photo.',
    severity: 'warning',
    action: 'Retake Photo',
    suggestions: [
      'Use better lighting',
      'Hold the camera closer to the receipt',
      'Make sure the receipt is flat',
      'Clean your camera lens',
      'Avoid shadows and glare'
    ],
    canRetry: true,
    allowManualEntry: true,
    recoveryHint: 'Natural light or a bright room usually works best'
  },

  'NO_TEXT_DETECTED': {
    title: 'No Text Found',
    description: 'We couldn\'t find any readable text in your image. Make sure the receipt is clearly visible.',
    severity: 'warning',
    action: 'Retake Photo',
    suggestions: [
      'Make sure the entire receipt is in the photo',
      'Check that text is clearly visible',
      'Improve lighting conditions',
      'Hold the camera steadier'
    ],
    canRetry: true,
    allowManualEntry: true
  },

  'LOW_CONFIDENCE_EXTRACTION': {
    title: 'Unclear Receipt Information',
    description: 'We could only partially read your receipt. Please review and correct the extracted information.',
    severity: 'info',
    action: 'Review Details',
    suggestions: [
      'Double-check the extracted information',
      'Fill in any missing details',
      'Consider retaking the photo for better results'
    ],
    canRetry: true,
    allowManualEntry: true,
    recoveryHint: 'You can always edit the details we extracted'
  },

  // Service and System Errors
  'INTERNAL_ERROR': {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again, or enter your receipt details manually.',
    severity: 'error',
    action: 'Try Again',
    suggestions: [
      'Try again in a moment',
      'Enter details manually',
      'Contact support if the problem persists'
    ],
    canRetry: true,
    allowManualEntry: true,
    recoveryHint: 'These issues are usually temporary'
  },

  'SERVICE_UNAVAILABLE': {
    title: 'Service Temporarily Down',
    description: 'Our scanning service is currently undergoing maintenance. Please try again later.',
    severity: 'error',
    action: 'Try Later',
    suggestions: [
      'Try again in a few minutes',
      'Enter receipt details manually',
      'Check our status page for updates'
    ],
    canRetry: true,
    allowManualEntry: true,
    recoveryHint: 'Maintenance usually takes just a few minutes'
  },

  'RATE_LIMIT_EXCEEDED': {
    title: 'Too Many Requests',
    description: 'You\'ve made too many requests recently. Please wait a moment before trying again.',
    severity: 'warning',
    action: 'Wait and Retry',
    suggestions: [
      'Wait 30 seconds before trying again',
      'Enter details manually if urgent',
      'Avoid rapid successive uploads'
    ],
    canRetry: true,
    allowManualEntry: true,
    recoveryHint: 'This helps keep our service fast for everyone'
  },

  // Processing and Validation Errors
  'PROCESSING_CANCELLED': {
    title: 'Processing Cancelled',
    description: 'Receipt processing was cancelled.',
    severity: 'info',
    action: 'Try Again',
    suggestions: [
      'Upload your receipt again',
      'Take a new photo if needed'
    ],
    canRetry: true,
    allowManualEntry: true
  },

  'VALIDATION_FAILED': {
    title: 'Receipt Information Incomplete',
    description: 'We couldn\'t extract all the necessary information from your receipt.',
    severity: 'warning',
    action: 'Review and Complete',
    suggestions: [
      'Review the extracted information',
      'Fill in any missing details',
      'Double-check amounts and dates'
    ],
    canRetry: false,
    allowManualEntry: true,
    recoveryHint: 'You can manually add or correct any information'
  },

  // Authentication and Permission Errors
  'UNAUTHORIZED': {
    title: 'Authentication Required',
    description: 'You need to be logged in to upload receipts.',
    severity: 'error',
    action: 'Sign In',
    suggestions: [
      'Sign in to your account',
      'Check if your session has expired',
      'Contact support if you\'re having trouble signing in'
    ],
    canRetry: false,
    allowManualEntry: false
  },

  'INSUFFICIENT_PERMISSIONS': {
    title: 'Access Denied',
    description: 'You don\'t have permission to perform this action.',
    severity: 'error',
    action: 'Contact Administrator',
    suggestions: [
      'Contact your administrator',
      'Verify your account permissions',
      'Check if you\'re in the correct organization'
    ],
    canRetry: false,
    allowManualEntry: false
  },

  // Default fallback error
  'UNKNOWN_ERROR': {
    title: 'Unexpected Error',
    description: 'An unexpected error occurred. Please try again or contact support.',
    severity: 'error',
    action: 'Try Again',
    suggestions: [
      'Try the operation again',
      'Check your internet connection',
      'Contact support if the problem continues'
    ],
    canRetry: true,
    allowManualEntry: true
  }
};

/**
 * Get user-friendly error message from error code or error object
 */
export function getErrorMessage(error: string | Error | any): ErrorMessage {
  let errorCode: string = 'UNKNOWN_ERROR';
  
  if (typeof error === 'string') {
    errorCode = error;
  } else if (error instanceof Error) {
    // Map common error patterns to codes
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      errorCode = 'NETWORK_ERROR';
    } else if (message.includes('timeout')) {
      errorCode = 'TIMEOUT_ERROR';
    } else if (message.includes('unauthorized') || message.includes('401')) {
      errorCode = 'UNAUTHORIZED';
    } else if (message.includes('permission') || message.includes('403')) {
      errorCode = 'INSUFFICIENT_PERMISSIONS';
    } else if (message.includes('file') && message.includes('large')) {
      errorCode = 'FILE_TOO_LARGE';
    } else if (message.includes('file') && message.includes('type')) {
      errorCode = 'INVALID_FILE_TYPE';
    } else if (message.includes('aborted') || message.includes('cancelled')) {
      errorCode = 'PROCESSING_CANCELLED';
    }
  } else if (error?.code) {
    errorCode = error.code;
  } else if (error?.error_code) {
    errorCode = error.error_code;
  }
  
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['UNKNOWN_ERROR'];
}

/**
 * Format error for display with consistent structure
 */
export function formatErrorForDisplay(error: string | Error | any) {
  const errorMessage = getErrorMessage(error);
  
  return {
    ...errorMessage,
    timestamp: new Date().toISOString(),
    originalError: error
  };
}

/**
 * Check if error allows retry
 */
export function canRetryError(error: string | Error | any): boolean {
  const errorMessage = getErrorMessage(error);
  return errorMessage.canRetry || false;
}

/**
 * Check if manual entry should be offered
 */
export function shouldOfferManualEntry(error: string | Error | any): boolean {
  const errorMessage = getErrorMessage(error);
  return errorMessage.allowManualEntry || false;
}