/**
 * Centralized OCR Types
 * 
 * All OCR-related type definitions for receipt processing, confidence scoring,
 * and progress tracking throughout the application.
 */

/**
 * Line item structure for OCR-processed receipts
 */
export interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  // Hook-compatible format
  amount?: number;
}

/**
 * Raw OCR confidence scores (using OCR field names)
 */
export interface OCRConfidence {
  vendor?: number;
  total?: number;
  date?: number;
  lineItems?: number;
}

/**
 * Form-mapped confidence scores (using form field names)
 */
export interface FormConfidence {
  vendor_name?: number;
  amount?: number;
  receipt_date?: number;
  [key: string]: number | undefined;
}

/**
 * Progress stage for OCR processing
 */
export type ProgressStage = 'uploading' | 'processing' | 'extracting' | 'complete' | 'error';

/**
 * OCR progress tracking
 */
export interface OCRProgress {
  stage: ProgressStage;
  value: number;
  message?: string;
}

/**
 * Comprehensive OCR result structure
 * Supports both hook and component interfaces
 */
export interface OCRResult {
  vendor: string;
  total: number;
  date: string;
  confidence: OCRConfidence;
  subtotal?: number;
  tax?: number;
  lineItems: LineItem[];
  
  // Hook-compatible fields for backward compatibility
  line_items?: Array<{
    description: string;
    amount: number;
  }>;
}

/**
 * OCR processing status
 */
export interface OCRStatus {
  isProcessing: boolean;
  isProcessingLocked: boolean;
  data: OCRResult | null;
  confidence: Record<string, number>;
  error: string | null;
  retryCount: number;
}

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