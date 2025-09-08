/**
 * Consolidated OCR Utilities
 * 
 * Centralized utilities for OCR processing, confidence mapping, display formatting,
 * and validation. Combines functionality from multiple utility files into a single
 * organized module for better maintainability and developer experience.
 */

import type { OCRConfidence, FormConfidence, OCRResult } from '@/types/ocr';

// =============================================================================
// CONFIDENCE MAPPING (from ocr-confidence-mapper.ts)
// =============================================================================

/**
 * Maps OCR confidence field names to form field names
 */
export function mapOCRConfidenceToForm(ocrConfidence: OCRConfidence): FormConfidence {
  const mapped: FormConfidence = {
    vendor_name: ocrConfidence.vendor,
    amount: ocrConfidence.total,
    receipt_date: ocrConfidence.date,
  };

  console.log('📊 OCR Confidence Mapping:', {
    input: ocrConfidence,
    output: mapped,
    mapping: {
      'vendor → vendor_name': `${(ocrConfidence.vendor || 0) * 100}% → ${(mapped.vendor_name || 0) * 100}%`,
      'total → amount': `${(ocrConfidence.total || 0) * 100}% → ${(mapped.amount || 0) * 100}%`,
      'date → receipt_date': `${(ocrConfidence.date || 0) * 100}% → ${(mapped.receipt_date || 0) * 100}%`,
    }
  });

  return mapped;
}

/**
 * Maps form confidence field names back to OCR field names (for debugging)
 */
export function mapFormConfidenceToOCR(formConfidence: FormConfidence): OCRConfidence {
  return {
    vendor: formConfidence.vendor_name,
    total: formConfidence.amount,
    date: formConfidence.receipt_date,
  };
}

/**
 * Helper to get confidence value for a form field
 */
export function getFormFieldConfidence(
  formConfidence: FormConfidence, 
  fieldName: keyof FormConfidence
): number {
  return formConfidence[fieldName] || 0;
}

/**
 * Helper to get confidence value for an OCR field  
 */
export function getOCRFieldConfidence(
  ocrConfidence: OCRConfidence,
  fieldName: keyof OCRConfidence
): number {
  return ocrConfidence[fieldName] || 0;
}

// =============================================================================
// CONFIDENCE DISPLAY (from confidence-display.ts)
// =============================================================================

export interface ConfidenceValues {
  vendor_name?: number;
  amount?: number;
  receipt_date?: number;
  [key: string]: number | undefined;
}

/**
 * Formats confidence value for display
 * Handles both decimal (0.95) and percentage (95) formats
 */
export function formatConfidencePercent(confidence: number | undefined): string {
  if (confidence === undefined || confidence === null) return '0%';
  
  // Handle decimal format (0.95 -> 95%)
  if (confidence <= 1) {
    return `${Math.round(confidence * 100)}%`;
  }
  
  // Handle percentage format (95 -> 95%)
  return `${Math.round(confidence)}%`;
}

/**
 * Gets confidence value for a specific field
 */
export function getFieldConfidence(
  confidenceValues: ConfidenceValues | undefined,
  fieldName: keyof ConfidenceValues
): number | undefined {
  if (!confidenceValues) return undefined;
  return confidenceValues[fieldName];
}

/**
 * Validates if confidence value is in correct decimal format (0-1)
 */
export function validateConfidenceFormat(confidence: number): boolean {
  return confidence >= 0 && confidence <= 1;
}

/**
 * Logs confidence debug information
 */
export function logConfidenceDebug(
  label: string,
  confidenceValues: ConfidenceValues | undefined
): void {
  if (process.env.NODE_ENV === 'development' && confidenceValues) {
    console.log(`📊 ${label} Confidence Debug:`, {
      raw: confidenceValues,
      formatted: Object.entries(confidenceValues).reduce((acc, [key, value]) => {
        acc[key] = formatConfidencePercent(value);
        return acc;
      }, {} as Record<string, string>)
    });
  }
}

// =============================================================================
// TYPE GUARDS AND VALIDATORS (from types/ocr.ts)
// =============================================================================

/**
 * Type guard to check if confidence is OCRConfidence
 */
export function isOCRConfidence(confidence: any): confidence is OCRConfidence {
  return confidence && typeof confidence === 'object' &&
    (confidence.vendor !== undefined || confidence.total !== undefined || confidence.date !== undefined);
}

/**
 * Type guard to check if confidence is FormConfidence
 */
export function isFormConfidence(confidence: any): confidence is FormConfidence {
  return confidence && typeof confidence === 'object' &&
    (confidence.vendor_name !== undefined || confidence.amount !== undefined || confidence.receipt_date !== undefined);
}

/**
 * Type guard to check if result is a valid OCRResult
 */
export function isValidOCRResult(result: any): result is OCRResult {
  return result && typeof result === 'object' &&
    typeof result.vendor === 'string' &&
    typeof result.total === 'number' &&
    typeof result.date === 'string' &&
    Array.isArray(result.lineItems);
}

// =============================================================================
// OCR PROCESSING HELPERS (new utilities)
// =============================================================================

/**
 * Determines confidence level based on numeric confidence value
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

/**
 * Checks if a field has high confidence above threshold
 */
export function isHighConfidenceField(confidence: number, threshold = 0.8): boolean {
  return confidence >= threshold;
}

/**
 * Determines if confidence warning should be shown
 */
export function shouldShowConfidenceWarning(confidence: number, threshold = 0.5): boolean {
  return confidence < threshold;
}

/**
 * Calculates overall confidence score from individual field confidences
 */
export function calculateOverallConfidence(confidences: OCRConfidence): number {
  const fields = [confidences.vendor, confidences.total, confidences.date];
  const validFields = fields.filter(c => c !== undefined) as number[];
  
  if (validFields.length === 0) return 0;
  
  const sum = validFields.reduce((acc, val) => acc + val, 0);
  return sum / validFields.length;
}

/**
 * Validates OCR result has minimum required fields
 */
export function hasMinimumRequiredFields(result: OCRResult): boolean {
  return !!(result.vendor && result.total && result.date);
}

/**
 * Validates OCR fields and returns validation result
 */
export function validateOCRFields(result: OCRResult): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!result.vendor || result.vendor.trim().length === 0) {
    issues.push('Vendor name is missing or empty');
  }
  
  if (!result.total || result.total <= 0) {
    issues.push('Amount is missing or invalid');
  }
  
  if (!result.date || result.date.trim().length === 0) {
    issues.push('Receipt date is missing or empty');
  }
  
  if (!Array.isArray(result.lineItems)) {
    issues.push('Line items are missing or invalid');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Extracts only high confidence fields from OCR result
 */
export function extractHighConfidenceFields(
  result: OCRResult, 
  threshold = 0.8
): Partial<OCRResult> {
  const extracted: Partial<OCRResult> = {};
  
  if (isHighConfidenceField(result.confidence.vendor || 0, threshold)) {
    extracted.vendor = result.vendor;
  }
  
  if (isHighConfidenceField(result.confidence.total || 0, threshold)) {
    extracted.total = result.total;
  }
  
  if (isHighConfidenceField(result.confidence.date || 0, threshold)) {
    extracted.date = result.date;
  }
  
  return extracted;
}

/**
 * Normalizes OCR result to ensure consistent format
 */
export function normalizeOCRResult(result: any): OCRResult {
  return {
    vendor: result.vendor || '',
    total: Number(result.total) || 0,
    date: result.date || '',
    confidence: result.confidence || { vendor: 0, total: 0, date: 0 },
    subtotal: Number(result.subtotal) || undefined,
    tax: Number(result.tax) || undefined,
    lineItems: Array.isArray(result.lineItems) ? result.lineItems : [],
    line_items: Array.isArray(result.line_items) ? result.line_items : undefined,
  };
}

/**
 * Merges OCR results with fallback values
 */
export function mergeOCRResults(
  primary: OCRResult, 
  fallback: Partial<OCRResult>
): OCRResult {
  return {
    vendor: primary.vendor || fallback.vendor || '',
    total: primary.total || fallback.total || 0,
    date: primary.date || fallback.date || '',
    confidence: { ...fallback.confidence, ...primary.confidence },
    subtotal: primary.subtotal || fallback.subtotal,
    tax: primary.tax || fallback.tax,
    lineItems: primary.lineItems.length > 0 ? primary.lineItems : (fallback.lineItems || []),
    line_items: primary.line_items || fallback.line_items,
  };
}

// =============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// =============================================================================

// Re-export commonly used types for backward compatibility
export type { OCRConfidence, FormConfidence, OCRResult };