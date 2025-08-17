// Input/output validation utilities

export interface RequestValidation {
  isValid: boolean;
  error?: string;
  sanitizedImageUrl?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  confidence: number;
}

export function validateImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateRequest(req: Request): RequestValidation {
  if (req.method === 'OPTIONS') {
    return { isValid: true };
  }

  if (req.method !== 'POST') {
    return {
      isValid: false,
      error: 'METHOD_NOT_ALLOWED'
    };
  }

  const contentType = req.headers.get('Content-Type');
  if (!contentType || !contentType.includes('application/json')) {
    return {
      isValid: false,
      error: 'INVALID_CONTENT_TYPE'
    };
  }

  return { isValid: true };
}

export function validateResponse(result: any): ValidationResult {
  const issues: string[] = [];
  
  // Simple validation - just check if we have core fields
  if (!result.vendor) issues.push('Missing vendor');
  if (!result.total) issues.push('Missing total');
  if (!result.date) issues.push('Missing date');

  return {
    isValid: issues.length < 3, // Allow some missing fields
    issues,
    quality: issues.length === 0 ? 'good' : 'fair',
    confidence: issues.length === 0 ? 0.8 : 0.6
  };
}

export function createErrorResponse(
  errorCode: string, 
  userMessage: string, 
  debugInfo?: any,
  corsHeaders?: any
): Response {
  const response = {
    success: false,
    error: errorCode,
    message: userMessage,
    debug: debugInfo || null
  };

  return new Response(JSON.stringify(response), {
    status: errorCode === 'METHOD_NOT_ALLOWED' ? 405 : 400,
    headers: {
      'Content-Type': 'application/json',
      ...(corsHeaders || {})
    }
  });
}

// User-friendly error message mapping
export function getUserFriendlyMessage(errorCode: string): string {
  const messages: Record<string, string> = {
    'NETWORK_ERROR': 'Connection problem. Please check your internet and try again.',
    'OCR_SERVICE_ERROR': 'Our scanning service is temporarily unavailable. You can enter details manually.',
    'NO_TEXT_DETECTED': 'No text found in your image. Make sure the receipt is clearly visible.',
    'POOR_IMAGE_QUALITY': 'Image quality is too low. Please take a clearer photo.',
    'FILE_TOO_LARGE': 'Image file is too large. Please use a smaller file.',
    'INVALID_FILE_TYPE': 'Please upload an image file (JPG, PNG, WebP, or HEIC).',
    'PROCESSING_TIMEOUT': 'Processing took too long. Try a clearer image or enter details manually.',
    'INSUFFICIENT_TEXT': 'Not enough readable text found. Please provide a clearer image.',
    'SERVICE_UNAVAILABLE': 'Service temporarily unavailable. Please try again later.',
    'INTERNAL_ERROR': 'Something went wrong. Please try again or enter details manually.'
  };
  return messages[errorCode] || 'An unexpected error occurred. Please try again.';
}