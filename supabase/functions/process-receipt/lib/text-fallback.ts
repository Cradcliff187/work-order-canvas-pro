// Fallback text parsing for when spatial analysis fails

import { findVendor } from "./vendor-detection.ts";
import { parseReceiptDate } from "./date-parsing.ts";
import { parseAmounts } from "./amount-parser.ts";
import { extractLineItems } from "./line-item-parser.ts";
import { calculateOverallConfidence, getExtractionQuality } from "./confidence-scoring.ts";

export interface TextFallbackResult {
  vendor: string;
  vendor_confidence: number;
  total: number;
  total_confidence: number;
  date: string;
  date_confidence: number;
  lineItems: any[];
  lineItems_confidence: number;
  overall_confidence: number;
  extraction_method: 'text_fallback';
}

export function runTextFallback(text: string): TextFallbackResult {
  console.log('📝 Running text fallback extraction...');
  
  // Use existing text-based parsers
  const vendorResult = findVendor(text);
  const dateResult = parseReceiptDate(text);
  const amountResult = parseAmounts(text);
  const lineItemsResult = extractLineItems(text);
  
  const confidence = {
    vendor: vendorResult.confidence || 0.5,
    total: amountResult.total_confidence || 0.5,
    date: dateResult.confidence || 0.5,
    lineItems: lineItemsResult.length > 0 ? 0.6 : 0
  };
  
  const overallConfidence = calculateOverallConfidence(confidence);
  
  return {
    vendor: vendorResult.name || '',
    vendor_confidence: confidence.vendor,
    total: amountResult.total || 0,
    total_confidence: confidence.total,
    date: dateResult.date || new Date().toISOString().split('T')[0],
    date_confidence: confidence.date,
    lineItems: lineItemsResult || [],
    lineItems_confidence: confidence.lineItems,
    overall_confidence: overallConfidence,
    extraction_method: 'text_fallback'
  };
}