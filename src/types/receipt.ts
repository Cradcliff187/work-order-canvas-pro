/**
 * Shared Receipt Types
 * 
 * Centralized type definitions for receipt processing, OCR, and form handling.
 */

export interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
}

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
  lineItems: LineItem[];
}

export interface SmartReceiptFormData {
  vendor_name: string;
  amount: number;
  description?: string;
  receipt_date: string;
  notes?: string;
  work_order_id?: string;
}

export interface OCRConfidence {
  vendor_name?: number;
  amount?: number;
  receipt_date?: number;
  [key: string]: number | undefined;
}