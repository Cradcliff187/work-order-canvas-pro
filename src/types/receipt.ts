/**
 * Shared Receipt Types
 * 
 * Centralized type definitions for receipt processing, OCR, and form handling.
 */

// Re-export OCRResult and LineItem from centralized types for backward compatibility
export type { OCRResult, LineItem } from '@/types/ocr';

export interface SmartReceiptFormData {
  vendor_name: string;
  amount: number;
  description?: string;
  receipt_date: string;
  notes?: string;
  work_order_id?: string;
}

// Re-export FormConfidence from centralized types for backward compatibility
export type { FormConfidence as OCRConfidence } from '@/types/ocr';