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
  let qualityScore = 1.0;

  // Check for missing critical fields
  if (!result.vendor || result.vendor.trim().length === 0) {
    issues.push('Missing vendor information');
    qualityScore -= 0.2;
  }

  if (!result.total || result.total <= 0) {
    issues.push('Missing or invalid total amount');
    qualityScore -= 0.3;
  }

  if (!result.date || result.date.trim().length === 0) {
    issues.push('Missing date information');
    qualityScore -= 0.15;
  }

  // Check line items quality
  if (!result.lineItems || result.lineItems.length === 0) {
    issues.push('No line items detected');
    qualityScore -= 0.25;
  } else {
    const validLineItems = result.lineItems.filter((item: any) => 
      item.description && item.description.trim().length > 0 && 
      item.total_price > 0
    );
    
    if (validLineItems.length < result.lineItems.length * 0.7) {
      issues.push('Many line items have incomplete information');
      qualityScore -= 0.15;
    }
  }

  // Check confidence scores
  const confidence = result.confidence || {};
  if (confidence.overall && confidence.overall < 0.5) {
    issues.push('Low overall confidence in extraction');
    qualityScore -= 0.1;
  }

  // Determine quality
  let quality: 'excellent' | 'good' | 'fair' | 'poor';
  if (qualityScore >= 0.9) quality = 'excellent';
  else if (qualityScore >= 0.7) quality = 'good';
  else if (qualityScore >= 0.5) quality = 'fair';
  else quality = 'poor';

  return {
    isValid: issues.length === 0 || quality !== 'poor',
    issues,
    quality,
    confidence: Math.max(qualityScore, 0)
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